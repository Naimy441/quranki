/**
 * Cloud sync for Quranki Web with Firestore.
 * Syncs learned words, reader bookmarks, settings, review dates, and streaks
 * with the Firestore database shared with the mobile app.
 */

import { getValidIdToken, loadAccountSession, FIREBASE_PROJECT_ID } from './account-auth';
import type { Bookmark, UserSettings } from './storage';

export interface RemoteSnapshot {
  wordIds: string[];
  knownLemmas: string[];
  settings: Partial<UserSettings> | null;
  onboardingCompleted: boolean;
  hifz: unknown;
  quranMarks: {
    lastRead?: unknown;
    recentSurahs?: unknown[];
    pins?: unknown[];
    pinPlacements?: unknown[];
    collections?: unknown[];
    bookmarks?: { id?: string; collectionId?: string; surah: number; ayah: number; createdAt?: string }[];
  };
  reviewDates: string[];
  streakGraceDates: string[];
  studyMsByDate: Record<string, number>;
  updatedAt: number;
}

const CLOUD_FIELD_PATHS = [
  'wordIds',
  'knownLemmas',
  'settings',
  'onboardingCompleted',
  'hifz',
  'quranMarks',
  'reviewDates',
  'streakGraceDates',
  'studyMsByDate',
  'updatedAt',
] as const;

let cachedRemoteSnapshot: RemoteSnapshot | null = null;

function documentUrl(uid: string): string {
  return `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}`;
}

function decodeStringArray(value: unknown): string[] {
  if (!value || typeof value !== 'object' || !('arrayValue' in value)) return [];
  const arrayValue = (value as { arrayValue?: { values?: unknown[] } }).arrayValue;
  const values = arrayValue?.values ?? [];
  const items: string[] = [];
  for (const item of values) {
    if (item && typeof item === 'object' && 'stringValue' in item) {
      const text = (item as { stringValue?: string }).stringValue;
      if (text) items.push(text);
    }
  }
  return items;
}

function encodeStringArray(items: string[]): { arrayValue: { values: { stringValue: string }[] } } {
  return { arrayValue: { values: items.map((s) => ({ stringValue: s })) } };
}

function encodeJson(value: unknown): { stringValue: string } {
  return { stringValue: JSON.stringify(value) };
}

function decodeJson<T>(value: unknown, fallback: T): T {
  if (value && typeof value === 'object' && 'stringValue' in value) {
    const raw = (value as { stringValue?: string }).stringValue;
    if (raw) {
      try {
        return JSON.parse(raw) as T;
      } catch {
        return fallback;
      }
    }
  }
  return fallback;
}

function sanitizeDayKeys(keys: string[]): string[] {
  return Array.from(new Set(keys.filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)))).sort();
}

function mapSettingsFromRemote(remoteSettings: Record<string, unknown> | null): Partial<UserSettings> {
  if (!remoteSettings) return {};
  const s: Partial<UserSettings> = {};

  if (typeof remoteSettings.wordsPerSession === 'number') s.wordsPerSession = remoteSettings.wordsPerSession;
  if (typeof remoteSettings.dailyReviewLimit === 'number') s.dailyReviewLimit = remoteSettings.dailyReviewLimit;
  if (typeof remoteSettings.selectedReciterKey === 'string') s.selectedReciterKey = remoteSettings.selectedReciterKey;

  const fontAr = remoteSettings.readerArabicFontSize ?? remoteSettings.readerArabicSize;
  if (typeof fontAr === 'number') s.readerArabicFontSize = fontAr;

  const fontTrans = remoteSettings.readerTranslationFontSize ?? remoteSettings.readerGlossSize;
  if (typeof fontTrans === 'number') s.readerTranslationFontSize = fontTrans;

  if (typeof remoteSettings.readerShowTranslation === 'boolean') s.readerShowTranslation = remoteSettings.readerShowTranslation;
  if (typeof remoteSettings.readerShowWbwGloss === 'boolean') s.readerShowWbwGloss = remoteSettings.readerShowWbwGloss;

  const translit = remoteSettings.readerShowWbwTransliteration ?? remoteSettings.readerTransliteration;
  if (typeof translit === 'boolean') s.readerShowWbwTransliteration = translit;

  if (typeof remoteSettings.readerShowTajweed === 'boolean') s.readerShowTajweed = remoteSettings.readerShowTajweed;
  if (typeof remoteSettings.readerHideLearnedWords === 'boolean') s.readerHideLearnedWords = remoteSettings.readerHideLearnedWords;
  if (typeof remoteSettings.canReadQuran === 'boolean') s.canReadQuran = remoteSettings.canReadQuran;

  const theme = remoteSettings.theme ?? remoteSettings.themePreference;
  if (theme === 'light' || theme === 'dark' || theme === 'system') s.theme = theme;

  return s;
}

