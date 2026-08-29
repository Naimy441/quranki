import morphologyIndexData from '@/data/quran/morphology-index.json';
import vocabLemmasData from '@/data/quran/vocab-lemmas.json';

export interface LemmaIndexEntry {
  count: number;
  arabic: string;
  root?: string;
  pos?: string;
}

export interface RootLemmaEntry {
  lemma: string;
  arabic: string;
  count: number;
}

export interface RootIndexEntry {
  count: number;
  lemmas: RootLemmaEntry[];
}

interface MorphologyIndex {
  lemmas: Record<string, LemmaIndexEntry>;
  roots: Record<string, RootIndexEntry>;
}

export interface VocabLemmaMapping {
  lemmas: string[];
  feats?: string[];
  excludeFeats?: string[];
}

const morphologyIndex = morphologyIndexData as MorphologyIndex;
const vocabLemmas = vocabLemmasData as Record<string, VocabLemmaMapping>;

const POS_LABEL: Record<string, string> = {
  N: 'Noun',
  V: 'Verb',
  P: 'Particle',
};

export function posLabel(pos: string | undefined): string | undefined {
  if (!pos) return undefined;
  return POS_LABEL[pos] ?? pos;
}

export function getLemmaEntry(lemma: string | undefined): LemmaIndexEntry | undefined {
  if (!lemma) return undefined;
  return morphologyIndex.lemmas[lemma];
}

export function getRootEntry(root: string | undefined): RootIndexEntry | undefined {
  if (!root) return undefined;
  return morphologyIndex.roots[root];
}

export function getVocabLemmas(vocabId: string | undefined): VocabLemmaMapping | undefined {
  if (!vocabId) return undefined;
  return vocabLemmas[vocabId];
}

/** How many Qur'an tokens share this corpus lemma (aligned ayahs only). */
export function getLemmaOccurrenceCount(lemma: string | undefined): number {
  return getLemmaEntry(lemma)?.count ?? 0;
}

/** Sum of corpus-lemma counts mapped to a study card. 0 if the card is not in the lemma map. */
export function getMappedLemmaOccurrenceCount(vocabId: string | undefined): number {
  const mapping = getVocabLemmas(vocabId);
  if (!mapping?.lemmas.length) return 0;
  let total = 0;
  for (const lemma of mapping.lemmas) total += getLemmaOccurrenceCount(lemma);
  return total;
}
