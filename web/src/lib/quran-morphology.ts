import morphologyIndexData from '@/data/quran/morphology-index.json';

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
  roots: Record<string, RootIndexEntry>;
}

const morphologyIndex = morphologyIndexData as MorphologyIndex;

const POS_LABEL: Record<string, string> = {
  N: 'Noun',
  V: 'Verb',
  P: 'Particle',
};

export function posLabel(pos: string | undefined): string | undefined {
  if (!pos) return undefined;
  return POS_LABEL[pos] ?? pos;
}

export function getRootEntry(root: string | undefined): RootIndexEntry | undefined {
  if (!root) return undefined;
  return morphologyIndex.roots[root];
}
