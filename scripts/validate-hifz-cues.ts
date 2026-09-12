/**
 * Checks every ruku cue from `getRukuCue` against the catalog.
 * Run: npx tsx scripts/validate-hifz-cues.ts
 */
import { getSurahAyahs, getSurahMeta } from '../src/lib/quran-reader';
import {
  HIFZ_CUE_MIN_WORDS,
  RUKUS,
  getRukuCue,
  getRukuCueWordCount,
  type Ruku,
} from '../src/lib/ruku';

const MARKS = /[\u0640\u064B-\u065F\u0670\u06D6-\u06ED\u200B-\u200F\uFEFF]/g;

function openingWords(ruku: Ruku, limit: number): string[] {
  const ayahs = getSurahAyahs(ruku.surah);
  const words: string[] = [];
  for (let ayah = ruku.fromAyah; ayah <= ruku.toAyah && words.length < limit; ayah += 1) {
    const entry = ayahs[ayah - 1];
    if (!entry) continue;
    for (const word of entry.w) {
      if (words.length >= limit) break;
      words.push(word.ar.map((seg) => seg.t).join('').replace(/\u06EB/g, '\u06EC'));
    }
  }
  return words;
}

function letters(text: string): string {
  return text.replace(MARKS, '').replace(/\s+/g, '');
}

function label(ruku: Ruku): string {
  const meta = getSurahMeta(ruku.surah);
  return `#${ruku.id} ${meta?.en ?? `Surah ${ruku.surah}`} ${ruku.fromAyah}–${ruku.toAyah}`;
}

const failures: string[] = [];
function fail(message: string) {
  failures.push(message);
}

if (RUKUS.length !== 558) fail(`catalog size ${RUKUS.length}, expected 558`);
const ids = RUKUS.map((ruku) => ruku.id);
if (new Set(ids).size !== ids.length) fail('duplicate ruku ids');
if (Math.min(...ids) !== 1 || Math.max(...ids) !== 558) fail(`id range ${Math.min(...ids)}–${Math.max(...ids)}`);

const cues = RUKUS.map((ruku) => {
  const count = getRukuCueWordCount(ruku);
  const cue = getRukuCue(ruku);
  const opening = openingWords(ruku, Math.max(count, cue.words.length, HIFZ_CUE_MIN_WORDS));
  return { ruku, count, cue, opening };
});

const byExact = new Map<string, Ruku[]>();
const byLetters = new Map<string, Ruku[]>();

for (const row of cues) {
  const { ruku, count, cue, opening } = row;
  const name = label(ruku);

  if (cue.words.length === 0) fail(`${name}: empty cue`);
  if (count !== cue.words.length) fail(`${name}: count ${count} != cue.words ${cue.words.length}`);
  if (cue.text !== cue.words.map((word) => word.text).join(' ')) {
    fail(`${name}: cue.text does not match joined words`);
  }
  if (ruku.ayahCount > 0 && cue.words.length < Math.min(HIFZ_CUE_MIN_WORDS, opening.length)) {
    fail(`${name}: cue shorter than min (${cue.words.length} < ${HIFZ_CUE_MIN_WORDS})`);
  }

  const shown = cue.words.map((word) => word.text);
  if (shown.join('\0') !== opening.slice(0, shown.length).join('\0')) {
    fail(`${name}: cue is not the ruku opening\n  cue: ${shown.join(' ')}\n  open: ${opening.slice(0, shown.length).join(' ')}`);
  }

  let prevAyah = ruku.fromAyah;
  let prevPos = 0;
  for (const word of cue.words) {
    if (!word.text.trim()) fail(`${name}: blank cue word at ${word.ayah}:${word.position}`);
    if (word.ayah < ruku.fromAyah || word.ayah > ruku.toAyah) {
      fail(`${name}: cue word ${word.ayah}:${word.position} outside ruku`);
    }
    if (word.ayah < prevAyah || (word.ayah === prevAyah && word.position < prevPos)) {
      fail(`${name}: cue words out of order at ${word.ayah}:${word.position}`);
    }
    if (word.text !== word.word.ar.map((seg) => seg.t).join('').replace(/\u06EB/g, '\u06EC')) {
      fail(`${name}: cue text != word surface at ${word.ayah}:${word.position}`);
    }
    prevAyah = word.ayah;
    prevPos = word.position;
  }

  const exact = shown.join('\0');
  const visual = letters(shown.join(''));
  const exactList = byExact.get(exact) ?? [];
  exactList.push(ruku);
  byExact.set(exact, exactList);
  const visualList = byLetters.get(visual) ?? [];
  visualList.push(ruku);
  byLetters.set(visual, visualList);

  if (count > HIFZ_CUE_MIN_WORDS && opening.length >= count) {
    const shorter = shown.slice(0, count - 1).map(letters).join('\0');
    const clash = cues.some(
      (other) =>
        other.ruku.id !== ruku.id &&
        other.opening.slice(0, count - 1).map(letters).join('\0') === shorter,
    );
    if (!clash) fail(`${name}: ${count} words but ${count - 1} was already unique`);
  }
}

for (const [key, group] of byExact) {
  if (group.length < 2) continue;
  fail(
    `exact collision (${group.length}): ${group.map(label).join(' | ')}\n  ${key.replace(/\0/g, ' ')}`,
  );
}

for (const [key, group] of byLetters) {
  if (group.length < 2) continue;
  if (new Set(group.map((ruku) => ruku.id)).size < 2) continue;
  const exactAlso =
    new Set(group.map((ruku) => getRukuCue(ruku).words.map((word) => word.text).join('\0'))).size === 1;
  if (exactAlso) continue;
  fail(`visual collision (${group.length}): ${group.map(label).join(' | ')}\n  ${key}`);
}

const falaq = cues.find((row) => row.ruku.surah === 113);
const nas = cues.find((row) => row.ruku.surah === 114);
if (!falaq || !nas) fail('missing Falaq or Nas');
else if (falaq.cue.text === nas.cue.text) fail(`Falaq and Nas still share: ${falaq.cue.text}`);

const lengths = cues.map((row) => row.cue.words.length).sort((a, b) => a - b);
const hist = new Map<number, number>();
for (const n of lengths) hist.set(n, (hist.get(n) ?? 0) + 1);

console.log(`rukus ${RUKUS.length}`);
console.log(`cue length min=${lengths[0]} median=${lengths[Math.floor(lengths.length / 2)]} max=${lengths[lengths.length - 1]}`);
console.log(
  'length histogram',
  [...hist.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([n, c]) => `${n}:${c}`)
    .join(' '),
);
console.log(`Falaq: ${falaq?.count}w  ${falaq?.cue.text}`);
console.log(`Nas:   ${nas?.count}w  ${nas?.cue.text}`);

const longest = [...cues].sort((a, b) => b.count - a.count).slice(0, 8);
console.log('longest cues');
for (const row of longest) console.log(`  ${row.count}w  ${label(row.ruku)}`);

if (failures.length) {
  console.error(`\nFAILED ${failures.length}`);
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log('\nOK: every cue is a unique ruku opening');
