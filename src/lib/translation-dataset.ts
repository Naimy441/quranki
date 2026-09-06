import type { DownloadProgress } from 'expo-file-system';

import type { TranslationPart } from '@/lib/quran-reader-types';
import { forgetCachedDataset, getRemoteDataset, hasCachedDataset } from '@/lib/remote-dataset-cache';
import { translationDatasetPath } from '@/lib/translations';

/** Keyed `"surah:ayah"`, e.g. `"2:255"`. Covers the whole Quran (6236 ayahs). Each entry is
 *  already resolved to the same `TranslationPart[]` shape the bundled reader data uses (plain
 *  text runs plus footnote markers) - pre-parsed at publish time by
 *  `scripts/upload-translation-data.js`, so the app never needs to parse `<sup>` markup at
 *  runtime. */
export type TranslationDataset = Record<string, TranslationPart[]>;

const FULL_QURAN_AYAH_COUNT = 6236;

function isValidDataset(value: unknown): value is TranslationDataset {
  return !!value && typeof value === 'object' && Object.keys(value).length >= FULL_QURAN_AYAH_COUNT;
}

/** Whether this translation's dataset is already downloaded. Always `false` for the bundled
 *  default, which has no separate dataset to download. */
export function isTranslationDatasetDownloaded(key: string): boolean {
  return hasCachedDataset(translationDatasetPath(key));
}

/** Downloads (or reuses the cached copy of) one translation's full per-ayah text. `onProgress`
 *  only fires while this call is the one actually downloading it - see `getRemoteDataset`. */
export function downloadTranslationDataset(
  key: string,
  signal?: AbortSignal,
  onProgress?: (data: DownloadProgress) => void,
): Promise<TranslationDataset> {
  return getRemoteDataset<TranslationDataset>(translationDatasetPath(key), {
    isValid: isValidDataset,
    signal,
    onProgress,
  });
}

/** Forgets a translation's downloaded dataset. */
export function deleteTranslationDataset(key: string): void {
  forgetCachedDataset(translationDatasetPath(key));
}

export function getAyahTranslationParts(
  dataset: TranslationDataset,
  surahNumber: number,
  ayahNumber: number,
): TranslationPart[] | undefined {
  return dataset[`${surahNumber}:${ayahNumber}`];
}
