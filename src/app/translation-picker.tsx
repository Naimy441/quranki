import { Stack } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TranslationPickerInline } from '@/components/quranki/translation-picker-sheet';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useProgressStore } from '@/store/progress-store';
import { ensureTranslationDatasetLoaded } from '@/store/translation-store';

/** A real pushed screen, mirroring `/reciter-picker` - reachable from inside another already-open
 *  sheet (the reader's settings sheet), which a nested `Modal` can't be on iOS. */
export default function TranslationPickerScreen() {
  const selectedTranslationKey = useProgressStore((s) => s.settings.selectedTranslationKey);
  const updateSettings = useProgressStore((s) => s.updateSettings);

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: 'Translation' }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView style={styles.list} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TranslationPickerInline
            selectedKey={selectedTranslationKey}
            onSelect={(selectedTranslationKey) => {
              updateSettings({ selectedTranslationKey });
              ensureTranslationDatasetLoaded(selectedTranslationKey);
            }}
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
