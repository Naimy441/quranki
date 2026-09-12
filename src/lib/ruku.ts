/**
 * Ruku catalogue from `quran-metadata-ruku.json`, plus coverage / cue helpers for the
 * memorization deck. Unlock uses the same per-ayah vocabulary ratio as the Progress
 * histogram (every ayah weighted equally), not raw verse count.
 */
import rukuCueCounts from '@/data/ruku-cue-counts.json';
import rukuMetadata from '@/data/quran-metadata-ruku.json';

import { shapeQpcArabic } from '@/lib/arabic-display';
import { getKnownLemmaIds, type KnownWordsMap } from '@/lib/known-words';
import { getMasteredLemmaIds, type ProgressMap } from '@/lib/levels';
import { CANONICAL_AYAHS } from '@/lib/quran-lemma-index';
import { ayahLemmaUnderstanding, type LemmaId } from '@/lib/quran-lemmas';
import { getSurahAyahs, getSurahMeta } from '@/lib/quran-reader';
import type { ReaderWord } from '@/lib/quran-reader-types';

export const HIFZ_UNLOCK_RATIO = 0.7;
/** Fewest opening words that still feel like a prompt, not a single token. */
export const HIFZ_CUE_MIN_WORDS = 3;

interface RawRuku {
  ruku_number: number;
  surah_ruku_number: number;
  verses_count: number;
  first_verse_key: string;
  last_verse_key: string;
  verse_mapping: Record<string, string>;
}

export interface Ruku {
  id: number;
  surahRukuNumber: number;
  surah: number;
  fromAyah: number;
  toAyah: number;
  ayahCount: number;
}

function parseVerseKey(key: string): { surah: number; ayah: number } {
  const [surah, ayah] = key.split(':').map(Number);
  return { surah, ayah };
}

function parseRange(spec: string): [number, number] {
  const [from, to] = spec.split('-').map(Number);
  return [from, to ?? from];
}

function buildCatalog(): Ruku[] {
  const raw = rukuMetadata as Record<string, RawRuku>;
  const list: Ruku[] = [];
  for (const entry of Object.values(raw)) {
    const mapping = Object.entries(entry.verse_mapping)[0];
    const fromKey = parseVerseKey(entry.first_verse_key);
    const toKey = parseVerseKey(entry.last_verse_key);
    const surah = mapping ? Number(mapping[0]) : fromKey.surah;
    const [fromAyah, toAyah] = mapping ? parseRange(mapping[1]) : [fromKey.ayah, toKey.ayah];
    list.push({
      id: entry.ruku_number,
      surahRukuNumber: entry.surah_ruku_number,
      surah,
      fromAyah,
      toAyah,
      ayahCount: entry.verses_count,
    });
  }
  return list.sort((a, b) => a.id - b.id);
}

export const RUKUS: Ruku[] = buildCatalog();

const rukuById = new Map(RUKUS.map((ruku) => [ruku.id, ruku]));

/** Canonical lemma lists for every ayah, keyed `"surah:ayah"`. Opening letters are already omitted. */
const CANONICAL_BY_AYAH = new Map(
  CANONICAL_AYAHS.map((ayah) => [`${ayah.surah}:${ayah.ayah}`, ayah.words] as const),
);

export function getRuku(id: number): Ruku | undefined {
  return rukuById.get(id);
}

export function formatRukuAyahRange(ruku: Ruku): string {
  return `${ruku.surah}:${ruku.fromAyah} - ${ruku.toAyah}`;
}

export function formatRukuTitle(ruku: Ruku): string {
  const meta = getSurahMeta(ruku.surah);
  const chapter = meta?.en ?? `Surah ${ruku.surah}`;
  return `${chapter} - Ruku ${ruku.surahRukuNumber}`;
}

/** Mastered vocabulary plus reader-marked known lemmas - the same set the reader coverage uses. */
export function getRecognizedLemmaIds(progress: ProgressMap, knownWords: KnownWordsMap): Set<LemmaId> {
  const ids = getMasteredLemmaIds(progress);
  for (const id of getKnownLemmaIds(knownWords)) ids.add(id);
  return ids;
}

/**
 * Mean ayah-understanding ratio for this ruku. Ayahs with no lexical words are skipped.
 * This is the fair scale: a two-ayah wall of text and a fifty-ayah short-verse passage
 * are compared by how much of each ayah the learner can follow, not by verse count.
 */
