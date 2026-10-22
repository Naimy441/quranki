// Downloads the optional translations the mobile app streams from Firebase Storage and splits
// them into public/data/translations/<key>/<surah>.json. The bucket sends no CORS headers, so
// browsers cannot read it directly; serving the files ourselves also puts them on the CDN.
// Usage: node scripts/fetch-translations.mjs
import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

const BUCKET = 'quranki-506915.firebasestorage.app';
const KEYS = ['haleem', 'hilali-khan', 'pickthall', 'yusuf-ali'];
const out = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../public/data/translations');

for (const key of KEYS) {
  const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(`translation-data/${key}.json.gz`)}?alt=media`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${key}: HTTP ${res.status}`);
  const data = JSON.parse(gunzipSync(Buffer.from(await res.arrayBuffer())).toString('utf8'));
  const bySurah = {};
  for (const [ref, parts] of Object.entries(data)) {
    const [s, a] = ref.split(':');
    (bySurah[s] ??= {})[a] = parts;
  }
  fs.mkdirSync(path.join(out, key), { recursive: true });
  for (const [s, ayahs] of Object.entries(bySurah)) fs.writeFileSync(path.join(out, key, `${s}.json`), JSON.stringify(ayahs));
  console.log(key, Object.keys(data).length, 'ayahs');
}
