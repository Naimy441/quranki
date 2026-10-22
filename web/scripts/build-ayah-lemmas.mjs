// Builds public/data/ayah-lemmas.json from the mobile app's src/data/quran-word-lemmas.json:
// `{ "<surah>": [[...lemma ids per word] per ayah] }`. Opening letters are already omitted there,
// so coverage and Hifz unlocks match the mobile app exactly.
// Usage: node scripts/build-ayah-lemmas.mjs
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = JSON.parse(fs.readFileSync(path.join(root, '../src/data/quran-word-lemmas.json'), 'utf8'));
const out = {};
for (const s of src.surahs) {
  const ayahs = [];
  for (const a of s.ayahs) ayahs[a.ayah - 1] = a.words.map((w) => w.lemmaIds);
  out[s.surah] = ayahs;
}
fs.writeFileSync(path.join(root, 'public/data/ayah-lemmas.json'), JSON.stringify(out));
console.log('ayah-lemmas.json', src.metadata);
