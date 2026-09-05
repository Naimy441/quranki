#!/usr/bin/env node
/**
 * Packs QUL 956 (Husary Mujawwad gapped) word timestamps into one lazy JSON
 * per surah so ayah playback can highlight words without shipping the 2 MB catalog.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'src/data/ayah-recitation-mahmoud-khalil-al-husary-mujawwad-hafs-956.json');
const OUT_DIR = path.join(ROOT, 'src/data/quran/wbw-timings');
const LOADER = path.join(ROOT, 'src/data/quran/wbw-timings-loader.ts');

const catalog = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
const bySurah = new Map();
for (const [key, row] of Object.entries(catalog)) {
  const [surah, ayah] = key.split(':').map(Number);
  if (!bySurah.has(surah)) bySurah.set(surah, []);
  bySurah.get(surah)[ayah - 1] = row.segments ?? [];
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const requires = [];
for (let surah = 1; surah <= 114; surah++) {
  const file = `${String(surah).padStart(3, '0')}.json`;
  fs.writeFileSync(path.join(OUT_DIR, file), JSON.stringify(bySurah.get(surah) ?? []));
  requires.push(`  ${surah}: () => require('./wbw-timings/${file}') as WordTiming[][],`);
}

fs.writeFileSync(
  LOADER,
  `import type { WordTiming } from '@/lib/recitation';

const loaders: Record<number, () => WordTiming[][]> = {
${requires.join('\n')}
};

const cache = new Map<number, WordTiming[][]>();

/** Gapped Husary word timestamps for one surah, 0-indexed by ayah. */
export function loadGappedWordTimings(surahNumber: number): WordTiming[][] {
  const cached = cache.get(surahNumber);
  if (cached) return cached;
  const loader = loaders[surahNumber];
  if (!loader) return [];
  const timings = loader();
  cache.set(surahNumber, timings);
  return timings;
}
`,
);
console.log(`Wrote ${bySurah.size} surah timing files`);
