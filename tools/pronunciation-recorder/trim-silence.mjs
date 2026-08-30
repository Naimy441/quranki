#!/usr/bin/env node

/**
 * Removes excess leading/trailing silence from pronunciation recordings while preserving a small
 * natural pause. Output is compact mono Opus (`.webm`) at 32 kbps.
 *
 * Default: writes copies to `recordings/trimmed/`.
 * Use `--replace` only after reviewing those copies to overwrite the originals.
 * Optional: `--padding=0.4` keeps 0.4 seconds at each edge (maximum recommended: 0.5).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readdir, rename, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const RECORDINGS = join(ROOT, 'recordings');
const replace = process.argv.includes('--replace');
const refresh = process.argv.includes('--refresh');
const paddingArgument = process.argv.find((argument) => argument.startsWith('--padding='));
const limitArgument = process.argv.find((argument) => argument.startsWith('--limit='));
const padding = Number(paddingArgument?.slice('--padding='.length) ?? 0.4);
const limit = Number(limitArgument?.slice('--limit='.length) ?? Infinity);

if (!Number.isFinite(padding) || padding < 0 || padding > 0.5) {
  throw new Error('Padding must be between 0 and 0.5 seconds. Example: --padding=0.4');
}
if (limitArgument && (!Number.isFinite(limit) || limit < 1)) throw new Error('Limit must be a positive number. Example: --limit=1');
if (!existsSync(RECORDINGS)) throw new Error('No recordings directory found.');

const outputDirectory = replace ? RECORDINGS : join(RECORDINGS, 'trimmed');
const clips = (await readdir(RECORDINGS)).filter((file) => file.endsWith('.webm')).sort().slice(0, limit);
await mkdir(outputDirectory, { recursive: true });

const SILENCE_FILTER = 'silencedetect=n=-42dB:d=0.15';

function audioDuration(input) {
  const containerDuration = Number(execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', input,
  ], { encoding: 'utf8' }).trim());
  if (Number.isFinite(containerDuration)) return containerDuration;

  // Browser-recorded WebM commonly has no container duration. Its final packet timestamp is
  // authoritative, so use that instead of abandoning the whole batch.
  const packets = execFileSync('ffprobe', [
    '-v', 'error', '-select_streams', 'a:0', '-show_entries', 'packet=pts_time,duration_time', '-of', 'csv=p=0', input,
  ], { encoding: 'utf8' }).trim().split('\n').reverse();
  for (const packet of packets) {
    const [pts, packetDuration] = packet.split(',').map(Number);
    if (Number.isFinite(pts) && Number.isFinite(packetDuration)) return pts + packetDuration;
  }
  return null;
}

/** Finds only silence that touches the start or end of the file. Interior pauses are never cut. */
function trimBounds(input, duration) {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-i', input, '-af', SILENCE_FILTER, '-f', 'null', '-'], { encoding: 'utf8' });
  const log = `${result.stdout}\n${result.stderr}`;
  const events = [];
  for (const line of log.split('\n')) {
    const start = line.match(/silence_start: ([\d.]+)/);
    if (start) events.push({ start: Number(start[1]), end: undefined });
    const end = line.match(/silence_end: ([\d.]+)/);
    if (end && events.length) events.at(-1).end = Number(end[1]);
  }
  const leading = events.find((event) => event.start <= 0.02 && event.end !== undefined);
  const trailing = [...events].reverse().find((event) => event.end === undefined || event.end >= duration - 0.02);
  const start = leading ? Math.max(0, leading.end - padding) : 0;
  const end = trailing ? Math.min(duration, trailing.start + padding) : duration;
  return end > start + 0.05 ? { start, end } : { start: 0, end: duration };
}

console.log(`Trimming ${clips.length} clips with ${padding}s edge padding → ${outputDirectory}`);
for (const [index, clip] of clips.entries()) {
  const input = join(RECORDINGS, clip);
  const output = join(outputDirectory, clip);
  if (!replace && !refresh && existsSync(output)) continue;
  const temporary = `${output}.tmp.webm`;
  await rm(temporary, { force: true });
  const duration = audioDuration(input);
  const bounds = duration === null ? null : trimBounds(input, duration);
  execFileSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', input,
    '-map', '0:a:0', '-vn', '-af', bounds ? `atrim=start=${bounds.start}:end=${bounds.end},asetpts=PTS-STARTPTS` : 'anull',
    '-ac', '1', '-c:a', 'libopus', '-b:a', '32k', '-vbr', 'on', '-application', 'voip',
    temporary,
  ], { stdio: 'inherit' });
  await rename(temporary, output);
  if ((index + 1) % 50 === 0 || index + 1 === clips.length) console.log(`${index + 1}/${clips.length}`);
}

console.log(replace ? 'Done. Originals were replaced.' : 'Done. Review recordings/trimmed, then rerun with --replace if you want to replace originals.');
