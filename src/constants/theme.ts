/**
 * Quranki design tokens. Light theme is a clean, airy white; dark theme mirrors it with deep,
 * near-black surfaces. The brand accent defaults to green and can be changed in Settings.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const ACCENT_IDS = [
  'green',
  'mint',
  'olive',
  'teal',
  'cyan',
  'blue',
  'navy',
  'indigo',
  'violet',
  'purple',
  'lavender',
  'magenta',
  'rose',
  'coral',
  'orange',
  'amber',
  'gold',
  'rust',
  'burgundy',
  'slate',
  'stone',
] as const;
export type AccentId = (typeof ACCENT_IDS)[number];
export const DEFAULT_ACCENT: AccentId = 'green';

export interface AccentTokens {
  primary: string;
  primaryDark: string;
  onPrimary: string;
  backgroundSelected: string;
}

export interface AccentOption {
  id: AccentId;
  label: string;
  light: AccentTokens;
  dark: AccentTokens;
}

/** Accent swatches shown in Settings. `green` matches the original brand tokens. */
export const ACCENTS: AccentOption[] = [
  {
    id: 'green',
    label: 'Green',
    light: { primary: '#1E8E5A', primaryDark: '#0F5C3C', onPrimary: '#FFFFFF', backgroundSelected: '#E4F1E8' },
    dark: { primary: '#34C77E', primaryDark: '#1E8E5A', onPrimary: '#06140D', backgroundSelected: '#1E2B23' },
  },
  {
    id: 'mint',
    label: 'Mint',
    light: { primary: '#2BA67A', primaryDark: '#1A6E52', onPrimary: '#FFFFFF', backgroundSelected: '#E5F6EF' },
    dark: { primary: '#5ED4A8', primaryDark: '#2BA67A', onPrimary: '#061510', backgroundSelected: '#162820' },
  },
  {
    id: 'olive',
    label: 'Olive',
    light: { primary: '#6B8A2A', primaryDark: '#45581A', onPrimary: '#FFFFFF', backgroundSelected: '#F1F4E4' },
    dark: { primary: '#A3C44A', primaryDark: '#6B8A2A', onPrimary: '#121408', backgroundSelected: '#222616' },
  },
  {
    id: 'teal',
    label: 'Teal',
    light: { primary: '#0F8A7D', primaryDark: '#0A5C54', onPrimary: '#FFFFFF', backgroundSelected: '#E3F4F2' },
    dark: { primary: '#3DC4B5', primaryDark: '#0F8A7D', onPrimary: '#041413', backgroundSelected: '#152422' },
  },
  {
    id: 'cyan',
    label: 'Cyan',
    light: { primary: '#0E8FA8', primaryDark: '#085E6E', onPrimary: '#FFFFFF', backgroundSelected: '#E3F5F8' },
    dark: { primary: '#4DCEE0', primaryDark: '#0E8FA8', onPrimary: '#041214', backgroundSelected: '#152428' },
  },
  {
    id: 'blue',
    label: 'Blue',
    light: { primary: '#2E7FC7', primaryDark: '#1A4F80', onPrimary: '#FFFFFF', backgroundSelected: '#E4F0F8' },
    dark: { primary: '#5AA6E0', primaryDark: '#2E7FC7', onPrimary: '#061018', backgroundSelected: '#16232D' },
  },
  {
    id: 'navy',
    label: 'Navy',
    light: { primary: '#2C4F8F', primaryDark: '#1A325C', onPrimary: '#FFFFFF', backgroundSelected: '#E6EAF3' },
    dark: { primary: '#6B8FD4', primaryDark: '#2C4F8F', onPrimary: '#080C14', backgroundSelected: '#161C28' },
  },
  {
    id: 'indigo',
    label: 'Indigo',
    light: { primary: '#5B5FC7', primaryDark: '#3A3D8A', onPrimary: '#FFFFFF', backgroundSelected: '#EBEBF8' },
    dark: { primary: '#8B8EE8', primaryDark: '#5B5FC7', onPrimary: '#0C0C18', backgroundSelected: '#1C1D2B' },
  },
  {
    id: 'violet',
    label: 'Violet',
    light: { primary: '#7C5CBF', primaryDark: '#4E3A7A', onPrimary: '#FFFFFF', backgroundSelected: '#F0EBF8' },
    dark: { primary: '#B49AE8', primaryDark: '#7C5CBF', onPrimary: '#100C18', backgroundSelected: '#221C2C' },
  },
  {
    id: 'purple',
    label: 'Purple',
    light: { primary: '#9A4BA8', primaryDark: '#63306E', onPrimary: '#FFFFFF', backgroundSelected: '#F5E8F7' },
    dark: { primary: '#D084DC', primaryDark: '#9A4BA8', onPrimary: '#140816', backgroundSelected: '#27182A' },
  },
  {
    id: 'lavender',
    label: 'Lavender',
    light: { primary: '#8B6BB5', primaryDark: '#584474', onPrimary: '#FFFFFF', backgroundSelected: '#F1ECF7' },
    dark: { primary: '#C4A8E8', primaryDark: '#8B6BB5', onPrimary: '#100C16', backgroundSelected: '#221C28' },
  },
  {
    id: 'magenta',
    label: 'Magenta',
    light: { primary: '#C43D8A', primaryDark: '#7A2456', onPrimary: '#FFFFFF', backgroundSelected: '#F8E6F1' },
    dark: { primary: '#E86BB0', primaryDark: '#C43D8A', onPrimary: '#160810', backgroundSelected: '#2A1824' },
  },
  {
    id: 'rose',
    label: 'Rose',
    light: { primary: '#C4476A', primaryDark: '#7A2A40', onPrimary: '#FFFFFF', backgroundSelected: '#F8E8EE' },
    dark: { primary: '#E85D8C', primaryDark: '#C4476A', onPrimary: '#16080D', backgroundSelected: '#2B1820' },
  },
  {
    id: 'coral',
    label: 'Coral',
    light: { primary: '#D45A4A', primaryDark: '#8A342C', onPrimary: '#FFFFFF', backgroundSelected: '#F8EBE8' },
    dark: { primary: '#F08A7A', primaryDark: '#D45A4A', onPrimary: '#180A08', backgroundSelected: '#2B1C1A' },
  },
  {
    id: 'orange',
    label: 'Orange',
    light: { primary: '#D46B1E', primaryDark: '#8A450F', onPrimary: '#FFFFFF', backgroundSelected: '#F8EDDF' },
    dark: { primary: '#F09A4A', primaryDark: '#D46B1E', onPrimary: '#160E06', backgroundSelected: '#2A1E14' },
  },
  {
    id: 'amber',
    label: 'Amber',
    light: { primary: '#D4940F', primaryDark: '#8A5E0A', onPrimary: '#FFFFFF', backgroundSelected: '#F8F1DC' },
    dark: { primary: '#F0B84A', primaryDark: '#D4940F', onPrimary: '#161208', backgroundSelected: '#2A2414' },
  },
  {
    id: 'gold',
    label: 'Gold',
    light: { primary: '#C4921A', primaryDark: '#7A5A10', onPrimary: '#FFFFFF', backgroundSelected: '#F8F1DC' },
    dark: { primary: '#E6B325', primaryDark: '#C4921A', onPrimary: '#161208', backgroundSelected: '#2A2414' },
  },
  {
    id: 'rust',
    label: 'Rust',
    light: { primary: '#B5522A', primaryDark: '#74361A', onPrimary: '#FFFFFF', backgroundSelected: '#F6EBE4' },
    dark: { primary: '#E07A4A', primaryDark: '#B5522A', onPrimary: '#160C08', backgroundSelected: '#2A1C16' },
  },
  {
    id: 'burgundy',
    label: 'Burgundy',
    light: { primary: '#9A2F4A', primaryDark: '#641E30', onPrimary: '#FFFFFF', backgroundSelected: '#F4E6EA' },
    dark: { primary: '#D45A78', primaryDark: '#9A2F4A', onPrimary: '#16080C', backgroundSelected: '#28161C' },
  },
  {
    id: 'slate',
    label: 'Slate',
    light: { primary: '#5A6E7A', primaryDark: '#3A4850', onPrimary: '#FFFFFF', backgroundSelected: '#E8EDF0' },
    dark: { primary: '#8AA0AC', primaryDark: '#5A6E7A', onPrimary: '#0C1012', backgroundSelected: '#1A2024' },
  },
  {
    id: 'stone',
    label: 'Stone',
    light: { primary: '#7A6B5C', primaryDark: '#4E453A', onPrimary: '#FFFFFF', backgroundSelected: '#F0EBE6' },
    dark: { primary: '#B8A898', primaryDark: '#7A6B5C', onPrimary: '#12100C', backgroundSelected: '#24201C' },
  },
];

export function isAccentId(value: unknown): value is AccentId {
  return typeof value === 'string' && (ACCENT_IDS as readonly string[]).includes(value);
}

export function getAccent(id: unknown): AccentOption {
  return ACCENTS.find((accent) => accent.id === id) ?? ACCENTS[0];
}

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

export type ThemeColors = {
  [K in keyof typeof Colors.light]: string;
};

export type ThemeColor = keyof ThemeColors;

export function resolveThemeColors(scheme: 'light' | 'dark', accentId: unknown): ThemeColors {
  const accent = getAccent(accentId)[scheme];
  return { ...Colors[scheme], ...accent };
}

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
