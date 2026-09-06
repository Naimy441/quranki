/**
 * Small generic helpers shared by every reciter's per-ayah playback (see
 * `lib/reciter-dataset.ts` and `lib/recitation-cache.ts`) - filename/key formatting and the
 * word-highlight lookup used while a clip plays.
 */

/** 1-based word index plus start/end in the current audio file's clock. */
export type WordTiming = [word: number, fromMs: number, toMs: number];

export function recitationFileName(surahNumber: number, ayahNumber: number): string {
  const surah = String(surahNumber).padStart(3, '0');
  const ayah = String(ayahNumber).padStart(3, '0');
  return `${surah}${ayah}.mp3`;
}

export function recitationAyahKey(surahNumber: number, ayahNumber: number): string {
  return `${surahNumber}:${ayahNumber}`;
}

/** Last word whose start is at or before `timeMs` (1-based). `0` before the first stamp. */
export function wordAtTimeMs(words: WordTiming[], timeMs: number): number {
  if (!words.length) return 0;
  let index = -1;
  let lo = 0;
  let hi = words.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (words[mid][1] <= timeMs) {
      index = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (index < 0) return timeMs + 180 >= words[0][1] ? words[0][0] : 0;
  return words[index][0];
}
