/**
 * Local persistence for Quranki, backed by @react-native-async-storage/async-storage. Works
 * reliably across iOS, Android, and web (falls back to localStorage) with no extra native
 * configuration.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_ACCENT, isAccentId, type AccentId } from '@/constants/theme';
import { clampReminderHour, clampReminderMinute, DEFAULT_REMINDER_HOUR, DEFAULT_REMINDER_MINUTE } from '@/lib/practice-reminder';
import type { KnownWordsMap } from '@/lib/known-words';
import type { ProgressMap } from '@/lib/levels';
import { sanitizeHifzData, type HifzData } from '@/lib/hifz';
import { EMPTY_QURAN_MARKS, sanitizeQuranMarks, type QuranMarksData } from '@/lib/quran-marks';
import { DEFAULT_RECITER_KEY, isReciterKey } from '@/lib/reciters';
import { accountStorageKeys } from '@/lib/account-auth';
import { REMOTE_CONFIG_STORAGE_KEYS } from '@/lib/firebase-remote-config';
import { DEFAULT_TRANSLATION_KEY, isTranslationKey } from '@/lib/translations';
import { persistNativeThemePreference } from '@/lib/color-scheme';

const PROGRESS_KEY = 'quranki:progress:v1';
const SETTINGS_KEY = 'quranki:settings:v1';
const META_KEY = 'quranki:meta:v1';
const KNOWN_WORDS_KEY = 'quranki:known-words:v2';
const LEGACY_KNOWN_WORDS_KEY = 'quranki:known-words:v1';
const QURAN_MARKS_KEY = 'quranki:quran-marks:v1';
const HIFZ_KEY = 'quranki:hifz:v1';

export interface Settings {
  wordsPerSession: number;
  themePreference: 'system' | 'light' | 'dark';
  /** Brand accent used for buttons, progress, and selected states. Defaults to green. */
  accentColor: AccentId;
  readerArabicSize: number;
  readerGlossSize: number;
  readerShowTranslation: boolean;
  /** Whether the Quran reader shows the per-ayah vocabulary-coverage percentage. */
  readerShowAyahCoverage: boolean;
  /** Keep the Quran reader's optional transliteration enabled across sessions. */
  readerTransliteration: boolean;
  readerTransliterationSize: number;
  /** Daily local reminder to open a practice session. */
  reminderEnabled: boolean;
  /** Local hour (0–23) for the practice reminder. */
  reminderHour: number;
  /** Local minute (0–59) for the practice reminder. */
  reminderMinute: number;
  /** Which reciter+style plays Quran audio; see `lib/reciters.ts`. Every option downloads on
   *  demand from Firebase Storage the first time it's picked. */
  selectedReciterKey: string;
  /** Which English translation the reader shows; see `lib/translations.ts`. Every option besides
   *  the bundled default downloads on demand from Firebase Storage the first time it's picked. */
  selectedTranslationKey: string;
  /** Keeps the full ayah translation panel open for every ayah at all times, instead of only the
   *  ones the reader has tapped "Translate" on. */
  readerAlwaysShowTranslation: boolean;
  /** False when the learner asked to start with the Qaida. Existing installs default to true. */
  canReadQuran: boolean;
}

/** Inclusive bounds for the Settings "new words per day" slider. */
export const WORDS_PER_SESSION_MIN = 3;
export const WORDS_PER_SESSION_MAX = 30;

export function clampWordsPerSession(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.wordsPerSession;
  return Math.min(WORDS_PER_SESSION_MAX, Math.max(WORDS_PER_SESSION_MIN, Math.round(value)));
}

