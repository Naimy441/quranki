/**
 * Web version of the mobile reader data module. The mobile app bundles all 114 surahs and reads
 * them synchronously; the web fetches each surah's JSON on demand. `getSurahAyahs` keeps the
 * mobile signature: it returns the cached surah (or an empty list while it loads and starts the
 * download). Components re-render through `useQuranDataVersion` once data arrives.
 */
import { create } from 'zustand';

import bismillahData from '@/data/quran/bismillah.json';
import surahIndexData from '@/data/quran/surah-index.json';
import type { ReaderAyah, ReaderWord, SurahIndexEntry } from '@/lib/quran-reader-types';

export const SURAH_INDEX: SurahIndexEntry[] = surahIndexData as SurahIndexEntry[];
export const BISMILLAH_WORDS: ReaderWord[] = bismillahData as ReaderWord[];
export const SURAH_COUNT = SURAH_INDEX.length;

const SURAH_NAME_GLYPHS =
  'ﱅﱆﱇﱊﱋﱎﱏﱑﱒﱓﱕﱖﱘﱚﱛﱜﱝﱞﱡﱢﱤﭑﭒﭔﭕﭗﭘﭚﭛﭝﭞﭠﭡﭣﭤﭦﭧﭩﭪﭬﭭﭯﭰﭲﭳﭵﭶﭸﭹﭻﭼﭾﭿﮁﮂﮄﮅﮇﮈﮊﮋﮍﮎﮐﮑﮓﮔﮖﮗﮙﮚﮜﮝﮟﮠﮢﮣﮥﮦﮨﮩﮫﮬﮮﮯﮱ﮲﮴﮵﮷﮸﮺﮻﮽﮾﯀﯁ﯓﯔﯖﯗﯙﯚﯜﯝﯟﯠﯢﯣﯥﯦﯨﯩﯫ';

export function getSurahNameGlyph(surahNumber: number): string {
  if (surahNumber < 1 || surahNumber > SURAH_NAME_GLYPHS.length) return '';
  return SURAH_NAME_GLYPHS.charAt(surahNumber - 1);
}

export function getSurahMeta(surahNumber: number): SurahIndexEntry | undefined {
  return SURAH_INDEX[surahNumber - 1];
}

/** Bumps whenever a surah finishes loading so components reading `getSurahAyahs` re-render. */
export const useQuranDataVersion = create<{ version: number }>(() => ({ version: 0 }));

const cache = new Map<number, ReaderAyah[]>();
const inflight = new Map<number, Promise<ReaderAyah[]>>();
const EMPTY: ReaderAyah[] = [];

/** Fetches (once) and caches a surah. */
export function loadSurahAyahs(surahNumber: number): Promise<ReaderAyah[]> {
  if (surahNumber < 1 || surahNumber > SURAH_COUNT) return Promise.resolve(EMPTY);
  const cached = cache.get(surahNumber);
  if (cached) return Promise.resolve(cached);
  let pending = inflight.get(surahNumber);
  if (!pending) {
    pending = fetch(`/data/surahs/${String(surahNumber).padStart(3, '0')}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ReaderAyah[]>;
      })
      .then((ayahs) => {
        cache.set(surahNumber, ayahs);
        useQuranDataVersion.setState((s) => ({ version: s.version + 1 }));
        return ayahs;
      })
      .finally(() => inflight.delete(surahNumber));
    inflight.set(surahNumber, pending);
  }
  return pending;
}

/** Cached ayahs for a surah, or an empty list while it downloads (the download starts here). */
export function getSurahAyahs(surahNumber: number): ReaderAyah[] {
  const cached = cache.get(surahNumber);
  if (cached) return cached;
  if (typeof window !== 'undefined') void loadSurahAyahs(surahNumber).catch(() => {});
  return EMPTY;
}

export function isSurahLoaded(surahNumber: number): boolean {
  return cache.has(surahNumber);
}

/** Plain-text representation of an ayah for sharing/copying: surah + verse, Arabic, translation. */
export function buildAyahShareText(surahName: string, ayah: ReaderAyah): string {
  const arabic = ayah.w.map((word) => word.ar.map((seg) => seg.t).join('')).join(' ');
  const english = ayah.tr.map((part) => (part.t !== undefined ? part.t : `[${part.n}]`)).join('');
  return `${surahName} ${ayah.a}\n${arabic}\n${english}`;
}
