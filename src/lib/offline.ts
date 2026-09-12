import * as Network from 'expo-network';

import { hapticWarning } from '@/lib/haptics';
import { useSnackbarStore } from '@/store/snackbar-store';

const OFFLINE_HINT =
  /offline|network request failed|failed to fetch|internet connection|not connected|unreachable|could not connect|connection lost|the internet connection appears to be offline|nsurlerror|eai_again|enetunreach|enotfound/i;

export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    if (state.type === Network.NetworkStateType.NONE) return false;
    if (state.isConnected === false) return false;
    if (state.isInternetReachable === false) return false;
    return true;
  } catch {
    // Native module missing (needs a rebuild) or the check itself failed - let the
    // real request run, then `notifyIfOffline` can still catch a network error.
    return true;
  }
}

export function looksOffline(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return OFFLINE_HINT.test(message);
}

let lastNotifyAt = 0;

export function notifyOffline(): void {
  const now = Date.now();
  if (now - lastNotifyAt > 800) hapticWarning();
  lastNotifyAt = now;
  useSnackbarStore.getState().showOffline();
}

/** Shows the offline snackbar and returns false when there is no usable connection. */
export async function requireOnline(): Promise<boolean> {
  if (await isOnline()) return true;
  notifyOffline();
  return false;
}

/** After a failed network attempt, show the snackbar if we look offline. */
export async function notifyIfOffline(error?: unknown): Promise<void> {
  if (error !== undefined && looksOffline(error)) {
    notifyOffline();
    return;
  }
  if (!(await isOnline())) notifyOffline();
}
