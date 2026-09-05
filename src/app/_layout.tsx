import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { Appearance } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';

import { StreakGraceNotice } from '@/components/quranki/streak-grace-notice';
import { createPaperTheme } from '@/constants/paper-theme';
import { ArabicFont, Colors, SurahNameFont } from '@/constants/theme';
import { useAppColorScheme, useTheme } from '@/hooks/use-theme';
import '@/lib/practice-reminder';
import { getStreakReclaimOpportunity } from '@/lib/stats';
import { useKnownWordsStore } from '@/store/known-words-store';
import { useProgressStore } from '@/store/progress-store';
import { useQuranMarksStore } from '@/store/quran-marks-store';

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
  const hydrateQuranMarks = useQuranMarksStore((state) => state.hydrate);
  const quranMarksHydrated = useQuranMarksStore((state) => state.hydrated);
  const themePreference = useProgressStore((state) => state.settings.themePreference);
  const hasFinishedOnboarding = useProgressStore(selectHasFinishedOnboarding);
  const reviewDates = useProgressStore((state) => state.reviewDates);
  const streakGraceDates = useProgressStore((state) => state.streakGraceDates);
  const colors = useTheme();
  const [dismissedReclaimableStreak, setDismissedReclaimableStreak] = useState<number | null>(null);
  const reclaimableStreak = getStreakReclaimOpportunity(reviewDates, streakGraceDates);
  const [fontsLoaded] = useFonts({
    [ArabicFont]: require('@/assets/fonts/UthmanicHafs1Ver18.ttf'),
    [SurahNameFont]: require('@/assets/fonts/surah_names.ttf'),
  });

  useEffect(() => {
    void hydrate();
    void hydrateKnownWords();
    void hydrateQuranMarks();
  }, [hydrate, hydrateKnownWords, hydrateQuranMarks]);

  // Native chrome (tab bar liquid glass, scroll-edge effects) follows the window color scheme,
  // not React theme tokens. Keep them in lockstep with the in-app appearance setting.
  useEffect(() => {
    Appearance.setColorScheme(themePreference === 'system' ? 'unspecified' : themePreference);
  }, [themePreference]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(Colors[scheme].background);
  }, [scheme]);

  useEffect(() => {
    if (fontsLoaded && hydrated && knownWordsHydrated && quranMarksHydrated) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, hydrated, knownWordsHydrated, quranMarksHydrated]);

  if (!fontsLoaded || !hydrated || !knownWordsHydrated || !quranMarksHydrated) {
    return null;
  }

  const paperTheme = createPaperTheme(scheme, colors);
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
              <Stack.Screen name="grammar/[id]" options={{ title: 'Grammar', headerBackTitle: 'Levels' }} />
              <Stack.Screen
                name="quran/[surah]"
                options={{ title: '', headerBackTitle: "Quran", gestureEnabled: false, fullScreenGestureEnabled: false }}
              />
              <Stack.Screen name="saved" options={{ title: 'Saved', headerBackTitle: "Quran" }} />
              <Stack.Screen name="known-words" options={{ title: 'Known words', headerBackTitle: 'Settings' }} />
              <Stack.Screen
                name="session/review"
                options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }}
              />
            </Stack.Protected>
          </Stack>
          <StreakGraceNotice
            visible={hasFinishedOnboarding && reclaimableStreak > 0 && dismissedReclaimableStreak !== reclaimableStreak}
            streak={reclaimableStreak}
            onDismiss={() => setDismissedReclaimableStreak(reclaimableStreak)}
          />
        </ThemeProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
