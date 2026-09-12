import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReaderDisplaySettings } from '@/components/quran/reader-display-settings';
import { ReciterPickerSheet, ReciterSettingsRow } from '@/components/quranki/reciter-picker-sheet';
import { TranslationPickerSheet, TranslationSettingsRow } from '@/components/quranki/translation-picker-sheet';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useProgressStore } from '@/store/progress-store';

/** A real pushed screen rather than a sheet of display controls - the Quran reader just needs
 *  to push this route rather than manage visibility and thread every display setting through it.
 *  Reciter and Translation open native sheets from here so they can expand to full screen. */
export default function ReaderSettingsScreen() {
  const settings = useProgressStore((s) => s.settings);
  const updateSettings = useProgressStore((s) => s.updateSettings);
  const [reciterVisible, setReciterVisible] = useState(false);
  const [translationVisible, setTranslationVisible] = useState(false);

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: 'Settings' }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView style={styles.list} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ReciterSettingsRow
            selectedKey={settings.selectedReciterKey}
            onPress={() => setReciterVisible(true)}
          />
          <TranslationSettingsRow
            selectedKey={settings.selectedTranslationKey}
            onPress={() => setTranslationVisible(true)}
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
      <ReciterPickerSheet visible={reciterVisible} onDismiss={() => setReciterVisible(false)} />
      <TranslationPickerSheet visible={translationVisible} onDismiss={() => setTranslationVisible(false)} />
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
