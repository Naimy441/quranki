import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import {
  gaplessSurahFileName,
  getAyahAudioUrl,
  getGaplessSegmentsUrl,
  getGaplessSurahUrl,
  parseGaplessSegments,
  recitationAyahKey,
  recitationFileName,
  type GaplessSurahMeta,
} from '@/lib/recitation';

/** Anything smaller than this is treated as a failed/partial download and re-fetched. */
const MIN_GAPPED_BYTES = 2048;
const MIN_GAPLESS_BYTES = 16 * 1024;

const ayahInflight = new Map<string, Promise<string>>();
const gaplessInflight = new Map<number, Promise<string>>();
const metaMemory = new Map<number, GaplessSurahMeta>();
const metaInflight = new Map<number, Promise<GaplessSurahMeta>>();

export function isAbortError(error: unknown): boolean {
  if (error instanceof Error && (error.name === 'AbortError' || error.name === 'CanceledError')) {
    return true;
  }
  return typeof error === 'object' && error !== null && 'name' in error && (error as { name: string }).name === 'AbortError';
}

function canCacheToDisk(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function ayahDirectory(): Directory {
  const dir = new Directory(Paths.document, 'recitation', 'husary-mujawwad');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function gaplessDirectory(): Directory {
  const dir = new Directory(Paths.document, 'recitation', 'husary-mujawwad-gapless');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function ayahFile(surahNumber: number, ayahNumber: number): File {
  return new File(ayahDirectory(), recitationFileName(surahNumber, ayahNumber));
}

function gaplessAudioFile(surahNumber: number): File {
  return new File(gaplessDirectory(), gaplessSurahFileName(surahNumber));
}

function gaplessMetaFile(surahNumber: number): File {
  return new File(gaplessDirectory(), `${String(surahNumber).padStart(3, '0')}.timings.json`);
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

function readCachedMeta(surahNumber: number, ayahCount: number): GaplessSurahMeta | null {
  const memory = metaMemory.get(surahNumber);
  if (memory && memory.ayahs.length === ayahCount) return memory;
  if (!canCacheToDisk()) return null;

  const file = gaplessMetaFile(surahNumber);
  if (!file.exists) return null;
  try {
    const parsed = JSON.parse(file.textSync()) as GaplessSurahMeta;
    if (!Array.isArray(parsed.ayahs) || parsed.ayahs.length !== ayahCount) return null;
    if (!Array.isArray(parsed.words) || parsed.words.length !== ayahCount) return null;
    metaMemory.set(surahNumber, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedMeta(surahNumber: number, meta: GaplessSurahMeta): void {
  metaMemory.set(surahNumber, meta);
  if (!canCacheToDisk()) return;
  try {
    const file = gaplessMetaFile(surahNumber);
    if (!file.exists) file.create();
    file.write(JSON.stringify(meta));
  } catch {
    // Timings can be fetched again next play.
  }
}

/** Local `file://` URI if this ayah is already on disk; otherwise `null`. */
export function getCachedAyahUri(surahNumber: number, ayahNumber: number): string | null {
  if (!canCacheToDisk()) return null;
  const file = ayahFile(surahNumber, ayahNumber);
  return isValidAudioFile(file, MIN_GAPPED_BYTES) ? file.uri : null;
}

export function getCachedGaplessUri(surahNumber: number): string | null {
  if (!canCacheToDisk()) return null;
  const file = gaplessAudioFile(surahNumber);
  return isValidAudioFile(file, MIN_GAPLESS_BYTES) ? file.uri : null;
}

async function downloadAyah(surahNumber: number, ayahNumber: number, signal?: AbortSignal): Promise<string> {
  const file = ayahFile(surahNumber, ayahNumber);
  if (isValidAudioFile(file, MIN_GAPPED_BYTES)) return file.uri;

  try {
    const downloaded = await File.downloadFileAsync(getAyahAudioUrl(surahNumber, ayahNumber), file, {
      idempotent: true,
      signal,
    });
    if (!isValidAudioFile(downloaded, MIN_GAPPED_BYTES)) {
      deleteQuietly(downloaded);
      throw new Error('Downloaded recitation file was empty');
    }
    return downloaded.uri;
  } catch (error) {
    deleteQuietly(file);
    throw error;
  }
}

/**
 * Resolves a playable URI for one ayah: a cached local file on iOS/Android, or the remote
 * CDN URL on web (where `expo-file-system` cannot persist downloads).
 */
export async function getAyahPlaybackUri(
  surahNumber: number,
  ayahNumber: number,
  signal?: AbortSignal,
): Promise<string> {
  if (!canCacheToDisk()) return getAyahAudioUrl(surahNumber, ayahNumber);

  const cached = getCachedAyahUri(surahNumber, ayahNumber);
  if (cached) return cached;

  const key = recitationAyahKey(surahNumber, ayahNumber);
  const pending = ayahInflight.get(key);
  if (pending) return pending;

  const request = downloadAyah(surahNumber, ayahNumber, signal).finally(() => {
    ayahInflight.delete(key);
  });
  ayahInflight.set(key, request);
  return request;
}

async function fetchGaplessMeta(
  surahNumber: number,
  ayahCount: number,
  signal?: AbortSignal,
): Promise<GaplessSurahMeta> {
  const response = await fetch(getGaplessSegmentsUrl(surahNumber, ayahCount), {
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Segments HTTP ${response.status}`);
  }
  const meta = parseGaplessSegments(surahNumber, ayahCount, await response.json());
  writeCachedMeta(surahNumber, meta);
  return meta;
}

/** Ayah start/end times and audio URL for one surah. Fetched the first time that surah is played. */
export async function getGaplessSurahMeta(
  surahNumber: number,
  ayahCount: number,
  signal?: AbortSignal,
): Promise<GaplessSurahMeta> {
  const cached = readCachedMeta(surahNumber, ayahCount);
  if (cached) return cached;

  const pending = metaInflight.get(surahNumber);
  if (pending) return pending;

  const request = fetchGaplessMeta(surahNumber, ayahCount, signal).finally(() => {
    metaInflight.delete(surahNumber);
  });
  metaInflight.set(surahNumber, request);
  return request;
}

async function downloadGaplessSurah(
  surahNumber: number,
  url: string,
  signal?: AbortSignal,
  onProgress?: (bytesWritten: number, totalBytes: number) => void,
): Promise<string> {
  const file = gaplessAudioFile(surahNumber);
  if (isValidAudioFile(file, MIN_GAPLESS_BYTES)) {
    onProgress?.(file.size, file.size);
    return file.uri;
  }

  try {
    const downloaded = await File.downloadFileAsync(url, file, {
      idempotent: true,
      signal,
      onProgress: ({ bytesWritten, totalBytes }) => {
        onProgress?.(bytesWritten, totalBytes);
      },
    });
    if (!isValidAudioFile(downloaded, MIN_GAPLESS_BYTES)) {
      deleteQuietly(downloaded);
      throw new Error('Downloaded recitation file was empty');
    }
    onProgress?.(downloaded.size, downloaded.size);
    return downloaded.uri;
  } catch (error) {
    deleteQuietly(file);
    throw error;
  }
}

/**
 * One gapless MP3 for this surah. Downloaded the first time the surah is played; later plays
 * reuse the cached file. Web streams the remote URL.
 */
export async function getGaplessPlaybackUri(
  surahNumber: number,
  options: {
    url?: string;
    signal?: AbortSignal;
    onProgress?: (bytesWritten: number, totalBytes: number) => void;
  } = {},
): Promise<string> {
  const url = options.url || getGaplessSurahUrl(surahNumber);
  if (!canCacheToDisk()) {
    options.onProgress?.(1, 1);
    return url;
  }

  const cached = getCachedGaplessUri(surahNumber);
  if (cached) {
    const file = gaplessAudioFile(surahNumber);
    options.onProgress?.(file.size, file.size);
    return cached;
  }

  const pending = gaplessInflight.get(surahNumber);
  if (pending) {
    try {
      return await pending;
    } catch (error) {
      if (isAbortError(error) && !options.signal?.aborted) {
        // Previous attempt was cancelled; this play still wants the file.
      } else {
        throw error;
      }
    }
  }

  const request = downloadGaplessSurah(surahNumber, url, options.signal, options.onProgress).finally(() => {
    gaplessInflight.delete(surahNumber);
  });
  gaplessInflight.set(surahNumber, request);
  return request;
}
