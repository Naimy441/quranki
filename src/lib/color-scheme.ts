/**
 * Applies the in-app theme override as early as possible so the native splash can match
 * Dark/Light before the rest of the store hydrates. iOS also mirrors the choice into
 * UserDefaults (`quranki.themePreference`) so AppDelegate can style the window on the
 * next cold start, before JavaScript runs.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, Platform, Settings } from 'react-native';

export const NATIVE_THEME_KEY = 'quranki.themePreference';
const SETTINGS_STORAGE_KEY = 'quranki:settings:v1';

export type ThemePreference = 'system' | 'light' | 'dark';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function applyThemePreference(preference: ThemePreference): void {
  Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  persistNativeThemePreference(preference);
}

export function persistNativeThemePreference(preference: ThemePreference): void {
  if (Platform.OS !== 'ios') return;
  Settings.set({ [NATIVE_THEME_KEY]: preference });
}

function readNativeThemePreference(): ThemePreference | null {
  if (Platform.OS !== 'ios') return null;
  const value = Settings.get(NATIVE_THEME_KEY);
  return isThemePreference(value) ? value : null;
}

const nativeBootPreference = readNativeThemePreference();
if (nativeBootPreference) {
  Appearance.setColorScheme(nativeBootPreference === 'system' ? 'unspecified' : nativeBootPreference);
}

export const didApplyThemeAtImport = nativeBootPreference != null;

export const themePreferenceReady: Promise<ThemePreference> = (async () => {
  if (nativeBootPreference) return nativeBootPreference;
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    const fromStore =
      parsed && typeof parsed === 'object' && 'themePreference' in parsed
        ? (parsed as { themePreference: unknown }).themePreference
        : null;
    const preference = isThemePreference(fromStore) ? fromStore : 'system';
    applyThemePreference(preference);
    return preference;
  } catch {
    applyThemePreference('system');
    return 'system';
  }
})();
