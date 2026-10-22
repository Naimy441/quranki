/**
 * Word-frequency facts for the blog, computed at build time from the Quranic Arabic Corpus
 * lemma counts. Server only: the source JSON is large, so never import this from a client file.
 */
import lemmaData from '@/data/quran-lemmas.json';

interface Lemma {
  id: number;
  arabic: string;
  frequency: number;
}

const { metadata, lemmas } = lemmaData as { metadata: { lemmaOccurrenceCount: number; wordCount: number }; lemmas: Lemma[] };

const ranked = [...lemmas].sort((a, b) => b.frequency - a.frequency);
const totalOccurrences = metadata.lemmaOccurrenceCount;

const cumulative: number[] = [];
ranked.reduce((sum, l) => {
  const next = sum + l.frequency;
  cumulative.push(next);
  return next;
}, 0);

export const QURAN_WORD_COUNT = metadata.wordCount;
export const UNIQUE_LEMMAS = ranked.length;

/** Percent of all word occurrences covered by the `n` most frequent lemmas. */
export function coverageAt(n: number): number {
  const i = Math.min(Math.max(n, 1), ranked.length) - 1;
  return (cumulative[i] / totalOccurrences) * 100;
}

/** Smallest number of top lemmas needed to reach `pct` coverage. */
export function wordsForCoverage(pct: number): number {
  const target = (pct / 100) * totalOccurrences;
  return cumulative.findIndex((c) => c >= target) + 1;
}

/** Points for a coverage curve, dense at the start where the curve bends. */
export function coverageCurve(max = ranked.length): { words: number; pct: number }[] {
  const pts: { words: number; pct: number }[] = [{ words: 0, pct: 0 }];
  for (let n = 1; n <= max; n++) {
    if (n <= 20 || (n <= 200 && n % 5 === 0) || (n <= 1000 && n % 25 === 0) || n % 100 === 0 || n === max) {
      pts.push({ words: n, pct: coverageAt(n) });
    }
  }
  return pts;
}

/** Compare spellings regardless of the order diacritics were typed in (shadda + fatha vs fatha + shadda). */
const spellingKey = (s: string) =>
  s.normalize('NFD').replace(/(\P{M})(\p{M}+)/gu, (_, base: string, marks: string) => base + [...marks].sort().join(''));

// Homographs share a spelling; keep the most frequent one, which comes first in `ranked`.
const frequencyBySpelling = new Map<string, number>();
for (const l of ranked) {
  const key = spellingKey(l.arabic);
  if (!frequencyBySpelling.has(key)) frequencyBySpelling.set(key, l.frequency);
}

export function frequencyOf(arabic: string): number {
  const freq = frequencyBySpelling.get(spellingKey(arabic));
  if (freq === undefined) throw new Error(`No corpus lemma spelled ${arabic}`);
  return freq;
}

/** How many lemmas appear a given number of times, grouped into readable bands. */
export function frequencyBands(): { label: string; count: number }[] {
  const bands: [string, number, number][] = [
    ['Once', 1, 1],
    ['2 to 4', 2, 4],
    ['5 to 9', 5, 9],
    ['10 to 49', 10, 49],
    ['50 to 99', 50, 99],
    ['100 to 499', 100, 499],
    ['500+', 500, Infinity],
  ];
  return bands.map(([label, lo, hi]) => ({
    label,
    count: ranked.filter((l) => l.frequency >= lo && l.frequency <= hi).length,
  }));
}
