import { create } from 'zustand';

import { getKnownLemmaIds, type KnownWordEntry, type KnownWordsMap } from '@/lib/known-words';
import { getStudyWordIdsForLemmas, getWord } from '@/lib/levels';
import { getLemmaIdsForLegacyArabic, lemmaIdFromStorageKey, lemmaPeekKey, lemmaStorageKey, type LemmaId } from '@/lib/quran-lemmas';
import { loadKnownWordsAsync, saveKnownWordsAsync } from '@/lib/storage';
import { useProgressStore } from '@/store/progress-store';

interface KnownWordsState {
  hydrated: boolean;
  hydrating: boolean;
  knownWords: KnownWordsMap;
  hydrate: () => Promise<void>;
  /** Marks canonical lemma ids as known, hiding translations everywhere those lemmas appear.
   *  `sampleArabic` is the on-screen text the user actually tapped, kept only for display in the
   *  Settings "Known words" list. If `id` is a curated word, this also auto-masters its
   *  flashcard progress (see useProgressStore.autoMasterWord) so it stops resurfacing in review
   *  sessions for a word the user just said they already know. */
  markKnown: (ids: readonly LemmaId[], sampleArabic: string) => void;
  /** Reverses `markKnown` for `id`. If it's a curated word whose flashcard mastery was granted
   *  by marking it known (not earned through a real review), that fabricated mastery is undone
   *  too - see useProgressStore.revertAutoMasteredWord. */
  unmarkKnown: (ids: readonly LemmaId[]) => void;
  clearAllKnown: () => void;
}

export const useKnownWordsStore = create<KnownWordsState>((set, get) => ({
  hydrated: false,
  hydrating: false,
  knownWords: {},

  hydrate: async () => {
    if (get().hydrated || get().hydrating) return;
    set({ hydrating: true });
    const stored = await loadKnownWordsAsync();
    const knownWords: KnownWordsMap = {};
    let migrated = false;
    for (const [key, entry] of Object.entries(stored)) {
      const currentId = lemmaIdFromStorageKey(key);
      const legacyIds = currentId !== undefined
        ? [currentId]
        : /^\d{2,3}-\d{3}$/.test(key)
          ? (getWord(key)?.lemmaIds ?? [])
          : key.startsWith('lem:')
            ? getLemmaIdsForLegacyArabic(key.slice(4))
            : [];
      if (currentId === undefined) migrated = true;
      for (const id of legacyIds) knownWords[lemmaStorageKey(id)] = entry;
    }
    set({ hydrated: true, hydrating: false, knownWords });
    if (migrated) void saveKnownWordsAsync(knownWords);
  },

  markKnown: (ids, sampleArabic) => {
    const entry: KnownWordEntry = { sampleArabic, addedAt: new Date().toISOString() };
    const nextKnownWords: KnownWordsMap = { ...get().knownWords };
    for (const id of ids) nextKnownWords[lemmaStorageKey(id)] = entry;
    set({ knownWords: nextKnownWords });
    void saveKnownWordsAsync(nextKnownWords);
    const progress = useProgressStore.getState();
    progress.clearReaderPeek(lemmaPeekKey(ids));
    progress.autoMasterWords(getStudyWordIdsForLemmas(ids));
  },

  unmarkKnown: (ids) => {
    const nextKnownWords = { ...get().knownWords };
    for (const id of ids) delete nextKnownWords[lemmaStorageKey(id)];
    set({ knownWords: nextKnownWords });
    void saveKnownWordsAsync(nextKnownWords);
    const remainingIds = getKnownLemmaIds(nextKnownWords);
    const toRevert = getStudyWordIdsForLemmas(ids).filter((wordId) => {
      const stillKnown = getWord(wordId)?.lemmaIds?.some((id) => remainingIds.has(id));
      return !stillKnown;
    });
    useProgressStore.getState().revertAutoMasteredWords(toRevert);
  },

  clearAllKnown: () => {
    const ids = Object.keys(get().knownWords);
    set({ knownWords: {} });
    void saveKnownWordsAsync({});
    const lemmaIds = ids.map(lemmaIdFromStorageKey).filter((id): id is LemmaId => id !== undefined);
    for (const wordId of getStudyWordIdsForLemmas(lemmaIds)) {
      useProgressStore.getState().revertAutoMasteredWord(wordId);
    }
  },
}));
