/**
 * Color palettes for the Quran reader.
 *
 * Word-by-word gloss colors are a lighter, decorative categorization of the translation's part
 * of speech (`n` noun, `v` verb, `pn` proper noun, `p` particle, `paren` clarifying aside,
 * `punc` punctuation), tuned to sit comfortably alongside the app's green brand accent.
 */

type SchemeColors = { light: string; dark: string };

export const TajweedColors: Record<string, SchemeColors> = {
  ham_wasl: { light: '#AAAAAA', dark: '#8B8F8C' }, slnt: { light: '#AAAAAA', dark: '#8B8F8C' }, laam_shamsiyah: { light: '#AAAAAA', dark: '#8B8F8C' },
  madda_normal: { light: '#537FFF', dark: '#7C9CFF' }, madda_permissible: { light: '#4050FF', dark: '#6B7BFF' }, madda_necessary: { light: '#000EBC', dark: '#5C6DFF' },
  madda_obligatory_mottasel: { light: '#2144C1', dark: '#6079E8' }, madda_obligatory_monfasel: { light: '#2144C1', dark: '#6079E8' },
  qalaqah: { light: '#1B9E4B', dark: '#3DDB70' }, ikhafa: { light: '#D61F26', dark: '#FF5A5F' }, ikhafa_shafawi: { light: '#D61F26', dark: '#FF5A5F' },
  idgham_shafawi: { light: '#8B2FC9', dark: '#C77DFF' }, idgham_ghunnah: { light: '#8B2FC9', dark: '#C77DFF' }, idgham_wo_ghunnah: { light: '#8A8A8A', dark: '#B0B0B0' },
  idgham_mutajanisayn: { light: '#8A8A8A', dark: '#B0B0B0' }, idgham_mutaqaribayn: { light: '#8A8A8A', dark: '#B0B0B0' },
  iqlab: { light: '#1876D2', dark: '#4EA3F5' }, ghunnah: { light: '#FF7E1E', dark: '#FF9A47' },
};

export function tajweedColor(cls: string | undefined, scheme: 'light' | 'dark', fallback: string): string {
  return cls ? (TajweedColors[cls]?.[scheme] ?? fallback) : fallback;
}

export const GlossColors: Record<string, SchemeColors> = {
  v: { light: '#1E8E5A', dark: '#34C77E' },
  n: { light: '#2E7FC7', dark: '#5AA6E0' },
  pn: { light: '#9333EA', dark: '#B27CF0' },
  p: { light: '#8A93A6', dark: '#8C99AC' },
  paren: { light: '#AEB6C4', dark: '#6E7787' },
};

export function glossColor(cls: string | undefined, scheme: 'light' | 'dark', fallback: string): string {
  if (!cls) return fallback;
  return GlossColors[cls]?.[scheme] ?? fallback;
}
