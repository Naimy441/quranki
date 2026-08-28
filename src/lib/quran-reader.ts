import bismillahData from '@/data/quran/bismillah.json';
import surahIndexData from '@/data/quran/surah-index.json';
import { loadSurahAyahs } from '@/data/quran/loader';
import type { ReaderAyah, ReaderWord, SurahIndexEntry } from '@/lib/quran-reader-types';

export const SURAH_INDEX: SurahIndexEntry[] = surahIndexData as SurahIndexEntry[];
export const BISMILLAH_WORDS: ReaderWord[] = bismillahData as ReaderWord[];
export const SURAH_COUNT = SURAH_INDEX.length;

/**
 * QCF_FullSurah puts each chapter's calligraphic name (including "سورة") on one glyph.
 * These 114 BMP code points are glyph ids 4–117 in the bundled font, in surah order.
 * Rendering `surah.ar` in this font will not work — the Arabic letters are not mapped.
 */
const SURAH_NAME_GLYPHS =
  '\ufc45\ufc46\ufc47\ufc4a\ufc4b\ufc4e\ufc4f\ufc51\ufc52\ufc53\ufc55\ufc56\ufc58\ufc5a\ufc5b\ufc5c\ufc5d\ufc5e\ufc61\ufc62\ufc64\ufb51\ufb52\ufb54\ufb55\ufb57\ufb58\ufb5a\ufb5b\ufb5d\ufb5e\ufb60\ufb61\ufb63\ufb64\ufb66\ufb67\ufb69\ufb6a\ufb6c\ufb6d\ufb6f\ufb70\ufb72\ufb73\ufb75\ufb76\ufb78\ufb79\ufb7b\ufb7c\ufb7e\ufb7f\ufb81\ufb82\ufb84\ufb85\ufb87\ufb88\ufb8a\ufb8b\ufb8d\ufb8e\ufb90\ufb91\ufb93\ufb94\ufb96\ufb97\ufb99\ufb9a\ufb9c\ufb9d\ufb9f\ufba0\ufba2\ufba3\ufba5\ufba6\ufba8\ufba9\ufbab\ufbac\ufbae\ufbaf\ufbb1\ufbb2\ufbb4\ufbb5\ufbb7\ufbb8\ufbba\ufbbb\ufbbd\ufbbe\ufbc0\ufbc1\ufbd3\ufbd4\ufbd6\ufbd7\ufbd9\ufbda\ufbdc\ufbdd\ufbdf\ufbe0\ufbe2\ufbe3\ufbe5\ufbe6\ufbe8\ufbe9\ufbeb';

export function getSurahNameGlyph(surahNumber: number): string {
  if (surahNumber < 1 || surahNumber > SURAH_NAME_GLYPHS.length) return '';
  return SURAH_NAME_GLYPHS.charAt(surahNumber - 1);
}

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
