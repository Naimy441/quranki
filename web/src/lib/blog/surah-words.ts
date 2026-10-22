/**
 * Word-by-word data for blog posts about specific surahs and the 99 Names. Server only.
 */
import fatiha from '../../../public/data/surahs/001.json';
import asma from '@/data/asma-ul-husna.json';
import lemmaData from '@/data/quran-lemmas.json';
import type { ReaderAyah } from '@/lib/quran-reader-types';

const { metadata, lemmas } = lemmaData as {
  metadata: { lemmaOccurrenceCount: number };
  lemmas: { id: number; arabic: string; frequency: number }[];
};
const lemmaById = new Map(lemmas.map((l) => [l.id, l]));
const lemmaIds = (l: number | number[] | undefined): number[] => (l === undefined ? [] : Array.isArray(l) ? l : [l]);

export interface StudyWord {
  ar: string;
  tl: string;
  en: string;
  lemma: string;
  lemmaId?: number;
  root?: string;
  /** Times this word's lemma appears anywhere in the Quran. */
  quranCount: number;
}

export interface StudyAyah {
  n: number;
  words: StudyWord[];
  translation: string;
}

export function surahStudy(ayahs: ReaderAyah[]): StudyAyah[] {
  return ayahs.map((a) => ({
    n: a.a,
    translation: a.tr.map((t) => t.t ?? '').join(''),
    words: a.w.map((w) => {
      // Multi-stem words list several lemmas; the last one is the content word after any prefix.
      const ids = lemmaIds(w.l);
      const lemma = lemmaById.get(ids[ids.length - 1]);
      return {
        ar: w.ar.map((s) => s.t).join(''),
        tl: w.tl ?? '',
        en: w.en.map((s) => s.t).join('').trim(),
        lemma: lemma?.arabic ?? '',
        lemmaId: lemma?.id,
        root: w.rt,
        quranCount: lemma?.frequency ?? 0,
      };
    }),
  }));
}

export const FATIHA = surahStudy(fatiha as ReaderAyah[]);

/** Distinct lemmas in a surah and the share of the whole Quran they cover. */
export function surahReach(ayahs: ReaderAyah[]): { words: number; unique: number; pct: number } {
  const ids = new Set<number>();
  let words = 0;
  for (const a of ayahs) {
    for (const w of a.w) {
      words++;
      for (const id of lemmaIds(w.l)) ids.add(id);
    }
  }
  const occ = [...ids].reduce((sum, id) => sum + (lemmaById.get(id)?.frequency ?? 0), 0);
  return { words, unique: ids.size, pct: (occ / metadata.lemmaOccurrenceCount) * 100 };
}

export const FATIHA_REACH = surahReach(fatiha as ReaderAyah[]);

export interface DivineName {
  n: number;
  ar: string;
  tl: string;
  en: string;
  verse?: { s: number; a: number };
}

export const NAMES: DivineName[] = (
  asma as { levels: { words: { id: string; arabic: string; english: string; transliteration?: string; exampleVerse?: { s: number; a: number } }[] }[] }
).levels
  .flatMap((l) => l.words)
  .filter((w) => w.id.startsWith('asma-') && w.id !== 'asma-000')
  .map((w) => ({
    n: Number(w.id.slice(5)),
    ar: w.arabic,
    tl: w.transliteration ?? '',
    en: w.english,
    verse: w.exampleVerse,
  }));
