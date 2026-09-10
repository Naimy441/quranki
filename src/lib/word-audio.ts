import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

/** Quran.com word-by-word MP3s, addressed as SURAH_AYAH_WORD (`001_001_001.mp3`). */
const WORD_AUDIO_CDN = 'https://audio.qurancdn.com/wbw';

const MIN_WORD_BYTES = 800;
const READY_TIMEOUT_MS = 4000;

const inflight = new Map<string, Promise<string>>();

let player: AudioPlayer | null = null;
let audioModeReady = false;
let requestSeq = 0;
let ignoreFinishUntil = 0;
let loadedUri: string | null = null;
let onFinished: (() => void) | null = null;
let onFailed: (() => void) | null = null;
let playerOp: Promise<void> = Promise.resolve();

function pad3(value: number): string {
  return String(value).padStart(3, '0');
}

export function wordAudioKey(surah: number, ayah: number, word: number): string {
  return `${pad3(surah)}_${pad3(ayah)}_${pad3(word)}`;
}

/** Direct playable URL for one Quranic word. */
export function getWordAudioUrl(surah: number, ayah: number, word: number): string {
  return `${WORD_AUDIO_CDN}/${wordAudioKey(surah, ayah, word)}.mp3`;
}

function canCacheToDisk(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function wordDirectory(): Directory {
  const dir = new Directory(Paths.document, 'word-audio', 'wbw');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function wordFile(surah: number, ayah: number, word: number): File {
  return new File(wordDirectory(), `${wordAudioKey(surah, ayah, word)}.mp3`);
}

function isValidAudioFile(file: File): boolean {
  return file.exists && file.size >= MIN_WORD_BYTES;
}

function deleteQuietly(file: File): void {
  try {
    if (file.exists) file.delete();
  } catch {
    // Best-effort cleanup of a partial download.
  }
}

async function downloadWord(
  surah: number,
  ayah: number,
  word: number,
  signal?: AbortSignal,
): Promise<string> {
  const file = wordFile(surah, ayah, word);
  if (isValidAudioFile(file)) return file.uri;

  const downloaded = await File.downloadFileAsync(getWordAudioUrl(surah, ayah, word), file, {
    idempotent: true,
    signal,
  });
  if (!isValidAudioFile(downloaded)) {
    deleteQuietly(downloaded);
    throw new Error('Downloaded word audio was empty');
  }
  return downloaded.uri;
}

async function getWordPlaybackUri(
  surah: number,
  ayah: number,
  word: number,
  signal?: AbortSignal,
): Promise<string> {
  if (!canCacheToDisk()) return getWordAudioUrl(surah, ayah, word);

  const cached = wordFile(surah, ayah, word);
  if (isValidAudioFile(cached)) return cached.uri;

  const key = wordAudioKey(surah, ayah, word);
  const pending = inflight.get(key);
  if (pending) return pending;

  const request = downloadWord(surah, ayah, word, signal).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, request);
  return request;
}

/** Warm the on-disk cache so the next tap does not hit the network. */
export function prefetchWordAudio(surah: number, ayah: number, word: number): void {
  if (!canCacheToDisk()) return;
  void getWordPlaybackUri(surah, ayah, word).catch(() => {
    // Prefetch is best-effort; play will retry.
  });
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
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
    audioModeReady = true;
  }
  if (!player) {
    // Keep the session up after a short clip ends - otherwise the next card's first
    // `play()` is ignored on iOS and only the second tap is audible.
    player = createAudioPlayer(null, { updateInterval: 80, keepAudioSessionActive: true });
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

function onPlaybackStatus(status: AudioStatus): void {
  if (status.error) {
    const failed = onFailed;
    onFailed = null;
    onFinished = null;
    failed?.();
    return;
  }
  if (Date.now() < ignoreFinishUntil) return;
  if (!status.didJustFinish) return;
  const finished = onFinished;
  onFinished = null;
  onFailed = null;
  finished?.();
}

/** Plays one word. Resolves `true` once playback has been started. */
export async function playWordAudio(
  surah: number,
  ayah: number,
  word: number,
  listeners?: { onFinished?: () => void; onFailed?: () => void },
): Promise<boolean> {
  const seq = ++requestSeq;
  // Ignore the outgoing clip's `didJustFinish` before swapping listeners, or a replace
  // would fire the new card's `onFinished` and clear the speaking state immediately.
  ignoreFinishUntil = Date.now() + 800;
  onFinished = listeners?.onFinished ?? null;
  onFailed = listeners?.onFailed ?? null;

  try {
    const uri = await getWordPlaybackUri(surah, ayah, word);
    if (seq !== requestSeq) return false;
    return await runPlayerOp(async () => {
      if (seq !== requestSeq) return false;
      const instance = await getPlayer();
      if (seq !== requestSeq) return false;

      ignoreFinishUntil = Date.now() + 400;
      if (loadedUri === uri && instance.isLoaded) {
        await instance.seekTo(0);
        if (seq !== requestSeq) return false;
        instance.play();
        return true;
      }

      instance.replace({ uri });
      loadedUri = uri;
      const ready = await waitForReady(instance, seq);
      if (!ready || seq !== requestSeq) return false;
      instance.play();
      return true;
    });
  } catch {
    if (seq !== requestSeq) return false;
    onFinished = null;
    const failed = onFailed;
    onFailed = null;
    failed?.();
    return false;
  }
}

export function stopWordAudio(): void {
  requestSeq += 1;
  const finished = onFinished;
  onFinished = null;
  onFailed = null;
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
