import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Speech from 'expo-speech';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Button, ProgressBar } from 'react-native-paper';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FlashCard } from '@/components/quranki/flash-card';
import { GradeButtonRow } from '@/components/quranki/grade-button-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getArabicVoiceAsync, toSpeechText } from '@/lib/arabic-speech';
import { createNewCard, deserializeCard, previewGrades, State, type GradeName } from '@/lib/fsrs';
import { hapticHeavy, hapticLight, hapticMedium, hapticSelection, hapticSuccess } from '@/lib/haptics';
import type { SessionWord } from '@/lib/levels';
import { useProgressStore } from '@/store/progress-store';

function hapticGrade(grade: GradeName) {
  if (grade === 'again') hapticHeavy();
  else if (grade === 'hard') hapticMedium();
  else if (grade === 'good') hapticLight();
  else hapticSuccess();
}

const EMPTY_RATING_COUNTS: Record<GradeName, number> = { again: 0, hard: 0, good: 0, easy: 0 };

interface SessionRunnerProps {
  /** The frozen queue of words for this session, built once by the caller. */
  queue: SessionWord[];
  /** Shown in the "all caught up" empty state when the queue is empty. */
  emptyMessage: string;
  /** Show a small "Level N" pill on each card - useful when a session mixes levels. */
  showLevelTag?: boolean;
}

