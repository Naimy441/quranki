import { router } from 'expo-router';

import { hapticSelection } from '@/lib/haptics';
import { getSurahMeta } from '@/lib/quran-reader';
import { useQuranMarksStore } from '@/store/quran-marks-store';

let lastNavigationAt = 0;
const NAVIGATION_DEBOUNCE_MS = 800;

let readerMounts = 0;

/** The reader stays mounted under Saved / Settings, so a bookmark can update this
 *  instance instead of pushing a second `/quran/[surah]` on top. */
export function noteQuranReaderMounted() {
  readerMounts += 1;
  return () => {
    readerMounts -= 1;
  };
}

export type ReaderOpenTarget = {
  surah: number;
  ayah: number;
  play: boolean;
  token: number;
};

let pendingTarget: ReaderOpenTarget | null = null;

/** Latest open request for the mounted reader to apply on focus (`setParams` + optional play). */
export function getPendingReaderTarget(): ReaderOpenTarget | null {
  return pendingTarget;
}

export type OpenQuranLocationOptions = {
  /** Start reciting from this ayah through the end of the surah. */
  play?: boolean;
  /** Callers sitting on top of the reader (Saved) must set this so we pop back into the
   *  existing reader instead of pushing another one. */
  fromOverlay?: boolean;
};

/** Opens a surah in the reader, optionally scrolling to an ayah. Records the chapter in recents
 *  and, when an ayah is given, updates last-read so Continue points at that verse. */
export function openQuranLocation(surah: number, ayah?: number, options?: OpenQuranLocationOptions) {
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
  }

  const href = clampedAyah !== undefined ? `/quran/${surah}?ayah=${clampedAyah}` : `/quran/${surah}`;
  if (options?.fromOverlay || options?.play) {
    pendingTarget = {
      surah,
      ayah: clampedAyah ?? 1,
      play: Boolean(options?.play),
      token: now,
    };
  }

  // Saved (and similar) sit on top of the reader. Pop back so the same screen instance picks
  // up `pendingTarget` on focus. If the reader isn't mounted (Saved opened from the list),
  // replace this overlay so we don't leave Saved sitting under a new reader.
  if (options?.fromOverlay) {
    if (readerMounts > 0 && router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(href);
    return;
  }

  router.push(href);
}
