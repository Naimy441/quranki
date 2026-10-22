/**
 * Builds a realistic demo account for the product video by replaying ~80 days of study through
 * the app's own FSRS scheduler and session queue. Writes the localStorage / AsyncStorage keys the
 * web and mobile apps read on launch to `video/seed/demo-state.json`.
 *
 * Run from the web folder so the `@/` alias resolves:
 *   cd web && npx tsx --tsconfig tsconfig.json ../video/scripts/seed.ts
 */
import fs from 'node:fs';
import path from 'node:path';

import { createNewCard, deserializeCard, gradeCard, serializeCard, State, type GradeName } from '@/lib/fsrs';
import { buildGlobalSessionQueue, computeReachedLevel, LEVELS, type ProgressMap } from '@/lib/levels';
import { getRecognizedLemmaIds, getUnlockedRukus, type Ruku } from '@/lib/ruku';
import { calendarDayKey } from '@/lib/stats';
import { getQuranAyahUnderstandingSummary, countMemorizedQuranWords } from '@/lib/quran-coverage';
import { loadCanonicalAyahs } from '@/lib/quran-lemma-index';

// The lemma index is fetched from /public at runtime in the browser; read it from disk here.
const publicDir = path.resolve(process.cwd(), 'public');
globalThis.fetch = (async (url: string) => {
  const body = fs.readFileSync(path.join(publicDir, String(url)), 'utf8');
  return { ok: true, json: async () => JSON.parse(body), text: async () => body } as Response;
}) as typeof fetch;

