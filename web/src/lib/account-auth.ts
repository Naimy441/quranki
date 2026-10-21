/**
 * Firebase Auth integration for Quranki Web: email + password.
 * Uses Firebase Identity Toolkit REST API (compatible with mobile app).
 */

export const FIREBASE_PROJECT_ID = 'quranki-506915';
export const FIREBASE_API_KEY = 'AIzaSyDF7zLexThLA3SbEUN64YiGDeLWLQURtnE';

const SESSION_STORAGE_KEY = 'quranki_account_session_v1';
const REFRESH_SKEW_MS = 60_000;
const MIN_PASSWORD_LENGTH = 6;

export interface AccountSession {
  uid: string;
  email: string;
  displayName?: string;
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

function authUrl(path: string): string {
  return `https://identitytoolkit.googleapis.com/v1/${path}?key=${FIREBASE_API_KEY}`;
}

function tokenUrl(): string {
  return `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`;
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

export function loadAccountSession(): AccountSession | null {
  if (typeof window === 'undefined') return null;
  if (sessionMemory !== undefined) return sessionMemory;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    sessionMemory = raw ? (JSON.parse(raw) as AccountSession) : null;
  } catch {
    sessionMemory = null;
  }
  return sessionMemory;
}

export function persistAccountSession(session: AccountSession | null): void {
  sessionMemory = session;
  if (typeof window === 'undefined') return;
  try {
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Failed to persist account session:', e);
  }
  for (const listener of sessionListeners) listener(session);
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

function sessionFromPayload(
  payload: Record<string, unknown>,
  fallbackEmail: string,
  fallbackDisplayName?: string,
): AccountSession {
  const idToken = typeof payload.idToken === 'string' ? payload.idToken : '';
  const refreshToken = typeof payload.refreshToken === 'string' ? payload.refreshToken : '';
  const uid = typeof payload.localId === 'string' ? payload.localId : '';
  const email = typeof payload.email === 'string' ? payload.email : fallbackEmail;
  const displayName = typeof payload.displayName === 'string' ? payload.displayName : fallbackDisplayName;
  const expiresIn = Number(payload.expiresIn ?? 3600);

  if (!idToken || !refreshToken || !uid) throw new Error('Sign-in did not return a session.');
  return {
    uid,
    email: normalizeEmail(email),
    displayName: displayName || email.split('@')[0],
    idToken,
    refreshToken,
    expiresAt: Date.now() + Math.max(60, expiresIn) * 1000,
  };
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

  if (!idToken) throw new Error('Could not refresh session.');
  const updated: AccountSession = {
    ...session,
    idToken,
    refreshToken,
    expiresAt: Date.now() + Math.max(60, expiresIn) * 1000,
  };
  persistAccountSession(updated);
  return updated;
}

export async function getValidIdToken(): Promise<string | null> {
  const session = loadAccountSession();
  if (!session) return null;
  if (Date.now() < session.expiresAt - REFRESH_SKEW_MS) return session.idToken;
  try {
    const refreshed = await refreshAccountSession(session);
    return refreshed.idToken;
  } catch {
    return session.idToken;
  }
}

export async function signInWithPassword(email: string, password: string): Promise<AccountSession> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) throw new Error('That email does not look valid.');
  if (!isValidPassword(password)) throw new Error(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);

  const response = await fetch(authUrl('accounts:signInWithPassword'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: normalized, password, returnSecureToken: true }),
  });
  const payload = await readJson(response);
  const session = sessionFromPayload(payload, normalized);
  persistAccountSession(session);
  return session;
}

export async function signUpWithPassword(
  email: string,
  password: string,
  displayName?: string,
): Promise<AccountSession> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) throw new Error('That email does not look valid.');
  if (!isValidPassword(password)) throw new Error(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);

  const response = await fetch(authUrl('accounts:signUp'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: normalized, password, returnSecureToken: true }),
  });
  const payload = await readJson(response);
  const session = sessionFromPayload(payload, normalized, displayName);

  // If displayName is provided, update profile
  if (displayName && session.idToken) {
    try {
      await fetch(authUrl('accounts:update'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: session.idToken,
          displayName,
          returnSecureToken: true,
        }),
      });
    } catch {
      // Ignore display name failure
    }
  }

  persistAccountSession(session);
  return session;
}

export function signOutAccount(): void {
  persistAccountSession(null);
}
