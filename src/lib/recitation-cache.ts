import { Directory, File, Paths, type DownloadProgress } from 'expo-file-system';
import { Platform } from 'react-native';

import { recitationAyahKey, recitationFileName } from '@/lib/recitation';

/** Anything smaller than this is treated as a failed/partial download and re-fetched. */
const MIN_GAPPED_BYTES = 2048;

const reciterAyahInflight = new Map<string, Promise<string>>();

export function isAbortError(error: unknown): boolean {
  if (error instanceof Error && (error.name === 'AbortError' || error.name === 'CanceledError')) {
    return true;
  }
  return typeof error === 'object' && error !== null && 'name' in error && (error as { name: string }).name === 'AbortError';
}

function canCacheToDisk(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

/** Namespaced by reciter key (e.g. `sudais-murattal`) so each reciter/style gets its own
 *  on-disk ayah-audio cache directory. */
function reciterAyahDirectory(reciterKey: string): Directory {
  const dir = new Directory(Paths.document, 'recitation', reciterKey);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function reciterAyahFile(reciterKey: string, surahNumber: number, ayahNumber: number): File {
  return new File(reciterAyahDirectory(reciterKey), recitationFileName(surahNumber, ayahNumber));
}

function isValidAudioFile(file: File, minBytes: number): boolean {
  return file.exists && file.size >= minBytes;
}

function deleteQuietly(file: File): void {
  try {
    if (file.exists) file.delete();
  } catch {
    // Best-effort cleanup of a partial download.
  }
}

/** Local `file://` URI if this reciter's copy of this ayah is already on disk; otherwise `null`. */
export function getCachedReciterAyahUri(reciterKey: string, surahNumber: number, ayahNumber: number): string | null {
  if (!canCacheToDisk()) return null;
  const file = reciterAyahFile(reciterKey, surahNumber, ayahNumber);
  return isValidAudioFile(file, MIN_GAPPED_BYTES) ? file.uri : null;
}

async function downloadReciterAyah(
  reciterKey: string,
  surahNumber: number,
  ayahNumber: number,
  url: string,
  signal?: AbortSignal,
  onProgress?: (data: DownloadProgress) => void,
): Promise<string> {
  const file = reciterAyahFile(reciterKey, surahNumber, ayahNumber);
  if (isValidAudioFile(file, MIN_GAPPED_BYTES)) return file.uri;

  try {
    // `createDownloadTask` (unlike `downloadFileAsync`) reports live byte progress and always
    // overwrites an existing destination file, so no `idempotent` flag is needed here.
    const task = File.createDownloadTask(url, file, { signal, onProgress });
    const downloaded = await task.downloadAsync();
    if (!downloaded || !isValidAudioFile(downloaded, MIN_GAPPED_BYTES)) {
      deleteQuietly(downloaded ?? file);
      throw new Error('Downloaded recitation file was empty');
    }
    return downloaded.uri;
  } catch (error) {
    deleteQuietly(file);
    throw error;
  }
}

/** Resolves a playable URI for one ayah: a cached local file on iOS/Android, or the remote
 *  URL on web (where `expo-file-system` cannot persist downloads), given that ayah's explicit
 *  source URL from the reciter's dataset entry (see `lib/reciter-dataset.ts`). */
export async function getReciterAyahPlaybackUri(
  reciterKey: string,
  surahNumber: number,
  ayahNumber: number,
  url: string,
  signal?: AbortSignal,
  onProgress?: (data: DownloadProgress) => void,
): Promise<string> {
  if (!canCacheToDisk()) return url;

  const cached = getCachedReciterAyahUri(reciterKey, surahNumber, ayahNumber);
  if (cached) return cached;

  const key = `${reciterKey}:${recitationAyahKey(surahNumber, ayahNumber)}`;
  const pending = reciterAyahInflight.get(key);
  if (pending) return pending;

  const request = downloadReciterAyah(reciterKey, surahNumber, ayahNumber, url, signal, onProgress).finally(() => {
    reciterAyahInflight.delete(key);
  });
  reciterAyahInflight.set(key, request);
  return request;
}

/** Deletes every cached ayah audio file for one reciter/style, e.g. when the user removes it in
 *  Settings to reclaim space. */
export function clearReciterAyahCache(reciterKey: string): void {
  if (!canCacheToDisk()) return;
  try {
    const dir = reciterAyahDirectory(reciterKey);
    if (dir.exists) dir.delete();
  } catch {
    // Best-effort; a stray file or two will just be re-downloaded next time it's needed.
  }
}
