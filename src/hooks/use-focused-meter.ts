import { useEffect } from 'react';
import {
  Easing,
  cancelAnimation,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

export const PROGRESS_METER_TIMING = {
  duration: 700,
  easing: Easing.bezier(0.16, 1, 0.3, 1),
};

function clamp01(value: number): number {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

/** Tweens a 0–1 meter from its current value to `target` while the screen is focused. */
export function useFocusedProgressValue(target: number, enabled: boolean) {
  const reduceMotion = useReducedMotion();
  const value = useSharedValue(0);

  useEffect(() => {
    if (!enabled) return;
    const next = clamp01(target);
    cancelAnimation(value);
    value.value = reduceMotion ? next : withTiming(next, PROGRESS_METER_TIMING);
  }, [enabled, reduceMotion, target, value]);

  return value;
}
