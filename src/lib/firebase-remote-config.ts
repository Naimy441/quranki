/**
 * Client fetch of Firebase Remote Config over the same REST surface the official SDK uses.
 * Quranki already talks to Firebase Storage with plain HTTP (see `lib/remote-dataset-cache.ts`);
 * Remote Config follows that pattern so a what's-new popup doesn't need a native Firebase SDK.
 *
 * Console parameters (Firebase → Remote Config):
 *   whats_new_id     store version this popup is for, e.g. 1.0.3 (bump for the next update)
 *   whats_new_title  heading (optional; defaults to "What's new")
 *   whats_new_body   message body (required with an id)
 *
 * Or one JSON parameter named `whats_new`:
 *   { "id": "1.0.3", "title": "What's new", "body": "…" }
 *
 * Dismissing stores that version locally. The popup stays gone until `whats_new_id` is a
 * newer version than the one they skipped (a later update), and it also stays hidden if
 * the installed app is already on that version or newer.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { FIREBASE_PROJECT_ID, firebaseAppConfig } from '@/lib/firebase-config';

const PROJECT_ID = FIREBASE_PROJECT_ID;
const INSTALLATIONS_SDK = 'w:0.6.4';
const AUTH_VERSION = 'FIS_v2';
const RC_SDK_VERSION = '11.0.0';
const FETCH_TTL_MS = 60 * 60 * 1000;
const TOKEN_REFRESH_SKEW_MS = 60 * 60 * 1000;

const INSTALLATION_KEY = 'quranki:firebase-installation:v1';
const CONFIG_CACHE_KEY = 'quranki:remote-config:v1';
const DISMISSED_KEY = 'quranki:whats-new:dismissed-id';
/** In-memory copy so a remount before AsyncStorage finishes writing still hides the popup. */
let dismissedIdMemory: string | null | undefined;

/** Extra AsyncStorage keys wiped by a full reset. */
export const REMOTE_CONFIG_STORAGE_KEYS = [INSTALLATION_KEY, CONFIG_CACHE_KEY, DISMISSED_KEY];

interface FirebaseAppConfig {
  apiKey: string;
  appId: string;
}

interface Installation {
  fid: string;
  refreshToken: string;
  authToken: string;
  authExpiresAt: number;
}

interface ConfigCache {
  entries: Record<string, string>;
  fetchedAt: number;
}

export interface WhatsNewAnnouncement {
  id: string;
  title: string;
  body: string;
}

function appConfig(): FirebaseAppConfig | null {
  return firebaseAppConfig();
}

function appVersion(): string {
  return Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? '1.0.0';
}

function parseExpiresIn(value: string | undefined, fallbackMs: number): number {
  const seconds = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(seconds) || seconds <= 0) return fallbackMs;
  return seconds * 1000;
}

function entryValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'stringValue' in value && typeof value.stringValue === 'string') {
    return value.stringValue;
  }
  return '';
}

function isVersionId(value: string): boolean {
  return /^\d+(\.\d+)*$/.test(value);
}

function compareVersions(a: string, b: string): number {
  const left = a.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const right = b.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const delta = (left[i] ?? 0) - (right[i] ?? 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

/** True when this announcement is a newer update than both the installed app and any skipped one. */
function shouldOfferUpdate(announcement: WhatsNewAnnouncement, dismissedId: string | null, installed: string): boolean {
  if (isVersionId(announcement.id)) {
    if (isVersionId(installed) && compareVersions(announcement.id, installed) <= 0) return false;
    if (dismissedId && isVersionId(dismissedId) && compareVersions(announcement.id, dismissedId) <= 0) return false;
  }
  return announcement.id !== dismissedId;
}

function parseAnnouncement(entries: Record<string, string>): WhatsNewAnnouncement | null {
  const packed = entries.whats_new?.trim();
  if (packed) {
    try {
      const parsed = JSON.parse(packed) as { id?: unknown; title?: unknown; body?: unknown; message?: unknown };
      const id = typeof parsed.id === 'string' ? parsed.id.trim() : '';
      const body = typeof parsed.body === 'string' ? parsed.body.trim() : typeof parsed.message === 'string' ? parsed.message.trim() : '';
      if (id && body) {
        const title = typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : "What's new";
        return { id, title, body };
      }
    } catch {
      // Fall through to the separate keys.
    }
  }
  const id = entries.whats_new_id?.trim();
  const body = (entries.whats_new_body ?? entries.whats_new_message)?.trim();
  if (!id || !body) return null;
  const title = entries.whats_new_title?.trim() || "What's new";
  return { id, title, body };
}

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function createInstallation(config: FirebaseAppConfig): Promise<Installation> {
  const response = await fetch(`https://firebaseinstallations.googleapis.com/v1/projects/${PROJECT_ID}/installations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
    body: JSON.stringify({
      appId: config.appId,
      authVersion: AUTH_VERSION,
      sdkVersion: INSTALLATIONS_SDK,
    }),
  });
  if (!response.ok) throw new Error(`installations ${response.status}`);
  const payload = (await response.json()) as {
    fid?: string;
    refreshToken?: string;
    authToken?: { token?: string; expiresIn?: string };
  };
  if (!payload.fid || !payload.refreshToken || !payload.authToken?.token) throw new Error('installations missing fields');
  return {
    fid: payload.fid,
    refreshToken: payload.refreshToken,
    authToken: payload.authToken.token,
    authExpiresAt: Date.now() + parseExpiresIn(payload.authToken.expiresIn, 7 * 24 * 60 * 60 * 1000) - TOKEN_REFRESH_SKEW_MS,
  };
}

async function refreshInstallation(config: FirebaseAppConfig, current: Installation): Promise<Installation> {
  const response = await fetch(
    `https://firebaseinstallations.googleapis.com/v1/projects/${PROJECT_ID}/installations/${current.fid}/authTokens:generate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.apiKey,
        Authorization: `${AUTH_VERSION} ${current.refreshToken}`,
      },
      body: JSON.stringify({ installation: { sdkVersion: INSTALLATIONS_SDK, appId: config.appId } }),
    },
  );
  if (!response.ok) throw new Error(`token refresh ${response.status}`);
  const payload = (await response.json()) as { token?: string; expiresIn?: string };
  if (!payload.token) throw new Error('token refresh missing token');
  return {
    ...current,
    authToken: payload.token,
    authExpiresAt: Date.now() + parseExpiresIn(payload.expiresIn, 7 * 24 * 60 * 60 * 1000) - TOKEN_REFRESH_SKEW_MS,
  };
}

