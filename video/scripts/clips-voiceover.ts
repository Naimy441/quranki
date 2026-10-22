// Generates Jon's lines for the Shorts and the Al-Fatiha video and lays every segment of a track end to
// end: its audio file first, then the line. Writes public/vo-clips/*.mp3 and src/data/clips/<track>-timeline.json.
// Run with: npx tsx --env-file=.env scripts/clips-voiceover.ts [topten|rahma|fatiha ...] [--force]
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

import { TRACKS, type Seg, type TrackId } from '../src/clips/tracks';

const VOICE = 'enzbGixeo55iqn1QxbbC'; // Jon
const MODEL = 'eleven_v4';
const SETTINGS = { stability: 0.5, similarityBoost: 0.75 };
/** Shorts run a touch faster than the long video. */
const SPEED: Record<TrackId, number> = { topten: 1.1, rahma: 1.08, fatiha: 1 };
const GAP = 0.25;
/** Silence before the first segment, and between a segment's audio and its line. */
const LEAD = 0.25;
const AFTER_PLAY = 0.2;

const root = path.resolve(__dirname, '..');
const pub = path.join(root, 'public');
const voDir = path.join(pub, 'vo-clips');
const force = process.argv.includes('--force');
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('--')) as TrackId[];

interface Line {
  src: string;
  speechStart: number;
  speechEnd: number;
  /** Word timings relative to the clip. */
  words: { w: string; s: number; e: number }[];
  hash: string;
}

const client = new ElevenLabsClient();
const spokenOf = (s: Seg) => s.spoken ?? s.say!;

function duration(file: string): number {
  return +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim();
}

/** Where sound starts and stops in a file, so recited words don't carry their padding. */
function soundBounds(file: string): [number, number] {
  const log = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'silencedetect=n=-40dB:d=0.08', '-f', 'null', '-']).stderr.toString();
  const total = duration(file);
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  const head = starts[0] !== undefined && starts[0] < 0.01 && ends[0] !== undefined ? ends[0] : 0;
  const lastStart = starts[starts.length - 1];
  const tail = lastStart !== undefined && lastStart > head && (ends.length < starts.length || ends[ends.length - 1] >= total - 0.02) ? lastStart : total;
  return [Math.max(0, head - 0.03), Math.min(total, tail + 0.05)];
}

async function line(track: TrackId, segs: Seg[], i: number): Promise<Line> {
  const seg = segs[i];
  const text = spokenOf(seg);
  const said = segs.filter((s) => s.say);
  const k = said.indexOf(seg);
  const previousText = said.slice(Math.max(0, k - 2), k).map(spokenOf).join(' ') || undefined;
  const nextText = said[k + 1] ? spokenOf(said[k + 1]) : undefined;
  const hash = crypto.createHash('sha1').update(JSON.stringify([VOICE, MODEL, SETTINGS, SPEED[track], text, previousText, nextText])).digest('hex').slice(0, 12);
  const name = `${track}-${seg.id.replace(/:/g, '-')}`;
  const metaPath = path.join(voDir, `${name}.json`);
  if (!force && fs.existsSync(metaPath)) {
    const meta: Line = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    if (meta.hash === hash) return meta;
  }
  const res = await client.textToSpeech.convertWithTimestamps(VOICE, {
    text,
    modelId: MODEL,
    voiceSettings: { ...SETTINGS, speed: SPEED[track] },
    outputFormat: 'mp3_44100_128',
    previousText,
    nextText,
    seed: 7,
  });
  fs.writeFileSync(path.join(voDir, `${name}.mp3`), Buffer.from(res.audioBase64, 'base64'));
  const a = res.alignment!;
  // Group characters into words for captions.
  const words: Line['words'] = [];
  let cur: Line['words'][number] | null = null;
  a.characters.forEach((c, j) => {
    if (c.trim()) {
      if (!cur) cur = { w: '', s: a.characterStartTimesSeconds[j], e: 0 };
      cur.w += c;
      cur.e = a.characterEndTimesSeconds[j];
    } else if (cur) {
      words.push(cur);
      cur = null;
    }
  });
  if (cur) words.push(cur);
  const meta: Line = { src: `vo-clips/${name}.mp3`, speechStart: words[0].s, speechEnd: words[words.length - 1].e, words, hash };
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  console.log(`generated ${name}`);
  return meta;
}

/** Caption words come from the written line, not the phonetic spelling, matched one to one when counts agree. */
function captionWords(seg: Seg, l: Line) {
  const written = seg.say!.split(/\s+/).filter(Boolean);
  if (written.length === l.words.length) return l.words.map((w, i) => ({ ...w, w: written[i] }));
  // Spread the written words over the spoken span by character length.
  const total = written.reduce((n, w) => n + w.length, 0);
  let t = l.speechStart;
  const span = l.speechEnd - l.speechStart;
  return written.map((w) => {
    const d = (w.length / total) * span;
    const out = { w, s: t, e: t + d };
    t += d;
    return out;
  });
}

async function build(track: TrackId) {
  const segs = TRACKS[track];
  const timeline: Record<string, { start: number; end: number; sayStart?: number; sayEnd?: number; say?: string }> = {};
  const audio: { src: string; at: number; trim?: number; length: number }[] = [];
  const captions: { id: string; words: { w: string; s: number; e: number }[] }[] = [];
  let t = LEAD;
  for (let i = 0; i < segs.length; i += 1) {
    const seg = segs[i];
    const start = t;
    let cursor = t;
    if (seg.play) {
      const file = path.join(pub, seg.play);
      const [a, b] = seg.clip ?? (seg.play.startsWith('wbw/') ? soundBounds(file) : [0, duration(file)]);
      audio.push({ src: seg.play, at: cursor, trim: a, length: b - a });
      cursor += b - a;
      if (seg.say) cursor += AFTER_PLAY;
    }
    const entry: (typeof timeline)[string] = { start, end: cursor };
    if (seg.say) {
      const l = await line(track, segs, i);
      const at = cursor;
      audio.push({ src: l.src, at: at - l.speechStart, length: l.speechEnd + 0.15 });
      entry.sayStart = at;
      entry.sayEnd = at + (l.speechEnd - l.speechStart);
      entry.say = seg.say;
      captions.push({ id: seg.id, words: captionWords(seg, l).map((w) => ({ w: w.w, s: +(at + w.s - l.speechStart).toFixed(3), e: +(at + w.e - l.speechStart).toFixed(3) })) });
      cursor = entry.sayEnd;
    }
    entry.end = Math.max(cursor, start + (seg.hold ?? 0));
    timeline[seg.id] = entry;
    t = entry.end + (seg.gap ?? GAP);
  }
  const out = { duration: +t.toFixed(3), timeline, audio, captions };
  fs.writeFileSync(path.join(root, 'src', 'data', 'clips', `${track}-timeline.json`), JSON.stringify(out, null, 1));
  console.log(`${track}: ${t.toFixed(1)}s, ${Object.keys(timeline).length} segments`);
}

async function main() {
  fs.mkdirSync(voDir, { recursive: true });
  for (const track of wanted.length ? wanted : (Object.keys(TRACKS) as TrackId[])) await build(track);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
