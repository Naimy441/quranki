import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Appearance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';

import { PaperDarkTheme, PaperLightTheme } from '@/constants/paper-theme';
import { ArabicFont, Colors, SurahNameFont } from '@/constants/theme';
import { useAppColorScheme } from '@/hooks/use-theme';
import { useKnownWordsStore } from '@/store/known-words-store';
import { useProgressStore } from '@/store/progress-store';

SplashScreen.preventAutoHideAsync();

function selectHasFinishedOnboarding(state: { onboardingCompleted: boolean }): boolean {
  return state.onboardingCompleted === true;
}

export default function RootLayout() {
  'use no memo';
  const scheme = useAppColorScheme();
  const hydrate = useProgressStore((state) => state.hydrate);
  const hydrated = useProgressStore((state) => state.hydrated);
  const hydrateKnownWords = useKnownWordsStore((state) => state.hydrate);
  const knownWordsHydrated = useKnownWordsStore((state) => state.hydrated);
  const themePreference = useProgressStore((state) => state.settings.themePreference);
  const hasFinishedOnboarding = useProgressStore(selectHasFinishedOnboarding);
  const [fontsLoaded] = useFonts({
    [ArabicFont]: require('@/assets/fonts/UthmanicHafs1Ver18.ttf'),
    [SurahNameFont]: require('@/assets/fonts/surah_names.ttf'),
  });

  useEffect(() => {
    void hydrate();
    void hydrateKnownWords();
  }, [hydrate, hydrateKnownWords]);

  // Native chrome (tab bar liquid glass, scroll-edge effects) follows the window color scheme,
  // not React theme tokens. Keep them in lockstep with the in-app appearance setting.
  useEffect(() => {
    Appearance.setColorScheme(themePreference === 'system' ? null : themePreference);
  }, [themePreference]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(Colors[scheme].background);
  }, [scheme]);

  useEffect(() => {
    if (fontsLoaded && hydrated && knownWordsHydrated) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, hydrated, knownWordsHydrated]);

  if (!fontsLoaded || !hydrated || !knownWordsHydrated) {
    return null;
  }

  const paperTheme = scheme === 'dark' ? PaperDarkTheme : PaperLightTheme;
  const colors = Colors[scheme];
  const baseNavTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;
  // Stock DarkTheme uses a gray card (`rgb(18, 18, 18)`). iOS 26's tab bar samples that
  // surface, so tapping a tab makes the dock flash gray instead of the app background.
  const navTheme = {
    ...baseNavTheme,
    colors: {
      ...baseNavTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
      notification: colors.danger,
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={paperTheme}>
        <ThemeProvider value={navTheme}>
          <Stack>
            <Stack.Protected guard={!hasFinishedOnboarding}>
              <Stack.Screen
                name="onboarding"
                options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }}
              />
            </Stack.Protected>
            <Stack.Protected guard={hasFinishedOnboarding}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="level/[id]" options={{ title: '', headerBackTitle: 'Levels' }} />
              <Stack.Screen name="quran/[surah]" options={{ title: '', headerBackTitle: "Qur'an" }} />
              <Stack.Screen
                name="session/review"
                options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }}
              />
            </Stack.Protected>
          </Stack>
        </ThemeProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
