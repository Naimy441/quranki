/**
 * Local persistence for Quranki, backed by @react-native-async-storage/async-storage. Works
 * reliably across iOS, Android, and web (falls back to localStorage) with no extra native
 * configuration.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ProgressMap } from '@/lib/levels';

const PROGRESS_KEY = 'quranki:progress:v1';
const SETTINGS_KEY = 'quranki:settings:v1';
const META_KEY = 'quranki:meta:v1';

export interface Settings {
  wordsPerSession: number;
  ttsRate: number;
  themePreference: 'system' | 'light' | 'dark';
}

export interface Meta {
  maxUnlockedLevel: number;
  reviewDates: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  wordsPerSession: 5,
  ttsRate: 0.85,
  themePreference: 'system',
};

export const DEFAULT_META: Meta = {
  maxUnlockedLevel: 1,
  reviewDates: [],
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
  return safeParse(raw, DEFAULT_SETTINGS);
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

export async function resetAllAsync(): Promise<void> {
  await AsyncStorage.multiRemove([PROGRESS_KEY, SETTINGS_KEY, META_KEY]);
}
