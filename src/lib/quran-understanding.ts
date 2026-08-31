import { getSurahAyahs, SURAH_COUNT } from '@/lib/quran-reader';
import type { ReaderAyah } from '@/lib/quran-reader-types';
import { isHurufMuqattaatAyah } from '@/lib/huruf-muqattaat';

export interface AyahUnderstanding {
  /** Words whose vocabulary id is in the learner's recognized vocabulary. */
  knownWords: number;
  /** Every displayed word in the ayah counts once, with no part-of-speech weighting. */
  totalWords: number;
  /** The share of this ayah's vocabulary the learner recognizes. */
  ratio: number;
}

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
  /** Average ayah-understanding score for every surah, in Qur'an order. */
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

/**
 * Estimates how much of an ayah's vocabulary the learner can follow. This is deliberately a
 * simple, unweighted measure: each displayed Qur'an word counts exactly once. A word without a
 * resolved vocabulary id is not yet recognized and therefore counts as unknown.
 */
export function getAyahUnderstanding(ayah: ReaderAyah, recognizedVocabIds: Set<string>, surahNumber?: number): AyahUnderstanding {
  if (surahNumber !== undefined && isHurufMuqattaatAyah(surahNumber, ayah.a)) {
    return { knownWords: 0, totalWords: 0, ratio: 0 };
  }
  const totalWords = ayah.w.length;
  const knownWords = ayah.w.reduce(
    (count, word) => count + (word.v !== undefined && recognizedVocabIds.has(word.v) ? 1 : 0),
    0,
  );

  return {
    knownWords,
    totalWords,
    ratio: totalWords === 0 ? 0 : knownWords / totalWords,
  };
}

/**
 * The expected vocabulary understanding of a typical ayah. Unlike corpus-wide word coverage,
 * this gives every ayah equal weight, regardless of how short or long it is.
 */
export function getQuranAyahUnderstandingSummary(recognizedVocabIds: Set<string>): QuranAyahUnderstandingSummary {
  let total = 0;
  let ayahCount = 0;
  const counts = Array.from({ length: HISTOGRAM_BIN_COUNT }, () => 0);
  const surahAverages: number[] = [];

  for (let surahNumber = 1; surahNumber <= SURAH_COUNT; surahNumber += 1) {
    const ayahs = getSurahAyahs(surahNumber);
    let surahTotal = 0;
    let eligibleAyahCount = 0;

    for (const ayah of ayahs) {
      if (isHurufMuqattaatAyah(surahNumber, ayah.a)) continue;
      const ratio = getAyahUnderstanding(ayah, recognizedVocabIds, surahNumber).ratio;
      total += ratio;
      surahTotal += ratio;
      counts[Math.min(Math.floor(ratio * HISTOGRAM_BIN_COUNT), HISTOGRAM_BIN_COUNT - 1)] += 1;
      ayahCount += 1;
      eligibleAyahCount += 1;
    }

    const surahAverage = eligibleAyahCount === 0 ? 0 : surahTotal / eligibleAyahCount;
    surahAverages.push(surahAverage);
  }

  return {
    average: ayahCount === 0 ? 0 : total / ayahCount,
    ayahCount,
    histogram: createHistogram(counts),
    surahAverages,
  };
}
