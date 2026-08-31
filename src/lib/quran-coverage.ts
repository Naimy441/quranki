import vocabCoverageData from '@/data/quran/vocab-coverage.json';
import { HURUF_MUQATTAAT_WORD_COUNT } from '@/lib/huruf-muqattaat';

interface VocabCoverage {
  /** Every word in the whole Quran, tagged or not - "the entire Quran" for this metric. */
  totalWords: number;
  /** studyWordId -> how many times it actually occurs across the whole Quran. Generated at
   *  build time by scripts/build-quran-reader-data.js (see vocab-word-matcher.js for how each
   *  occurrence is matched to a study word). Ids the matcher never found in the text (e.g.
   *  fill-in-the-blank template entries like "لَ+فعل+نَّ") are simply absent. */
  occurrenceCounts: Record<string, number>;
}

const { totalWords, occurrenceCounts } = vocabCoverageData as VocabCoverage;
/** Opening letters have no lexical meaning, so they are omitted from vocabulary coverage. */
const TOTAL_QURAN_WORDS = totalWords - HURUF_MUQATTAAT_WORD_COUNT;

export { TOTAL_QURAN_WORDS };

/** How many of the Quran's actual words the user would now recognize, given a set of
 *  recognized vocabulary ids - i.e. real text coverage, not just "N of 547 vocab items". One
 *  mastered word like "the/that" can single-handedly cover thousands of on-screen occurrences,
 *  so this is a very different (and much more telling) number than the vocab-list mastery count.
 *  The caller decides what "recognized" means - the progress screen passes the union of FSRS-
 *  mastered study words and manually-marked-known words (see useKnownWordsStore), so a word
 *  outside the 547-word curriculum still counts once the user has marked it known, the same way
 *  it already does for hiding its translation in the reader. */
export function countMemorizedQuranWords(recognizedVocabIds: Set<string>): number {
  let count = 0;
  for (const id of recognizedVocabIds) {
    count += occurrenceCounts[id] ?? 0;
  }
  return count;
}

/** How many times a single vocabulary id (curated or "lem:...") occurs across the whole Quran -
 *  used to show "appears N times" when the user is deciding whether to mark a word known. */
export function getWordOccurrenceCount(id: string): number {
  return occurrenceCounts[id] ?? 0;
}
