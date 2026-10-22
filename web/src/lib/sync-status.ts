import { create } from 'zustand';

/** Web-only view of the cloud sync state, written by `account-sync.ts`. */
export const useSyncStatus = create<{ syncing: boolean; error: string | null; lastSyncedAt: number | null }>(() => ({
  syncing: false,
  error: null,
  lastSyncedAt: null,
}));

export function noteSyncStart(): void {
  useSyncStatus.setState({ syncing: true });
}

export function noteSyncSuccess(): void {
  useSyncStatus.setState({ syncing: false, error: null, lastSyncedAt: Date.now() });
}

export function noteSyncError(error: unknown): void {
  useSyncStatus.setState({ syncing: false, error: error instanceof Error ? error.message : 'Sync failed' });
}
