// Generates SCRIPT.md (voiceover script with timestamps) and voiceover.srt from src/scenes.ts.
import fs from 'node:fs';
import path from 'node:path';

import voiceover from '../src/data/voiceover.json';
import { SCENES, TOTAL_SECONDS, sentences } from '../src/scenes';

const root = path.resolve(__dirname, '..');
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const srtTime = (s: number) => {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
};
const words = (t: string) => t.split(/\s+/).filter(Boolean).length;

let md = `# Quranki product video - voiceover script\n\n`;
md += `Runtime ${mmss(TOTAL_SECONDS)}. ${SCENES.reduce((n, s) => n + words(s.vo), 0)} words of narration, paced at roughly 130 to 140 words a minute with room to breathe.\n\n`;
md += `Each block starts at the timestamp shown. Begin each line about half a second after the cut, and let the last sentence of a block finish before the next timestamp. The picture holds a beat after every line, so you can slow down rather than rush.\n\n`;
md += `| # | Time | Section | Words |\n|---|---|---|---|\n`;
let t = 0;
SCENES.forEach((s, i) => {
  md += `| ${i + 1} | ${mmss(t)} - ${mmss(t + s.seconds)} | ${s.title} | ${words(s.vo)} |\n`;
  t += s.seconds;
});
md += `\n---\n\n`;
t = 0;
let srt = '';
let n = 1;
SCENES.forEach((s, i) => {
  md += `## ${i + 1}. ${s.title}  \`${mmss(t)} - ${mmss(t + s.seconds)}\`\n\n`;
  md += `**On screen:** ${s.visual}\n\n`;
  md += `> ${s.vo}\n\n`;
  t += s.seconds;
});
// Captions follow the generated narration (scripts/voiceover.ts) when it exists, otherwise each
// scene's sentences are spread across it in proportion to length.
if (voiceover.length) {
  for (const line of voiceover) srt += `${n++}\n${srtTime(line.start)} --> ${srtTime(line.end)}\n${line.text}\n\n`;
} else {
  t = 0;
  for (const s of SCENES) {
    const total = words(s.vo);
    const span = s.seconds - 1.2;
    let c = t + 0.5;
    for (const sentence of sentences(s.vo)) {
      const d = (words(sentence) / total) * span;
      srt += `${n++}\n${srtTime(c)} --> ${srtTime(c + d - 0.1)}\n${sentence}\n\n`;
      c += d;
    }
    t += s.seconds;
  }
}
md += `---\n\nPronunciation notes: Quranki (kur-AN-kee), ruku (roo-KOO), hifz (hifz), FSRS (say the letters, F-S-R-S), Surah Yusuf (soo-rah YOO-suf), Al-Kahf (al-KAHF).\n`;

fs.writeFileSync(path.join(root, 'SCRIPT.md'), md);
fs.writeFileSync(path.join(root, 'out', 'voiceover-guide.srt'), srt);
console.log('wrote SCRIPT.md and out/voiceover-guide.srt');
