import lemmaData from '@/data/quran-lemmas.json';
import type { ReaderWord } from '@/lib/quran-reader-types';

export type LemmaId = number;

export interface QuranLemma {
  id: LemmaId;
  arabic: string;
  /** Number of Quranic Arabic Corpus stem occurrences. */
  frequency: number;
}

interface QuranLemmaData {
  metadata: {
    schemaVersion: number;
    sourceVersion: string;
    lemmaCount: number;
    wordCount: number;
    excludedOpeningLetterWordCount: number;
    lemmaOccurrenceCount: number;
  };
  lemmas: QuranLemma[];
}

const data = lemmaData as QuranLemmaData;
const lemmaById = new Map(data.lemmas.map((lemma) => [lemma.id, lemma]));
const legacyIdsByArabic = new Map<string, LemmaId[]>();

function normalizeLegacyArabic(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[\u0640\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0624/g, '\u0648')
    .replace(/\u0626/g, '\u064a')
    .replace(/\u0649/g, '\u064a');
}

for (const lemma of data.lemmas) {
  const key = normalizeLegacyArabic(lemma.arabic);
  const ids = legacyIdsByArabic.get(key) ?? [];
  ids.push(lemma.id);
  legacyIdsByArabic.set(key, ids);
}

export const QURAN_LEMMA_COUNT = data.metadata.lemmaCount;
export const TOTAL_QURAN_WORDS = data.metadata.wordCount;

export function getQuranLemma(id: LemmaId | undefined): QuranLemma | undefined {
  return id === undefined ? undefined : lemmaById.get(id);
}

export function getWordLemmaIds(word: Pick<ReaderWord, 'l'> | null | undefined): LemmaId[] {
  if (word?.l === undefined) return [];
  return Array.isArray(word.l) ? word.l : [word.l];
}

export function hasEveryLemma(word: Pick<ReaderWord, 'l'>, recognized: Set<LemmaId>): boolean {
  const ids = getWordLemmaIds(word);
  return ids.length > 0 && ids.every((id) => recognized.has(id));
}

/** Counts only words that have at least one lemma id. Opening letters are omitted. */
export function ayahLemmaUnderstanding(
  words: readonly (readonly LemmaId[])[],
  recognizedLemmaIds: Set<LemmaId>,
): { knownWords: number; totalWords: number; ratio: number } {
  let totalWords = 0;
  let knownWords = 0;
  for (const lemmaIds of words) {
    if (lemmaIds.length === 0) continue;
    totalWords += 1;
    if (lemmaIds.every((id) => recognizedLemmaIds.has(id))) knownWords += 1;
  }
  return {
    knownWords,
    totalWords,
    ratio: totalWords === 0 ? 0 : knownWords / totalWords,
  };
}

export function lemmaStorageKey(id: LemmaId): string {
  return `qac:${id}`;
}

export function lemmaIdFromStorageKey(key: string): LemmaId | undefined {
  const match = /^qac:(\d+)$/.exec(key);
  if (!match) return undefined;
  const id = Number(match[1]);
  return lemmaById.has(id) ? id : undefined;
}

export function lemmaPeekKey(ids: readonly LemmaId[]): string {
  return `qac:${ids.join(',')}`;
}

/** Resolves the old `lem:<Arabic>` storage ids during the one-time v1 → v2 migration. The old
 * system deliberately collapsed vocalized QAC variants, so every matching canonical id is kept. */
export function getLemmaIdsForLegacyArabic(arabic: string): readonly LemmaId[] {
  return legacyIdsByArabic.get(normalizeLegacyArabic(arabic)) ?? [];
}