async function main(): Promise<void> {
let seed = 1447;
function rand(): number {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
}

function pickReviewGrade(): GradeName {
  const r = rand();
  if (r < 0.06) return 'again';
  if (r < 0.08) return 'hard';
  if (r < 0.85) return 'good';
  return 'easy';
}

const DAYS = 82;
/** Days off, counted back from today. The current streak starts after the last one. */
const SKIPPED_DAYS_AGO = new Set([81, 74, 69, 63, 58, 52]);
const now = new Date();

const progress: ProgressMap = {};
const reviewDates: string[] = [];
const studyMsByDate: Record<string, number> = {};
let newCardsToday = 0;
let reviewsToday = 0;
let maxUnlockedLevel = 1;

function grade(wordId: string, g: GradeName, at: Date): void {
  const prev = progress[wordId];
  const card = prev ? deserializeCard(prev.card) : createNewCard(at);
  const next = gradeCard(card, g, at).card;
  const easyStreak = g === 'easy' ? (prev?.easyStreak ?? 0) + 1 : 0;
  progress[wordId] = {
    wordId,
    card: serializeCard(next),
    lastGrade: g,
    reviewedAt: at.toISOString(),
    ...(easyStreak ? { easyStreak } : {}),
  };
}

for (let daysAgo = DAYS; daysAgo >= 0; daysAgo -= 1) {
  if (SKIPPED_DAYS_AGO.has(daysAgo)) continue;
  const day = new Date(now);
  day.setDate(day.getDate() - daysAgo);
  // Study around midday local so the UTC review-date key matches the local calendar day.
  day.setHours(11 + Math.floor(rand() * 3), Math.floor(rand() * 60), 0, 0);
  // Ramp from 8 to 14 new words a day as the learner settles in.
  const wordsPerSession = daysAgo > 60 ? 8 : daysAgo > 30 ? 12 : 14;
  let queue = buildGlobalSessionQueue(progress, day, wordsPerSession);
  // Today: a short morning sitting keeps the streak alive and leaves a review queue for the demo.
  if (daysAgo === 0) {
    queue = queue.filter((item) => item.reason === 'due').slice(0, 12);
  }
  let t = day.getTime();
  let reviewed = 0;
  for (const item of queue) {
    t += 6_000 + rand() * 9_000;
    const at = new Date(t);
    if (daysAgo === 0) {
      grade(item.word.id, 'good', at);
      reviewsToday += 1;
      continue;
    }
    if (item.word.kind === 'grammar') {
      grade(item.word.id, 'good', at);
      continue;
    }
    if (item.reason === 'new') {
      grade(item.word.id, rand() < 0.15 ? 'again' : 'good', at);
    } else {
      grade(item.word.id, pickReviewGrade(), at);
    }
    reviewed += 1;
  }
  // Second pass: learning cards come back ten minutes later in the same sitting.
  t += 10 * 60_000;
  for (const [id, item] of Object.entries(progress)) {
    if (daysAgo === 0) break;
    const card = deserializeCard(item.card);
    if ((card.state === State.Learning || card.state === State.Relearning) && card.due.getTime() <= t + 30 * 60_000) {
      t += 5_000 + rand() * 6_000;
      grade(id, rand() < 0.9 ? 'good' : 'easy', new Date(Math.max(t, card.due.getTime())));
      reviewed += 1;
    }
  }
  reviewDates.push(day.toISOString().slice(0, 10));
  const minutes = Math.max(6, Math.round((t - day.getTime()) / 60_000 + rand() * 6));
  studyMsByDate[calendarDayKey(day)] = minutes * 60_000;
  void reviewed;
  maxUnlockedLevel = Math.max(maxUnlockedLevel, computeReachedLevel(progress));
}

// Mastering the Arabic-digit level switches every number in the UI to Arabic-Indic digits.
// Keep Western digits for an English-language video by leaving that level unstudied.
for (const level of LEVELS) {
  for (const word of level.words) if (word.kind === 'digit') delete progress[word.id];
}
await loadCanonicalAyahs();

// Hifz: enroll a handful of unlocked rukus, short surahs first, each with a few reviews behind it.
const recognized = getRecognizedLemmaIds(progress, {});
const unlocked = getUnlockedRukus(recognized);
const preferred = [1, 112, 113, 114, 103, 108, 110, 97, 2];
const chosen: Ruku[] = [];
for (const s of preferred) {
  const r = unlocked.find((ruku) => ruku.surah === s);
  if (r && !chosen.includes(r)) chosen.push(r);
}
for (const r of unlocked) {
  if (chosen.length >= 9) break;
  if (!chosen.includes(r)) chosen.push(r);
}
const hifzCards: Record<string, unknown> = {};
chosen.forEach((ruku, i) => {
  let card = createNewCard();
  const start = new Date(now);
  start.setDate(start.getDate() - (40 - i * 4));
  let at = start;
  let lastGrade: GradeName = 'good';
  const reps = Math.max(1, 5 - Math.floor(i / 2));
  for (let k = 0; k < reps; k += 1) {
    lastGrade = k === 0 ? 'good' : rand() < 0.8 ? 'good' : 'easy';
    card = gradeCard(card, lastGrade, at).card;
    if (k === 0) {
      at = new Date(at.getTime() + 10 * 60_000);
      card = gradeCard(card, 'good', at).card;
    }
    at = new Date(Math.min(card.due.getTime(), now.getTime() - 3600_000));
  }
  // Leave two rukus due today so the memorize session has something to show.
  if (i < 2) card = { ...card, due: new Date(now.getTime() - 6 * 3600_000) };
  hifzCards[String(ruku.id)] = {
    rukuId: ruku.id,
    card: serializeCard(card),
    lastGrade,
    reviewedAt: at.toISOString(),
  };
});
const hifz = { enrolledRukuIds: chosen.map((r) => r.id), cards: hifzCards, introSeen: true };

const iso = (daysAgo: number, h = 12) => {
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, 0, 0, 0);
  return d.toISOString();
};

