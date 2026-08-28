import { create } from 'zustand';

import { isCuratedWordId, type KnownWordEntry, type KnownWordsMap } from '@/lib/known-words';
import { loadKnownWordsAsync, saveKnownWordsAsync } from '@/lib/storage';
import { useProgressStore } from '@/store/progress-store';

interface KnownWordsState {
  hydrated: boolean;
  hydrating: boolean;
  knownWords: KnownWordsMap;
  hydrate: () => Promise<void>;
  /** Marks `id` (either a curated study word id or a generated "lem:..." corpus-lemma id - see
   *  ReaderWord.v) as known, hiding its translation everywhere it appears in the reader.
   *  `sampleArabic` is the on-screen text the user actually tapped, kept only for display in the
   *  Settings "Known words" list. If `id` is a curated word, this also auto-masters its
   *  flashcard progress (see useProgressStore.autoMasterWord) so it stops resurfacing in review
   *  sessions for a word the user just said they already know. */
  markKnown: (id: string, sampleArabic: string) => void;
  /** Reverses `markKnown` for `id`. If it's a curated word whose flashcard mastery was granted
   *  by marking it known (not earned through a real review), that fabricated mastery is undone
   *  too - see useProgressStore.revertAutoMasteredWord. */
  unmarkKnown: (id: string) => void;
  clearAllKnown: () => void;
}

export const useKnownWordsStore = create<KnownWordsState>((set, get) => ({
  hydrated: false,
  hydrating: false,
  knownWords: {},

  hydrate: async () => {
    if (get().hydrated || get().hydrating) return;
    set({ hydrating: true });
    const knownWords = await loadKnownWordsAsync();
    set({ hydrated: true, hydrating: false, knownWords });
  },

  markKnown: (id, sampleArabic) => {
    const entry: KnownWordEntry = { sampleArabic, addedAt: new Date().toISOString() };
    const nextKnownWords: KnownWordsMap = { ...get().knownWords, [id]: entry };
    set({ knownWords: nextKnownWords });
    void saveKnownWordsAsync(nextKnownWords);
    useProgressStore.getState().clearReaderPeek(id);
    if (isCuratedWordId(id)) useProgressStore.getState().autoMasterWord(id);
  },

  unmarkKnown: (id) => {
    const nextKnownWords = { ...get().knownWords };
    delete nextKnownWords[id];
    set({ knownWords: nextKnownWords });
    void saveKnownWordsAsync(nextKnownWords);
    if (isCuratedWordId(id)) useProgressStore.getState().revertAutoMasteredWord(id);
  },

  clearAllKnown: () => {
    const ids = Object.keys(get().knownWords);
    set({ knownWords: {} });
    void saveKnownWordsAsync({});
    for (const id of ids) {
      if (isCuratedWordId(id)) useProgressStore.getState().revertAutoMasteredWord(id);
    }
  },
}));
