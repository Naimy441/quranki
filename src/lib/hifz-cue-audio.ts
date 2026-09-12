/**
 * Plays every cue word shown on a hifz card, in the learner's selected reciter. Cuts at the
 * last shown word (chaining ayah files when the cue crosses an ayah). Separate from the full
 * recitation player so the card front can speak without opening the reader chrome.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { create } from 'zustand';

import { notifyIfOffline, requireOnline } from '@/lib/offline';
import { getCachedReciterAyahUri, getReciterAyahPlaybackUri, isAbortError } from '@/lib/recitation-cache';
import { wordAtTimeMs, type WordTiming } from '@/lib/recitation';
import { downloadReciterDataset, getAyahEntry, isReciterDatasetDownloaded, type AyahRecitationEntry } from '@/lib/reciter-dataset';
import { DEFAULT_RECITER_KEY, findReciterOption } from '@/lib/reciters';
import { getSurahAyahs } from '@/lib/quran-reader';
import { getRukuCue, type Ruku, type RukuCueWord } from '@/lib/ruku';
import { stopWordAudio } from '@/lib/word-audio';
import { useProgressStore } from '@/store/progress-store';
import { stopRecitation } from '@/store/recitation-store';

const READY_TIMEOUT_MS = 6000;

let player: AudioPlayer | null = null;
let audioModeReady = false;
let requestSeq = 0;
let onFinished: (() => void) | null = null;
let onFailed: (() => void) | null = null;
let cutAtSeconds = 0;
let sawClipStart = false;
let ignoreFinishUntil = 0;
let clipWaiter: ((ok: boolean) => void) | null = null;
let activeAyah = 0;
let activeSegments: WordTiming[] = [];
let activeCuePositions = new Set<number>();
let playerOp: Promise<void> = Promise.resolve();

export const useHifzCuePlayback = create<{
  playing: boolean;
  ayah: number;
  position: number;
}>(() => ({
  playing: false,
  ayah: 0,
  position: 0,
}));

function resetCuePlayback() {
  activeAyah = 0;
  activeSegments = [];
  activeCuePositions = new Set();
  cutAtSeconds = 0;
  sawClipStart = false;
  useHifzCuePlayback.setState({ playing: false, ayah: 0, position: 0 });
}

function runPlayerOp<T>(work: () => Promise<T>): Promise<T> {
  const run = playerOp.then(work, work);
  playerOp = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function getPlayer(): Promise<AudioPlayer> {
  if (!audioModeReady) {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'doNotMix',
    });
    audioModeReady = true;
  }
  if (!player) {
    player = createAudioPlayer(null, { updateInterval: 50, keepAudioSessionActive: true });
    player.addListener('playbackStatusUpdate', onPlaybackStatus);
  }
  return player;
}

function waitForReady(instance: AudioPlayer, seq: number): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      sub.remove();
      resolve(ok);
    };
    const timer = setTimeout(() => finish(seq === requestSeq && instance.isLoaded), READY_TIMEOUT_MS);
    const sub = instance.addListener('playbackStatusUpdate', (status: AudioStatus) => {
      if (seq !== requestSeq) {
        finish(false);
        return;
      }
      if (status.error) {
        finish(false);
        return;
      }
      if (status.isLoaded && !status.isBuffering) finish(true);
    });
  });
}

function resolveClip(ok: boolean) {
  const wait = clipWaiter;
  clipWaiter = null;
  wait?.(ok);
}

function finishOk() {
  const finished = onFinished;
  onFinished = null;
  onFailed = null;
  resetCuePlayback();
  finished?.();
}

function finishFail() {
  const failed = onFailed;
  onFinished = null;
  onFailed = null;
  resetCuePlayback();
  failed?.();
}

function onPlaybackStatus(status: AudioStatus): void {
  if (status.error) {
    resolveClip(false);
    finishFail();
    return;
  }
  if (!status.isLoaded) return;

  if (clipWaiter && status.playing && activeSegments.length) {
    const word =
      wordAtTimeMs(activeSegments, status.currentTime * 1000) || activeSegments[0]?.[0] || 0;
    const lastCue = Math.max(0, ...activeCuePositions);
    const position = activeCuePositions.has(word) ? word : word > lastCue ? lastCue : 0;
    if (position) {
      useHifzCuePlayback.setState({ playing: true, ayah: activeAyah, position });
    }
  }

  if (status.currentTime < 0.12) sawClipStart = true;
  if (cutAtSeconds > 0 && sawClipStart && status.currentTime >= cutAtSeconds) {
    try {
      player?.pause();
    } catch {
      // Player may already be torn down.
    }
    resolveClip(true);
    return;
  }
  if (status.didJustFinish && Date.now() >= ignoreFinishUntil) resolveClip(true);
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

/**
 * Reciter stamps often split the last mushaf word (2:47 العالمين is reader p=11 but
 * Dosari has stamps 11 and 12). If the cue ends on the ayah's last reader word, play
 * through the final stamp so that split is not cut off.
 */
