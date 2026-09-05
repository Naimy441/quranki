import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChoiceGrid } from '@/components/quranki/choice-grid';
import { ReminderTimePicker } from '@/components/quranki/reminder-time-picker';
import {
    OnboardingAyahPreview,
    OnboardingCoveragePreview,
    OnboardingFlashPreview,
    OnboardingIntentionPreview,
    OnboardingTapHint,
    OnboardingWelcomePreview,
} from '@/components/quranki/onboarding-visuals';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticMedium, hapticSelection, hapticSuccess } from '@/lib/haptics';
import {
    CURRICULUM_LEMMA_COUNT,
    getCoverageThroughLevel,
    LAST_LEVEL_NUMBER,
    LEVELS,
    STAGES,
    THEMATIC_WORD_COUNT,
} from '@/lib/levels';
import { formatCount } from '@/lib/stats';
import { DEFAULT_REMINDER_HOUR, DEFAULT_REMINDER_MINUTE, requestReminderPermission } from '@/lib/practice-reminder';
import { DEFAULT_SETTINGS } from '@/lib/storage';
import { playWordPronunciation, stopWordPronunciation } from '@/lib/word-pronunciation';
import { useProgressStore } from '@/store/progress-store';

const DEMO_WORD = LEVELS[0].words[0];

const PACE_OPTIONS = [
  { value: '5', label: '5', caption: 'Relaxed' },
  { value: '10', label: '10', caption: 'Comfortable' },
  { value: '15', label: '15', caption: 'Focused' },
  { value: '20', label: '20', caption: 'Intense' },
];

function coverageCopy(): { title: string; body: string } {
  const core = getCoverageThroughLevel(STAGES[0].lastLevel);
  const full = getCoverageThroughLevel(LAST_LEVEL_NUMBER);
  return {
    title: 'The first words go a long way',
    body: `Stage 1 is ${formatCount(THEMATIC_WORD_COUNT)} words. That is about ${core.percent}% of what you read. All ${formatCount(CURRICULUM_LEMMA_COUNT)} words reach ${full.percent}%.`,
  };
}

const STEPS = [
  {
    id: 'welcome',
    title: 'Assalamu alaykum!',
    body: 'Thank you for being here. Quranki helps you understand the Quran by learning its words, then reading them where they appear.',
  },
  {
    id: 'srs',
    title: 'A few words a day',
    body: 'You will see a word, hear it, and say how well you know it. The ones that slip come back sooner.',
  },
  {
    id: 'quran',
    title: 'Then open the Quran',
    body: 'Every word you learn is waiting in the real text, in its own verse.',
  },
  {
    id: 'hidden',
    title: 'Known words step aside',
    body: 'Once a word is yours, its translation hides. The page starts to look like the mushaf.',
  },
  {
    id: 'tap',
    title: 'Tap if you forget',
    body: 'A hidden word still has its meaning when you need it.',
  },
  {
    id: 'coverage',
    ...coverageCopy(),
  },
  {
    id: 'intention',
    title: 'Take it day by day',
    body: 'A little each day is enough. Keep your intention for the sake of Allah.',
  },
  {
    id: 'pace',
    title: 'How many new words today?',
    body: 'Start with what you can keep. You can change this later in Settings.',
  },
  {
    id: 'reminder',
    title: 'A daily reminder',
    body: 'Pick a time and we will nudge you to practice a few words. You can change this later.',
  },
] as const;

type StepId = (typeof STEPS)[number]['id'];

export default function OnboardingScreen() {
  const theme = useTheme();
  const completeOnboarding = useProgressStore((state) => state.completeOnboarding);
  const [index, setIndex] = useState(0);
  const [wordsPerDay, setWordsPerDay] = useState(String(DEFAULT_SETTINGS.wordsPerSession));
  const [reminderHour, setReminderHour] = useState(DEFAULT_REMINDER_HOUR);
  const [reminderMinute, setReminderMinute] = useState(DEFAULT_REMINDER_MINUTE);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [finishing, setFinishing] = useState(false);

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

  const finish = async (remind: boolean) => {
    if (finishing) return;
    setFinishing(true);
    hapticSuccess();
    stopWordPronunciation();
    const allowed = remind ? await requestReminderPermission() : false;
    await completeOnboarding(Number(wordsPerDay), {
      enabled: allowed,
      hour: reminderHour,
      minute: reminderMinute,
    });
  };

  const goNext = () => {
    if (isLast) {
      void finish(true);
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
            {step.id !== 'pace' && step.id !== 'reminder' && (
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
              {step.id === 'reminder' && (
                <ReminderTimePicker
                  hour={reminderHour}
                  minute={reminderMinute}
                  onChange={(hour, minute) => {
                    setReminderHour(hour);
                    setReminderMinute(minute);
                  }}
                />
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
              disabled={finishing}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: theme.primary },
                (pressed || finishing) && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor="onPrimary" style={styles.ctaLabel}>
                {isLast ? 'Remind me daily' : 'Continue'}
              </ThemedText>
            </Pressable>
            {isLast ? (
              <Pressable
                onPress={() => void finish(false)}
                disabled={finishing}
                accessibilityRole="button"
                style={({ pressed }) => [styles.skip, (pressed || finishing) && styles.pressed]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Not now
                </ThemedText>
              </Pressable>
            ) : null}
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
    case 'welcome':
      return <OnboardingWelcomePreview />;
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
    case 'reminder':
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
  skip: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
