/**
 * Types + pure helpers for user-marked "known" Quran words - words the reader should hide the
 * translation for even though they haven't been mastered through a real review yet. Keys are
 * stable `qac:<number>` references into the generated canonical lemma catalogue.
 *
 * Stored independently of FSRS progress (see useKnownWordsStore) so marking a word known never
 * requires - or interferes with - going through a real flashcard review.
 */
import { lemmaIdFromStorageKey, type LemmaId } from '@/lib/quran-lemmas';

export interface KnownWordEntry {
  /** The exact on-screen Arabic the user tapped when marking this word known - captured at mark
   *  time purely for display in the Settings "Known words" list, since the app doesn't ship a
   *  full lemma -> citation-form dictionary to look this back up from just the id. */
  sampleArabic: string;
  addedAt: string;
}

export type KnownWordsMap = Record<string, KnownWordEntry>;

/** Derives canonical ids the user has manually marked known. Invalid or legacy keys are ignored;
 * the store migrates supported v1 keys before exposing state. */
export function getKnownLemmaIds(knownWords: KnownWordsMap): Set<LemmaId> {
  const ids = new Set<LemmaId>();
  for (const key of Object.keys(knownWords)) {
    const id = lemmaIdFromStorageKey(key);
    if (id !== undefined) ids.add(id);
  }
  return ids;
}
