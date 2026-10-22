/**
 * Qaida letter and syllable TTS. The mobile app downloads gzipped clips from Firebase Storage;
 * the web serves the same clips from `public/audio/qaida/` (see `scripts/fetch-qaida-audio.mjs`).
 */
import { playAudioUri } from '@/lib/word-audio';

/** The clip store is case-insensitive, so Ḥā clips are stored as `-hah` instead of `-HA`. */
export function qaidaClipFileName(id: string): string {
  return `${id.replace(/-HA(?=-|$)/g, '-hah')}.mp3`;
}

export function getQaidaAudioUrl(id: string): string {
  return `/audio/qaida/${qaidaClipFileName(id)}`;
}

const prefetched = new Set<string>();

export function prefetchQaidaAudio(id: string): void {
  if (typeof window === 'undefined' || prefetched.has(id)) return;
  prefetched.add(id);
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = 'audio';
  link.href = getQaidaAudioUrl(id);
  document.head.appendChild(link);
}

export function isQaidaAudioCached(id: string): boolean {
  return prefetched.has(id);
}

export async function playQaidaAudio(
  id: string,
  listeners?: { onFinished?: () => void; onFailed?: () => void },
): Promise<boolean> {
  return playAudioUri(getQaidaAudioUrl(id), listeners);
}