async function getInstallation(config: FirebaseAppConfig): Promise<Installation> {
  const stored = await readJson<Installation>(INSTALLATION_KEY);
  if (stored?.fid && stored.refreshToken && stored.authToken) {
    if (stored.authExpiresAt > Date.now()) return stored;
    try {
      const refreshed = await refreshInstallation(config, stored);
      await AsyncStorage.setItem(INSTALLATION_KEY, JSON.stringify(refreshed));
      return refreshed;
    } catch {
      // Mint a new installation if the refresh token is no longer valid.
    }
  }
  const created = await createInstallation(config);
  await AsyncStorage.setItem(INSTALLATION_KEY, JSON.stringify(created));
  return created;
}

async function fetchEntries(config: FirebaseAppConfig, installation: Installation): Promise<Record<string, string>> {
  const response = await fetch(
    `https://firebaseremoteconfig.googleapis.com/v1/projects/${PROJECT_ID}/namespaces/firebase:fetch?key=${config.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: config.appId,
        app_instance_id: installation.fid,
        app_instance_id_token: installation.authToken,
        language_code: 'en-US',
        app_version: appVersion(),
        platform_version: String(Platform.Version),
        sdk_version: RC_SDK_VERSION,
      }),
    },
  );
  if (!response.ok) throw new Error(`remote config ${response.status}`);
  const payload = (await response.json()) as { entries?: Record<string, unknown> };
  const entries: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload.entries ?? {})) {
    const text = entryValue(value);
    if (text) entries[key] = text;
  }
  return entries;
}

async function loadEntries(force = false): Promise<Record<string, string>> {
  const cached = force ? null : await readJson<ConfigCache>(CONFIG_CACHE_KEY);
  if (cached && Date.now() - cached.fetchedAt < FETCH_TTL_MS) return cached.entries;
  const config = appConfig();
  if (!config) return cached?.entries ?? {};
  const installation = await getInstallation(config);
  const entries = await fetchEntries(config, installation);
  await AsyncStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify({ entries, fetchedAt: Date.now() } satisfies ConfigCache));
  return entries;
}

/** Returns the current what's-new announcement if this update hasn't been skipped and the
 *  installed app is still behind it. */
export async function loadUndismissedWhatsNew(): Promise<WhatsNewAnnouncement | null> {
  try {
    const [entries, storedDismissed] = await Promise.all([
      loadEntries(),
      dismissedIdMemory === undefined ? AsyncStorage.getItem(DISMISSED_KEY) : Promise.resolve(dismissedIdMemory),
    ]);
    const dismissedId = dismissedIdMemory ?? storedDismissed;
    if (dismissedIdMemory === undefined) dismissedIdMemory = dismissedId;
    const announcement = parseAnnouncement(entries);
    if (!announcement || !shouldOfferUpdate(announcement, dismissedId, appVersion())) return null;
    return announcement;
  } catch {
    return null;
  }
}

export async function dismissWhatsNew(id: string): Promise<void> {
  dismissedIdMemory = id;
  await AsyncStorage.setItem(DISMISSED_KEY, id);
}

const previewListeners = new Set<(announcement: WhatsNewAnnouncement) => void>();

/** Lets the root popup show an announcement on demand (dev tools). */
export function subscribeWhatsNewPreview(listener: (announcement: WhatsNewAnnouncement) => void): () => void {
  previewListeners.add(listener);
  return () => {
    previewListeners.delete(listener);
  };
}

const DEV_SAMPLE: WhatsNewAnnouncement = {
  id: '__dev_preview__',
  title: "What's new",
  body: 'This is a preview of the update popup. Set whats_new_id, whats_new_title, and whats_new_body in Firebase Remote Config to show a real announcement.',
};

/** Clears the dismiss flag, refetches Remote Config, and shows the popup. Falls back to sample
 *  copy when nothing is published yet so the UI can still be checked. */
export async function previewWhatsNew(): Promise<void> {
  dismissedIdMemory = null;
  await AsyncStorage.multiRemove([DISMISSED_KEY, CONFIG_CACHE_KEY]);
  let announcement: WhatsNewAnnouncement | null = null;
  try {
    announcement = parseAnnouncement(await loadEntries(true));
  } catch {
    announcement = null;
  }
  const next = announcement ?? DEV_SAMPLE;
  for (const listener of previewListeners) listener(next);
}
