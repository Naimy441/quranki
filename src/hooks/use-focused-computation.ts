import { useIsFocused } from 'expo-router';
import { useRef } from 'react';

/** Runs `compute` only while this screen is focused. Covered tabs (a session on top of
 *  Learn/Progress) keep the last result instead of repeating heavy work on every grade. */
export function useFocusedComputation<T>(compute: () => T): T {
  const focused = useIsFocused();
  const cache = useRef<T | undefined>(undefined);
  if (focused || cache.current === undefined) {
    cache.current = compute();
  }
  return cache.current;
}
