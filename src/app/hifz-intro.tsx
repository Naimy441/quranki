import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  HifzIntroAddPreview,
  HifzIntroCuePreview,
  HifzIntroGradePreview,
  HifzIntroStartPreview,
  HifzIntroUnlockPreview,
} from '@/components/hifz/hifz-intro-visuals';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticMedium, hapticSelection, hapticSuccess } from '@/lib/haptics';
import { HIFZ_UNLOCK_RATIO } from '@/lib/ruku';
import { useHifzStore } from '@/store/hifz-store';

const UNLOCK_PERCENT = Math.round(HIFZ_UNLOCK_RATIO * 100);

const STEPS = [
  {
    id: 'unlock',
    title: 'A ruku just opened',
    body: '',
  },
  {
    id: 'add',
    title: 'Add it to your deck',
    body: 'Open the surah on this list and tap + on a ruku. That enrolls it for review.',
  },
  {
    id: 'cue',
    title: 'A few words are the prompt',
    body: 'You will see the opening of the ruku. Recite the rest from memory, then reveal to check.',
  },
  {
    id: 'grade',
    title: 'Grade how it felt',
    body: 'Same Again, Hard, Good, and Easy as words. The ones that slip come back sooner.',
  },
  {
    id: 'start',
    title: 'Start from Quran',
    body: 'The Memorize card at the top of this list is your session. More rukus appear as you learn their words.',
  },
] as const;

type StepId = (typeof STEPS)[number]['id'];

export default function HifzIntroScreen() {
  const theme = useTheme();
  const markIntroSeen = useHifzStore((state) => state.markIntroSeen);
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const finish = () => {
    hapticSuccess();
    markIntroSeen();
    router.replace('/quran');
  };

  const goNext = () => {
    if (isLast) {
      finish();
      return;
    }
    hapticMedium();
    setIndex((current) => current + 1);
  };

  const goBack = () => {
    if (index === 0) return;
    hapticSelection();
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
            <View style={styles.visual}>{renderVisual(step.id)}</View>
            <View style={styles.copy}>
              <ThemedText type="subtitle" style={styles.title}>
                {step.title}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                {step.id === 'unlock' ? (
                  <>
                    You know {UNLOCK_PERCENT}
                    <ThemedText themeColor="textSecondary" style={styles.subtitle} convertDigits={false}>
                      %
                    </ThemedText>
                    {' '}of the words in a section of the Quran. That is enough to start memorizing it.
                  </>
                ) : (
                  step.body
                )}
              </ThemedText>
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
              style={({ pressed }) => [styles.cta, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
              <ThemedText type="smallBold" themeColor="onPrimary" style={styles.ctaLabel}>
                {isLast ? 'Show my rukus' : 'Continue'}
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function renderVisual(id: StepId) {
  switch (id) {
    case 'unlock':
      return <HifzIntroUnlockPreview />;
    case 'add':
      return <HifzIntroAddPreview />;
    case 'cue':
      return <HifzIntroCuePreview />;
    case 'grade':
      return <HifzIntroGradePreview />;
    case 'start':
      return <HifzIntroStartPreview />;
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
