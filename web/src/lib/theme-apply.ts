import { ACCENTS, getAccent, type AccentId } from '@/lib/theme-tokens';

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** Applies the theme preference and accent color (the same tokens the mobile app uses). */
export function applyTheme(themePreference: 'system' | 'light' | 'dark', accentId: AccentId | string | undefined): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const dark =
    themePreference === 'dark' ||
    (themePreference !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', dark);
  const accent = getAccent(accentId)[dark ? 'dark' : 'light'];
  root.style.setProperty('--primary-rgb', hexToRgb(accent.primary));
  root.style.setProperty('--primary-dark', accent.primaryDark);
  root.style.setProperty('--on-primary-rgb', hexToRgb(accent.onPrimary));
  root.style.setProperty('--background-selected', accent.backgroundSelected);
  document.querySelector('meta[name="theme-color"]:not([media])')?.setAttribute('content', dark ? '#090c0a' : '#fbfcfb');
}

/**
 * Inline script for <head>: applies the saved theme and accent before first paint. Kept in sync
 * with `applyTheme` by generating the accent table from the same source.
 */
export function themeBootScript(): string {
  const table: Record<string, [string, string, string, string, string, string, string, string]> = {};
  for (const a of ACCENTS) {
    table[a.id] = [
      hexToRgb(a.light.primary),
      a.light.primaryDark,
      hexToRgb(a.light.onPrimary),
      a.light.backgroundSelected,
      hexToRgb(a.dark.primary),
      a.dark.primaryDark,
      hexToRgb(a.dark.onPrimary),
      a.dark.backgroundSelected,
    ];
  }
  return `(function(){try{var s=JSON.parse(localStorage.getItem('quranki:settings:v1')||'null');if(!s){var o=JSON.parse(localStorage.getItem('quranki_web_data_v1')||'{}');s={themePreference:o.settings&&o.settings.theme}}var t=s.themePreference||'system';var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);var T=${JSON.stringify(
    table,
  )};var a=T[s.accentColor]||T.green;var i=d?4:0;r.style.setProperty('--primary-rgb',a[i]);r.style.setProperty('--primary-dark',a[i+1]);r.style.setProperty('--on-primary-rgb',a[i+2]);r.style.setProperty('--background-selected',a[i+3]);}catch(e){}})();`;
}
