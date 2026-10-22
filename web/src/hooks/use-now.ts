'use client';

import { useEffect, useMemo } from 'react';
import { create } from 'zustand';

/** Shared wall clock for FSRS due checks, refreshed when the tab becomes visible again
 *  (mirrors the mobile `use-now` hook, which refreshes on app foreground). */
const useClockStore = create<{ nowMs: number; refreshNow: () => void }>((set) => ({
  nowMs: Date.now(),
  refreshNow: () => set({ nowMs: Date.now() }),
}));

let listening = false;
function ensureClockListener() {
  if (listening || typeof document === 'undefined') return;
  listening = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') useClockStore.getState().refreshNow();
  });
}

export function refreshNow(): void {
  useClockStore.getState().refreshNow();
}

/** Current time that updates on mount and whenever the tab comes back to the foreground. */
export function useNow(): Date {
  const nowMs = useClockStore((s) => s.nowMs);
  useEffect(() => {
    ensureClockListener();
    useClockStore.getState().refreshNow();
  }, []);
  return useMemo(() => new Date(nowMs), [nowMs]);
}

/** When a learning card comes due, bump the shared clock so the Learn hero updates in place. */
export function useRefreshNowAt(dueAtMs: number | null | undefined) {
  useEffect(() => {
    if (dueAtMs == null) return;
    const wait = dueAtMs - Date.now();
    if (wait > 3_600_000) return;
    if (wait <= 0) {
      refreshNow();
      return;
    }
    const id = setTimeout(refreshNow, wait + 250);
    return () => clearTimeout(id);
  }, [dueAtMs]);
}
