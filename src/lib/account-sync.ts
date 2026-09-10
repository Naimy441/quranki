/**
 * Cloud backup for optional accounts. Learned vocab ids, reader "known" lemma keys, and
 * Settings (theme, accent, reminder, reader prefs) are stored. Level unlock is recomputed
 * locally from the word ids.
 *
 * Writes never block grading: we debounce and run after interactions.
 */
import { InteractionManager, Platform } from 'react-native';

import { getValidIdToken, loadAccountSession } from '@/lib/account-auth';
import { FIREBASE_PROJECT_ID } from '@/lib/firebase-config';
import { sanitizeSettings, type Settings } from '@/lib/storage';
import { useKnownWordsStore } from '@/store/known-words-store';
import { useProgressStore } from '@/store/progress-store';

const PUSH_DEBOUNCE_MS = 2500;

export interface CloudLearningSnapshot {
  wordIds: string[];
  knownLemmas: string[];
  settings: Settings | null;
  onboardingCompleted: boolean;
  updatedAt: number;
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pushInFlight = false;
let pushAgain = false;
let syncing = false;
let scheduledSyncPaused = 0;

function documentUrl(uid: string): string {
  return `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}`;
}

function decodeStringArray(value: unknown): string[] {
  if (!value || typeof value !== 'object' || !('arrayValue' in value)) return [];
  const arrayValue = (value as { arrayValue?: { values?: unknown[] } }).arrayValue;
  const values = arrayValue?.values ?? [];
  const ids: string[] = [];
  for (const item of values) {
    if (item && typeof item === 'object' && 'stringValue' in item) {
      const text = (item as { stringValue?: string }).stringValue;
      if (text) ids.push(text);
    }
  }
  return ids;
}

function encodeStringArray(ids: string[]): { arrayValue: { values: { stringValue: string }[] } } {
  return { arrayValue: { values: ids.map((id) => ({ stringValue: id })) } };
}

function decodeSnapshot(payload: Record<string, unknown>): CloudLearningSnapshot {
  const fields = (payload.fields ?? {}) as Record<string, unknown>;
  const updatedRaw = fields.updatedAt;
  let updatedAt = 0;
  if (updatedRaw && typeof updatedRaw === 'object') {
    if ('integerValue' in updatedRaw) updatedAt = Number((updatedRaw as { integerValue: string }).integerValue);
    else if ('timestampValue' in updatedRaw) {
      updatedAt = Date.parse((updatedRaw as { timestampValue: string }).timestampValue) || 0;
    }
  }
  return {
    wordIds: decodeStringArray(fields.wordIds),
    knownLemmas: decodeStringArray(fields.knownLemmas),
    settings: fields.settings ? decodeSettings(fields.settings) : null,
    onboardingCompleted:
      fields.onboardingCompleted &&
      typeof fields.onboardingCompleted === 'object' &&
      'booleanValue' in fields.onboardingCompleted
        ? Boolean((fields.onboardingCompleted as { booleanValue: boolean }).booleanValue)
        : false,
    updatedAt,
  };
}

function decodeSettings(value: unknown): Settings {
  if (value && typeof value === 'object' && 'stringValue' in value) {
    const raw = (value as { stringValue?: string }).stringValue;
    if (raw) {
      try {
        return sanitizeSettings(JSON.parse(raw));
      } catch {
        return sanitizeSettings(null);
      }
    }
  }
  return sanitizeSettings(null);
}

function localSnapshot(): CloudLearningSnapshot {
  const progress = useProgressStore.getState();
  const known = useKnownWordsStore.getState();
  return {
    wordIds: Object.keys(progress.progress),
    knownLemmas: Object.keys(known.knownWords),
    settings: progress.settings,
    onboardingCompleted: progress.onboardingCompleted,
    updatedAt: Date.now(),
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

export async function pullCloudSnapshot(): Promise<CloudLearningSnapshot | null> {
  const session = await loadAccountSession();
  if (!session) return null;
  const response = await authorizedFetch(documentUrl(session.uid), { method: 'GET' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Could not load cloud progress.');
  return decodeSnapshot((await response.json()) as Record<string, unknown>);
}

export async function pushCloudSnapshot(snapshot: CloudLearningSnapshot = localSnapshot()): Promise<void> {
  const session = await loadAccountSession();
  if (!session) return;
  const uniqueWords = [...new Set(snapshot.wordIds)].sort();
  const uniqueKnown = [...new Set(snapshot.knownLemmas)].sort();
  const body = JSON.stringify({
    fields: {
      wordIds: encodeStringArray(uniqueWords),
      knownLemmas: encodeStringArray(uniqueKnown),
      settings: { stringValue: JSON.stringify(snapshot.settings ?? localSnapshot().settings) },
      onboardingCompleted: { booleanValue: snapshot.onboardingCompleted },
      updatedAt: { integerValue: String(snapshot.updatedAt) },
    },
  });
  const base = documentUrl(session.uid);
  const mask =
    'updateMask.fieldPaths=wordIds&updateMask.fieldPaths=knownLemmas&updateMask.fieldPaths=settings&updateMask.fieldPaths=onboardingCompleted&updateMask.fieldPaths=updatedAt';
  let response = await authorizedFetch(`${base}?${mask}`, { method: 'PATCH', body });
  if (response.status === 404) {
    response = await authorizedFetch(base, { method: 'PATCH', body });
  }
  if (!response.ok) throw new Error('Could not save cloud progress.');
}

function applyCloudSnapshot(remote: CloudLearningSnapshot): void {
  useProgressStore.getState().importLearnedWordIds(remote.wordIds);
  if (remote.settings) useProgressStore.getState().importSettings(remote.settings);
  if (remote.onboardingCompleted) useProgressStore.getState().setOnboardingCompleted(true);
  useKnownWordsStore.getState().mergeCloudKnownLemmas(remote.knownLemmas);
}

export async function mergeAccountCloud(): Promise<void> {
  if (syncing) return;
  if (Platform.OS === 'web' && typeof window === 'undefined') return;
  const session = await loadAccountSession();
  if (!session) return;
  syncing = true;
  scheduledSyncPaused += 1;
  try {
    const remote = await pullCloudSnapshot();
    if (remote) applyCloudSnapshot(remote);
    await pushCloudSnapshot(localSnapshot());
  } catch {
    // Offline or rules not deployed yet — local study keeps working.
  } finally {
    scheduledSyncPaused = Math.max(0, scheduledSyncPaused - 1);
    syncing = false;
    scheduleAccountSync();
  }
}

async function flushPush(): Promise<void> {
  if (pushInFlight) {
    pushAgain = true;
    return;
  }
  pushInFlight = true;
  try {
    if (!(await loadAccountSession())) return;
    await pushCloudSnapshot();
  } catch {
    // Ignore; the next local change or launch retries.
  } finally {
    pushInFlight = false;
    if (pushAgain) {
      pushAgain = false;
      scheduleAccountSync();
    }
  }
}

/** Debounced, after-interactions upload. Safe to call from gradeWord. */
export function scheduleAccountSync(): void {
  if (scheduledSyncPaused > 0) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    InteractionManager.runAfterInteractions(() => {
      void flushPush();
    });
  }, PUSH_DEBOUNCE_MS);
}
