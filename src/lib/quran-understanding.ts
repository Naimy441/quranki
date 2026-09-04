import { ayahLemmaUnderstanding, getWordLemmaIds, type LemmaId } from '@/lib/quran-lemmas';
import type { ReaderAyah } from '@/lib/quran-reader-types';

export interface AyahUnderstanding {
  /** Words whose every canonical lemma is in the learner's recognized set. */
  knownWords: number;
  /** Lexical Quran words only — opening letters have no lemma id and are excluded. */
  totalWords: number;
  /** The share of this ayah's vocabulary the learner recognizes. */
  ratio: number;
}

/**
 * Estimates how much of an ayah's vocabulary the learner can follow. Each lexical Quran word
 * counts once. Opening letters are omitted because they have no lemma.
 */
export function getAyahUnderstanding(ayah: ReaderAyah, recognizedLemmaIds: Set<LemmaId>): AyahUnderstanding {
  return ayahLemmaUnderstanding(
    ayah.w.map((word) => getWordLemmaIds(word)),
    recognizedLemmaIds,
  );
}