export function SessionRunner({ queue, emptyMessage, showLevelTag = false }: SessionRunnerProps) {
  const theme = useTheme();
  const progress = useProgressStore((state) => state.progress);
  const ttsRate = useProgressStore((state) => state.settings.ttsRate);
  const maxUnlockedLevel = useProgressStore((state) => state.maxUnlockedLevel);
  const gradeWord = useProgressStore((state) => state.gradeWord);

  const [initialMaxUnlockedLevel] = useState(() => maxUnlockedLevel);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [phase, setPhase] = useState<'review' | 'summary'>(queue.length === 0 ? 'summary' : 'review');
  const [ratingCounts, setRatingCounts] = useState<Record<GradeName, number>>(EMPTY_RATING_COUNTS);
  // A card graded into Learning/Relearning (rather than graduating to Review) is due again
  // within minutes, not tomorrow - see ts-fsrs's learning_steps/relearning_steps. Anki resurfaces
  // such cards later in the very same sitting (its "Learn ahead" limit) instead of only showing
  // them the next time a session happens to be built, so this session's queue is a growable copy
  // of the frozen `queue` prop rather than the prop itself, letting handleGrade append a word
  // back onto the end for a second (or third...) pass this session.
  const [sessionQueue, setSessionQueue] = useState(() => queue);

  const currentEntry = sessionQueue[index];
  const currentProgress = currentEntry ? progress[currentEntry.word.id] : undefined;

  const currentCard = useMemo(() => {
    if (!currentEntry) return null;
    return currentProgress ? deserializeCard(currentProgress.card) : createNewCard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEntry?.word.id, currentProgress?.reviewedAt]);

  const previews = useMemo(() => {
    if (!currentCard) return [];
    return previewGrades(currentCard, new Date());
  }, [currentCard]);

  const handleSpeak = async () => {
    if (!currentEntry) return;
    // Passing `language: 'ar-SA'` and hoping some installed voice matches that exact tag is what
    // this used to do - on Android that's a bad bet (see getArabicVoiceAsync), and a mismatch
    // tends to fail *silently* rather than with a catchable error, which looks exactly like "the
    // button does nothing" instead of a real, explainable failure. Resolving an actual installed
    // voice up front means we can tell the difference between "no Arabic voice on this device" and
    // "picked one, something else went wrong" instead of guessing from silence either way.
    const voice = await getArabicVoiceAsync();
    if (!voice) {
      Alert.alert(
        'No Arabic voice found',
        "This device doesn't have an Arabic text-to-speech voice installed. Install \"Google Text-to-Speech\" from the Play Store, then enable an Arabic voice under Settings > Accessibility > Text-to-speech output (wording varies by manufacturer).",
      );
      return;
    }
    hapticSelection();
    void Speech.stop();
    setIsSpeaking(true);
    Speech.speak(toSpeechText(currentEntry.word.arabic), {
      voice: voice.identifier,
      language: voice.language,
      rate: ttsRate,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => {
        setIsSpeaking(false);
        Alert.alert('Couldn\u2019t play audio', 'The text-to-speech voice failed unexpectedly. Please try again.');
      },
    });
  };

  const handleClose = () => {
    void Speech.stop();
    if (Platform.OS === 'web') {
      router.back();
      return;
    }
    Alert.alert('End session?', 'Your progress so far has already been saved.', [
      { text: 'Keep reviewing', style: 'cancel' },
      { text: 'End session', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const handleGrade = (grade: GradeName) => {
    if (!currentEntry) return;
    hapticGrade(grade);
    const nextCard = gradeWord(currentEntry.word.id, grade);
    setRatingCounts((prev) => ({ ...prev, [grade]: prev[grade] + 1 }));

    // Still Learning/Relearning (not yet graduated to Review) means it's due again in minutes -
    // requeue it at the end of this session, the same "you'll see it again soon" behavior Anki
    // gives a card that hasn't graduated yet, rather than only showing it next time a session is
    // built (which, for same-day intervals, could otherwise be tomorrow).
    const needsRequeue = nextCard.state !== State.Review;
    const nextLength = sessionQueue.length + (needsRequeue ? 1 : 0);
    if (needsRequeue) setSessionQueue((prev) => [...prev, currentEntry]);

    if (index + 1 < nextLength) {
      setIndex(index + 1);
      setRevealed(false);
    } else {
      void Speech.stop();
      setPhase('summary');
    }
  };

  if (phase === 'summary') {
    const unlockedNewLevel = maxUnlockedLevel > initialMaxUnlockedLevel;
    return (
      <ThemedView style={styles.flex}>
        <SafeAreaView style={styles.flex}>
          <View style={styles.summaryContainer}>
            <Animated.View
              entering={ZoomIn.duration(400)}
              style={[styles.summaryIcon, { backgroundColor: theme.backgroundSelected }]}>
              <Ionicons name="checkmark-circle" size={48} color={theme.primary} />
            </Animated.View>
            <ThemedText type="title" style={styles.summaryTitle}>
              {queue.length === 0 ? 'All caught up' : 'Session complete'}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.summarySubtitle}>
              {queue.length === 0 ? emptyMessage : `You reviewed ${queue.length} ${queue.length === 1 ? 'word' : 'words'}.`}
            </ThemedText>

            {queue.length > 0 && (
              <View style={styles.ratingSummaryRow}>
                {(['again', 'hard', 'good', 'easy'] as GradeName[]).map((grade) => (
                  <View key={grade} style={styles.ratingSummaryItem}>
                    <ThemedText type="title" style={styles.ratingSummaryValue}>
                      {ratingCounts[grade]}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.ratingSummaryLabel}>
                      {grade}
                    </ThemedText>
                  </View>
                ))}
              </View>
            )}

            {unlockedNewLevel && (
              <Animated.View
                entering={FadeIn.delay(300)}
                style={[styles.unlockBanner, { backgroundColor: theme.primary }]}>
                <Ionicons name="flag" size={18} color={theme.onPrimary} />
                <ThemedText themeColor="onPrimary" type="smallBold">
                  Now studying level {maxUnlockedLevel}
                </ThemedText>
              </Animated.View>
            )}

            <Button
              mode="contained"
              style={styles.doneButton}
              contentStyle={styles.doneButtonContent}
              onPress={() => {
                hapticLight();
                router.back();
              }}>
              Done
            </Button>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!currentEntry || !currentCard) {
    return <ThemedView style={styles.flex} />;
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              hapticLight();
              handleClose();
            }}
            hitSlop={12}
            style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.textSecondary} />
          </Pressable>
          <ProgressBar progress={index / sessionQueue.length} color={theme.primary} style={styles.progressBar} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.progressLabel}>
            {index + 1}/{sessionQueue.length}
          </ThemedText>
        </View>

        <View style={styles.content}>
          {showLevelTag && (
            <View style={[styles.levelTag, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="small" themeColor="textSecondary">
                Level {currentEntry.levelNumber} - {currentEntry.reason === 'new' ? 'New word' : 'Review'}
              </ThemedText>
            </View>
          )}
          <FlashCard
            arabic={currentEntry.word.arabic}
            english={currentEntry.word.english}
            revealed={revealed}
            onSpeak={handleSpeak}
            isSpeaking={isSpeaking}
          />
        </View>

        <View style={styles.actions}>
          {revealed ? (
            <GradeButtonRow previews={previews} onGrade={handleGrade} />
          ) : (
            <Button
              mode="contained"
              style={styles.showAnswerButton}
              contentStyle={styles.showAnswerContent}
              onPress={() => {
                hapticLight();
                setRevealed(true);
              }}>
              Show answer
            </Button>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  closeButton: {
    padding: Spacing.one,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: Radius.pill,
  },
  progressLabel: {
    minWidth: 40,
    textAlign: 'right',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  levelTag: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  actions: {
    padding: Spacing.four,
  },
  showAnswerButton: {
    borderRadius: Radius.medium,
  },
  showAnswerContent: {
    height: 52,
  },
  summaryContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  summaryIcon: {
    width: 88,
    height: 88,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  summaryTitle: {
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
  },
  summarySubtitle: {
    textAlign: 'center',
  },
  ratingSummaryRow: {
    flexDirection: 'row',
    gap: Spacing.five,
    marginTop: Spacing.three,
  },
  ratingSummaryItem: {
    alignItems: 'center',
  },
  ratingSummaryValue: {
    fontSize: 24,
    lineHeight: 28,
  },
  ratingSummaryLabel: {
    textTransform: 'capitalize',
  },
  unlockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
    marginTop: Spacing.two,
  },
  doneButton: {
    borderRadius: Radius.medium,
    alignSelf: 'stretch',
    marginTop: Spacing.four,
  },
  doneButtonContent: {
    height: 52,
  },
});