function mapSettingsToRemote(localSettings: UserSettings, existingRemote: Record<string, unknown> | null): Record<string, unknown> {
  return {
    ...(existingRemote || {}),
    wordsPerSession: localSettings.wordsPerSession,
    dailyReviewLimit: localSettings.dailyReviewLimit,
    selectedReciterKey: localSettings.selectedReciterKey,
    readerArabicFontSize: localSettings.readerArabicFontSize,
    readerArabicSize: localSettings.readerArabicFontSize,
    readerTranslationFontSize: localSettings.readerTranslationFontSize,
    readerGlossSize: localSettings.readerTranslationFontSize,
    readerShowTranslation: localSettings.readerShowTranslation,
    readerShowWbwGloss: localSettings.readerShowWbwGloss,
    readerShowWbwTransliteration: localSettings.readerShowWbwTransliteration,
    readerTransliteration: localSettings.readerShowWbwTransliteration,
    readerShowTajweed: localSettings.readerShowTajweed,
    readerHideLearnedWords: localSettings.readerHideLearnedWords,
    canReadQuran: localSettings.canReadQuran,
    theme: localSettings.theme,
    themePreference: localSettings.theme,
  };
}

function decodeSnapshot(payload: Record<string, unknown>): RemoteSnapshot {
  const fields = (payload.fields ?? {}) as Record<string, unknown>;
  const updatedRaw = fields.updatedAt;
  let updatedAt = 0;
  if (updatedRaw && typeof updatedRaw === 'object') {
    if ('integerValue' in updatedRaw) updatedAt = Number((updatedRaw as { integerValue: string }).integerValue);
    else if ('timestampValue' in updatedRaw) {
      updatedAt = Date.parse((updatedRaw as { timestampValue: string }).timestampValue) || 0;
    }
  }

  const rawSettings = fields.settings ? decodeJson<Record<string, unknown>>(fields.settings, {}) : null;

  return {
    wordIds: decodeStringArray(fields.wordIds),
    knownLemmas: decodeStringArray(fields.knownLemmas),
    settings: rawSettings ? mapSettingsFromRemote(rawSettings) : null,
    onboardingCompleted:
      fields.onboardingCompleted &&
      typeof fields.onboardingCompleted === 'object' &&
      'booleanValue' in fields.onboardingCompleted
        ? Boolean((fields.onboardingCompleted as { booleanValue: boolean }).booleanValue)
        : false,
    hifz: decodeJson(fields.hifz, { enrolledRukuIds: [], cards: {} }),
    quranMarks: decodeJson(fields.quranMarks, { bookmarks: [] }),
    reviewDates: sanitizeDayKeys(decodeStringArray(fields.reviewDates)),
    streakGraceDates: sanitizeDayKeys(decodeStringArray(fields.streakGraceDates)),
    studyMsByDate: decodeJson<Record<string, number>>(fields.studyMsByDate, {}),
    updatedAt,
  };
}

