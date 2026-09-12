import { useMemo } from 'react';

import { hasUnlockedRuku, getRecognizedLemmaIds } from '@/lib/ruku';
import { useHifzStore } from '@/store/hifz-store';
import { useKnownWordsStore } from '@/store/known-words-store';
import { useProgressStore } from '@/store/progress-store';

/** True after the first ruku unlocks (or if anything is already enrolled). */
export function useHifzAvailable(): boolean {
  const progress = useProgressStore((state) => state.progress);
  const knownWords = useKnownWordsStore((state) => state.knownWords);
  const enrolledCount = useHifzStore((state) => state.enrolledRukuIds.length);
  const recognized = useMemo(
    () => getRecognizedLemmaIds(progress, knownWords),
    [knownWords, progress],
  );
  const unlocked = useMemo(() => hasUnlockedRuku(recognized), [recognized]);
  return enrolledCount > 0 || unlocked;
}
