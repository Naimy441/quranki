/**
 * The first web releases kept everything in one localStorage blob (`quranki_web_data_v1`) with
 * their own field names. The web now uses the mobile app's storage modules and keys, so move
 * that data across once, before the stores hydrate.
 */
import { sanitizeQuranMarks } from '@/lib/quran-marks';
import { sanitizeDayKeys, sanitizeStudyMsByDate } from '@/lib/stats';

const LEGACY_KEY = 'quranki_web_data_v1';

export function migrateLegacyWebData(): void {
  if (typeof window === 'undefined') return;
  let raw: string | null;
  try {
    raw = localStorage.getItem(LEGACY_KEY);
  } catch {
    return;
  }
  if (!raw) return;
  try {
    const old = JSON.parse(raw) as Record<string, any>;
    const has = (key: string) => localStorage.getItem(key) !== null;

    if (!has('quranki:progress:v1') && old.progress && typeof old.progress === 'object') {
      localStorage.setItem('quranki:progress:v1', JSON.stringify(old.progress));
    }

    if (!has('quranki:settings:v1') && old.settings && typeof old.settings === 'object') {
      const s = old.settings;
      const settings: Record<string, unknown> = {
        wordsPerSession: s.wordsPerSession,
        themePreference: s.theme ?? s.themePreference,
        readerArabicSize: s.readerArabicFontSize ?? s.readerArabicSize,
        readerGlossSize: s.readerTranslationFontSize ?? s.readerGlossSize,
        readerShowTranslation: s.readerShowWbwGloss ?? s.readerShowTranslation,
        readerAlwaysShowTranslation: s.readerShowTranslation,
        readerTransliteration: s.readerShowWbwTransliteration,
        selectedReciterKey: s.selectedReciterKey,
        canReadQuran: s.canReadQuran,
        readerShowTajweed: s.readerShowTajweed,
        readerMode: s.readerMode,
        autoPlayWordAudio: s.autoPlayWordAudio,
      };
      for (const key of Object.keys(settings)) if (settings[key] === undefined) delete settings[key];
      localStorage.setItem('quranki:settings:v1', JSON.stringify(settings));
    }

    if (!has('quranki:meta:v1')) {
      localStorage.setItem(
        'quranki:meta:v1',
        JSON.stringify({
          maxUnlockedLevel: Number(old.maxUnlockedLevel) || 1,
          reviewDates: sanitizeDayKeys(Array.isArray(old.reviewDates) ? old.reviewDates : []),
          streakGraceDates: sanitizeDayKeys(Array.isArray(old.streakGraceDates) ? old.streakGraceDates : []),
          reviewCountDate: '',
          reviewsToday: 0,
          newCardsToday: 0,
          studyMsByDate: sanitizeStudyMsByDate(old.studyMsByDate),
          onboardingCompleted: Boolean(old.hasCompletedOnboarding),
        }),
      );
    }

    if (!has('quranki:known-words:v2') && Array.isArray(old.knownLemmas)) {
      const known: Record<string, { sampleArabic: string; addedAt: string }> = {};
      const addedAt = new Date().toISOString();
      for (const key of old.knownLemmas) if (typeof key === 'string') known[key] = { sampleArabic: '', addedAt };
      localStorage.setItem('quranki:known-words:v2', JSON.stringify(known));
    }

    if (!has('quranki:quran-marks:v1') && old.quranMarks) {
      localStorage.setItem('quranki:quran-marks:v1', JSON.stringify(sanitizeQuranMarks(old.quranMarks)));
    }

    if (!has('quranki:hifz:v1') && old.hifz && typeof old.hifz === 'object') {
      localStorage.setItem('quranki:hifz:v1', JSON.stringify(old.hifz));
    }

    localStorage.removeItem(LEGACY_KEY);
  } catch (error) {
    console.warn('Could not migrate earlier web data', error);
  }
}
