/**
 * The English translations available in the Quran reader. Sahih International is the only one
 * that ships bundled in the app binary - it's baked directly into each surah's `ReaderAyah.tr`
 * by `scripts/build-quran-reader-data.js`, since the reader always needs *some* translation
 * available offline with zero setup. Every other translation downloads on demand from Firebase
 * Storage (see `scripts/upload-translation-data.js` and `lib/translation-dataset.ts`) and is
 * cached on disk the same way the per-reciter recitation datasets are (`lib/reciters.ts`).
 */

export interface TranslationOption {
  key: string;
  /** Short display name, e.g. "Sahih International". */
  name: string;
  /** Whether this translation includes footnotes (tappable `[n]` markers) at all. */
  hasFootnotes: boolean;
  /** Only true for the built-in default - it never needs downloading or deleting. */
  bundled: boolean;
}

export const DEFAULT_TRANSLATION_KEY = 'sahih';

export const TRANSLATION_OPTIONS: TranslationOption[] = [
  { key: 'sahih', name: 'Sahih International', hasFootnotes: true, bundled: true },
  { key: 'haleem', name: 'Abdel Haleem', hasFootnotes: true, bundled: false },
  { key: 'hilali-khan', name: 'Hilali & Khan', hasFootnotes: true, bundled: false },
  { key: 'pickthall', name: 'Pickthall', hasFootnotes: false, bundled: false },
  { key: 'yusuf-ali', name: 'Yusuf Ali', hasFootnotes: false, bundled: false },
];

const OPTIONS_BY_KEY: Map<string, TranslationOption> = new Map(
  TRANSLATION_OPTIONS.map((option) => [option.key, option]),
);

export function findTranslationOption(key: string): TranslationOption | undefined {
  return OPTIONS_BY_KEY.get(key);
}

export function isTranslationKey(value: unknown): value is string {
  return typeof value === 'string' && OPTIONS_BY_KEY.has(value);
}

export function translationLabel(key: string): string {
  return findTranslationOption(key)?.name ?? 'Unknown translation';
}

/** Path of this translation's per-ayah dataset in Firebase Storage (see `lib/remote-dataset-cache.ts`).
 *  Never called for the bundled default - see `TranslationOption.bundled`. */
export function translationDatasetPath(key: string): string {
  return `translation-data/${key}.json.gz`;
}
