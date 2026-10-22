/**
 * Web version of the canonical per-ayah lemma lists. The mobile app imports the 2.6 MB
 * `quran-word-lemmas.json` directly; the web loads a compact copy
 * (`public/data/ayah-lemmas.json`, built by `scripts/build-ayah-lemmas.mjs`) on first use.
 * Until it arrives `getCanonicalAyahs()` returns an empty list and `useCanonicalReady` is false.
 */
import { create } from 'zustand';

import type { LemmaId } from '@/lib/quran-lemmas';

export interface CanonicalAyahWords {
  surah: number;
  ayah: number;
  words: readonly (readonly LemmaId[])[];
}

export const useCanonicalReady = create<{ ready: boolean }>(() => ({ ready: false }));

let canonical: CanonicalAyahWords[] = [];
let pending: Promise<CanonicalAyahWords[]> | null = null;

export function loadCanonicalAyahs(): Promise<CanonicalAyahWords[]> {
  if (canonical.length > 0) return Promise.resolve(canonical);
  pending ??= fetch('/data/ayah-lemmas.json')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<Record<string, LemmaId[][][]>>;
    })
    .then((data) => {
      const list: CanonicalAyahWords[] = [];
      for (const [surah, ayahs] of Object.entries(data)) {
        ayahs.forEach((words, index) => {
          if (words) list.push({ surah: Number(surah), ayah: index + 1, words });
        });
      }
      list.sort((a, b) => a.surah - b.surah || a.ayah - b.ayah);
      canonical = list;
      useCanonicalReady.setState({ ready: true });
      return list;
    })
    .catch((error) => {
      pending = null;
      throw error;
    });
  return pending;
}

/** Every ayah's lemma lists, or an empty list until `loadCanonicalAyahs` resolves. */
export function getCanonicalAyahs(): CanonicalAyahWords[] {
  if (canonical.length === 0 && typeof window !== 'undefined') void loadCanonicalAyahs().catch(() => {});
  return canonical;
}
