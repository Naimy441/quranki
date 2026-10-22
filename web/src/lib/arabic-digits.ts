/**
 * Arabic-Indic digits (٠–٩) taught in Stage 2. A Western number in the UI switches only when
 * every digit in that run has been mastered: 1 → ١ after digit-1, 19 → ١٩ only after 1 and 9.
 */
import { deserializeCard, isWordMastered } from '@/lib/fsrs';
import type { ProgressMap } from '@/lib/levels';

export const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function arabicDigitWordId(digit: number): string {
  return `digit-${digit}`;
}

/** Sorted digits 0–9 that have graduated (Good/Easy review). */
export function arabicDigitMasteryKey(progress: ProgressMap): string {
  let key = '';
  for (let digit = 0; digit <= 9; digit += 1) {
    const entry = progress[arabicDigitWordId(digit)];
    if (!entry) continue;
    if (isWordMastered(deserializeCard(entry.card), entry.lastGrade)) key += String(digit);
  }
  return key;
}

export function masteredArabicDigitsFromKey(key: string): Set<number> {
  const mastered = new Set<number>();
  for (const ch of key) mastered.add(Number(ch));
  return mastered;
}

export function getMasteredArabicDigits(progress: ProgressMap): Set<number> {
  return masteredArabicDigitsFromKey(arabicDigitMasteryKey(progress));
}

/** Replace each run of Western digits iff every digit in that run is mastered. */
export function formatAppDigits(text: string, mastered: ReadonlySet<number>): string {
  if (!text || mastered.size === 0) return text;
  return text.replace(/\d+/g, (run) => {
    for (const ch of run) {
      if (!mastered.has(Number(ch))) return run;
    }
    return [...run].map((ch) => ARABIC_INDIC_DIGITS[Number(ch)] ?? ch).join('');
  });
}
