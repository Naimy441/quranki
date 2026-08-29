import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

import { Radius, type ThemeColors } from '@/constants/theme';

export function createPaperTheme(scheme: 'light' | 'dark', colors: ThemeColors): MD3Theme {
  const base = scheme === 'dark' ? MD3DarkTheme : MD3LightTheme;
  return {
    ...base,
    roundness: Radius.medium,
    colors: {
      ...base.colors,
      primary: colors.primary,
      onPrimary: colors.onPrimary,
      primaryContainer: colors.backgroundSelected,
      onPrimaryContainer: scheme === 'dark' ? colors.primary : colors.primaryDark,
      secondary: scheme === 'dark' ? colors.primary : colors.primaryDark,
      background: colors.background,
      onBackground: colors.text,
      surface: colors.card,
      onSurface: colors.text,
      surfaceVariant: colors.backgroundElement,
      onSurfaceVariant: colors.textSecondary,
      outline: colors.border,
      outlineVariant: colors.border,
      error: colors.danger,
    },
  };
}
