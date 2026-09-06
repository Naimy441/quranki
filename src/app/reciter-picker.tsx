import { Stack } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReciterPickerInline } from '@/components/quranki/reciter-picker-sheet';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useProgressStore } from '@/store/progress-store';

/** A real pushed screen rather than a sheet/`Modal` - this needs to be reachable from inside
 *  another already-open sheet (the reader's settings sheet), and iOS refuses to present a second
 *  `Modal` on a view controller that's already presenting one. A normal stack push has none of
 *  that fragility. */
export default function ReciterPickerScreen() {
  const selectedReciterKey = useProgressStore((s) => s.settings.selectedReciterKey);
  const updateSettings = useProgressStore((s) => s.updateSettings);

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: 'Reciter' }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView style={styles.list} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <ReciterPickerInline
            selectedKey={selectedReciterKey}
            onSelect={(selectedReciterKey) => updateSettings({ selectedReciterKey })}
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
