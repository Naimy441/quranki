import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

import { Colors, Radius } from '@/constants/theme';

export const PaperLightTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: Radius.medium,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.light.primary,
    onPrimary: Colors.light.onPrimary,
    primaryContainer: Colors.light.backgroundSelected,
    onPrimaryContainer: Colors.light.primaryDark,
    secondary: Colors.light.primaryDark,
    background: Colors.light.background,
    onBackground: Colors.light.text,
    surface: Colors.light.card,
    onSurface: Colors.light.text,
    surfaceVariant: Colors.light.backgroundElement,
    onSurfaceVariant: Colors.light.textSecondary,
    outline: Colors.light.border,
    outlineVariant: Colors.light.border,
    error: Colors.light.danger,
  },
};

export const PaperDarkTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: Radius.medium,
  colors: {
    ...MD3DarkTheme.colors,
    primary: Colors.dark.primary,
    onPrimary: Colors.dark.onPrimary,
    primaryContainer: Colors.dark.backgroundSelected,
    onPrimaryContainer: Colors.dark.primary,
    secondary: Colors.dark.primary,
    background: Colors.dark.background,
    onBackground: Colors.dark.text,
    surface: Colors.dark.card,
    onSurface: Colors.dark.text,
    surfaceVariant: Colors.dark.backgroundElement,
    onSurfaceVariant: Colors.dark.textSecondary,
    outline: Colors.dark.border,
    outlineVariant: Colors.dark.border,
    error: Colors.dark.danger,
  },
};
