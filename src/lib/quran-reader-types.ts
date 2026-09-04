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
  /** Canonical Quranic Arabic Corpus lemma id(s), merged by exact surah:ayah:word location.
   * Most words have one id; the compact array form is used for the 486 multi-stem words. Opening
   * letters intentionally have none because they have no lexical meaning. */
  l?: number | number[];
  /** Light-normalized QAC LEM tag for this location. Display and recognition use `l`, not this. */
  lm?: string;
  /** Corpus ROOT tag (vowel-stripped). Analysis only — never used to assign vocabulary ownership. */
  rt?: string;
  /** Corpus stem POS column: `N` (noun), `V` (verb), or `P` (particle). */
  ps?: string;
  /** Quranic Arabic Corpus prefix, stem, and suffix analysis for this exact word occurrence. */
  m?: ReaderMorphSegment[];
}

/** A reader word plus the surah/ayah it was opened from. Needed for word-level audio. */
export interface ReaderWordRef {
  surah: number;
  ayah: number;
  word: ReaderWord;
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
