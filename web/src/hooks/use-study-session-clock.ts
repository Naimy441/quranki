'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useProgressStore } from '@/store/progress-store';

const FLUSH_MS = 15_000;
const IDLE_CAP_MS = 180_000;
const MIN_FLUSH_MS = 250;

function countableMs(startedAt: number, lastTouch: number, now: number): number {
  return Math.max(0, Math.min(now, lastTouch + IDLE_CAP_MS) - startedAt);
}

/** Counts foreground time on a study screen into today's total. Stops after three idle minutes
 *  until the next interaction, like the mobile app. */
export function useStudySessionClock(active: boolean): {
  sessionMs: number;
  markInteraction: () => void;
  flushNow: () => number;
} {
  const recordStudyMs = useProgressStore((s) => s.recordStudyMs);
  const startedAt = useRef<number | null>(null);
  const lastTouch = useRef(Date.now());
  const sessionMsRef = useRef(0);
  const [sessionMs, setSessionMs] = useState(0);

  const flushNow = useCallback(() => {
    if (startedAt.current != null) {
      const now = Date.now();
      const counted = countableMs(startedAt.current, lastTouch.current, now);
      startedAt.current = now >= lastTouch.current + IDLE_CAP_MS ? null : now;
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
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        startedAt.current = Date.now();
        lastTouch.current = Date.now();
        return;
      }
      flushNow();
      startedAt.current = null;
    };
    const onActivity = () => markInteraction();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('pointerdown', onActivity);
    const interval = setInterval(flushNow, FLUSH_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('pointerdown', onActivity);
      clearInterval(interval);
      flushNow();
      startedAt.current = null;
    };
  }, [active, flushNow, markInteraction]);

  return { sessionMs, markInteraction, flushNow };
}
