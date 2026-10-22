/** Kept for older imports. The reader data module now mirrors the mobile app's `quran-reader`. */
export * from '@/lib/quran-reader';
export type { ReaderAyah, ReaderWord, SurahIndexEntry, TextSegment as ReaderWordSegment } from '@/lib/quran-reader-types';
export { loadSurahAyahs as fetchSurahAyahs } from '@/lib/quran-reader';
