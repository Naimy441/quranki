import { Ionicons } from '@expo/vector-icons';
import Slider from '@expo/ui/community/slider';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArabicText } from '@/components/arabic-text';
import { ChoiceGrid } from '@/components/quranki/choice-grid';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { displayArabic } from '@/lib/arabic-display';
import { hapticSelection, hapticWarning } from '@/lib/haptics';
import { isCuratedWordId } from '@/lib/known-words';
import { getWord } from '@/lib/levels';
import { getWordOccurrenceCount } from '@/lib/quran-coverage';
import { formatCount } from '@/lib/stats';
import { clampWordsPerSession, WORDS_PER_SESSION_MAX, WORDS_PER_SESSION_MIN } from '@/lib/storage';
import { useKnownWordsStore } from '@/store/known-words-store';
import { useProgressStore } from '@/store/progress-store';

const THEME_OPTIONS = [
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' as const },
  { value: 'light', label: 'Light', icon: 'sunny-outline' as const },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' as const },
];

const TTS_OPTIONS = [
  { value: '0.6', label: 'Slow' },
  { value: '0.85', label: 'Normal' },
  { value: '1.1', label: 'Fast' },
];

const KNOWN_PREVIEW_COUNT = 6;

function sessionPaceLabel(count: number): string {
  if (count <= 5) return 'Relaxed';
  if (count <= 10) return 'Comfortable';
  if (count <= 20) return 'Focused';
  return 'Intense';
}

