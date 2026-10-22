/**
 * Plays every cue word shown on a hifz card in the learner's selected reciter, cutting at the
 * last shown word (chaining ayah clips when the cue crosses an ayah). Web port of
 * `src/lib/hifz-cue-audio.ts`.
 */
import { create } from 'zustand';

import { requireOnline } from '@/lib/offline';
import { wordAtTimeMs, type WordTiming } from '@/lib/recitation';
import { DEFAULT_RECITER_KEY, fetchSurahAudio, findReciterOption, type AyahAudioData } from '@/lib/reciters';
import { loadSurahAyahs } from '@/lib/quran-reader';
import { getRukuCue, type Ruku, type RukuCueWord } from '@/lib/ruku';
import { stopWordAudio } from '@/lib/word-audio';
import { useProgressStore } from '@/store/progress-store';
import { stopRecitation } from '@/store/recitation-store';

export const useHifzCuePlayback = create<{ playing: boolean; ayah: number; position: number }>(() => ({
  playing: false,
  ayah: 0,
  position: 0,
}));

let player: HTMLAudioElement | null = null;
let requestSeq = 0;
let onFinished: (() => void) | null = null;
let frame = 0;

function reset(): void {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  useHifzCuePlayback.setState({ playing: false, ayah: 0, position: 0 });
}

function activeReciterKey(): string {
  const key = useProgressStore.getState().settings.selectedReciterKey;
  return findReciterOption(key)?.key ?? DEFAULT_RECITER_KEY;
}

function groupCueByAyah(words: RukuCueWord[]): { ayah: number; words: RukuCueWord[] }[] {
  const groups: { ayah: number; words: RukuCueWord[] }[] = [];
  for (const word of words) {
    const last = groups[groups.length - 1];
    if (last && last.ayah === word.ayah) last.words.push(word);
    else groups.push({ ayah: word.ayah, words: [word] });
  }
  return groups;
}

/** Same cut rule as mobile: play through split final stamps, else stop where the next word starts. */
function clipEndSeconds(entry: AyahAudioData, lastPosition: number, ayahWordCount: number): number {
  const segments = entry.segments ?? [];
  if (!segments.length) return 0;
  if (lastPosition >= ayahWordCount) return (segments[segments.length - 1][2] + 200) / 1000;
  const following = segments.find((segment) => segment[0] > lastPosition);
  if (following) return following[1] / 1000;
  const lastHit = [...segments].reverse().find((segment) => segment[0] <= lastPosition);
  return lastHit ? (lastHit[2] + 240) / 1000 : 0;
}

function playClip(
  url: string,
  cutAt: number,
  ayah: number,
  segments: WordTiming[],
  cuePositions: Set<number>,
  seq: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    player ??= new Audio();
    const audio = player;
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      audio.onended = null;
      audio.onerror = null;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      resolve(ok);
    };
    const lastCue = Math.max(0, ...cuePositions);
    const loop = () => {
      frame = 0;
      if (seq !== requestSeq) return finish(false);
      const t = audio.currentTime;
      const word = wordAtTimeMs(segments, t * 1000) || segments[0]?.[0] || 0;
      const position = cuePositions.has(word) ? word : word > lastCue ? lastCue : 0;
      if (position) useHifzCuePlayback.setState({ playing: true, ayah, position });
      if (cutAt > 0 && t >= cutAt) {
        audio.pause();
        return finish(true);
      }
      if (!audio.paused) frame = requestAnimationFrame(loop);
    };
    audio.onended = () => finish(true);
    audio.onerror = () => finish(false);
    audio.src = url;
    audio.currentTime = 0;
    audio
      .play()
      .then(() => {
        frame = requestAnimationFrame(loop);
      })
      .catch(() => finish(false));
  });
}

/** Opening clip covering every word shown on the card, in the selected reciter. */
export async function playRukuCue(ruku: Ruku, finished?: () => void): Promise<boolean> {
  const seq = ++requestSeq;
  onFinished = finished ?? null;
  stopRecitation();
  stopWordAudio();
  const fail = () => {
    if (seq !== requestSeq) return false;
    const cb = onFinished;
    onFinished = null;
    reset();
    cb?.();
    return false;
  };
  try {
    if (!(await requireOnline())) return fail();
    const [ayahs, dataset] = await Promise.all([loadSurahAyahs(ruku.surah), fetchSurahAudio(activeReciterKey(), ruku.surah)]);
    if (seq !== requestSeq) return false;
    const cue = getRukuCue(ruku);
    if (cue.words.length === 0) return fail();

    for (const group of groupCueByAyah(cue.words)) {
      if (seq !== requestSeq) return false;
      const entry = dataset[String(group.ayah)];
      if (!entry?.audio_url) return fail();
      const last = group.words[group.words.length - 1];
      const ayahWordCount = ayahs[group.ayah - 1]?.w.length ?? last.position;
      useHifzCuePlayback.setState({ playing: true, ayah: group.ayah, position: group.words[0].position });
      const ok = await playClip(
        entry.audio_url,
        clipEndSeconds(entry, last.position, ayahWordCount),
        group.ayah,
        entry.segments,
        new Set(group.words.map((w) => w.position)),
        seq,
      );
      if (!ok) return seq === requestSeq ? fail() : false;
    }
    if (seq !== requestSeq) return false;
    const cb = onFinished;
    onFinished = null;
    reset();
    cb?.();
    return true;
  } catch {
    return fail();
  }
}

export function stopRukuCue(): void {
  requestSeq += 1;
  player?.pause();
  const cb = onFinished;
  onFinished = null;
  reset();
  cb?.();
}
