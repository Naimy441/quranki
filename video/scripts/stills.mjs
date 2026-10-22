// Renders review stills: node scripts/stills.mjs <outDir> <frame> [frame...]
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';

const [outDir, ...frames] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
const composition = await selectComposition({ serveUrl, id: 'Quranki' });
for (const f of frames) {
  await renderStill({ serveUrl, composition, frame: Number(f), output: path.join(outDir, `f${String(f).padStart(5, '0')}.png`), scale: 0.5 });
  console.log('still', f);
}
