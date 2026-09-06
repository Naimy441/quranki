import type { DownloadProgress } from 'expo-file-system';

import { recitationAyahKey, type WordTiming } from '@/lib/recitation';
import { reciterDatasetPath } from '@/lib/reciters';
import { forgetCachedDataset, getRemoteDataset, hasCachedDataset } from '@/lib/remote-dataset-cache';

/** One ayah's entry in a reciter's raw catalog (see `scripts/upload-recitation-data.js`). */
export interface AyahRecitationEntry {
  surah_number: number;
  ayah_number: number;
  audio_url: string;
  duration: number | null;
  segments: WordTiming[];
}

/** Keyed `"surah:ayah"`, e.g. `"2:255"`. Covers the whole Quran (6236 ayahs). */
export type ReciterDataset = Record<string, AyahRecitationEntry>;

const FULL_QURAN_AYAH_COUNT = 6236;

function isValidDataset(value: unknown): value is ReciterDataset {
  return !!value && typeof value === 'object' && Object.keys(value).length >= FULL_QURAN_AYAH_COUNT;
}

/** Whether this reciter's dataset is already downloaded (does not check bundled reciters). */
export function isReciterDatasetDownloaded(key: string): boolean {
  return hasCachedDataset(reciterDatasetPath(key));
}

/** Downloads (or reuses the cached copy of) one reciter's full per-ayah catalog. `onProgress`
 *  only fires while this call is the one actually downloading it - see `getRemoteDataset`. */
export function downloadReciterDataset(
  key: string,
  signal?: AbortSignal,
  onProgress?: (data: DownloadProgress) => void,
): Promise<ReciterDataset> {
  return getRemoteDataset<ReciterDataset>(reciterDatasetPath(key), { isValid: isValidDataset, signal, onProgress });
}

/** Forgets a reciter's downloaded dataset. Callers should also clear its audio cache - see
 *  `clearReciterAyahCache` in `lib/recitation-cache.ts`. */
export function deleteReciterDataset(key: string): void {
  forgetCachedDataset(reciterDatasetPath(key));
}

export function getAyahEntry(
  dataset: ReciterDataset,
  surahNumber: number,
  ayahNumber: number,
): AyahRecitationEntry | undefined {
  return dataset[recitationAyahKey(surahNumber, ayahNumber)];
}
