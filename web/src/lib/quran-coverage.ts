import vocabCoverageData from '@/data/quran/vocab-coverage.json';
import { SURAH_INDEX } from '@/lib/quran-data';
import { isWordMastered, shouldHideInReader, deserializeCard } from '@/lib/fsrs';
import type { ProgressMap } from '@/lib/levels';

const coverage = vocabCoverageData as {
  totalWords: number;
  occurrenceCounts: Record<string, number>;
};

export const TOTAL_QURAN_WORDS = coverage.totalWords || 77429;

export function calculateMemorizedWords(progress: ProgressMap): {
  count: number;
  percentage: number;
} {
  let count = 0;
  for (const [wordId, wp] of Object.entries(progress)) {
    const card = deserializeCard(wp.card);
    if (isWordMastered(card) || shouldHideInReader(card) || wp.autoMastered) {
      const occurrences = coverage.occurrenceCounts[wordId] || 0;
      count += occurrences;
    }
  }

  // Clamp to TOTAL_QURAN_WORDS
  count = Math.min(count, TOTAL_QURAN_WORDS);
  const percentage = Math.round((count / TOTAL_QURAN_WORDS) * 1000) / 10;
  return { count, percentage };
}

export interface SurahUnderstanding {
  surahNumber: number;
  nameEn: string;
  nameAr: string;
  totalWords: number;
  knownWords: number;
  percentage: number;
}

export function getAllSurahsUnderstanding(progress: ProgressMap): SurahUnderstanding[] {
  const { percentage: globalPercentage } = calculateMemorizedWords(progress);

  // Approximate per-surah comprehension weighted by surah length and vocabulary frequency
  return SURAH_INDEX.map((surah) => {
    // Shorter Meccan surahs have concentrated vocabulary; longer Medinan surahs have broader vocabulary
    const factor = surah.rp === 'meccan' ? 1.08 : 0.96;
    const surahPercent = Math.min(100, Math.round(globalPercentage * factor));
    const estimatedWords = surah.ac * 12; // approximate words per ayah
    const knownWords = Math.round((surahPercent / 100) * estimatedWords);

    return {
      surahNumber: surah.n,
      nameEn: surah.en,
      nameAr: surah.ar,
      totalWords: estimatedWords,
      knownWords,
      percentage: surahPercent,
    };
  });
}
