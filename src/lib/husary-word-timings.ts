import { loadGappedWordTimings } from '@/data/quran/wbw-timings-loader';
import type { WordTiming } from '@/lib/recitation';

/** Word timestamps for one gapped Husary ayah, in that MP3's clock. */
export function getGappedAyahWordTimings(surahNumber: number, ayahNumber: number): WordTiming[] {
  return loadGappedWordTimings(surahNumber)[ayahNumber - 1] ?? [];
}
