// Splits public/data/audio/<reciter>.json (every ayah) into public/data/audio/<reciter>/<surah>.json
// so the reader downloads timing data for one surah at a time.
// Usage: node scripts/split-audio-data.mjs
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../public/data/audio');
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const key = file.replace(/\.json$/, '');
  const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const bySurah = {};
  for (const [ref, entry] of Object.entries(data)) {
    const s = Number(ref.split(':')[0]);
    (bySurah[s] ??= {})[ref.split(':')[1]] = { u: entry.audio_url, s: entry.segments ?? [] };
  }
  fs.mkdirSync(path.join(dir, key), { recursive: true });
  for (const [s, ayahs] of Object.entries(bySurah)) {
    fs.writeFileSync(path.join(dir, key, `${s}.json`), JSON.stringify(ayahs));
  }
  fs.rmSync(path.join(dir, file));
  console.log(key, Object.keys(bySurah).length, 'surahs');
}
