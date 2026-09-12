import { Directory, File, Paths, type DownloadProgress } from 'expo-file-system';
import { Platform } from 'react-native';

import { recitationAyahKey, recitationFileName } from '@/lib/recitation';

/** Anything smaller than this is treated as a failed/partial download and re-fetched. */
const MIN_GAPPED_BYTES = 2048;
const SURAH_INDEX_NAME = '_surah-index.json';

const reciterAyahInflight = new Map<string, Promise<string>>();
/** reciter → surah → cached ayah numbers. Survives as `_surah-index.json` so play can
 *  tell immediately whether a surah is already on disk (Bismillah 1:1 does not count). */
const surahIndexMemory = new Map<string, Map<number, Set<number>>>();

type StoredSurahIndex = Record<string, number[]>;

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

function surahIndexFile(reciterKey: string): File {
  return new File(reciterAyahDirectory(reciterKey), SURAH_INDEX_NAME);
}

function parseRecitationFileName(name: string): { surah: number; ayah: number } | null {
  const match = /^(\d{3})(\d{3})\.mp3$/i.exec(name);
  if (!match) return null;
  return { surah: Number(match[1]), ayah: Number(match[2]) };
}

function persistSurahIndex(reciterKey: string, index: Map<number, Set<number>>): void {
  if (!canCacheToDisk()) return;
  const stored: StoredSurahIndex = {};
  for (const [surah, ayahs] of index) {
    stored[String(surah)] = [...ayahs];
  }
  try {
    const file = surahIndexFile(reciterKey);
    if (!file.exists) file.create();
    file.write(JSON.stringify(stored));
  } catch {
    // Next ayah download rewrites it.
  }
}

function scanReciterAyahs(reciterKey: string): Map<number, Set<number>> {
  const index = new Map<number, Set<number>>();
  if (!canCacheToDisk()) return index;
  try {
    const dir = reciterAyahDirectory(reciterKey);
    if (!dir.exists) return index;
    for (const item of dir.list()) {
      if (item instanceof Directory) continue;
      const parsed = parseRecitationFileName(item.name);
      if (!parsed || !isValidAudioFile(item, MIN_GAPPED_BYTES)) continue;
      let ayahs = index.get(parsed.surah);
      if (!ayahs) {
        ayahs = new Set();
        index.set(parsed.surah, ayahs);
      }
      ayahs.add(parsed.ayah);
    }
  } catch {
    // Treat as empty; play will fall back to per-ayah file checks.
  }
  return index;
}

function loadSurahIndex(reciterKey: string): Map<number, Set<number>> {
  const cached = surahIndexMemory.get(reciterKey);
  if (cached) return cached;

  let index = new Map<number, Set<number>>();
  if (canCacheToDisk()) {
    try {
      const file = surahIndexFile(reciterKey);
      if (file.exists) {
        const parsed = JSON.parse(file.textSync()) as StoredSurahIndex;
        if (parsed && typeof parsed === 'object') {
          for (const [surah, ayahs] of Object.entries(parsed)) {
            if (!Array.isArray(ayahs)) continue;
            index.set(Number(surah), new Set(ayahs.filter((ayah) => Number.isFinite(ayah))));
          }
        }
      } else {
        index = scanReciterAyahs(reciterKey);
        persistSurahIndex(reciterKey, index);
      }
    } catch {
      index = scanReciterAyahs(reciterKey);
    }
  }
  surahIndexMemory.set(reciterKey, index);
  return index;
}

function markReciterAyahCached(reciterKey: string, surahNumber: number, ayahNumber: number): void {
  const index = loadSurahIndex(reciterKey);
  let ayahs = index.get(surahNumber);
  if (!ayahs) {
    ayahs = new Set();
    index.set(surahNumber, ayahs);
  }
  if (ayahs.has(ayahNumber)) return;
  ayahs.add(ayahNumber);
  persistSurahIndex(reciterKey, index);
}

/** True when every ayah of this surah is already on disk for this reciter. */
export function isSurahRecitationDownloaded(reciterKey: string, surahNumber: number, ayahCount: number): boolean {
  if (!canCacheToDisk() || ayahCount < 1) return false;
  const ayahs = loadSurahIndex(reciterKey).get(surahNumber);
  return !!ayahs && ayahs.size >= ayahCount;
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
  if (isValidAudioFile(file, MIN_GAPPED_BYTES)) {
    markReciterAyahCached(reciterKey, surahNumber, ayahNumber);
    return file.uri;
  }

  try {
    // `createDownloadTask` (unlike `downloadFileAsync`) reports live byte progress and always
    // overwrites an existing destination file, so no `idempotent` flag is needed here.
    const task = File.createDownloadTask(url, file, { signal, onProgress });
    const downloaded = await task.downloadAsync();
    if (!downloaded || !isValidAudioFile(downloaded, MIN_GAPPED_BYTES)) {
      deleteQuietly(downloaded ?? file);
      throw new Error('Downloaded recitation file was empty');
    }
    markReciterAyahCached(reciterKey, surahNumber, ayahNumber);
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
  surahIndexMemory.delete(reciterKey);
  if (!canCacheToDisk()) return;
  try {
    const dir = reciterAyahDirectory(reciterKey);
    if (dir.exists) dir.delete();
  } catch {
    // Best-effort; a stray file or two will just be re-downloaded next time it's needed.
  }
}
