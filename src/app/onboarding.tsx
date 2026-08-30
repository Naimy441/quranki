import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChoiceGrid } from '@/components/quranki/choice-grid';
import {
  OnboardingAyahPreview,
  OnboardingCoveragePreview,
  OnboardingFlashPreview,
  OnboardingIntentionPreview,
  OnboardingTapHint,
} from '@/components/quranki/onboarding-visuals';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticMedium, hapticSelection, hapticSuccess } from '@/lib/haptics';
import { playWordPronunciation, stopWordPronunciation } from '@/lib/word-pronunciation';
import {
  getCoverageThroughLevel,
  LAST_LEVEL_NUMBER,
  LEVELS,
  THEMATIC_LEVEL_COUNT,
  THEMATIC_WORD_COUNT,
  WORD_COUNT,
} from '@/lib/levels';
import { formatCount } from '@/lib/stats';
import { DEFAULT_SETTINGS } from '@/lib/storage';
import { useProgressStore } from '@/store/progress-store';

const DEMO_WORD = LEVELS[0].words[0];

const PACE_OPTIONS = [
  { value: '5', label: '5', caption: 'Relaxed' },
  { value: '10', label: '10', caption: 'Comfortable' },
  { value: '15', label: '15', caption: 'Focused' },
  { value: '20', label: '20', caption: 'Intense' },
];

function coverageCopy(): { title: string; body: string } {
  const core = getCoverageThroughLevel(THEMATIC_LEVEL_COUNT);
  const full = getCoverageThroughLevel(LAST_LEVEL_NUMBER);
  const extra = full.percent - core.percent;
  return {
    title: 'A little goes far',
    body: `The first ${formatCount(THEMATIC_WORD_COUNT)} words cover ${core.percent}% of the Qur'an. Going on to ${formatCount(WORD_COUNT)} adds another ${extra}% — ${full.percent}% in all.`,
  };
}

const STEPS = [
  {
    id: 'srs',
    title: 'Learn Qur’anic Arabic',
    body: 'Short reviews, spaced so each word comes back just as you start to forget it.',
  },
  {
    id: 'quran',
    title: 'Then read the Qur’an',
    body: 'Practice with the real text. Every word you learn appears in its verse.',
  },
  {
    id: 'hidden',
    title: 'Mastered words hide',
    body: 'Once you know a word, its translation disappears from the page.',
  },
  {
    id: 'tap',
    title: 'Tap to peek',
    body: 'Need a reminder? Tap a hidden word to see its meaning.',
  },
  {
    id: 'coverage',
    ...coverageCopy(),
  },
  {
    id: 'intention',
    title: 'Stay consistent',
    body: 'A few words each day is enough. Purify your intention for the sake of Allah (swt).',
  },
  {
    id: 'pace',
    title: 'New words each day',
    body: 'You can change this later in Settings.',
  },
] as const;

type StepId = (typeof STEPS)[number]['id'];

export default function OnboardingScreen() {
  const theme = useTheme();
  const completeOnboarding = useProgressStore((state) => state.completeOnboarding);
  const [index, setIndex] = useState(0);
  const [wordsPerDay, setWordsPerDay] = useState(String(DEFAULT_SETTINGS.wordsPerSession));
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => () => {
    stopWordPronunciation();
  }, []);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const handleSpeak = async () => {
    stopWordPronunciation();
    setIsSpeaking(true);
    void playWordPronunciation(DEMO_WORD.id, () => setIsSpeaking(false))
      .then((played) => { if (!played) setIsSpeaking(false); })
      .catch(() => setIsSpeaking(false));
  };

  const goNext = () => {
    if (isLast) {
      hapticSuccess();
      stopWordPronunciation();
      completeOnboarding(Number(wordsPerDay));
      return;
    }
    hapticMedium();
    stopWordPronunciation();
    setIsSpeaking(false);
    setIndex((current) => current + 1);
  };

  const goBack = () => {
    if (index === 0) return;
    hapticSelection();
    stopWordPronunciation();
    setIsSpeaking(false);
    setIndex((current) => current - 1);
  };

  return (
    <ThemedView style={styles.flex} collapsable={false}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.shell}>
          <View style={styles.topBar}>
            {index > 0 ? (
              <Pressable
                onPress={goBack}
                hitSlop={12}
                accessibilityLabel="Back"
                style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
                <Ionicons name="chevron-back" size={24} color={theme.text} />
              </Pressable>
            ) : (
              <View style={styles.backButton} />
            )}
          </View>

          <Animated.View key={step.id} entering={FadeIn.duration(280)} style={styles.body}>
            {step.id !== 'pace' && (
              <View style={styles.visual}>{renderVisual(step.id, { onSpeak: handleSpeak, isSpeaking })}</View>
            )}
            <View style={styles.copy}>
              <ThemedText type="subtitle" style={styles.title}>
                {step.title}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                {step.body}
              </ThemedText>
              {step.id === 'pace' && (
                <View style={styles.paceGrid}>
                  <ChoiceGrid
                    options={PACE_OPTIONS}
                    value={wordsPerDay}
                    onChange={setWordsPerDay}
                    columns={2}
                    prominent
                  />
                </View>
              )}
            </View>
          </Animated.View>

          <View style={styles.footer}>
            <View style={styles.dots}>
              {STEPS.map((item, i) => (
                <View
                  key={item.id}
                  style={[
                    styles.dot,
                    {
                      width: i === index ? 18 : 6,
                      backgroundColor: i === index ? theme.primary : theme.border,
                    },
                  ]}
                />
              ))}
            </View>
            <Pressable
              onPress={goNext}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: theme.primary },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor="onPrimary" style={styles.ctaLabel}>
                {isLast ? 'Get started' : 'Continue'}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function renderVisual(
  id: StepId,
  flash: { onSpeak: () => void; isSpeaking: boolean },
) {
  switch (id) {
    case 'srs':
      return <OnboardingFlashPreview onSpeak={flash.onSpeak} isSpeaking={flash.isSpeaking} />;
    case 'quran':
      return <OnboardingAyahPreview mode="shown" />;
    case 'hidden':
      return <OnboardingAyahPreview mode="hidden" />;
    case 'tap':
      return (
        <View>
          <OnboardingAyahPreview mode="tap" />
          <OnboardingTapHint />
        </View>
      );
    case 'coverage':
      return <OnboardingCoveragePreview />;
    case 'intention':
      return <OnboardingIntentionPreview />;
    case 'pace':
      return null;
  }
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  shell: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
  },
  topBar: {
    height: 44,
    justifyContent: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.four,
  },
  visual: {
    justifyContent: 'center',
    minHeight: 120,
  },
  copy: {
    gap: Spacing.two,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 24,
  },
  paceGrid: {
    marginTop: Spacing.two,
  },
  footer: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
    paddingTop: Spacing.three,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  cta: {
    height: 52,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontSize: 17,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.85,
  },
});
