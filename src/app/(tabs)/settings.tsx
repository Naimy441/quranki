import { Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, SegmentedButtons } from 'react-native-paper';

import { WordsPerSessionPicker } from '@/components/quranki/words-per-session-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useProgressStore } from '@/store/progress-store';

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </ThemedText>
      <View style={[styles.sectionCard, { backgroundColor: theme.backgroundElement }]}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const settings = useProgressStore((state) => state.settings);
  const updateSettings = useProgressStore((state) => state.updateSettings);
  const resetProgress = useProgressStore((state) => state.resetProgress);
  const masterAllWords = useProgressStore((state) => state.masterAllWords);

  const handleReset = () => {
    if (Platform.OS === 'web') {
      resetProgress();
      return;
    }
    Alert.alert(
      'Reset all progress?',
      'This clears every word\u2019s review history and re-locks all levels except the first. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => resetProgress() },
      ],
    );
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + Spacing.four }]}>
          <ThemedText type="title" style={styles.title}>
            Settings
          </ThemedText>

          <SettingsSection title="Session length">
            <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
              How many new words to introduce per session. Due reviews are always included on top of this.
            </ThemedText>
            <WordsPerSessionPicker
              value={settings.wordsPerSession}
              onChange={(value) => updateSettings({ wordsPerSession: value })}
            />
          </SettingsSection>

          <SettingsSection title="Appearance">
            <SegmentedButtons
              value={settings.themePreference}
              onValueChange={(value) => updateSettings({ themePreference: value as typeof settings.themePreference })}
              buttons={[
                { value: 'system', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
            />
          </SettingsSection>

          <SettingsSection title="Pronunciation">
            <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
              Playback speed for the Arabic text-to-speech voice.
            </ThemedText>
            <SegmentedButtons
              value={String(settings.ttsRate)}
              onValueChange={(value) => updateSettings({ ttsRate: Number(value) })}
              buttons={[
                { value: '0.6', label: 'Slow' },
                { value: '0.85', label: 'Normal' },
                { value: '1.1', label: 'Fast' },
              ]}
            />
          </SettingsSection>

          <SettingsSection title="Danger zone">
            <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
              Resetting clears all FSRS review history for every word and re-locks levels.
            </ThemedText>
            <Button mode="outlined" textColor={theme.danger} onPress={handleReset}>
              Reset all progress
            </Button>
          </SettingsSection>

          {__DEV__ && (
            <SettingsSection title="Developer">
              <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
                Instantly marks every word as mastered, unlocking all levels - useful for testing
                the Qur&apos;an reader&apos;s word-hiding feature without grinding real reviews.
              </ThemedText>
              <Button mode="outlined" onPress={masterAllWords}>
                Mark all words as mastered
              </Button>
            </SettingsSection>
          )}

          <ThemedText type="small" themeColor="textMuted" style={styles.footer}>
            Quranki uses the open-source FSRS spaced-repetition algorithm (ts-fsrs) to schedule
            reviews for 547 Quranic vocabulary words across 47 levels.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  content: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    marginTop: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    letterSpacing: 0.5,
    marginLeft: Spacing.one,
  },
  sectionCard: {
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  description: {
    lineHeight: 18,
  },
  footer: {
    textAlign: 'center',
    marginTop: Spacing.two,
    lineHeight: 16,
  },
});
