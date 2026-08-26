import bismillahData from '@/data/quran/bismillah.json';
import surahIndexData from '@/data/quran/surah-index.json';
import { loadSurahAyahs } from '@/data/quran/loader';
import type { ReaderAyah, ReaderWord, SurahIndexEntry } from '@/lib/quran-reader-types';

export const SURAH_INDEX: SurahIndexEntry[] = surahIndexData as SurahIndexEntry[];
export const BISMILLAH_WORDS: ReaderWord[] = bismillahData as ReaderWord[];
export const SURAH_COUNT = SURAH_INDEX.length;

export function getSurahMeta(surahNumber: number): SurahIndexEntry | undefined {
  return SURAH_INDEX[surahNumber - 1];
}

/** Lazily loads (and caches) every ayah + word for a surah. Only parses that surah's JSON. */
export function getSurahAyahs(surahNumber: number): ReaderAyah[] {
  return loadSurahAyahs(surahNumber);
}

/** Plain-text representation of an ayah for sharing/copying: surah + verse, Arabic, translation. */
export function buildAyahShareText(surahName: string, ayah: ReaderAyah): string {
  const arabic = ayah.w.map((word) => word.ar.map((seg) => seg.t).join('')).join(' ');
  const english = ayah.tr.map((part) => (part.t !== undefined ? part.t : `[${part.n}]`)).join('');
  return `${surahName} ${ayah.a}\n${arabic}\n${english}`;
}
