/**
 * Quranki design tokens. Light theme is a clean, airy white; dark theme mirrors it with deep,
 * near-black surfaces. Green is the single brand accent across both themes.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#101913',
    textSecondary: '#5C6B62',
    textMuted: '#94A39B',
    background: '#FFFFFF',
    backgroundElement: '#F3F7F4',
    backgroundSelected: '#E4F1E8',
    border: '#E6ECE8',
    primary: '#1E8E5A',
    primaryDark: '#0F5C3C',
    onPrimary: '#FFFFFF',
    card: '#FFFFFF',
    danger: '#E5484D',
  },
  dark: {
    text: '#F2F6F3',
    textSecondary: '#9CB0A5',
    textMuted: '#6C7A73',
    background: '#0A0D0B',
    backgroundElement: '#151B17',
    backgroundSelected: '#1E2B23',
    border: '#232B26',
    primary: '#34C77E',
    primaryDark: '#1E8E5A',
    onPrimary: '#06140D',
    card: '#131916',
    danger: '#F1666B',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Colors for the four FSRS grading actions, consistent across themes. */
export const GradeColors = {
  again: { light: '#E5484D', dark: '#F1666B' },
  hard: { light: '#DE8A2E', dark: '#F0A64B' },
  good: { light: '#1E8E5A', dark: '#34C77E' },
  easy: { light: '#2E7FC7', dark: '#5AA6E0' },
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** Arabic display font family name, registered from the bundled Uthmanic Hafs v18 font asset. */
export const ArabicFont = 'UthmanicHafs1Ver18';

/**
 * Spread onto any Text style that sets `fontFamily: ArabicFont`, instead of setting the font
 * family alone. `UthmanicHafs1Ver18` is only registered as a single weight - if the surrounding
 * style (e.g. ThemedText's default type) also carries a numeric `fontWeight`, Android tries to
 * synthesize that missing weight by mechanically thickening the glyph strokes ("faux bold").
 * For this font's tightly-joined Arabic calligraphy, that thickening can bleed adjacent letters
 * into each other into an unreadable blob (iOS doesn't synthesize weights the same way, so this
 * only shows up on Android). Pinning `fontWeight: 'normal'` here keeps Android from ever
 * attempting that synthesis.
 */
export const ArabicTextStyle = { fontFamily: ArabicFont, fontWeight: 'normal' as const };

/**
 * Calligraphic surah-name headers (QCF FullSurah). One glyph per chapter, including "سورة".
 * The bundled file is the outline face — the original SVG color table is stripped because iOS
 * Core Text paints those glyphs in hardcoded black (invisible in dark mode) and React Native
 * Text often draws them as empty. Outlines follow `color` like the Uthmanic Hafs font.
 */
export const SurahNameFont = 'QCF_FullSurah';
export const SurahNameTextStyle = { fontFamily: SurahNameFont, fontWeight: 'normal' as const };

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 10,
  medium: 16,
  large: 22,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
