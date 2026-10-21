import vocabExampleOverrides from '@/data/quran/vocab-example-overrides.json';
import vocabExamplesData from '@/data/quran/vocab-examples.json';
import type { Word } from '@/lib/levels';

export interface VocabExampleRef {
  s: number;
  a: number;
  p: number;
  n?: number;
  hits?: number[];
}

type StoredExample = VocabExampleRef & { w?: string[]; tr?: string };

const examples = {
  ...(vocabExamplesData as Record<string, StoredExample | StoredExample[]>),
  ...(vocabExampleOverrides as Record<string, StoredExample | StoredExample[]>),
};

function storedList(raw: StoredExample | StoredExample[] | undefined): StoredExample[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

export function getVocabExampleRefs(word: Word): VocabExampleRef[] {
  return storedList(examples[word.id]);
}
