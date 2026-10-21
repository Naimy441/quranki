import bismillahData from '@/data/quran/bismillah.json';
import surahIndexData from '@/data/quran/surah-index.json';

export interface SurahIndexEntry {
  n: number;
  ar: string;
  en: string;
  tr: string;
  nt: string;
  ac: number;
  rp: 'meccan' | 'medinan';
  b: boolean;
}

export interface ReaderWordSegment {
  t: string;
  c?: string;
}

export interface ReaderWord {
  p: number;
  ar: ReaderWordSegment[];
  en: ReaderWordSegment[];
  tl?: string;
  l?: number | number[];
  lm?: string;
  rt?: string;
  ps?: string;
  m?: { t: string; k: string; p: string; f: string[] }[];
}

export interface ReaderAyah {
  a: number;
  w: ReaderWord[];
  tr: { t?: string; n?: string; fn?: string }[];
}

export const SURAH_INDEX: SurahIndexEntry[] = surahIndexData as SurahIndexEntry[];
export const BISMILLAH_WORDS: ReaderWord[] = bismillahData as ReaderWord[];
export const SURAH_COUNT = SURAH_INDEX.length;

export function getSurahMeta(surahNumber: number): SurahIndexEntry | undefined {
  return SURAH_INDEX[surahNumber - 1];
}

const SURAH_NAME_GLYPHS =
  '\ufc45\ufc46\ufc47\ufc4a\ufc4b\ufc4e\ufc4f\ufc51\ufc52\ufc53\ufc55\ufc56\ufc58\ufc5a\ufc5b\ufc5c\ufc5d\ufc5e\ufc61\ufc62\ufc64\ufb51\ufb52\ufb54\ufb55\ufb57\ufb58\ufb5a\ufb5b\ufb5d\ufb5e\ufb60\ufb61\ufb63\ufb64\ufb66\ufb67\ufb69\ufb6a\ufb6c\ufb6d\ufb6f\ufb70\ufb72\ufb73\ufb75\ufb76\ufb78\ufb79\ufb7b\ufb7c\ufb7e\ufb7f\ufb81\ufb82\ufb84\ufb85\ufb87\ufb88\ufb8a\ufb8b\ufb8d\ufb8e\ufb90\ufb91\ufb93\ufb94\ufb96\ufb97\ufb99\ufb9a\ufb9c\ufb9d\ufb9f\ufba0\ufba2\ufba3\ufba5\ufba6\ufba8\ufba9\ufbab\ufbac\ufbae\ufbaf\ufbb1\ufbb2\ufbb4\ufbb5\ufbb7\ufbb8\ufbba\ufbbb\ufbbd\ufbbe\ufbc0\ufbc1\ufbd3\ufbd4\ufbd6\ufbd7\ufbd9\ufbda\ufbdc\ufbdd\ufbdf\ufbe0\ufbe2\ufbe3\ufbe5\ufbe6\ufbe8\ufbe9\ufbeb';

export function getSurahNameGlyph(surahNumber: number): string {
  if (surahNumber < 1 || surahNumber > SURAH_NAME_GLYPHS.length) return '';
  return SURAH_NAME_GLYPHS.charAt(surahNumber - 1);
}

const surahCache = new Map<number, ReaderAyah[]>();

export async function fetchSurahAyahs(surahNumber: number): Promise<ReaderAyah[]> {
  if (surahNumber < 1 || surahNumber > 114) return [];
  const cached = surahCache.get(surahNumber);
  if (cached) return cached;

  const pad = String(surahNumber).padStart(3, '0');
  try {
    const res = await fetch(`/data/surahs/${pad}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ayahs = (await res.json()) as ReaderAyah[];
    surahCache.set(surahNumber, ayahs);
    return ayahs;
  } catch (e) {
    console.error(`Failed to fetch surah ${surahNumber}:`, e);
    return [];
  }
}
