/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useProgressStore } from '@/store/progress-store';

/** Resolves the effective color scheme, honoring the user's Settings override. */
export function useAppColorScheme(): 'light' | 'dark' {
  const system = useColorScheme();
  const preference = useProgressStore((state) => state.settings.themePreference);

  if (preference === 'light' || preference === 'dark') return preference;
  return system === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  const scheme = useAppColorScheme();
  return Colors[scheme];
}
