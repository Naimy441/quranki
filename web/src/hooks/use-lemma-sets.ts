'use client';

import { useEffect, useMemo } from 'react';
import { getKnownLemmaIds } from '@/lib/known-words';
import { getHiddenLemmaIds, getMasteredLemmaIds, type ProgressMap } from '@/lib/levels';
import type { LemmaId } from '@/lib/quran-lemmas';
import { getRecognizedLemmaIds, hasUnlockedRuku } from '@/lib/ruku';
import { getQuranAyahUnderstandingSummary, countMemorizedQuranWords, TOTAL_QURAN_WORDS } from '@/lib/quran-coverage';
import { loadCanonicalAyahs, useCanonicalReady } from '@/lib/quran-lemma-index';
import { useHifzStore } from '@/store/hifz-store';
import { useKnownWordsStore } from '@/store/known-words-store';
import { useProgressStore } from '@/store/progress-store';

/** Mastered vocabulary plus reader-marked known lemmas (the set the reader coverage uses). */
export function useRecognizedLemmaIds(): Set<LemmaId> {
  const progress = useProgressStore((s) => s.progress);
  const knownWords = useKnownWordsStore((s) => s.knownWords);
  return useMemo(() => getRecognizedLemmaIds(progress, knownWords), [progress, knownWords]);
}

/** Lemmas whose gloss starts hidden in the reader: Learning or Review cards. */
export function useHiddenLemmaIds(): Set<LemmaId> {
  const progress = useProgressStore((s) => s.progress);
  return useMemo(() => getHiddenLemmaIds(progress), [progress]);
}

export function useKnownLemmaIds(): Set<LemmaId> {
  const knownWords = useKnownWordsStore((s) => s.knownWords);
  return useMemo(() => getKnownLemmaIds(knownWords), [knownWords]);
}

export function masteredPlusKnown(progress: ProgressMap, known: Set<LemmaId>): Set<LemmaId> {
  const ids = getMasteredLemmaIds(progress);
  for (const id of known) ids.add(id);
  return ids;
}

/** Quran coverage summary, or null until the canonical lemma index has loaded. */
export function useQuranCoverage() {
  const ready = useCanonicalReady((s) => s.ready);
  const recognized = useRecognizedLemmaIds();
  useEffect(() => {
    if (!ready) void loadCanonicalAyahs().catch(() => {});
  }, [ready]);
  return useMemo(() => {
    if (!ready) return null;
    const memorized = countMemorizedQuranWords(recognized);
    return {
      memorized,
      total: TOTAL_QURAN_WORDS,
      percentage: TOTAL_QURAN_WORDS > 0 ? (memorized / TOTAL_QURAN_WORDS) * 100 : 0,
      summary: getQuranAyahUnderstandingSummary(recognized),
    };
  }, [ready, recognized]);
}

/** True after the first ruku unlocks (or if anything is already enrolled). */
export function useHifzAvailable(): boolean {
  const ready = useCanonicalReady((s) => s.ready);
  const recognized = useRecognizedLemmaIds();
  const enrolledCount = useHifzStore((s) => s.enrolledRukuIds.length);
  useEffect(() => {
    if (!ready) void loadCanonicalAyahs().catch(() => {});
  }, [ready]);
  const unlocked = useMemo(() => ready && hasUnlockedRuku(recognized), [ready, recognized]);
  return enrolledCount > 0 || unlocked;
}
