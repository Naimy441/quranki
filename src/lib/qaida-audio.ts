import { Directory, File, Paths } from 'expo-file-system';
import { gunzipSync } from 'fflate';
import { Platform } from 'react-native';

import { isOnline, notifyIfOffline, requireOnline } from '@/lib/offline';
import { getRemoteDatasetUrl } from '@/lib/remote-dataset-cache';
import { playAudioUri } from '@/lib/word-audio';

const STORAGE_PREFIX = 'qaida-audio';
const MIN_CLIP_BYTES = 800;
const inflight = new Map<string, Promise<string>>();

/** APFS is case-insensitive, so Ḥā clips are stored as `-hah` instead of `-HA`. */
export function qaidaClipFileName(id: string): string {
  return `${id.replace(/-HA(?=-|$)/g, '-hah')}.mp3`;
}

export function getQaidaAudioStoragePath(id: string): string {
  return `${STORAGE_PREFIX}/${qaidaClipFileName(id)}.gz`;
}

export function getQaidaAudioUrl(id: string): string {
  return getRemoteDatasetUrl(getQaidaAudioStoragePath(id));
}

function canCacheToDisk(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function qaidaDirectory(): Directory {
  const dir = new Directory(Paths.document, 'word-audio', 'qaida');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function qaidaFile(id: string): File {
  return new File(qaidaDirectory(), qaidaClipFileName(id));
}

function tempGzipFile(id: string): File {
  return new File(qaidaDirectory(), `${qaidaClipFileName(id)}.gz.tmp`);
}

function deleteQuietly(file: File): void {
  try {
    if (file.exists) file.delete();
  } catch {
    // Best-effort cleanup of a partial download.
  }
}

function isValidAudioFile(file: File): boolean {
  return file.exists && file.size >= MIN_CLIP_BYTES;
}

export function isQaidaAudioCached(id: string): boolean {
  if (!canCacheToDisk()) return false;
  return isValidAudioFile(qaidaFile(id));
}

async function writeDecompressedClip(id: string, gzipped: Uint8Array): Promise<string> {
  const mp3 = gunzipSync(gzipped);
  if (mp3.byteLength < MIN_CLIP_BYTES) throw new Error(`Qaida clip for ${id} was empty`);

  if (!canCacheToDisk()) {
    const bytes = mp3.buffer.slice(mp3.byteOffset, mp3.byteOffset + mp3.byteLength) as ArrayBuffer;
    return URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }));
  }

  const file = qaidaFile(id);
  if (!file.exists) file.create();
  file.write(mp3);
  if (!isValidAudioFile(file)) {
    deleteQuietly(file);
    throw new Error(`Qaida clip for ${id} was empty`);
  }
  return file.uri;
}

async function downloadQaidaClip(id: string, signal?: AbortSignal): Promise<string> {
  const cached = qaidaFile(id);
  if (canCacheToDisk() && isValidAudioFile(cached)) return cached.uri;

  const url = getQaidaAudioUrl(id);
  if (!canCacheToDisk()) {
    const response = await fetch(url, { signal, headers: { Accept: 'application/gzip' } });
    if (!response.ok) throw new Error(`Qaida audio HTTP ${response.status}`);
    return writeDecompressedClip(id, new Uint8Array(await response.arrayBuffer()));
  }

  const tmp = tempGzipFile(id);
  deleteQuietly(tmp);
  try {
    const downloaded = await File.downloadFileAsync(url, tmp, { idempotent: true, signal });
    const gzipped = new Uint8Array(await downloaded.arrayBuffer());
    return writeDecompressedClip(id, gzipped);
  } finally {
    deleteQuietly(tmp);
  }
}

async function getQaidaPlaybackUri(id: string, signal?: AbortSignal): Promise<string> {
  if (canCacheToDisk() && isQaidaAudioCached(id)) return qaidaFile(id).uri;

  const pending = inflight.get(id);
  if (pending) return pending;

  const request = downloadQaidaClip(id, signal).finally(() => {
    inflight.delete(id);
  });
  inflight.set(id, request);
  return request;
}

export function prefetchQaidaAudio(id: string): void {
  if (!canCacheToDisk() || isQaidaAudioCached(id)) return;
  void isOnline().then((online) => {
    if (!online) return;
    void getQaidaPlaybackUri(id).catch(() => {
      // Prefetch is best-effort; play will retry.
    });
  });
}

export async function playQaidaAudio(
  id: string,
  listeners?: { onFinished?: () => void; onFailed?: () => void },
): Promise<boolean> {
  try {
    if (!isQaidaAudioCached(id) && !(await requireOnline())) {
      listeners?.onFailed?.();
      return false;
    }
    const uri = await getQaidaPlaybackUri(id);
    return playAudioUri(uri, listeners);
  } catch (error) {
    void notifyIfOffline(error);
    listeners?.onFailed?.();
    return false;
  }
}