function clipEndSeconds(
  entry: AyahRecitationEntry,
  lastPosition: number,
  ayahWordCount: number,
): number {
  const segments = entry.segments ?? [];
  if (!segments.length) return entry.duration && entry.duration > 0 ? entry.duration : 0;

  const endsOnLastMushafWord = lastPosition >= ayahWordCount;
  if (endsOnLastMushafWord) {
    const lastStamp = segments[segments.length - 1];
    return (lastStamp[2] + 200) / 1000;
  }

  const following = segments.find((segment) => segment[0] > lastPosition);
  if (following) return following[1] / 1000;
  const lastHit = [...segments].reverse().find((segment) => segment[0] <= lastPosition);
  if (lastHit) return (lastHit[2] + 240) / 1000;
  return entry.duration && entry.duration > 0 ? entry.duration : 0;
}

/** Opening clip covering every word shown on the card, in the selected reciter. */
export async function playRukuCue(ruku: Ruku, finished?: () => void): Promise<boolean> {
  const seq = ++requestSeq;
  onFinished = finished ?? null;
  onFailed = finished ?? null;
  cutAtSeconds = 0;
  sawClipStart = false;
  resolveClip(false);
  stopRecitation();
  stopWordAudio();

  try {
    const cue = getRukuCue(ruku);
    if (cue.words.length === 0) {
      finishFail();
      return false;
    }

    const reciterKey = activeReciterKey();
    const needsNetwork =
      !isReciterDatasetDownloaded(reciterKey) ||
      cue.words.some((word) => !getCachedReciterAyahUri(reciterKey, ruku.surah, word.ayah));
    if (needsNetwork && !(await requireOnline())) {
      finishFail();
      return false;
    }

    const dataset = await downloadReciterDataset(reciterKey);
    if (seq !== requestSeq) return false;

    const first = cue.words[0];
    useHifzCuePlayback.setState({ playing: true, ayah: first.ayah, position: first.position });

    for (const group of groupCueByAyah(cue.words)) {
      if (seq !== requestSeq) return false;
      const entry = getAyahEntry(dataset, ruku.surah, group.ayah);
      if (!entry?.audio_url) {
        finishFail();
        return false;
      }

      const last = group.words[group.words.length - 1];
      const ayahWordCount = getSurahAyahs(ruku.surah)[group.ayah - 1]?.w.length ?? last.position;
      activeAyah = group.ayah;
      activeSegments = entry.segments ?? [];
      activeCuePositions = new Set(group.words.map((word) => word.position));
      cutAtSeconds = clipEndSeconds(entry, last.position, ayahWordCount);
      sawClipStart = false;
      useHifzCuePlayback.setState({
        playing: true,
        ayah: group.ayah,
        position: group.words[0].position,
      });

      const uri = await getReciterAyahPlaybackUri(reciterKey, ruku.surah, group.ayah, entry.audio_url);
      if (seq !== requestSeq) return false;

      const clipDone = new Promise<boolean>((resolve) => {
        clipWaiter = resolve;
      });
      const played = await runPlayerOp(async () => {
        if (seq !== requestSeq) return false;
        const instance = await getPlayer();
        if (seq !== requestSeq) return false;
        instance.replace({ uri });
        const ready = await waitForReady(instance, seq);
        if (!ready || seq !== requestSeq) return false;
        await instance.seekTo(0);
        if (seq !== requestSeq) return false;
        ignoreFinishUntil = Date.now() + 280;
        sawClipStart = false;
        instance.play();
        return true;
      });
      if (!played) {
        resolveClip(false);
        if (seq !== requestSeq) return false;
        finishFail();
        return false;
      }

      const clipOk = await clipDone;
      if (!clipOk || seq !== requestSeq) return false;
    }

    if (seq !== requestSeq) return false;
    finishOk();
    return true;
  } catch (error) {
    if (isAbortError(error) || seq !== requestSeq) return false;
    void notifyIfOffline(error);
    finishFail();
    return false;
  }
}

export function stopRukuCue(): void {
  requestSeq += 1;
  cutAtSeconds = 0;
  sawClipStart = false;
  activeAyah = 0;
  activeSegments = [];
  activeCuePositions = new Set();
  resolveClip(false);
  const finished = onFinished;
  onFinished = null;
  onFailed = null;
  resetCuePlayback();
  try {
    player?.pause();
  } catch {
    // Player may already be torn down.
  }
  void runPlayerOp(async () => {
    try {
      player?.pause();
      await player?.seekTo(0);
    } catch {
      // Player may already be torn down.
    }
  });
  finished?.();
}
