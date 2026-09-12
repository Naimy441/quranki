import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { create } from 'zustand';

/** Shared wall clock for FSRS due checks. Screens that call `new Date()` only while
 *  rendering keep a frozen time after the app is backgrounded, so due cards stay hidden
 *  until a full reload. */
interface ClockState {
  nowMs: number;
  refreshNow: () => void;
}

const useClockStore = create<ClockState>((set) => ({
  nowMs: Date.now(),
  refreshNow: () => set({ nowMs: Date.now() }),
}));

let listening = false;

function ensureClockListener() {
  if (listening) return;
  listening = true;
  const onChange = (next: AppStateStatus) => {
    if (next === 'active') useClockStore.getState().refreshNow();
  };
  AppState.addEventListener('change', onChange);
}

/** Shared clock without a focus listener - safe in layouts that are not screens. */
export function useNowClock(): Date {
  const nowMs = useClockStore((state) => state.nowMs);

  useEffect(() => {
    ensureClockListener();
  }, []);

  return useMemo(() => new Date(nowMs), [nowMs]);
}

/** Current time that updates when the screen is focused or the app returns to the foreground. */
export function useNow(): Date {
  const now = useNowClock();
  const refreshNow = useClockStore((state) => state.refreshNow);

  useFocusEffect(
    useCallback(() => {
      refreshNow();
    }, [refreshNow]),
  );

  return now;
}

/** When a learning card comes due, bump the shared clock so the Learn hero updates in place. */
export function useRefreshNowAt(dueAtMs: number | null | undefined) {
  const refreshNow = useClockStore((state) => state.refreshNow);
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
  }, [dueAtMs, refreshNow]);
}
