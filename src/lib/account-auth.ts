/**
 * Optional Firebase Auth session: email + password. Tokens live in AsyncStorage so the
 * user stays signed in across launches.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { firebaseApiKey } from '@/lib/firebase-config';

const SESSION_KEY = 'quranki:account:v1';
const REFRESH_SKEW_MS = 60_000;
const MIN_PASSWORD_LENGTH = 6;

export interface AccountSession {
  uid: string;
  email: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}

let sessionMemory: AccountSession | null | undefined;
const sessionListeners = new Set<(session: AccountSession | null) => void>();

export function subscribeAccountSession(listener: (session: AccountSession | null) => void): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

export function accountStorageKeys(): string[] {
  return [SESSION_KEY];
}

function authUrl(path: string): string {
  const key = firebaseApiKey();
  if (!key) throw new Error('Firebase is not configured on this platform.');
  return `https://identitytoolkit.googleapis.com/v1/${path}?key=${key}`;
}

function tokenUrl(): string {
  const key = firebaseApiKey();
  if (!key) throw new Error('Firebase is not configured on this platform.');
  return `https://securetoken.googleapis.com/v1/token?key=${key}`;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const error = payload.error;
    const message =
      error && typeof error === 'object' && 'message' in error && typeof error.message === 'string'
        ? error.message
        : `Auth request failed (${response.status})`;
    throw new Error(friendlyAuthError(message));
  }
  return payload;
}

function friendlyAuthError(code: string): string {
  const normalized = code.toUpperCase();
  if (normalized.includes('INVALID_EMAIL')) return 'That email does not look valid.';
  if (normalized.includes('EMAIL_EXISTS')) return 'An account with that email already exists. Sign in instead.';
  if (normalized.includes('EMAIL_NOT_FOUND')) return 'No account with that email. Create one first.';
  if (normalized.includes('INVALID_LOGIN_CREDENTIALS') || normalized.includes('INVALID_PASSWORD')) {
    return 'Email or password is incorrect.';
  }
  if (normalized.includes('WEAK_PASSWORD')) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (normalized.includes('MISSING_PASSWORD')) return 'Enter a password.';
  if (normalized.includes('TOO_MANY_ATTEMPTS') || normalized.includes('QUOTA')) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  if (normalized.includes('USER_DISABLED')) return 'This account is disabled.';
  if (normalized.includes('MISSING_EMAIL')) return 'Enter your email first.';
  return 'Could not sign in. Check your connection and try again.';
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

export function isValidPassword(value: string): boolean {
  return value.length >= MIN_PASSWORD_LENGTH;
}

export async function loadAccountSession(): Promise<AccountSession | null> {
  if (sessionMemory !== undefined) return sessionMemory;
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    sessionMemory = raw ? (JSON.parse(raw) as AccountSession) : null;
  } catch {
    sessionMemory = null;
  }
  return sessionMemory;
}

async function persistSession(session: AccountSession | null): Promise<void> {
  sessionMemory = session;
  if (session) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else await AsyncStorage.removeItem(SESSION_KEY);
  for (const listener of sessionListeners) listener(session);
}

function sessionFromAuthPayload(payload: Record<string, unknown>, fallbackEmail: string): AccountSession {
  const idToken = typeof payload.idToken === 'string' ? payload.idToken : '';
  const refreshToken = typeof payload.refreshToken === 'string' ? payload.refreshToken : '';
  const uid = typeof payload.localId === 'string' ? payload.localId : '';
  const email = typeof payload.email === 'string' ? payload.email : fallbackEmail;
  const expiresIn = Number(payload.expiresIn ?? 3600);
  if (!idToken || !refreshToken || !uid) throw new Error('Sign-in did not return a session.');
  return {
    uid,
    email: normalizeEmail(email),
    idToken,
    refreshToken,
    expiresAt: Date.now() + Math.max(60, expiresIn) * 1000,
  };
}

async function authenticate(path: 'accounts:signInWithPassword' | 'accounts:signUp', email: string, password: string): Promise<AccountSession> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) throw new Error('That email does not look valid.');
  if (!isValidPassword(password)) throw new Error(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
  const response = await fetch(authUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: normalized, password, returnSecureToken: true }),
  });
  const payload = await readJson(response);
  const session = sessionFromAuthPayload(payload, normalized);
  await persistSession(session);
  return session;
}

export async function signInWithPassword(email: string, password: string): Promise<AccountSession> {
  return authenticate('accounts:signInWithPassword', email, password);
}

export async function createAccount(email: string, password: string): Promise<AccountSession> {
  return authenticate('accounts:signUp', email, password);
}

export async function refreshAccountSession(session: AccountSession): Promise<AccountSession> {
  const response = await fetch(tokenUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(session.refreshToken)}`,
  });
  const payload = await readJson(response);
  const idToken = typeof payload.id_token === 'string' ? payload.id_token : '';
  const refreshToken = typeof payload.refresh_token === 'string' ? payload.refresh_token : session.refreshToken;
  const expiresIn = Number(payload.expires_in ?? 3600);
  const uid = typeof payload.user_id === 'string' ? payload.user_id : session.uid;
  if (!idToken) throw new Error('Could not refresh your sign-in.');
  const next: AccountSession = {
    uid,
    email: session.email,
    idToken,
    refreshToken,
    expiresAt: Date.now() + Math.max(60, expiresIn) * 1000,
  };
  await persistSession(next);
  return next;
}

export async function getValidIdToken(): Promise<string | null> {
  const session = await loadAccountSession();
  if (!session) return null;
  if (session.expiresAt - REFRESH_SKEW_MS > Date.now()) return session.idToken;
  try {
    const refreshed = await refreshAccountSession(session);
    return refreshed.idToken;
  } catch {
    await persistSession(null);
    return null;
  }
}

export async function signOutAccount(): Promise<void> {
  await persistSession(null);
}
