// Generates the narration with ElevenLabs, one clip per sentence, and lines each clip up with its
// on-screen cue from src/scenes.ts. Writes public/vo/*.mp3 and src/data/voiceover.json.
// Run with: npx tsx --env-file=.env scripts/voiceover.ts   (add --force to regenerate every clip)
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

import { FPS, SCENES, sentences } from '../src/scenes';

const VOICE = 'enzbGixeo55iqn1QxbbC'; // Jon
const MODEL = 'eleven_v4';
const SETTINGS = { stability: 0.5, similarityBoost: 0.75 };
/** Silence between two sentences in the same scene, and before the first line after a cut. */
const GAP = 0.3;
const LEAD = 0.5;
/** Speech has to finish this long before the next cut. */
const TAIL = 0.4;

const root = path.resolve(__dirname, '..');
const voDir = path.join(root, 'public', 'vo');
const force = process.argv.includes('--force');

/** Spellings the voice reads more reliably than the written form. */
const spoken = (t: string) => t.replace(/\bFSRS\b/g, 'F-S-R-S').replace(/\bruku revision\b/g, 'roo-koo revision');

interface Clip {
  scene: string;
  index: number;
  text: string;
  src: string;
  /** Where speech starts and ends inside the clip, in seconds. */
  speechStart: number;
  speechEnd: number;
  duration: number;
  hash: string;
}

const client = new ElevenLabsClient();
const lines = SCENES.flatMap((s) => sentences(s.vo).map((text, index) => ({ scene: s, index, text })));

async function clip(i: number): Promise<Clip> {
  const { scene, index, text } = lines[i];
  const name = `${scene.id}-${index}`;
  const previousText = lines.slice(Math.max(0, i - 2), i).map((l) => spoken(l.text)).join(' ') || undefined;
  const nextText = lines[i + 1] ? spoken(lines[i + 1].text) : undefined;
  const hash = crypto
    .createHash('sha1')
    .update(JSON.stringify([VOICE, MODEL, SETTINGS, spoken(text), previousText, nextText]))
    .digest('hex')
    .slice(0, 12);
  const metaPath = path.join(voDir, `${name}.json`);
  if (!force && fs.existsSync(metaPath)) {
    const meta: Clip = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    if (meta.hash === hash) return meta;
  }

  const res = await client.textToSpeech.convertWithTimestamps(VOICE, {
    text: spoken(text),
    modelId: MODEL,
    voiceSettings: SETTINGS,
    outputFormat: 'mp3_44100_128',
    previousText,
    nextText,
    seed: 7,
  });
  const audio = Buffer.from(res.audioBase64, 'base64');
  fs.writeFileSync(path.join(voDir, `${name}.mp3`), audio);
  const a = res.alignment!;
  const spokenIdx = a.characters.map((c, k) => (c.trim() ? k : -1)).filter((k) => k >= 0);
  const meta: Clip = {
    scene: scene.id,
    index,
    text,
    src: `vo/${name}.mp3`,
    speechStart: a.characterStartTimesSeconds[spokenIdx[0]],
    speechEnd: a.characterEndTimesSeconds[spokenIdx[spokenIdx.length - 1]],
    duration: a.characterEndTimesSeconds[a.characterEndTimesSeconds.length - 1],
    hash,
  };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  console.log(`generated ${name}`);
  return meta;
}

async function main() {
  fs.mkdirSync(voDir, { recursive: true });
  const clips: Clip[] = [];
  // Sequential so each request gets the same stitching context and stays under rate limits.
  for (let i = 0; i < lines.length; i += 1) clips.push(await clip(i));

  const timeline: { scene: string; text: string; src: string; from: number; start: number; end: number }[] = [];
  const problems: string[] = [];
  let sceneStart = 0;
  let prevEnd = -Infinity;
  let k = 0;
  for (const scene of SCENES) {
    const sceneEnd = sceneStart + scene.seconds;
    sentences(scene.vo).forEach((_, index) => {
      const c = clips[k++];
      const cue = scene.cues[index];
      const floor = index === 0 ? Math.max(prevEnd + GAP, sceneStart + LEAD) : prevEnd + GAP;
      const start = Math.max(floor, cue === null ? -Infinity : sceneStart + cue / FPS);
      const end = start + (c.speechEnd - c.speechStart);
      const late = cue === null ? 0 : start - (sceneStart + cue / FPS);
      if (late > 0.6) problems.push(`${c.scene}-${index} starts ${late.toFixed(2)}s after its cue`);
      if (end > sceneEnd - TAIL) problems.push(`${c.scene}-${index} runs ${(end - sceneEnd + TAIL).toFixed(2)}s past the end of its scene`);
      // The clip's own leading silence is played before the speech start.
      const from = Math.round((start - c.speechStart) * FPS);
      timeline.push({ scene: c.scene, text: c.text, src: c.src, from, start: +start.toFixed(3), end: +end.toFixed(3) });
      prevEnd = end;
    });
    sceneStart = sceneEnd;
  }

  fs.writeFileSync(path.join(root, 'src', 'data', 'voiceover.json'), JSON.stringify(timeline, null, 2));
  for (const t of timeline) console.log(`${t.start.toFixed(2).padStart(7)} - ${t.end.toFixed(2).padStart(7)}  ${t.scene.padEnd(9)} ${t.text}`);
  console.log(problems.length ? `\n${problems.join('\n')}` : '\nevery line lands on its cue and fits its scene');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
