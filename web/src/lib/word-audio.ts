/**
 * Web version of the mobile word-audio player: one shared <audio> element for single-word clips
 * and short TTS files. Same exports as `src/lib/word-audio.ts`.
 */
import { notifyIfOffline } from '@/lib/offline';

const WORD_AUDIO_CDN = 'https://audio.qurancdn.com/wbw';

function pad3(value: number): string {
  return String(value).padStart(3, '0');
}

export function wordAudioKey(surah: number, ayah: number, word: number): string {
  return `${surah}:${ayah}:${word}`;
}

export function getWordAudioUrl(surah: number, ayah: number, word: number): string {
  return `${WORD_AUDIO_CDN}/${pad3(surah)}_${pad3(ayah)}_${pad3(word)}.mp3`;
}

let player: HTMLAudioElement | null = null;
let requestSeq = 0;
let onFinished: (() => void) | null = null;
let onFailed: (() => void) | null = null;
const prefetched = new Set<string>();

function getPlayer(): HTMLAudioElement {
  if (!player) {
    player = new Audio();
    player.preload = 'auto';
    player.addEventListener('ended', () => {
      const finished = onFinished;
      onFinished = null;
      onFailed = null;
      finished?.();
    });
  }
  return player;
}

export function isWordAudioCached(surah: number, ayah: number, word: number): boolean {
  return prefetched.has(getWordAudioUrl(surah, ayah, word));
}

/** Warms the browser cache for a word clip. */
export function prefetchWordAudio(surah: number, ayah: number, word: number): void {
  const url = getWordAudioUrl(surah, ayah, word);
  if (prefetched.has(url) || typeof window === 'undefined') return;
  prefetched.add(url);
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = 'audio';
  link.href = url;
  document.head.appendChild(link);
}

function beginPlayback(listeners?: { onFinished?: () => void; onFailed?: () => void }): number {
  requestSeq += 1;
  const previous = onFinished;
  onFinished = listeners?.onFinished ?? null;
  onFailed = listeners?.onFailed ?? null;
  previous?.();
  // The Quran recitation pauses while a word clip speaks (same as mobile).
  void import('@/store/recitation-store').then(({ pauseRecitation }) => pauseRecitation());
  return requestSeq;
}

function failPlayback(seq: number, error?: unknown): boolean {
  if (seq !== requestSeq) return false;
  void notifyIfOffline(error);
  const failed = onFailed;
  onFinished = null;
  onFailed = null;
  failed?.();
  return false;
}

async function playResolvedUri(uri: string, seq: number): Promise<boolean> {
  const audio = getPlayer();
  audio.pause();
  audio.src = uri;
  audio.currentTime = 0;
  try {
    await audio.play();
    return seq === requestSeq;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return false;
    return failPlayback(seq, error);
  }
}

/** Plays a local or remote audio URI on the shared word-audio player. */
export async function playAudioUri(
  uri: string,
  listeners?: { onFinished?: () => void; onFailed?: () => void },
): Promise<boolean> {
  const seq = beginPlayback(listeners);
  return playResolvedUri(uri, seq);
}

/** Plays one word. Resolves `true` once playback has been started. */
export async function playWordAudio(
  surah: number,
  ayah: number,
  word: number,
  listeners?: { onFinished?: () => void; onFailed?: () => void },
): Promise<boolean> {
  const seq = beginPlayback(listeners);
  prefetched.add(getWordAudioUrl(surah, ayah, word));
  return playResolvedUri(getWordAudioUrl(surah, ayah, word), seq);
}

export function stopWordAudio(): void {
  requestSeq += 1;
  const finished = onFinished;
  onFinished = null;
  onFailed = null;
  try {
    player?.pause();
  } catch {
    // Already stopped.
  }
  finished?.();
}

/** True while a word clip is audible. */
export function isWordAudioPlaying(): boolean {
  return Boolean(player && !player.paused && !player.ended);
}
