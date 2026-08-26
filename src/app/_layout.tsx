import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';

import { PaperDarkTheme, PaperLightTheme } from '@/constants/paper-theme';
import { ArabicFont } from '@/constants/theme';
import { useAppColorScheme } from '@/hooks/use-theme';
import { useProgressStore } from '@/store/progress-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useAppColorScheme();
  const hydrate = useProgressStore((state) => state.hydrate);
  const hydrated = useProgressStore((state) => state.hydrated);
  const [fontsLoaded] = useFonts({ [ArabicFont]: require('@/assets/fonts/UthmanicHafs1Ver18.ttf') });

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (fontsLoaded && hydrated) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, hydrated]);

  if (!fontsLoaded || !hydrated) {
    return null;
  }

  const paperTheme = scheme === 'dark' ? PaperDarkTheme : PaperLightTheme;
  const navTheme = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={paperTheme}>
        <ThemeProvider value={navTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="level/[id]" options={{ title: '', headerBackTitle: 'Levels' }} />
            <Stack.Screen name="quran/[surah]" options={{ title: '', headerBackTitle: "Qur'an" }} />
            <Stack.Screen
              name="session/[id]"
              options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }}
            />
            <Stack.Screen
              name="session/review"
              options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }}
            />
          </Stack>
        </ThemeProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
