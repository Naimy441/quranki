import { CANONICAL_AYAHS } from '@/lib/quran-lemma-index';
import { ayahLemmaUnderstanding, getQuranLemma, TOTAL_QURAN_WORDS, type LemmaId } from '@/lib/quran-lemmas';
import { SURAH_COUNT } from '@/lib/quran-reader';

export { TOTAL_QURAN_WORDS };

export interface AyahUnderstandingHistogramBin {
  min: number;
  max: number;
  label: string;
  ayahCount: number;
}

export interface QuranAyahUnderstandingSummary {
  average: number;
  ayahCount: number;
  histogram: AyahUnderstandingHistogramBin[];
  /** Average ayah-understanding score for every surah, in Quran order. */
  surahAverages: number[];
}

const HISTOGRAM_BIN_COUNT = 10;

function createHistogram(counts: number[]): AyahUnderstandingHistogramBin[] {
  return counts.map((ayahCount, index) => {
    const min = index * 10;
    const max = index === HISTOGRAM_BIN_COUNT - 1 ? 100 : min + 9;
    return { min, max, label: `${min}–${max}%`, ayahCount };
  });
}

/** Exact Quran-word coverage for a set of canonical lemmas. Multi-stem words count only when
 * every lexical stem is recognized; opening letters are excluded from both numerator and total. */
export function countMemorizedQuranWords(recognizedLemmaIds: Set<LemmaId>): number {
  let count = 0;
  for (const ayah of CANONICAL_AYAHS) {
    count += ayahLemmaUnderstanding(ayah.words, recognizedLemmaIds).knownWords;
  }
  return count;
}

/**
 * The expected vocabulary understanding of a typical ayah. Unlike corpus-wide word coverage,
 * this gives every ayah equal weight, regardless of how short or long it is.
 */
export function getQuranAyahUnderstandingSummary(recognizedLemmaIds: Set<LemmaId>): QuranAyahUnderstandingSummary {
  let total = 0;
  let ayahCount = 0;
  const counts = Array.from({ length: HISTOGRAM_BIN_COUNT }, () => 0);
  const surahTotals = Array.from({ length: SURAH_COUNT }, () => 0);
  const surahCounts = Array.from({ length: SURAH_COUNT }, () => 0);

  for (const ayah of CANONICAL_AYAHS) {
    const { totalWords, ratio } = ayahLemmaUnderstanding(ayah.words, recognizedLemmaIds);
    if (totalWords === 0) continue;
    total += ratio;
    surahTotals[ayah.surah - 1] += ratio;
    surahCounts[ayah.surah - 1] += 1;
    counts[Math.min(Math.floor(ratio * HISTOGRAM_BIN_COUNT), HISTOGRAM_BIN_COUNT - 1)] += 1;
    ayahCount += 1;
  }

  return {
    average: ayahCount === 0 ? 0 : total / ayahCount,
    ayahCount,
    histogram: createHistogram(counts),
    surahAverages: surahTotals.map((surahTotal, index) => (
      surahCounts[index] === 0 ? 0 : surahTotal / surahCounts[index]
    )),
  };
}

/** Exact stem frequency supplied by the generated canonical lemma catalogue. */
export function getLemmaOccurrenceCount(id: LemmaId | undefined): number {
  return getQuranLemma(id)?.frequency ?? 0;
}
