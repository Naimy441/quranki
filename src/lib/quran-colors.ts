/**
 * Color palettes for the Qur'an reader.
 *
 * Tajweed colors follow the standard scheme popularized by the Qatar/Bahrain "colour-coded"
 * Mushaf (the same rule-to-color mapping used across most tajweed apps), adapted with brighter
 * dark-mode variants for contrast against a near-black background.
 *
 * Word-by-word gloss colors are a lighter, decorative categorization of the translation's part
 * of speech (`n` noun, `v` verb, `pn` proper noun, `p` particle, `paren` clarifying aside,
 * `punc` punctuation), tuned to sit comfortably alongside the app's green brand accent.
 */

type SchemeColors = { light: string; dark: string };

export const TajweedColors: Record<string, SchemeColors> = {
  ham_wasl: { light: '#AAAAAA', dark: '#8B8F8C' },
  slnt: { light: '#AAAAAA', dark: '#8B8F8C' },
  laam_shamsiyah: { light: '#AAAAAA', dark: '#8B8F8C' },
  madda_normal: { light: '#537FFF', dark: '#7C9CFF' },
  madda_permissible: { light: '#4050FF', dark: '#6B7BFF' },
  madda_necessary: { light: '#000EBC', dark: '#5C6DFF' },
  madda_obligatory_mottasel: { light: '#2144C1', dark: '#6079E8' },
  madda_obligatory_monfasel: { light: '#2144C1', dark: '#6079E8' },
  qalaqah: { light: '#DD0008', dark: '#FF5A5F' },
  ikhafa: { light: '#9400A8', dark: '#D470E0' },
  ikhafa_shafawi: { light: '#D500B7', dark: '#F06FDD' },
  idgham_shafawi: { light: '#58B800', dark: '#7FDB2E' },
  idgham_ghunnah: { light: '#169777', dark: '#3AC9A8' },
  idgham_wo_ghunnah: { light: '#169200', dark: '#4FCB1E' },
  idgham_mutajanisayn: { light: '#A1A1A1', dark: '#B8B8B8' },
  idgham_mutaqaribayn: { light: '#A1A1A1', dark: '#B8B8B8' },
  iqlab: { light: '#26BFFD', dark: '#4FCCFF' },
  ghunnah: { light: '#FF7E1E', dark: '#FF9A47' },
};

export function tajweedColor(cls: string | undefined, scheme: 'light' | 'dark', fallback: string): string {
  if (!cls) return fallback;
  return TajweedColors[cls]?.[scheme] ?? fallback;
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

/** Legend rows for an in-app "About tajweed colors" reference. */
export const TajweedLegend: { label: string; classes: string[] }[] = [
  { label: 'Ghunnah (nasalization)', classes: ['ghunnah'] },
  { label: 'Silent / not pronounced', classes: ['ham_wasl', 'slnt', 'laam_shamsiyah'] },
  { label: 'Qalqalah (echo)', classes: ['qalaqah'] },
  { label: 'Madd (prolongation)', classes: ['madda_normal', 'madda_permissible'] },
  { label: 'Madd (obligatory / necessary)', classes: ['madda_necessary', 'madda_obligatory_mottasel', 'madda_obligatory_monfasel'] },
  { label: 'Ikhafa (hidden pronunciation)', classes: ['ikhafa', 'ikhafa_shafawi'] },
  { label: 'Idgham (assimilation)', classes: ['idgham_shafawi', 'idgham_ghunnah', 'idgham_wo_ghunnah', 'idgham_mutajanisayn', 'idgham_mutaqaribayn'] },
  { label: 'Iqlab (conversion to meem)', classes: ['iqlab'] },
];