export interface Meta {
  maxUnlockedLevel: number;
  reviewDates: string[];
  /** Days protected by a one-day streak grace. They connect a streak but do not increase it. */
  streakGraceDates: string[];
  /** Calendar day (`YYYY-MM-DD`) that `reviewsToday` was last incremented. */
  reviewCountDate: string;
  /** How many Review-state cards have been graded on `reviewCountDate`. Caps the daily review
   *  queue at DAILY_REVIEW_LIMIT without touching new-word introductions. */
  reviewsToday: number;
  /** How many unseen words have been introduced on `reviewCountDate`. Caps the default day's
   *  new-card batch at the Settings "new words per day" value so finishing a session does not
   *  immediately deal another. The learner can still start another session by hand. */
  newCardsToday: number;
  /** Milliseconds spent in vocab or hifz sessions, keyed by local calendar day. */
  studyMsByDate: Record<string, number>;
  /** True once the first-launch explainer has been finished. Absent on older installs - hydrate
   *  infers it from existing progress so an update doesn't replay onboarding for current users. */
  onboardingCompleted?: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  wordsPerSession: 5,
  themePreference: 'system',
  accentColor: DEFAULT_ACCENT,
  readerArabicSize: 30,
  readerGlossSize: 15,
  readerShowTranslation: true,
  readerShowAyahCoverage: true,
  readerTransliteration: false,
  readerTransliterationSize: 13,
  reminderEnabled: false,
  reminderHour: DEFAULT_REMINDER_HOUR,
  reminderMinute: DEFAULT_REMINDER_MINUTE,
  selectedReciterKey: DEFAULT_RECITER_KEY,
  selectedTranslationKey: DEFAULT_TRANSLATION_KEY,
  readerAlwaysShowTranslation: false,
  canReadQuran: true,
};

