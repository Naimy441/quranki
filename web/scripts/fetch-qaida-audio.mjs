// Downloads every Qaida card's TTS clip from Firebase Storage into public/audio/qaida/<id>.mp3.
// The bucket stores them gzipped and sends no CORS headers, so the web serves its own copies.
// Usage: node scripts/fetch-qaida-audio.mjs
import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import ts from 'typescript';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = fs.readFileSync(path.join(root, 'src/data/qaida.ts'), 'utf8');
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 } }).outputText;
const tmp = path.join(root, 'scripts/.qaida-tmp.mjs');
fs.writeFileSync(tmp, js.replace(/^import .*$/gm, ''));
const { QAIDA_LEVELS } = await import(tmp);
fs.rmSync(tmp);

const ids = QAIDA_LEVELS.flatMap((l) => l.words).filter((w) => w.kind === 'qaida').map((w) => w.id);
const out = path.join(root, 'public/audio/qaida');
fs.mkdirSync(out, { recursive: true });
const fileName = (id) => `${id.replace(/-HA(?=-|$)/g, '-hah')}.mp3`;

let ok = 0;
let missing = 0;
const queue = [...new Set(ids)];
async function worker() {
  while (queue.length) {
    const id = queue.shift();
    const dest = path.join(out, fileName(id));
    if (fs.existsSync(dest)) { ok++; continue; }
    const url = `https://firebasestorage.googleapis.com/v0/b/quranki-506915.firebasestorage.app/o/${encodeURIComponent(`qaida-audio/${fileName(id)}.gz`)}?alt=media`;
    const res = await fetch(url);
    if (!res.ok) { missing++; console.warn('missing', id, res.status); continue; }
    fs.writeFileSync(dest, gunzipSync(Buffer.from(await res.arrayBuffer())));
    ok++;
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
console.log(`qaida clips: ${ok} saved, ${missing} missing, ${ids.length} cards`);
