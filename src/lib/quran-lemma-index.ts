import wordLemmaData from '@/data/quran-word-lemmas.json';

import type { LemmaId } from '@/lib/quran-lemmas';

interface WordLemmaFile {
  metadata: { wordCount: number };
  surahs: {
    surah: number;
    ayahs: { ayah: number; words: { lemmaIds: number[] }[] }[];
  }[];
}

export interface CanonicalAyahWords {
  surah: number;
  ayah: number;
  words: readonly (readonly LemmaId[])[];
}

const data = wordLemmaData as WordLemmaFile;

/** Compact per-ayah lemma lists from the generated word-position artifact. Opening letters are
 * already omitted, so this is the coverage/understanding corpus without loading reader surahs. */
export const CANONICAL_AYAHS: CanonicalAyahWords[] = data.surahs.flatMap((surah) =>
  surah.ayahs.map((ayah) => ({
    surah: surah.surah,
    ayah: ayah.ayah,
    words: ayah.words.map((word) => word.lemmaIds),
  })),
);

