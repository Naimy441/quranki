import { router } from 'expo-router';

import { hapticSelection } from '@/lib/haptics';
import { getSurahMeta } from '@/lib/quran-reader';
import { useQuranMarksStore } from '@/store/quran-marks-store';

let lastNavigationAt = 0;
const NAVIGATION_DEBOUNCE_MS = 800;

/** Opens a surah in the reader, optionally scrolling to an ayah. Records the chapter in recents
 *  and, when an ayah is given, updates last-read so Continue points at that verse. */
export function openQuranLocation(surah: number, ayah?: number) {
  const now = Date.now();
  if (now - lastNavigationAt < NAVIGATION_DEBOUNCE_MS) return;
  lastNavigationAt = now;

  const meta = getSurahMeta(surah);
  if (!meta) return;

  const clampedAyah = ayah !== undefined ? Math.max(1, Math.min(meta.ac, Math.round(ayah))) : undefined;
  hapticSelection();
  useQuranMarksStore.getState().noteOpenedSurah(surah);
  if (clampedAyah !== undefined) {
    useQuranMarksStore.getState().setLastRead(surah, clampedAyah);
    router.push(`/quran/${surah}?ayah=${clampedAyah}`);
    return;
  }
  router.push(`/quran/${surah}`);
}
