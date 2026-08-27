/** A run of Arabic or English text sharing one tajweed/part-of-speech class (or none). */
export interface TextSegment {
  t: string;
  c?: string;
}

export interface ReaderWord {
  /** 1-based position of this word within the ayah. */
  p: number;
  ar: TextSegment[];
  en: TextSegment[];
  /** Unified vocabulary id for this Qur'an word, if one could be resolved (see
   *  scripts/build-quran-reader-data.js). Either:
   *   - one of the 547 curated src/data/quranic-words.json study word ids ("01-001"), matched by
   *     lemma/root/surface text via the Qur'anic Arabic Corpus morphology data, or
   *   - for a word outside the curriculum, a generated "lem:<lemma>" id (see
   *     scripts/vocab-word-matcher.js's buildLemmaFallbackTags) shared by every occurrence of
   *     that same corpus dictionary lemma.
   *  Used to hide/reveal this word's translation once the user has mastered it (curated ids,
   *  via FSRS - see getMasteredVocabIds) or manually marked it known (either kind of id - see
   *  useKnownWordsStore), whichever comes first. */
  v?: string;
}

/** A run of the full ayah translation: either plain text, or a footnote marker with its body. */
export interface TranslationPart {
  t?: string;
  n?: string;
  fn?: string;
}

export interface ReaderAyah {
  /** 1-based ayah number within the surah. */
  a: number;
  w: ReaderWord[];
  /** Full Sahih International ayah translation, with inline footnote markers resolved. */
  tr: TranslationPart[];
}

export interface SurahIndexEntry {
  /** Surah number, 1-114. */
  n: number;
  /** Arabic name, e.g. "الفاتحة". */
  ar: string;
  /** Simple English transliteration, e.g. "Al-Fatihah". */
  en: string;
  /** Full diacritical transliteration, e.g. "Al-Fātiĥah". */
  tr: string;
  /** Ayah count. */
  ac: number;
  rp: 'meccan' | 'medinan';
  /** Whether the Bismillah should be shown as a header before ayah 1. */
  b: boolean;
}
