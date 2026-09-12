/**
 * Writes src/data/ruku-cue-counts.json so the first hifz card does not scan every
 * ruku (and parse every surah JSON) to find a unique opening.
 *
 * Run: node scripts/build-ruku-cue-counts.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIN_WORDS = 3;
const IGNORABLE = /[\u0640\u064B-\u065F\u0670\u06D6-\u06ED\u200B-\u200F\uFEFF]/g;

const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/quran-metadata-ruku.json'), 'utf8'));

function parseVerseKey(key) {
  const [surah, ayah] = key.split(':').map(Number);
  return { surah, ayah };
}

function parseRange(spec) {
  const [from, to] = spec.split('-').map(Number);
  return [from, to ?? from];
}

const rukus = Object.values(raw)
  .map((entry) => {
    const mapping = Object.entries(entry.verse_mapping)[0];
    const fromKey = parseVerseKey(entry.first_verse_key);
    const toKey = parseVerseKey(entry.last_verse_key);
    const surah = mapping ? Number(mapping[0]) : fromKey.surah;
    const [fromAyah, toAyah] = mapping ? parseRange(mapping[1]) : [fromKey.ayah, toKey.ayah];
    return {
      id: entry.ruku_number,
      surah,
      fromAyah,
      toAyah,
    };
  })
  .sort((a, b) => a.id - b.id);

const surahCache = new Map();
function loadSurah(surahNumber) {
  const cached = surahCache.get(surahNumber);
  if (cached) return cached;
  const file = path.join(ROOT, 'src/data/quran/surahs', `${String(surahNumber).padStart(3, '0')}.json`);
  const ayahs = JSON.parse(fs.readFileSync(file, 'utf8'));
  surahCache.set(surahNumber, ayahs);
  return ayahs;
}

function wordText(word) {
  return word.ar.map((segment) => segment.t).join('').replace(/\u06EB/g, '\u06EC');
}

function collect(ruku, limit) {
  const ayahs = loadSurah(ruku.surah);
  const words = [];
  for (let ayah = ruku.fromAyah; ayah <= ruku.toAyah && words.length < limit; ayah += 1) {
    const entry = ayahs[ayah - 1];
    if (!entry) continue;
    for (const word of entry.w) {
      words.push(wordText(word).replace(IGNORABLE, ''));
      if (words.length >= limit) return words;
    }
  }
  return words;
}

function cueKey(words) {
  return words.join('\0');
}

function collides(ruku, count, mine) {
  return rukus.some((other) => {
    if (other.id === ruku.id) return false;
    return cueKey(collect(other, count)) === mine;
  });
}

const counts = {};
for (const ruku of rukus) {
  const first = collect(ruku, MIN_WORDS);
  let count = first.length;
  if (count === 0) {
    counts[ruku.id] = 0;
    continue;
  }
  while (true) {
    const words = collect(ruku, count);
    if (!collides(ruku, count, cueKey(words))) break;
    if (words.length < count) break;
    count += 1;
  }
  counts[ruku.id] = count;
}

const dest = path.join(ROOT, 'src/data/ruku-cue-counts.json');
fs.writeFileSync(dest, `${JSON.stringify(counts)}\n`);
console.log(`Wrote ${Object.keys(counts).length} cue counts to ${path.relative(ROOT, dest)}`);
