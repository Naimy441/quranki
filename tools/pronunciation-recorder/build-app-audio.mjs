import { execFile } from 'node:child_process';
import { access, mkdir, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(ROOT, 'recordings', 'trimmed');
const DESTINATION = join(ROOT, '..', '..', 'assets', 'audio', 'word-pronunciations');
const force = process.argv.includes('--force');

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function convert(input, output) {
  await run('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', input,
    '-map', '0:a:0', '-vn', '-ac', '1', '-c:a', 'aac', '-b:a', '48k', '-movflags', '+faststart', output,
  ]);
}

await mkdir(DESTINATION, { recursive: true });
const files = (await readdir(SOURCE)).filter((file) => file.endsWith('.webm')).sort();
let next = 0;
let completed = 0;
let skipped = 0;

async function worker() {
  while (next < files.length) {
    const file = files[next++];
    const output = join(DESTINATION, `${file.slice(0, -'.webm'.length)}.m4a`);
    if (!force && await exists(output)) {
      skipped += 1;
      continue;
    }
    await convert(join(SOURCE, file), output);
    completed += 1;
    if (completed % 100 === 0 || completed === files.length - skipped) {
      console.log(`${completed + skipped}/${files.length}`);
    }
  }
}

console.log(`Preparing ${files.length} trimmed pronunciations for the app…`);
await Promise.all(Array.from({ length: 4 }, worker));
console.log(`Done: ${completed} converted, ${skipped} already present → ${DESTINATION}`);
