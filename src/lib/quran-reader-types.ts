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
  /** id of the src/data/quranic-words.json study word this Qur'an word was matched to (by
   *  lemma/root via the Qur'anic Arabic Corpus morphology data), if any. Used to hide/reveal its
   *  word-by-word translation based on whether the user has mastered that study word. */
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
