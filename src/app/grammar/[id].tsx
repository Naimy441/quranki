import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FlashCard } from '@/components/quranki/flash-card';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getWord } from '@/lib/levels';

export default function GrammarIntroScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const word = id ? getWord(id) : undefined;

  if (!word || word.kind !== 'grammar') {
    return <ThemedView style={styles.flex} />;
  }

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: word.english, headerBackTitle: 'Levels' }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <FlashCard word={word} revealed onSpeak={() => undefined} isSpeaking={false} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
});
