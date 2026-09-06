import { router, Stack } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReaderDisplaySettings } from '@/components/quran/reader-display-settings';
import { ReciterSettingsRow } from '@/components/quranki/reciter-picker-sheet';
import { TranslationSettingsRow } from '@/components/quranki/translation-picker-sheet';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useProgressStore } from '@/store/progress-store';

/** A real pushed screen rather than a `Modal` sheet - same reasoning as `/reciter-picker` and
 *  `/translation-picker`: the reciter/translation rows below need to push further screens of
 *  their own, and iOS refuses to present a second `Modal` on a view controller that's already
 *  presenting one. Reads settings straight from the store instead of taking them as props, so
 *  the Quran reader just needs to push this route rather than manage a sheet's visibility and
 *  thread every display setting through it. */
export default function ReaderSettingsScreen() {
  const settings = useProgressStore((s) => s.settings);
  const updateSettings = useProgressStore((s) => s.updateSettings);

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: 'Settings' }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView style={styles.list} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ReciterSettingsRow
            selectedKey={settings.selectedReciterKey}
            onPress={() => router.push('/reciter-picker')}
          />
          <TranslationSettingsRow
            selectedKey={settings.selectedTranslationKey}
            onPress={() => router.push('/translation-picker')}
          />
          <ReaderDisplaySettings
            arabicSize={settings.readerArabicSize}
            onArabicSizeChange={(readerArabicSize) => updateSettings({ readerArabicSize })}
            glossSize={settings.readerGlossSize}
            onGlossSizeChange={(readerGlossSize) => updateSettings({ readerGlossSize })}
            showTranslation={settings.readerShowTranslation}
            onShowTranslationChange={(readerShowTranslation) => updateSettings({ readerShowTranslation })}
            showAyahCoverage={settings.readerShowAyahCoverage}
            onShowAyahCoverageChange={(readerShowAyahCoverage) => updateSettings({ readerShowAyahCoverage })}
            showTransliteration={settings.readerTransliteration}
            onShowTransliterationChange={(readerTransliteration) => updateSettings({ readerTransliteration })}
            transliterationSize={settings.readerTransliterationSize}
            onTransliterationSizeChange={(readerTransliterationSize) => updateSettings({ readerTransliterationSize })}
            alwaysShowTranslation={settings.readerAlwaysShowTranslation}
            onAlwaysShowTranslationChange={(readerAlwaysShowTranslation) =>
              updateSettings({ readerAlwaysShowTranslation })
            }
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
  },
});
