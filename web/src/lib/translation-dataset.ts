import type { TranslationPart } from '@/lib/quran-reader-types';

/** Keyed `"surah:ayah"`, e.g. `"2:255"`, the same shape the mobile app downloads. The web fills
 *  it one surah at a time from `public/data/translations/<key>/<surah>.json`
 *  (see `scripts/fetch-translations.mjs`). */
export type TranslationDataset = Record<string, TranslationPart[]>;

const inflight = new Map<string, Promise<Record<string, TranslationPart[]>>>();

/** Fetches one surah of a non-bundled translation, keyed by ayah number. */
export function downloadTranslationSurah(key: string, surah: number): Promise<Record<string, TranslationPart[]>> {
  const id = `${key}/${surah}`;
  let pending = inflight.get(id);
  if (!pending) {
    pending = fetch(`/data/translations/${key}/${surah}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Record<string, TranslationPart[]>>;
      })
      .catch((error) => {
        inflight.delete(id);
        throw error;
      });
    inflight.set(id, pending);
  }
  return pending;
}

export function getAyahTranslationParts(
  dataset: TranslationDataset,
  surahNumber: number,
  ayahNumber: number,
): TranslationPart[] | undefined {
  return dataset[`${surahNumber}:${ayahNumber}`];
}
