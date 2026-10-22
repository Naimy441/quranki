import { create } from 'zustand';

import { downloadTranslationSurah, type TranslationDataset } from '@/lib/translation-dataset';
import { findTranslationOption } from '@/lib/translations';

/** The active non-bundled translation's text, filled in per surah as the reader opens them.
 *  `key`/`dataset` stay `null` for the bundled default (Sahih International), which is read
 *  straight off each `ReaderAyah.tr`, as on mobile. */
interface TranslationDatasetState {
  key: string | null;
  dataset: TranslationDataset | null;
  loading: boolean;
  loadedSurahs: Record<number, true>;
}

const INITIAL_STATE: TranslationDatasetState = { key: null, dataset: null, loading: false, loadedSurahs: {} };

export const useTranslationDatasetStore = create<TranslationDatasetState>(() => INITIAL_STATE);

/** Selects which translation the store holds. Switching clears text from the previous pick. */
export function ensureTranslationDatasetLoaded(key: string): void {
  const option = findTranslationOption(key);
  if (!option || option.bundled) {
    if (useTranslationDatasetStore.getState().key !== null) useTranslationDatasetStore.setState(INITIAL_STATE);
    return;
  }
  if (useTranslationDatasetStore.getState().key === key) return;
  useTranslationDatasetStore.setState({ key, dataset: {}, loading: false, loadedSurahs: {} });
}

/** Loads one surah of the selected translation into the store. */
export function ensureTranslationSurahLoaded(key: string, surah: number): void {
  ensureTranslationDatasetLoaded(key);
  const state = useTranslationDatasetStore.getState();
  if (state.key !== key || state.loadedSurahs[surah]) return;
  useTranslationDatasetStore.setState({ loading: true });
  void downloadTranslationSurah(key, surah)
    .then((ayahs) => {
      const current = useTranslationDatasetStore.getState();
      if (current.key !== key) return;
      const dataset = { ...(current.dataset ?? {}) };
      for (const [ayah, parts] of Object.entries(ayahs)) dataset[`${surah}:${ayah}`] = parts;
      useTranslationDatasetStore.setState({
        dataset,
        loading: false,
        loadedSurahs: { ...current.loadedSurahs, [surah]: true },
      });
    })
    .catch(() => {
      if (useTranslationDatasetStore.getState().key === key) useTranslationDatasetStore.setState({ loading: false });
    });
}
