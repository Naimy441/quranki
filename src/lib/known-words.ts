/**
 * Types + pure helpers for user-marked "known" Qur'an words - words the reader should hide the
 * translation for even though they aren't part of the 547-word FSRS curriculum (or are, but
 * haven't been mastered through a real review yet). Keys into the same id space as
 * `ReaderWord.v`: either a curated study word id ("01-001") or a generated corpus-lemma id
 * ("lem:كِتاب") - see that field's doc comment for how the two are produced at build time.
 *
 * Stored independently of FSRS progress (see useKnownWordsStore) so marking a word known never
 * requires - or interferes with - going through a real flashcard review.
 */
export interface KnownWordEntry {
  /** The exact on-screen Arabic the user tapped when marking this word known - captured at mark
   *  time purely for display in the Settings "Known words" list, since the app doesn't ship a
   *  full lemma -> citation-form dictionary to look this back up from just the id. */
  sampleArabic: string;
  addedAt: string;
}

export type KnownWordsMap = Record<string, KnownWordEntry>;

const CURATED_ID_RE = /^\d{2}-\d{3}$/;

/** Whether `id` is one of the 547 curated study-word ids, as opposed to a generated "lem:..."
 *  corpus-lemma id for a word outside the curriculum. Used to decide whether marking/unmarking a
 *  word "known" should also touch its FSRS flashcard progress (see useProgressStore's
 *  autoMasterWord/revertAutoMasteredWord). */
export function isCuratedWordId(id: string): boolean {
  return CURATED_ID_RE.test(id);
}

/** Derives the set of ids a user has manually marked known, for combining with
 *  `getMasteredVocabIds` when deciding whether to hide a word's translation. */
export function getKnownWordIds(knownWords: KnownWordsMap): Set<string> {
  return new Set(Object.keys(knownWords));
}
