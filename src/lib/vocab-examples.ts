import vocabExamplesData from '@/data/quran/vocab-examples.json';
import type { Word } from '@/lib/levels';

export interface VocabExample {
  s: number;
  a: number;
  p: number;
  /** Highlight this many consecutive words starting at `p` (phrase cards). */
  n?: number;
  /** Highlight these 1-based word positions (non-contiguous pattern cards). */
  hits?: number[];
  w: string[];
  tr: string;
}

const examples = vocabExamplesData as Record<string, VocabExample>;

export function getVocabExample(word: Word): VocabExample | undefined {
  return examples[word.id] ?? (word.exampleOf ? examples[word.exampleOf] : undefined);
}
