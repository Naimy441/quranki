import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FlashCard } from '@/components/quranki/flash-card';
import { GradeButtonRow } from '@/components/quranki/grade-button-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createNewCard, deserializeCard, formatInterval, previewGrades, State, type GradeName } from '@/lib/fsrs';
import { hapticHeavy, hapticLight, hapticMedium, hapticSelection, hapticSuccess } from '@/lib/haptics';
import { useStudySessionClock } from '@/hooks/use-study-session-clock';
import { getStageForLevel, getUpcomingLearning, isStudyWord, type SessionWord } from '@/lib/levels';
import { formatStudyDuration } from '@/lib/stats';
import { playWordPronunciation, stopWordPronunciation } from '@/lib/word-pronunciation';
import { useProgressStore } from '@/store/progress-store';
import { stopRecitation } from '@/store/recitation-store';

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
}

export function SessionRunner({ queue, emptyMessage }: SessionRunnerProps) {
  const theme = useTheme();
  const progress = useProgressStore((state) => state.progress);
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
  const { sessionMs, markInteraction, flushNow } = useStudySessionClock(phase === 'review' && queue.length > 0);

  useEffect(
    () => () => {
      stopRecitation();
      stopWordPronunciation();
    },
    [],
  );

  const currentEntry = sessionQueue[index];
  const currentWordId = currentEntry?.word.id;
  useEffect(() => {
    setIsSpeaking(false);
    stopWordPronunciation();
  }, [currentWordId]);
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
    markInteraction();
    hapticSelection();
    stopRecitation();
    stopWordPronunciation();
    setIsSpeaking(true);
    void playWordPronunciation(currentEntry.word.id, () => setIsSpeaking(false))
      .then((played) => { if (!played) setIsSpeaking(false); })
      .catch(() => setIsSpeaking(false));
  };

  const handleClose = () => {
    if (Platform.OS === 'web') {
      stopWordPronunciation();
      stopRecitation();
      router.back();
      return;
    }
    Alert.alert('End session?', 'Your progress so far has already been saved.', [
      { text: 'Keep reviewing', style: 'cancel' },
      {
        text: 'End session',
        style: 'destructive',
        onPress: () => {
          stopWordPronunciation();
          stopRecitation();
          router.back();
        },
      },
    ]);
  };

  const handleGrade = (grade: GradeName) => {
    if (!currentEntry) return;
    markInteraction();
    setIsSpeaking(false);
    hapticGrade(grade);
    stopRecitation();
    const nextCard = gradeWord(currentEntry.word.id, grade);
    if (isStudyWord(currentEntry.word)) {
      setRatingCounts((prev) => ({ ...prev, [grade]: prev[grade] + 1 }));
    }

    // Still Learning/Relearning (not yet graduated to Review) means it's due again in minutes -
    // requeue it at the end of this session, the same "you'll see it again soon" behavior Anki
    // gives a card that hasn't graduated yet, rather than only showing it later this sitting.
    const needsRequeue = nextCard.state !== State.Review && isStudyWord(currentEntry.word);
    const nextLength = sessionQueue.length + (needsRequeue ? 1 : 0);
    if (needsRequeue) {
      setSessionQueue((prev) => [...prev, { ...currentEntry, reason: 'due' }]);
    }

    if (index + 1 < nextLength) {
      setIndex(index + 1);
      setRevealed(false);
    } else {
      stopWordPronunciation();
      flushNow();
      setPhase('summary');
    }
  };

  if (phase === 'summary') {
    const unlockedNewLevel = maxUnlockedLevel > initialMaxUnlockedLevel;
    const reviewedCount = queue.filter((entry) => isStudyWord(entry.word)).length;
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
              {queue.length === 0
                ? emptyMessage
                : reviewedCount === 0
                  ? 'Grammar intro done.'
                  : `You reviewed ${reviewedCount} ${reviewedCount === 1 ? 'word' : 'words'}${sessionMs > 0 ? ` in ${formatStudyDuration(sessionMs)}` : ''}.`}
            </ThemedText>
            {reviewedCount > 0 ? <UpcomingReviewNote /> : null}

            {reviewedCount > 0 && (
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
                  {getStageForLevel(maxUnlockedLevel).id > getStageForLevel(initialMaxUnlockedLevel).id
                    ? `Stage ${getStageForLevel(maxUnlockedLevel).id} unlocked`
                    : `Now studying level ${maxUnlockedLevel}`}
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

  const studyTotal = sessionQueue.filter((entry) => isStudyWord(entry.word)).length;
  const studyCompleted = sessionQueue.slice(0, index).filter((entry) => isStudyWord(entry.word)).length;
  const studyPosition = isStudyWord(currentEntry.word) ? studyCompleted + 1 : studyCompleted;
  const studyProgress = studyTotal === 0 ? 0 : studyCompleted / studyTotal;

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <View style={styles.topBar}>
          <View style={styles.topBarSide}>
            <Pressable
              onPress={() => {
                hapticLight();
                handleClose();
              }}
              hitSlop={12}
              style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.progressLabel}>
            {studyTotal === 0 ? '' : `${Math.max(studyPosition, 1)}/${studyTotal}`}
          </ThemedText>
          <View style={[styles.topBarSide, styles.topBarSideEnd]}>
            <ThemedText type="small" themeColor="textSecondary">
              Level {currentEntry.levelNumber}
            </ThemedText>
          </View>
        </View>
        <SessionProgressBar progress={studyProgress} color={theme.primary} trackColor={theme.backgroundElement} />

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentInner,
            revealed || currentEntry.word.kind === 'grammar' ? styles.contentRevealed : styles.contentPrompt,
          ]}
          keyboardShouldPersistTaps="handled">
          <FlashCard
            word={currentEntry.word}
            revealed={revealed || currentEntry.word.kind === 'grammar'}
            onSpeak={handleSpeak}
            isSpeaking={isSpeaking}
          />
        </ScrollView>

        <View style={styles.actions}>
          {currentEntry.word.kind === 'grammar' ? (
            <Button
              mode="contained"
              style={styles.showAnswerButton}
              contentStyle={styles.showAnswerContent}
              onPress={() => handleGrade('easy')}>
              Got it
            </Button>
          ) : revealed ? (
            <GradeButtonRow previews={previews} onGrade={handleGrade} />
          ) : (
            <Button
              mode="contained"
              style={styles.showAnswerButton}
              contentStyle={styles.showAnswerContent}
              onPress={() => {
                markInteraction();
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
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  topBarSide: {
    width: 72,
    justifyContent: 'center',
  },
  topBarSideEnd: {
    alignItems: 'flex-end',
  },
  closeButton: {
    padding: Spacing.one,
    marginLeft: -Spacing.one,
  },
  progressLabel: {
    flex: 1,
    textAlign: 'center',
  },
  progressTrack: {
    height: 6,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    marginHorizontal: Spacing.four,
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  contentPrompt: {
    justifyContent: 'center',
  },
  contentRevealed: {
    justifyContent: 'flex-start',
    paddingTop: Spacing.three,
  },
  actions: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
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

function SessionProgressBar({
  progress,
  color,
  trackColor,
}: {
  progress: number;
  color: string;
  trackColor: string;
}) {
  const fill = useSharedValue(progress);
  const trackWidth = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(Math.min(1, Math.max(0, progress)), {
      duration: 380,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, fill]);

  const fillStyle = useAnimatedStyle(() => ({
    width: trackWidth.value * fill.value,
  }));

  return (
    <View
      style={[styles.progressTrack, { backgroundColor: trackColor }]}
      onLayout={(event) => {
        trackWidth.value = event.nativeEvent.layout.width;
      }}>
      <Animated.View style={[styles.progressFill, { backgroundColor: color }, fillStyle]} />
    </View>
  );
}

function UpcomingReviewNote() {
  const upcoming = getUpcomingLearning(useProgressStore.getState().progress, new Date());
  if (!upcoming) return null;
  const label = upcoming.count === 1 ? 'word comes' : 'words come';
  return (
    <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
      {upcoming.count} {label} back in about {formatInterval(upcoming.ms)}.
    </ThemedText>
  );
}
