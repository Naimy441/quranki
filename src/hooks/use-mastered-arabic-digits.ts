import { useMemo } from 'react';

import {
  arabicDigitMasteryKey,
  formatAppDigits,
  masteredArabicDigitsFromKey,
} from '@/lib/arabic-digits';
import { useProgressStore } from '@/store/progress-store';

/** Digits the learner has mastered. Stable unless that set changes. */
export function useMasteredArabicDigits(): Set<number> {
  const key = useProgressStore((state) => arabicDigitMasteryKey(state.progress));
  return useMemo(() => masteredArabicDigitsFromKey(key), [key]);
}

export function useAppDigits(text: string): string {
  const mastered = useMasteredArabicDigits();
  return formatAppDigits(text, mastered);
}
