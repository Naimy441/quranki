import { Ionicons } from '@expo/vector-icons';
import SliderControl from '@expo/ui/community/slider';
import { router } from 'expo-router';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChoiceGrid } from '@/components/quranki/choice-grid';
import { ReaderDisplaySettings } from '@/components/quran/reader-display-settings';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ACCENTS, BottomTabInset, MaxContentWidth, Radius, Spacing, type AccentId } from '@/constants/theme';
import { useAppColorScheme, useTheme } from '@/hooks/use-theme';
import { hapticSelection } from '@/lib/haptics';
import { clampWordsPerSession, WORDS_PER_SESSION_MAX, WORDS_PER_SESSION_MIN } from '@/lib/storage';
import { useProgressStore } from '@/store/progress-store';

const THEME_OPTIONS = [
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' as const },
  { value: 'light', label: 'Light', icon: 'sunny-outline' as const },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' as const },
];

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
            <SliderControl
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

          <SettingsSection title="Appearance">
            <ChoiceGrid
              options={THEME_OPTIONS}
              value={settings.themePreference}
              onChange={(value) => updateSettings({ themePreference: value as typeof settings.themePreference })}
            />
            <AccentPicker
              value={settings.accentColor ?? 'green'}
              onChange={(accentColor) => updateSettings({ accentColor })}
            />
          </SettingsSection>

          <SettingsSection title="Qur'an">
            <ReaderDisplaySettings
              arabicSize={settings.readerArabicSize}
              onArabicSizeChange={(readerArabicSize) => updateSettings({ readerArabicSize })}
              glossSize={settings.readerGlossSize}
              onGlossSizeChange={(readerGlossSize) => updateSettings({ readerGlossSize })}
              showTranslation={settings.readerShowTranslation}
              onShowTranslationChange={(readerShowTranslation) => updateSettings({ readerShowTranslation })}
              showTransliteration={settings.readerTransliteration}
              onShowTransliterationChange={(readerTransliteration) => updateSettings({ readerTransliteration })}
              transliterationSize={settings.readerTransliterationSize}
              onTransliterationSizeChange={(readerTransliterationSize) => updateSettings({ readerTransliterationSize })}
            />
          </SettingsSection>

          <SettingsSection title="Data">
            <ActionRow
              icon="list-outline"
              label="Known words"
              chevron
              onPress={() => router.push('/known-words')}
            />
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

const ACCENT_COLUMNS = 7;

function AccentPicker({ value, onChange }: { value: AccentId; onChange: (id: AccentId) => void }) {
  const theme = useTheme();
  const scheme = useAppColorScheme();
  const selected = ACCENTS.find((accent) => accent.id === value) ?? ACCENTS[0];
  const rows: (typeof ACCENTS)[] = [];
  for (let i = 0; i < ACCENTS.length; i += ACCENT_COLUMNS) {
    rows.push(ACCENTS.slice(i, i + ACCENT_COLUMNS));
  }

  return (
    <View style={styles.accentBlock}>
      <View style={styles.accentHeader}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Accent
        </ThemedText>
        <ThemedText type="smallBold" themeColor="primary">
          {selected.label}
        </ThemedText>
      </View>
      <View style={styles.accentGrid}>
        {rows.map((row) => (
          <View key={row[0].id} style={styles.accentRow}>
            {row.map((accent) => {
              const isSelected = accent.id === selected.id;
              const swatch = accent[scheme].primary;
              return (
                <Pressable
                  key={accent.id}
                  onPress={() => {
                    if (accent.id === selected.id) return;
                    hapticSelection();
                    onChange(accent.id);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={accent.label}
                  accessibilityState={{ selected: isSelected }}
                  style={({ pressed }) => [
                    styles.accentSwatch,
                    {
                      backgroundColor: swatch,
                      borderColor: isSelected ? theme.text : theme.border,
                    },
                    pressed && styles.pressed,
                  ]}>
                  {isSelected ? <Ionicons name="checkmark" size={16} color={accent[scheme].onPrimary} /> : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  destructive,
  chevron,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  destructive?: boolean;
  chevron?: boolean;
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
      {chevron ? <Ionicons name="chevron-forward" size={16} color={theme.textMuted} /> : null}
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
  accentBlock: {
    gap: Spacing.two,
  },
  accentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
  },
  accentGrid: {
    gap: Spacing.two,
  },
  accentRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  accentSwatch: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
