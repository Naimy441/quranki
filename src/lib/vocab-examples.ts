import vocabExamplesData from '@/data/quran/vocab-examples.json';
import { studyForms } from '@/lib/arabic-display';
import type { Word } from '@/lib/levels';
import { getWordLemmaIds } from '@/lib/quran-lemmas';
import { getSurahAyahs } from '@/lib/quran-reader';
import type { ReaderWord } from '@/lib/quran-reader-types';

export interface VocabExampleRef {
  s: number;
  a: number;
  p: number;
  /** Highlight this many consecutive words starting at `p` (phrase cards). */
  n?: number;
  /** Highlight these 1-based word positions (non-contiguous pattern cards). */
  hits?: number[];
}

export interface VocabExample extends VocabExampleRef {
  w: string[];
  tr: string;
  words?: ReaderWord[];
}

type StoredExample = VocabExampleRef & { w?: string[]; tr?: string };

const examples = vocabExamplesData as Record<string, StoredExample | StoredExample[]>;

/** Keep vowels so لِمَ does not collide with لَم; drop shadda/recitation marks so لِّمَا matches لِمَا. */
function foldExampleSurface(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[\u0640\u0651\u06D6-\u06ED]/g, '')
    .replace(/\u0671/g, '\u0627');
}

function ayahPlainTranslation(ayah: { tr: { t?: string }[] }): string {
  return ayah.tr
    .map((part) => (part.t !== undefined ? part.t : ''))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function storedList(raw: StoredExample | StoredExample[] | undefined): StoredExample[] {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function hydrateExample(ref: StoredExample): VocabExample | undefined {
  const ayah = getSurahAyahs(ref.s).find((item) => item.a === ref.a);
  if (ayah) {
    return {
      s: ref.s,
      a: ref.a,
      p: ref.p,
      n: ref.n,
      hits: ref.hits,
      w: ayah.w.map((item) => item.ar.map((seg) => seg.t).join('')),
      tr: ayahPlainTranslation(ayah),
      words: ayah.w,
    };
  }
  if (ref.w && ref.tr) {
    return { s: ref.s, a: ref.a, p: ref.p, n: ref.n, hits: ref.hits, w: ref.w, tr: ref.tr };
  }
  return undefined;
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
    tr: ayahPlainTranslation(ayah),
    words: ayah.w,
  };
}

export function exampleSurface(example: VocabExample): string {
  return example.w[example.p - 1] ?? '';
}

export function getVocabExamples(word: Word): VocabExample[] {
  const stored = storedList(examples[word.id]).map(hydrateExample).filter((item): item is VocabExample => !!item);
  if (stored.length > 0) return stored;
  if (word.exampleOf) {
    const inherited = storedList(examples[word.exampleOf])
      .map(hydrateExample)
      .filter((item): item is VocabExample => !!item);
    if (inherited.length > 0) return inherited;
  }
  const fromVerse = exampleFromVerse(word);
  return fromVerse ? [fromVerse] : [];
}

export function getVocabExample(word: Word): VocabExample | undefined {
  return getVocabExamples(word)[0];
}