async function authorizedFetch(url: string, init: RequestInit): Promise<Response> {
  const token = await getValidIdToken();
  if (!token) throw new Error('Not signed in.');
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

export async function pullCloudSnapshot(): Promise<RemoteSnapshot | null> {
  const session = loadAccountSession();
  if (!session) return null;

  try {
    const response = await authorizedFetch(documentUrl(session.uid), { method: 'GET' });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Failed to fetch cloud progress (${response.status})`);
    }
    const payload = (await response.json()) as Record<string, unknown>;
    const snapshot = decodeSnapshot(payload);
    cachedRemoteSnapshot = snapshot;
    return snapshot;
  } catch (e) {
    console.warn('Could not load cloud progress:', e);
    throw e;
  }
}

export interface LocalSyncPayload {
  wordIds: string[];
  settings: UserSettings;
  bookmarks: Bookmark[];
  reviewDates: string[];
  studySeconds: number;
  hasCompletedOnboarding: boolean;
}

export async function pushCloudSnapshot(local: LocalSyncPayload): Promise<void> {
  const session = loadAccountSession();
  if (!session) return;

  const baseRemote = cachedRemoteSnapshot;
  const uniqueWords = [...new Set([...(baseRemote?.wordIds || []), ...local.wordIds])].sort();
  const uniqueDates = sanitizeDayKeys([...(baseRemote?.reviewDates || []), ...local.reviewDates]);

  // Merge bookmarks with existing remote quranMarks.bookmarks
  const existingBookmarks = (baseRemote?.quranMarks?.bookmarks as {
    id?: string;
    collectionId?: string;
    surah: number;
    ayah: number;
    createdAt?: string;
  }[]) || [];

  const localBookmarkSet = new Set(local.bookmarks.map((b) => `${b.surah}:${b.ayah}`));
  // Keep existing that are still bookmarked
  const retainedExisting = existingBookmarks.filter((b) => localBookmarkSet.has(`${b.surah}:${b.ayah}`));
  const retainedSet = new Set(retainedExisting.map((b) => `${b.surah}:${b.ayah}`));

  // Add new bookmarks from web
  const addedBookmarks = local.bookmarks
    .filter((b) => !retainedSet.has(`${b.surah}:${b.ayah}`))
    .map((b) => ({
      id: `web-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      collectionId: '',
      surah: b.surah,
      ayah: b.ayah,
      createdAt: new Date().toISOString(),
    }));

  const mergedMarks = {
    ...(baseRemote?.quranMarks || {}),
    bookmarks: [...retainedExisting, ...addedBookmarks],
  };

  // Convert studySeconds to studyMsByDate for today
  const todayKey = new Date().toISOString().split('T')[0];
  const studyMsByDate = { ...(baseRemote?.studyMsByDate || {}) };
  if (local.studySeconds > 0) {
    studyMsByDate[todayKey] = Math.max(studyMsByDate[todayKey] || 0, local.studySeconds * 1000);
  }

  const mergedSettings = mapSettingsToRemote(
    local.settings,
    (baseRemote?.settings as Record<string, unknown>) || null
  );

  const body = JSON.stringify({
    fields: {
      wordIds: encodeStringArray(uniqueWords),
      knownLemmas: encodeStringArray(baseRemote?.knownLemmas || []),
      settings: encodeJson(mergedSettings),
      onboardingCompleted: { booleanValue: local.hasCompletedOnboarding || Boolean(baseRemote?.onboardingCompleted) },
      hifz: encodeJson(baseRemote?.hifz || { enrolledRukuIds: [], cards: {} }),
      quranMarks: encodeJson(mergedMarks),
      reviewDates: encodeStringArray(uniqueDates),
      streakGraceDates: encodeStringArray(baseRemote?.streakGraceDates || []),
      studyMsByDate: encodeJson(studyMsByDate),
      updatedAt: { integerValue: String(Date.now()) },
    },
  });

  const base = documentUrl(session.uid);
  const mask = CLOUD_FIELD_PATHS.map((path) => `updateMask.fieldPaths=${path}`).join('&');

  let response = await authorizedFetch(`${base}?${mask}`, { method: 'PATCH', body });
  if (response.status === 404) {
    response = await authorizedFetch(base, { method: 'PATCH', body });
  }
  if (!response.ok) {
    throw new Error(`Failed to save cloud progress (${response.status})`);
  }
}
