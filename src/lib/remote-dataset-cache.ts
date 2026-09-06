import { Directory, File, Paths, type DownloadProgress } from 'expo-file-system';
import { gunzipSync, strFromU8 } from 'fflate';
import { Platform } from 'react-native';

/**
 * Downloads and caches large, optional JSON datasets (e.g. a per-reciter word-timing set) that
 * are too big to bundle into the app binary, mirroring the gapless-timings cache in
 * `lib/recitation-cache.ts`: in-memory first, then on-disk, then a deduped network fetch.
 *
 * Files live in Quranki's Firebase Storage bucket under `recitation-data/` as gzip archives
 * (`<name>.json.gz`), which is public-read (see `storage.rules`) - no Firebase SDK or auth is
 * needed client-side, just a plain REST GET, exactly like the Tarteel CDN URLs in
 * `lib/recitation.ts`. Datasets are published pre-gzipped with `scripts/upload-recitation-data.js`.
 *
 * The `.gz` is decompressed here with `fflate` rather than relying on the HTTP client to honor
 * a `Content-Encoding: gzip` response header - that negotiation is inconsistent across iOS/
 * Android native networking stacks and CDN edges, so explicit decompression is the reliable
 * choice. Only the decompressed JSON is cached on disk; re-reading a cached dataset never pays
 * the decompression cost again.
 */

const STORAGE_BUCKET = 'quranki-506915.firebasestorage.app';

/** Public download URL for an object at `storagePath` inside the bucket (e.g. `recitation-data/mishary/001.json.gz`). */
export function getRemoteDatasetUrl(storagePath: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(storagePath)}?alt=media`;
}

function canCacheToDisk(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

function datasetDirectory(): Directory {
  const dir = new Directory(Paths.document, 'remote-data');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function cacheKeyFor(storagePath: string, cacheKey?: string): string {
  return cacheKey ?? storagePath.replace(/\//g, '_');
}

function datasetFile(key: string): File {
  return new File(datasetDirectory(), `${key}.json`);
}

/** Scratch location for the still-gzipped download - see `fetchDataset`. Never left behind:
 *  cleaned up both before a fresh attempt and after decompressing. */
function tempGzipFile(key: string): File {
  return new File(datasetDirectory(), `${key}.json.gz.tmp`);
}

function deleteQuietly(file: File): void {
  try {
    if (file.exists) file.delete();
  } catch {
    // Best-effort cleanup of a partial download.
  }
}

const memory = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

function readCachedJson<T>(key: string, isValid: (value: T) => boolean): T | null {
  const cached = memory.get(key) as T | undefined;
  if (cached !== undefined && isValid(cached)) return cached;
  if (!canCacheToDisk()) return null;

  const file = datasetFile(key);
  if (!file.exists) return null;
  try {
    const parsed = JSON.parse(file.textSync()) as T;
    if (!isValid(parsed)) return null;
    memory.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedJson<T>(key: string, value: T): void {
  memory.set(key, value);
  if (!canCacheToDisk()) return;
  try {
    const file = datasetFile(key);
    if (!file.exists) file.create();
    file.write(JSON.stringify(value));
  } catch {
    // Re-fetched next time if this failed to persist.
  }
}

/** Downloads the still-gzipped dataset to a temp file first (rather than buffering the whole
 *  response with `fetch`) purely so `File.createDownloadTask`'s `onProgress` can report real
 *  bytes-written/total - the same mechanism `expo-audio`'s per-ayah downloads use - instead of
 *  the caller only finding out once the entire (multi-hundred-KB) transfer has finished. */
async function fetchDatasetToFile<T>(
  storagePath: string,
  key: string,
  signal?: AbortSignal,
  onProgress?: (data: DownloadProgress) => void,
): Promise<T> {
  const url = getRemoteDatasetUrl(storagePath);
  const tmp = tempGzipFile(key);
  deleteQuietly(tmp);
  try {
    const task = File.createDownloadTask(url, tmp, {
      headers: { Accept: 'application/gzip' },
      signal,
      onProgress,
    });
    const downloaded = await task.downloadAsync();
    if (!downloaded) throw new Error(`Dataset download did not complete: ${storagePath}`);
    const gzipped = new Uint8Array(await downloaded.arrayBuffer());
    const text = strFromU8(gunzipSync(gzipped));
    const parsed = JSON.parse(text) as T;
    writeCachedJson(key, parsed);
    return parsed;
  } finally {
    deleteQuietly(tmp);
  }
}

/** Web has no `expo-file-system` disk cache (see `canCacheToDisk`), so it just buffers the
 *  response directly - there's nothing to persist between sessions there anyway. */
async function fetchDatasetViaFetch<T>(storagePath: string, key: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(getRemoteDatasetUrl(storagePath), {
    signal,
    headers: { Accept: 'application/gzip' },
  });
  if (!response.ok) {
    throw new Error(`Dataset HTTP ${response.status}: ${storagePath}`);
  }
  const gzipped = new Uint8Array(await response.arrayBuffer());
  const text = strFromU8(gunzipSync(gzipped));
  const parsed = JSON.parse(text) as T;
  writeCachedJson(key, parsed);
  return parsed;
}

function fetchDataset<T>(
  storagePath: string,
  key: string,
  signal?: AbortSignal,
  onProgress?: (data: DownloadProgress) => void,
): Promise<T> {
  return canCacheToDisk()
    ? fetchDatasetToFile<T>(storagePath, key, signal, onProgress)
    : fetchDatasetViaFetch<T>(storagePath, key, signal);
}

/**
 * Resolves a JSON dataset, fetching and caching it the first time it's needed. `isValid` lets
 * callers reject a malformed or outdated cached shape (e.g. wrong item count) so a fresh copy
 * is downloaded instead of trusting whatever is on disk.
 */
export async function getRemoteDataset<T>(
  storagePath: string,
  options: {
    cacheKey?: string;
    isValid?: (value: T) => boolean;
    signal?: AbortSignal;
    /** Only fires for the caller that actually triggers the download - a request already
     *  in flight (e.g. a duplicate call racing the first) won't get progress ticks, since by
     *  definition it's just riding along on someone else's fetch. */
    onProgress?: (data: DownloadProgress) => void;
  } = {},
): Promise<T> {
  const key = cacheKeyFor(storagePath, options.cacheKey);
  const isValid = options.isValid ?? (() => true);

  const cached = readCachedJson<T>(key, isValid);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const request = fetchDataset<T>(storagePath, key, options.signal, options.onProgress).finally(() => {
    inflight.delete(key);
  });
  inflight.set(key, request as Promise<unknown>);
  return request;
}

/** Whether this dataset already has an on-disk cache. Does not validate its contents. */
export function hasCachedDataset(storagePath: string, cacheKey?: string): boolean {
  if (!canCacheToDisk()) return false;
  return datasetFile(cacheKeyFor(storagePath, cacheKey)).exists;
}

/** Deletes a dataset's on-disk (and in-memory) cache, e.g. to reclaim space or force a re-download. */
export function forgetCachedDataset(storagePath: string, cacheKey?: string): void {
  const key = cacheKeyFor(storagePath, cacheKey);
  memory.delete(key);
  if (!canCacheToDisk()) return;
  deleteQuietly(datasetFile(key));
}