const quranMarks = {
  lastRead: { surah: 18, ayah: 10, updatedAt: iso(1, 21) },
  recentSurahs: [
    { n: 18, ayah: 10, openedAt: iso(1, 21) },
    { n: 36, ayah: 1, openedAt: iso(2, 21) },
    { n: 67, ayah: 1, openedAt: iso(3, 22) },
    { n: 1, ayah: 1, openedAt: iso(4, 7) },
    { n: 2, ayah: 255, openedAt: iso(5, 7) },
    { n: 55, ayah: 13, openedAt: iso(6, 21) },
  ],
  pins: [
    { id: 'pin_kahf', name: 'Friday Kahf', color: '#2E7FC7', createdAt: iso(30) },
    { id: 'pin_hifz', name: 'Hifz', color: '#1E8E5A', createdAt: iso(40) },
  ],
  pinPlacements: [
    { id: 'pp_1', pinId: 'pin_kahf', surah: 18, ayah: 10, createdAt: iso(1) },
    { id: 'pp_2', pinId: 'pin_hifz', surah: 67, ayah: 1, createdAt: iso(3) },
  ],
  collections: [
    { id: 'col_dua', name: 'Duas', color: '#7C5CBF', createdAt: iso(50) },
    { id: 'col_mercy', name: 'Mercy', color: '#E85D8C', createdAt: iso(45) },
    { id: 'col_reflect', name: 'To reflect on', color: '#DE8A2E', createdAt: iso(35) },
  ],
  bookmarks: [
    { id: 'bm_1', collectionId: 'col_dua', surah: 2, ayah: 201, createdAt: iso(48) },
    { id: 'bm_2', collectionId: 'col_dua', surah: 2, ayah: 286, createdAt: iso(47) },
    { id: 'bm_3', collectionId: 'col_dua', surah: 3, ayah: 8, createdAt: iso(40) },
    { id: 'bm_4', collectionId: 'col_dua', surah: 20, ayah: 114, createdAt: iso(33) },
    { id: 'bm_5', collectionId: 'col_dua', surah: 25, ayah: 74, createdAt: iso(20) },
    { id: 'bm_6', collectionId: 'col_mercy', surah: 39, ayah: 53, createdAt: iso(44) },
    { id: 'bm_7', collectionId: 'col_mercy', surah: 7, ayah: 156, createdAt: iso(30) },
    { id: 'bm_8', collectionId: 'col_mercy', surah: 94, ayah: 5, createdAt: iso(12) },
    { id: 'bm_9', collectionId: 'col_reflect', surah: 13, ayah: 28, createdAt: iso(34) },
    { id: 'bm_10', collectionId: 'col_reflect', surah: 2, ayah: 286, createdAt: iso(9) },
    { id: 'bm_11', collectionId: 'col_reflect', surah: 3, ayah: 190, createdAt: iso(4) },
  ],
};

const settings = {
  wordsPerSession: 14,
  themePreference: 'dark',
  accentColor: 'green',
  readerArabicSize: 30,
  readerGlossSize: 15,
  readerShowTranslation: true,
  readerShowAyahCoverage: true,
  readerTransliteration: false,
  readerTransliterationSize: 13,
  reminderEnabled: true,
  reminderHour: 6,
  reminderMinute: 30,
  readerAlwaysShowTranslation: false,
  readerShowRukuMarkers: true,
  canReadQuran: true,
  readerShowTajweed: true,
  readerMode: 'wbw',
  autoPlayWordAudio: false,
};

const meta = {
  maxUnlockedLevel,
  reviewDates,
  streakGraceDates: [],
  reviewCountDate: now.toISOString().slice(0, 10),
  reviewsToday,
  newCardsToday,
  studyMsByDate,
  onboardingCompleted: true,
};

const state = {
  'quranki:progress:v1': JSON.stringify(progress),
  'quranki:settings:v1': JSON.stringify(settings),
  'quranki:meta:v1': JSON.stringify(meta),
  'quranki:hifz:v1': JSON.stringify(hifz),
  'quranki:quran-marks:v1': JSON.stringify(quranMarks),
  'quranki:known-words:v2': JSON.stringify({}),
};

const outDir = path.resolve(process.cwd(), '../video/seed');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'demo-state.json'), JSON.stringify(state));

const summary = getQuranAyahUnderstandingSummary(recognized);
const states = Object.values(progress).map((p) => p.card.state);
console.log({
  words: Object.keys(progress).length,
  review: states.filter((s) => s === State.Review).length,
  maxUnlockedLevel,
  studyDays: reviewDates.length,
  unlockedRukus: unlocked.length,
  hifz: chosen.map((r) => `${r.surah}:${r.fromAyah}-${r.toAyah}`),
  memorizedQuranWords: countMemorizedQuranWords(recognized),
  summary: { ...summary, histogram: undefined },
});
}

void main();