function SettingsSection({
  title,
  accessory,
  children,
}: {
  title: string;
  accessory?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
          {title.toUpperCase()}
        </ThemedText>
        {accessory ? (
          <ThemedText type="smallBold" themeColor="textMuted">
            {accessory}
          </ThemedText>
        ) : null}
      </View>
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
  const setOnboardingCompleted = useProgressStore((state) => state.setOnboardingCompleted);
  const knownWords = useKnownWordsStore((state) => state.knownWords);
  const unmarkKnown = useKnownWordsStore((state) => state.unmarkKnown);
  const clearAllKnown = useKnownWordsStore((state) => state.clearAllKnown);
  const [showAllKnown, setShowAllKnown] = useState(false);

  const knownEntries = Object.entries(knownWords).sort((a, b) => b[1].addedAt.localeCompare(a[1].addedAt));
  const visibleKnown = showAllKnown ? knownEntries : knownEntries.slice(0, KNOWN_PREVIEW_COUNT);
  const hiddenKnownCount = knownEntries.length - visibleKnown.length;

  const handleClearKnown = () => {
    if (Platform.OS === 'web') {
      clearAllKnown();
      return;
    }
    Alert.alert(
      'Clear all known words?',
      'This un-hides every word you\u2019ve manually marked as known in the Qur\u2019an reader. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => clearAllKnown() },
      ],
    );
  };

  const handleReset = () => {
    if (Platform.OS === 'web') {
      resetProgress();
      return;
    }
    Alert.alert(
      'Reset all progress?',
      'This clears every word\u2019s review history and starts the deck over from the first word. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => resetProgress() },
      ],
    );
  };

  return (
    <ThemedView style={styles.flex} collapsable={false}>
      <SafeAreaView style={styles.flex} edges={['top']} collapsable={false}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + Spacing.four }]}>
          <View style={styles.titleBlock}>


          </View>
          <SettingsSection title="New words per day">
            <View style={styles.sliderValueBlock}>
              <ThemedText type="title" style={styles.sliderValue}>
                {clampWordsPerSession(settings.wordsPerSession)}
              </ThemedText>
              <ThemedText type="smallBold" themeColor="primary">
                {sessionPaceLabel(settings.wordsPerSession)}
              </ThemedText>
            </View>
            <Slider
              value={clampWordsPerSession(settings.wordsPerSession)}
              minimumValue={WORDS_PER_SESSION_MIN}
              maximumValue={WORDS_PER_SESSION_MAX}
              step={1}
              minimumTrackTintColor={theme.primary}
              onValueChange={(value) => {
                const next = clampWordsPerSession(value);
                if (next === settings.wordsPerSession) return;
                hapticSelection();
                updateSettings({ wordsPerSession: next });
              }}
              style={styles.slider}
            />
            <View style={styles.sliderEnds}>
              <ThemedText type="small" themeColor="textMuted">
                {WORDS_PER_SESSION_MIN}
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                {WORDS_PER_SESSION_MAX}
              </ThemedText>
            </View>
          </SettingsSection>

          <SettingsSection title="Voice">
            <ChoiceGrid
              options={TTS_OPTIONS}
              value={String(settings.ttsRate)}
              onChange={(value) => updateSettings({ ttsRate: Number(value) })}
            />
          </SettingsSection>

          <SettingsSection title="Appearance">
            <ChoiceGrid
              options={THEME_OPTIONS}
              value={settings.themePreference}
              onChange={(value) => updateSettings({ themePreference: value as typeof settings.themePreference })}
            />
          </SettingsSection>

          <SettingsSection
            title="Known words"
            accessory={knownEntries.length > 0 ? formatCount(knownEntries.length) : undefined}>
            {knownEntries.length === 0 ? (
              <ThemedText type="small" themeColor="textMuted">
                Long-press a word in the Qur&apos;an to hide it.
              </ThemedText>
            ) : (
              <View style={[styles.knownList, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {visibleKnown.map(([id, entry], index) => {
                  const studyWord = isCuratedWordId(id) ? getWord(id) : undefined;
                  const label = studyWord ? displayArabic(studyWord) : entry.sampleArabic;
                  const sub = studyWord
                    ? studyWord.english
                    : `${formatCount(getWordOccurrenceCount(id))} occurrences`;
                  return (
                    <View
                      key={id}
                      style={[
                        styles.knownRow,
                        index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                      ]}>
                      <View style={styles.knownTextCol}>
                        <ArabicText style={styles.knownArabic}>{label}</ArabicText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {sub}
                        </ThemedText>
                      </View>
                      <Pressable
                        onPress={() => {
                          hapticWarning();
                          unmarkKnown(id);
                        }}
                        hitSlop={10}
                        accessibilityLabel="Forget this word">
                        <Ionicons name="close-circle" size={22} color={theme.textMuted} />
                      </Pressable>
                    </View>
                  );
                })}
                {hiddenKnownCount > 0 && (
                  <Pressable
                    onPress={() => {
                      hapticSelection();
                      setShowAllKnown(true);
                    }}
                    style={[styles.knownMore, { borderTopColor: theme.border }]}>
                    <ThemedText type="smallBold" themeColor="primary">
                      Show {formatCount(hiddenKnownCount)} more
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            )}
            {knownEntries.length > 0 && (
              <ActionRow icon="close-circle-outline" label="Clear all" destructive onPress={handleClearKnown} />
            )}
          </SettingsSection>

          <SettingsSection title="Data">
            <ActionRow icon="refresh-outline" label="Reset progress" destructive onPress={handleReset} />
            {__DEV__ && <ActionRow icon="flask-outline" label="Master all words" onPress={masterAllWords} />}
            {__DEV__ && (
              <ActionRow
                icon="sparkles-outline"
                label="Replay onboarding"
                onPress={() => setOnboardingCompleted(false)}
              />
            )}
          </SettingsSection>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function ActionRow({
  icon,
  label,
  destructive,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const color = destructive ? theme.danger : theme.text;
  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      style={({ pressed }) => [
        styles.actionRow,
        { backgroundColor: theme.card, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.actionIcon, { backgroundColor: destructive ? `${theme.danger}14` : theme.backgroundElement }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <ThemedText type="smallBold" style={[styles.actionLabel, { color }]}>
        {label}
      </ThemedText>
    </Pressable>
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
  titleBlock: {
    gap: Spacing.one,
    marginTop: Spacing.three,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: Spacing.one,
    marginRight: Spacing.one,
  },
  sectionTitle: {
    letterSpacing: 0.5,
  },
  sectionCard: {
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  sliderValueBlock: {
    alignItems: 'center',
    gap: 2,
  },
  sliderValue: {
    fontSize: 40,
    lineHeight: 44,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderEnds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -Spacing.two,
  },
  knownList: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    overflow: 'hidden',
  },
  knownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  knownTextCol: {
    flex: 1,
    gap: 2,
  },
  knownArabic: {
    fontSize: 22,
    lineHeight: 36,
  },
  knownMore: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    flex: 1,
  },
  pressed: {
    opacity: 0.8,
  },
});
