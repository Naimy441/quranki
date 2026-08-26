import vocabCoverageData from '@/data/quran/vocab-coverage.json';

interface VocabCoverage {
  /** Every word in the whole Qur'an, tagged or not - "the entire Qur'an" for this metric. */
  totalWords: number;
  /** studyWordId -> how many times it actually occurs across the whole Qur'an. Generated at
   *  build time by scripts/build-quran-reader-data.js (see vocab-word-matcher.js for how each
   *  occurrence is matched to a study word). Ids the matcher never found in the text (e.g.
   *  fill-in-the-blank template entries like "لَ+فعل+نَّ") are simply absent. */
  occurrenceCounts: Record<string, number>;
}

const { totalWords: TOTAL_QURAN_WORDS, occurrenceCounts } = vocabCoverageData as VocabCoverage;

export { TOTAL_QURAN_WORDS };

/** How many of the Qur'an's actual words the user would now recognize, given the study words
 *  they've mastered - i.e. real text coverage, not just "N of 547 vocab items". One mastered
 *  word like "the/that" can single-handedly cover thousands of on-screen occurrences, so this
 *  is a very different (and much more telling) number than the vocab-list mastery count. */
export function countMemorizedQuranWords(masteredVocabIds: Set<string>): number {
  let count = 0;
  for (const id of masteredVocabIds) {
    count += occurrenceCounts[id] ?? 0;
  }
  return count;
}
