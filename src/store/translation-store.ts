import { create } from 'zustand';

import { downloadTranslationDataset, type TranslationDataset } from '@/lib/translation-dataset';
import { findTranslationOption } from '@/lib/translations';

/** Holds the currently-active *non-bundled* translation's downloaded dataset in memory, so the
 *  reader (`AyahBlock`) can read it synchronously on every render instead of awaiting a promise
 *  per ayah. `key`/`dataset` are both `null` whenever the bundled default (Sahih International)
 *  is selected - that one is read straight off each `ReaderAyah.tr` instead, see
 *  `lib/translations.ts`. */
interface TranslationDatasetState {
  key: string | null;
  dataset: TranslationDataset | null;
  loading: boolean;
}

const INITIAL_STATE: TranslationDatasetState = { key: null, dataset: null, loading: false };

export const useTranslationDatasetStore = create<TranslationDatasetState>(() => INITIAL_STATE);

// Guards against a stale download resolving after the reader has since switched to a different
// translation (or back to the bundled default) - the same "supersede, don't just overwrite"
// pattern `recitation-store.ts` uses for its own async loads.
let activeRequestKey: string | null = null;

/** Ensures `key`'s dataset is loaded into `useTranslationDatasetStore` for the reader to consume.
 *  Safe to call redundantly (e.g. once per mounted `AyahBlock`) - no-ops once that key is already
 *  active or already in flight. Called both when the reader mounts (so an already-downloaded
 *  pick is ready immediately) and right when the user selects a translation in the picker (so a
 *  fresh pick starts downloading immediately, mirroring the reciter picker). */
export function ensureTranslationDatasetLoaded(key: string): void {
  const option = findTranslationOption(key);
  if (!option || option.bundled) {
    activeRequestKey = null;
    if (useTranslationDatasetStore.getState().key !== null) {
      useTranslationDatasetStore.setState({ key: null, dataset: null, loading: false });
    }
    return;
  }

  const current = useTranslationDatasetStore.getState();
  if (current.key === key && current.dataset) return;
  if (activeRequestKey === key) return;

  activeRequestKey = key;
  useTranslationDatasetStore.setState({ loading: true });
  void downloadTranslationDataset(key)
    .then((dataset) => {
      if (activeRequestKey !== key) return;
      useTranslationDatasetStore.setState({ key, dataset, loading: false });
    })
    .catch(() => {
      if (activeRequestKey !== key) return;
      activeRequestKey = null;
      useTranslationDatasetStore.setState({ loading: false });
    });
}