export function getRukuCoverage(ruku: Ruku, recognizedLemmaIds: Set<LemmaId>): number {
  let total = 0;
  let count = 0;
  for (let ayah = ruku.fromAyah; ayah <= ruku.toAyah; ayah += 1) {
    const words = CANONICAL_BY_AYAH.get(`${ruku.surah}:${ayah}`);
    if (!words) continue;
    const { totalWords, ratio } = ayahLemmaUnderstanding(words, recognizedLemmaIds);
    if (totalWords === 0) continue;
    total += ratio;
    count += 1;
  }
  return count === 0 ? 0 : total / count;
}

export function isRukuUnlocked(ruku: Ruku, recognizedLemmaIds: Set<LemmaId>): boolean {
  return getRukuCoverage(ruku, recognizedLemmaIds) >= HIFZ_UNLOCK_RATIO;
}

export function hasUnlockedRuku(recognizedLemmaIds: Set<LemmaId>): boolean {
  return RUKUS.some((ruku) => isRukuUnlocked(ruku, recognizedLemmaIds));
}

export function getUnlockedRukus(recognizedLemmaIds: Set<LemmaId>): Ruku[] {
  return RUKUS.filter((ruku) => isRukuUnlocked(ruku, recognizedLemmaIds));
}

/** One coverage pass per ruku so the Memorize list does not scan the catalog twice. */
export function getUnlockedRukuRows(
  recognizedLemmaIds: Set<LemmaId>,
): { ruku: Ruku; coverage: number }[] {
  const rows: { ruku: Ruku; coverage: number }[] = [];
  for (const ruku of RUKUS) {
    const coverage = getRukuCoverage(ruku, recognizedLemmaIds);
    if (coverage >= HIFZ_UNLOCK_RATIO) rows.push({ ruku, coverage });
  }
  return rows;
}

export function groupUnlockedRukusBySurah(
  recognizedLemmaIds: Set<LemmaId>,
): Map<number, { ruku: Ruku; coverage: number }[]> {
  const grouped = new Map<number, { ruku: Ruku; coverage: number }[]>();
  for (const row of getUnlockedRukuRows(recognizedLemmaIds)) {
    const list = grouped.get(row.ruku.surah) ?? [];
    list.push(row);
    grouped.set(row.ruku.surah, list);
  }
  return grouped;
}

export interface RukuCueWord {
  ayah: number;
  position: number;
  word: ReaderWord;
  text: string;
}

export interface RukuCue {
  text: string;
  words: RukuCueWord[];
}

const cuePrefixCache = new Map<number, RukuCueWord[]>();
const cueWordCounts = new Map(
  Object.entries(rukuCueCounts as Record<string, number>).map(([id, count]) => [Number(id), count]),
);

function collectCueWords(ruku: Ruku, limit: number): RukuCueWord[] {
  let cached = cuePrefixCache.get(ruku.id);
  if (!cached) {
    cached = [];
    cuePrefixCache.set(ruku.id, cached);
  }
  if (cached.length >= limit) return cached.slice(0, limit);

  const ayahs = getSurahAyahs(ruku.surah);
  let seen = 0;
  for (let ayah = ruku.fromAyah; ayah <= ruku.toAyah; ayah += 1) {
    const entry = ayahs[ayah - 1];
    if (!entry) continue;
    for (const word of entry.w) {
      if (seen >= cached.length) {
        cached.push({
          ayah,
          position: word.p,
          word,
          text: shapeQpcArabic(word.ar.map((seg) => seg.t).join('')),
        });
      }
      seen += 1;
      if (cached.length >= limit) return cached.slice(0, limit);
    }
  }
  return cached.slice(0, Math.min(limit, cached.length));
}

export function getRukuCueWordCount(ruku: Ruku): number {
  return cueWordCounts.get(ruku.id) ?? HIFZ_CUE_MIN_WORDS;
}

/** Opening mushaf words used on the card front and for the reciter clip. */
export function getRukuCue(ruku: Ruku, wordCount?: number): RukuCue {
  const words = collectCueWords(ruku, wordCount ?? getRukuCueWordCount(ruku));
  return { text: words.map((word) => word.text).join(' '), words };
}
