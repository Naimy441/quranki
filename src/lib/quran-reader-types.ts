/** A run of Arabic or English text sharing one tajweed/part-of-speech class (or none). */
export interface TextSegment {
  t: string;
  c?: string;
}

/** A Quranic Arabic Corpus morphological segment attached to a reader word. */
export interface ReaderMorphSegment {
  /** Arabic text belonging to this segment. */
  t: string;
  /** Where the segment sits in the word. */
  k: 'prefix' | 'stem' | 'suffix';
  /** Quranic Arabic Corpus part-of-speech tag for this segment. */
  p: string;
  /** Quranic Arabic Corpus tags, excluding location, lemma, root, and segment-position tags. */
  f: string[];
}

export interface ReaderWord {
  /** 1-based position of this word within the ayah. */
  p: number;
  ar: TextSegment[];
  en: TextSegment[];
  /** Optional word-by-word Latin transliteration. */
  tl?: string;
  /** Unified vocabulary id for this Qur'an word, if one could be resolved (see
   *  scripts/build-quran-reader-data.js). Either:
   *   - one of the curated src/data/quranic-words.json study word ids ("01-001"), matched by
   *     lemma/root/surface text via the Qur'anic Arabic Corpus morphology data, or
   *   - for a word outside the curriculum, a generated "lem:<lemma>" id (see
   *     scripts/vocab-word-matcher.js's buildLemmaFallbackTags) shared by every occurrence of
   *     that same corpus dictionary lemma.
   *  Used to hide/reveal this word's translation once the user is supposed to know it (curated
   *  ids in FSRS Review/Learning - see getHiddenVocabIds) or has manually marked it known (either
   *  kind of id - see useKnownWordsStore), whichever comes first. */
  v?: string;
  /**
   * Qur'anic Arabic Corpus dictionary lemma (light-normalized LEM tag), attached by location
   * (`surah:ayah:word`) rather than by matching Tajweed text. Used for analysis and, later,
   * lemma-based mastery. Absent on the handful of ayahs whose corpus word-count disagrees
   * with the reader, and on stems the corpus left unlemmatized.
   */
  lm?: string;
  /** Corpus ROOT tag (vowel-stripped). Analysis only — never used to assign vocabulary ownership. */
  rt?: string;
  /** Corpus stem POS column: `N` (noun), `V` (verb), or `P` (particle). */
  ps?: string;
  /** Quranic Arabic Corpus prefix, stem, and suffix analysis for this exact word occurrence. */
  m?: ReaderMorphSegment[];
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
  /** English meaning of the name, e.g. "The Opener". */
  nt: string;
  /** Ayah count. */
  ac: number;
  rp: 'meccan' | 'medinan';
  /** Whether the Bismillah should be shown as a header before ayah 1. */
  b: boolean;
}
