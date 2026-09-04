import vocabExamplesData from '@/data/quran/vocab-examples.json';
import { studyForms } from '@/lib/arabic-display';
import type { Word } from '@/lib/levels';
import { getWordLemmaIds } from '@/lib/quran-lemmas';
import { getSurahAyahs } from '@/lib/quran-reader';

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

/** Keep vowels so لِمَ does not collide with لَم; drop shadda/recitation marks so لِّمَا matches لِمَا. */
function foldExampleSurface(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[\u0640\u0651\u06D6-\u06ED]/g, '')
    .replace(/\u0671/g, '\u0627');
}

function exampleFromVerse(word: Word): VocabExample | undefined {
  const verse = word.exampleVerse;
  if (!verse) return undefined;
  const ayah = getSurahAyahs(verse.s).find((item) => item.a === verse.a);
  if (!ayah) return undefined;
  const lemmaId = word.lemmaIds?.[0];
  const forms = studyForms(word).map(foldExampleSurface).filter(Boolean);
  const hit =
    (lemmaId === undefined
      ? undefined
      : ayah.w.find((item) => getWordLemmaIds(item).includes(lemmaId))) ??
    ayah.w.find((item) => forms.includes(foldExampleSurface(item.ar.map((seg) => seg.t).join(''))));
  if (!hit) return undefined;
  return {
    s: verse.s,
    a: verse.a,
    p: hit.p,
    w: ayah.w.map((item) => item.ar.map((seg) => seg.t).join('')),
    tr: ayah.tr
      .map((part) => (part.t !== undefined ? part.t : ''))
      .join('')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 180),
  };
}

export function getVocabExample(word: Word): VocabExample | undefined {
  return examples[word.id] ?? (word.exampleOf ? examples[word.exampleOf] : undefined) ?? exampleFromVerse(word);
}