export const DEFAULT_META: Meta = {
  maxUnlockedLevel: 1,
  reviewDates: [],
  streakGraceDates: [],
  reviewCountDate: '',
  reviewsToday: 0,
  newCardsToday: 0,
  studyMsByDate: {},
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

export async function loadProgressAsync(): Promise<ProgressMap> {
  const raw = await AsyncStorage.getItem(PROGRESS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ProgressMap;
  } catch {
    return {};
  }
}

export function saveProgressAsync(progress: ProgressMap): Promise<void> {
  return AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

/** Defaults missing keys; never treats an explicit `false` as "unset". */
function persistFlag(value: unknown, defaultValue: boolean): boolean {
  if (value === true) return true;
  if (value === false) return false;
  return defaultValue;
}

export function sanitizeSettings(value: unknown): Settings {
  if (!value || typeof value !== 'object') return DEFAULT_SETTINGS;
  return normalizeSettings({ ...DEFAULT_SETTINGS, ...(value as Partial<Settings>) });
}

function normalizeSettings(settings: Settings): Settings {
  return {
    ...settings,
    themePreference:
      settings.themePreference === 'light' || settings.themePreference === 'dark' || settings.themePreference === 'system'
        ? settings.themePreference
        : DEFAULT_SETTINGS.themePreference,
    wordsPerSession: clampWordsPerSession(settings.wordsPerSession),
    accentColor: isAccentId(settings.accentColor) ? settings.accentColor : DEFAULT_ACCENT,
    readerArabicSize: Number.isFinite(settings.readerArabicSize)
      ? Math.min(38, Math.max(18, settings.readerArabicSize))
      : DEFAULT_SETTINGS.readerArabicSize,
    readerGlossSize: Number.isFinite(settings.readerGlossSize)
      ? Math.min(19, Math.max(11, settings.readerGlossSize))
      : DEFAULT_SETTINGS.readerGlossSize,
    readerShowTranslation: persistFlag(settings.readerShowTranslation, DEFAULT_SETTINGS.readerShowTranslation),
    readerShowAyahCoverage: persistFlag(settings.readerShowAyahCoverage, DEFAULT_SETTINGS.readerShowAyahCoverage),
    readerTransliteration: persistFlag(settings.readerTransliteration, DEFAULT_SETTINGS.readerTransliteration),
    readerTransliterationSize: Number.isFinite(settings.readerTransliterationSize)
      ? Math.min(18, Math.max(10, settings.readerTransliterationSize))
      : DEFAULT_SETTINGS.readerTransliterationSize,
    reminderEnabled: persistFlag(settings.reminderEnabled, DEFAULT_SETTINGS.reminderEnabled),
    reminderHour: clampReminderHour(settings.reminderHour ?? DEFAULT_SETTINGS.reminderHour),
    reminderMinute: clampReminderMinute(settings.reminderMinute ?? DEFAULT_SETTINGS.reminderMinute),
    selectedReciterKey: isReciterKey(settings.selectedReciterKey) ? settings.selectedReciterKey : DEFAULT_RECITER_KEY,
    selectedTranslationKey: isTranslationKey(settings.selectedTranslationKey)
      ? settings.selectedTranslationKey
      : DEFAULT_TRANSLATION_KEY,
    readerAlwaysShowTranslation: persistFlag(
      settings.readerAlwaysShowTranslation,
      DEFAULT_SETTINGS.readerAlwaysShowTranslation,
    ),
    canReadQuran: persistFlag(settings.canReadQuran, DEFAULT_SETTINGS.canReadQuran),
  };
}

export async function loadSettingsAsync(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  return normalizeSettings(safeParse(raw, DEFAULT_SETTINGS));
}

let settingsWriteChain: Promise<void> = Promise.resolve();

export function saveSettingsAsync(settings: Settings): Promise<void> {
  const normalized = normalizeSettings(settings);
  persistNativeThemePreference(normalized.themePreference);
  const payload = JSON.stringify(normalized);
  const write = settingsWriteChain.then(() => AsyncStorage.setItem(SETTINGS_KEY, payload));
  settingsWriteChain = write.catch(() => undefined);
  return write;
}

export async function loadMetaAsync(): Promise<Meta> {
  const raw = await AsyncStorage.getItem(META_KEY);
  return safeParse(raw, DEFAULT_META);
}

export function saveMetaAsync(meta: Meta): Promise<void> {
  return AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
}

export async function loadKnownWordsAsync(): Promise<KnownWordsMap> {
  const raw = (await AsyncStorage.getItem(KNOWN_WORDS_KEY)) ?? (await AsyncStorage.getItem(LEGACY_KNOWN_WORDS_KEY));
  if (!raw) return {};
  try {
    return JSON.parse(raw) as KnownWordsMap;
  } catch {
    return {};
  }
}

export function saveKnownWordsAsync(knownWords: KnownWordsMap): Promise<void> {
  return AsyncStorage.setItem(KNOWN_WORDS_KEY, JSON.stringify(knownWords));
}

export async function loadQuranMarksAsync(): Promise<QuranMarksData> {
  const raw = await AsyncStorage.getItem(QURAN_MARKS_KEY);
  if (!raw) return EMPTY_QURAN_MARKS;
  try {
    return sanitizeQuranMarks(JSON.parse(raw));
  } catch {
    return EMPTY_QURAN_MARKS;
  }
}

export function saveQuranMarksAsync(data: QuranMarksData): Promise<void> {
  return AsyncStorage.setItem(QURAN_MARKS_KEY, JSON.stringify(data));
}

export async function loadHifzAsync(): Promise<HifzData> {
  const raw = await AsyncStorage.getItem(HIFZ_KEY);
  if (!raw) return sanitizeHifzData(null);
  try {
    return sanitizeHifzData(JSON.parse(raw));
  } catch {
    return sanitizeHifzData(null);
  }
}

export function saveHifzAsync(data: HifzData): Promise<void> {
  return AsyncStorage.setItem(HIFZ_KEY, JSON.stringify(data));
}

export async function resetAllAsync(): Promise<void> {
  await AsyncStorage.multiRemove([
    PROGRESS_KEY,
    SETTINGS_KEY,
    META_KEY,
    KNOWN_WORDS_KEY,
    LEGACY_KNOWN_WORDS_KEY,
    QURAN_MARKS_KEY,
    HIFZ_KEY,
    ...REMOTE_CONFIG_STORAGE_KEYS,
    ...accountStorageKeys(),
  ]);
}
