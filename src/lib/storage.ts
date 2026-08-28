/**
 * Local persistence for Quranki, backed by @react-native-async-storage/async-storage. Works
 * reliably across iOS, Android, and web (falls back to localStorage) with no extra native
 * configuration.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { KnownWordsMap } from '@/lib/known-words';
import type { ProgressMap } from '@/lib/levels';

const PROGRESS_KEY = 'quranki:progress:v1';
const SETTINGS_KEY = 'quranki:settings:v1';
const META_KEY = 'quranki:meta:v1';
const KNOWN_WORDS_KEY = 'quranki:known-words:v1';

export interface Settings {
  wordsPerSession: number;
  ttsRate: number;
  themePreference: 'system' | 'light' | 'dark';
}

/** Inclusive bounds for the Settings "new words per session" slider. */
export const WORDS_PER_SESSION_MIN = 3;
export const WORDS_PER_SESSION_MAX = 30;

export function clampWordsPerSession(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.wordsPerSession;
  return Math.min(WORDS_PER_SESSION_MAX, Math.max(WORDS_PER_SESSION_MIN, Math.round(value)));
}

export interface Meta {
  maxUnlockedLevel: number;
  reviewDates: string[];
  /** Calendar day (`YYYY-MM-DD`) that `reviewsToday` was last incremented. */
  reviewCountDate: string;
  /** How many Review-state cards have been graded on `reviewCountDate`. Caps the daily review
   *  queue at DAILY_REVIEW_LIMIT without touching new-word introductions. */
  reviewsToday: number;
  /** True once the first-launch explainer has been finished. Absent on older installs - hydrate
   *  infers it from existing progress so an update doesn't replay onboarding for current users. */
  onboardingCompleted?: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  wordsPerSession: 5,
  ttsRate: 0.85,
  themePreference: 'system',
};

export const DEFAULT_META: Meta = {
  maxUnlockedLevel: 1,
  reviewDates: [],
  reviewCountDate: '',
  reviewsToday: 0,
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

export async function loadSettingsAsync(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  const settings = safeParse(raw, DEFAULT_SETTINGS);
  return { ...settings, wordsPerSession: clampWordsPerSession(settings.wordsPerSession) };
}

export function saveSettingsAsync(settings: Settings): Promise<void> {
  return AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadMetaAsync(): Promise<Meta> {
  const raw = await AsyncStorage.getItem(META_KEY);
  return safeParse(raw, DEFAULT_META);
}

export function saveMetaAsync(meta: Meta): Promise<void> {
  return AsyncStorage.setItem(META_KEY, JSON.stringify(meta));
}

export async function loadKnownWordsAsync(): Promise<KnownWordsMap> {
  const raw = await AsyncStorage.getItem(KNOWN_WORDS_KEY);
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

export async function resetAllAsync(): Promise<void> {
  await AsyncStorage.multiRemove([PROGRESS_KEY, SETTINGS_KEY, META_KEY, KNOWN_WORDS_KEY]);
}
