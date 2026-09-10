import { create } from 'zustand';

import {
  createAccount as createAccountRemote,
  getValidIdToken,
  loadAccountSession,
  signInWithPassword,
  signOutAccount,
  subscribeAccountSession,
  type AccountSession,
} from '@/lib/account-auth';
import { mergeAccountCloud } from '@/lib/account-sync';

interface AccountState {
  hydrated: boolean;
  hydrating: boolean;
  uid: string | null;
  email: string | null;
  busy: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  createAccount: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

function applySession(session: AccountSession | null): Pick<AccountState, 'uid' | 'email'> {
  return {
    uid: session?.uid ?? null,
    email: session?.email ?? null,
  };
}

async function finishAuth(
  set: (partial: Partial<AccountState>) => void,
  run: () => Promise<AccountSession>,
): Promise<void> {
  set({ busy: true, error: null });
  try {
    const session = await run();
    set({ ...applySession(session), error: null });
    await mergeAccountCloud();
  } catch (error) {
    set({
      busy: false,
      error: error instanceof Error ? error.message : 'Could not sign in.',
    });
  }
}

export const useAccountStore = create<AccountState>((set, get) => ({
  hydrated: false,
  hydrating: false,
  uid: null,
  email: null,
  busy: false,
  error: null,

  hydrate: async () => {
    if (get().hydrated || get().hydrating) return;
    set({ hydrating: true });
    subscribeAccountSession((session) => {
      set(applySession(session));
    });
    const session = await loadAccountSession();
    set({
      hydrated: true,
      hydrating: false,
      ...applySession(session),
    });
    if (session) void getValidIdToken();
  },

  signIn: async (email, password) => {
    await finishAuth(set, () => signInWithPassword(email, password));
  },

  createAccount: async (email, password) => {
    await finishAuth(set, () => createAccountRemote(email, password));
  },

  signOut: async () => {
    set({ busy: true, error: null });
    await signOutAccount();
    set({ uid: null, email: null, busy: false });
  },

  clearError: () => {
    if (get().error) set({ error: null });
  },
}));
