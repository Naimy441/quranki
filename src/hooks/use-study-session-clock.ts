import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useProgressStore } from '@/store/progress-store';

const FLUSH_MS = 15_000;
const IDLE_CAP_MS = 180_000;
const MIN_FLUSH_MS = 250;

function countableMs(startedAt: number, lastTouch: number, now: number): number {
  return Math.max(0, Math.min(now, lastTouch + IDLE_CAP_MS) - startedAt);
}

/** Counts foreground time on the review screen and writes it into today's study total.
 *  Stops after three idle minutes until the next tap so a leftover card does not inflate the day. */
export function useStudySessionClock(active: boolean): {
  sessionMs: number;
  markInteraction: () => void;
  flushNow: () => number;
} {
  const recordStudyMs = useProgressStore((state) => state.recordStudyMs);
  const startedAt = useRef<number | null>(null);
  const lastTouch = useRef(Date.now());
  const sessionMsRef = useRef(0);
  const [sessionMs, setSessionMs] = useState(0);

  const flushNow = useCallback(() => {
    if (startedAt.current != null) {
      const now = Date.now();
      const counted = countableMs(startedAt.current, lastTouch.current, now);
      if (now >= lastTouch.current + IDLE_CAP_MS) {
        startedAt.current = null;
      } else {
        startedAt.current = now;
      }
      if (counted >= MIN_FLUSH_MS) {
        sessionMsRef.current += counted;
        recordStudyMs(counted);
      }
    }
    setSessionMs(sessionMsRef.current);
    return sessionMsRef.current;
  }, [recordStudyMs]);

  const markInteraction = useCallback(() => {
    lastTouch.current = Date.now();
    if (active && startedAt.current == null) startedAt.current = Date.now();
  }, [active]);

  useEffect(() => {
    if (!active) {
      flushNow();
      startedAt.current = null;
      return;
    }

    startedAt.current = Date.now();
    lastTouch.current = Date.now();

    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') {
        startedAt.current = Date.now();
        lastTouch.current = Date.now();
        return;
      }
      flushNow();
      startedAt.current = null;
    };

    const appSub = AppState.addEventListener('change', onAppState);
    const interval = setInterval(flushNow, FLUSH_MS);
    return () => {
      appSub.remove();
      clearInterval(interval);
      flushNow();
      startedAt.current = null;
    };
  }, [active, flushNow]);

  return { sessionMs, markInteraction, flushNow };
}
