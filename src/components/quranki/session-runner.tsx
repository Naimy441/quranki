import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FlashCard } from '@/components/quranki/flash-card';
import { GradeButtonRow } from '@/components/quranki/grade-button-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useStudySessionClock } from '@/hooks/use-study-session-clock';
import { useTheme } from '@/hooks/use-theme';
import {
    createNewCard,
    deserializeCard,
    formatInterval,
    previewGrades,
    serializeCard,
    State,
    type Card,
    type GradeName,
    type GradePreview,
} from '@/lib/fsrs';
import { hapticHeavy, hapticLight, hapticMedium, hapticSelection, hapticSuccess } from '@/lib/haptics';
import { getStageForLevel, getUpcomingLearning, hidesPromptArabic, isStudyWord, type SessionWord, type WordProgress } from '@/lib/levels';
import { formatStudyDuration } from '@/lib/stats';
import { playWordPronunciation, prefetchWordPronunciation, stopWordPronunciation } from '@/lib/word-pronunciation';
import { useProgressStore } from '@/store/progress-store';
import { stopRecitation } from '@/store/recitation-store';

function hapticGrade(grade: GradeName) {
  if (grade === 'again') hapticHeavy();
  else if (grade === 'hard') hapticMedium();
  else if (grade === 'good') hapticLight();
  else hapticSuccess();
}

const EMPTY_RATING_COUNTS: Record<GradeName, number> = { again: 0, hard: 0, good: 0, easy: 0 };

type QueuedEntry = SessionWord & { sessionKey: string };

let nextSessionKey = 0;
function tagEntry(entry: SessionWord): QueuedEntry {
  nextSessionKey += 1;
  return { ...entry, sessionKey: `q-${nextSessionKey}` };
}

/** Position in the sitting, counting a later Again/Hard copy of the same word only if
 *  that word still appears ahead. All-Hard then back-and-Easy stays 1/10…10/10 instead of
 *  ballooning to 20 and finishing at 10/20. */
function cloneWordProgress(progress: WordProgress): WordProgress {
  return { ...progress, card: { ...progress.card } };
}

function ratingCountsFromGrades(grades: Record<string, { grades: GradeName[] }>): Record<GradeName, number> {
  const counts = { ...EMPTY_RATING_COUNTS };
  for (const entry of Object.values(grades)) {
    for (const grade of entry.grades) counts[grade] += 1;
  }
  return counts;
}

function sessionStudyProgress(queue: QueuedEntry[], index: number, currentEntry: QueuedEntry) {
  const studyCompleted = queue.slice(0, index).filter((entry) => isStudyWord(entry.word)).length;
  const aheadIds = new Set<string>();
  for (let i = index; i < queue.length; i += 1) {
    if (isStudyWord(queue[i].word)) aheadIds.add(queue[i].word.id);
  }
  const studyTotal = studyCompleted + aheadIds.size;
  const studyPosition = isStudyWord(currentEntry.word) ? studyCompleted + 1 : studyCompleted;
  const studyProgress = studyTotal === 0 ? 0 : studyCompleted / studyTotal;
  return { studyTotal, studyPosition, studyProgress };
}

interface SessionRunnerProps {
  /** The frozen queue of words for this session, built once by the caller. */
  queue: SessionWord[];
  /** Shown in the "all caught up" empty state when the queue is empty. */
  emptyMessage: string;
}

export function SessionRunner({ queue, emptyMessage }: SessionRunnerProps) {
  const theme = useTheme();
  const progress = useProgressStore((state) => state.progress);
  const hideNextSessionPrompts = useProgressStore((state) => state.hideNextSessionPrompts);
  const maxUnlockedLevel = useProgressStore((state) => state.maxUnlockedLevel);
  const gradeWord = useProgressStore((state) => state.gradeWord);
  const revertSessionWord = useProgressStore((state) => state.revertSessionWord);

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
  const [sessionQueue, setSessionQueue] = useState(() => queue.map(tagEntry));
  const { sessionMs, markInteraction, flushNow } = useStudySessionClock(phase === 'review' && queue.length > 0);
  // Grade previews must keep using the card as it was when this queue slot first appeared.
  // After a rating, FSRS mutates the stored card; going back would otherwise show the
  // post-grade intervals as if they were the original Again/Hard/Good/Easy. Keyed by
  // sessionKey so a later requeue of the same word can snapshot its post-Again state.
  const firstSeenCards = useRef<Record<string, Card>>({});
  const firstSeenPreviews = useRef<Record<string, GradePreview[]>>({});
  const firstSeenByWord = useRef<Record<string, Card>>({});
  const preSessionProgress = useRef<Record<string, WordProgress | null>>({});
  const sessionGradesByWord = useRef<
    Record<string, { grades: GradeName[]; countedAsNew: boolean; countedAsReview: boolean }>
  >({});
  const autoplayOnAdvance = useRef(false);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelOverlayAutoplay = () => {
    if (autoplayTimer.current == null) return;
    clearTimeout(autoplayTimer.current);
    autoplayTimer.current = null;
  };

  useEffect(
    () => () => {
      stopRecitation();
      stopWordPronunciation();
    },
    [],
  );

  const currentEntry = sessionQueue[index];
  const currentWordId = currentEntry?.word.id;
  const nextWordId = sessionQueue[index + 1]?.word.id;
  useEffect(() => {
    setIsSpeaking(false);
    stopWordPronunciation();
    if (currentWordId) prefetchWordPronunciation(currentWordId);
  }, [currentWordId]);
  useEffect(() => {
    if (nextWordId) prefetchWordPronunciation(nextWordId);
  }, [nextWordId]);
  useEffect(() => {
    if (!currentEntry || !autoplayOnAdvance.current) return;
    autoplayOnAdvance.current = false;
    const store = useProgressStore.getState();
    const hideArabic =
      currentEntry.word.kind !== 'grammar' &&
      (store.hideNextSessionPrompts || hidesPromptArabic(store.progress[currentEntry.word.id]));
    if (!hideArabic) return;
    const wordId = currentEntry.word.id;
    autoplayTimer.current = setTimeout(() => {
      autoplayTimer.current = null;
      stopRecitation();
      setIsSpeaking(true);
      void playWordPronunciation(wordId, () => setIsSpeaking(false))
        .then((played) => {
          if (!played) setIsSpeaking(false);
        })
        .catch(() => setIsSpeaking(false));
    }, 400);
    return () => {
      cancelOverlayAutoplay();
    };
  }, [currentEntry?.sessionKey]);
  const currentProgress = currentEntry ? progress[currentEntry.word.id] : undefined;

  const currentCard = useMemo(() => {
    if (!currentEntry) return null;
    return currentProgress ? deserializeCard(currentProgress.card) : createNewCard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEntry?.word.id, currentProgress?.reviewedAt]);

  if (currentEntry && currentCard && !firstSeenCards.current[currentEntry.sessionKey]) {
    firstSeenCards.current[currentEntry.sessionKey] = deserializeCard(serializeCard(currentCard));
  }
  if (currentEntry && currentCard && !firstSeenByWord.current[currentEntry.word.id]) {
    firstSeenByWord.current[currentEntry.word.id] = deserializeCard(serializeCard(currentCard));
    preSessionProgress.current[currentEntry.word.id] = currentProgress ? cloneWordProgress(currentProgress) : null;
  }
  const previewCard = currentEntry
    ? (firstSeenCards.current[currentEntry.sessionKey] ?? currentCard)
    : null;

  const previews = useMemo(() => {
    if (!previewCard || !currentEntry) return [];
    const key = currentEntry.sessionKey;
    if (!firstSeenPreviews.current[key]) {
      firstSeenPreviews.current[key] = previewGrades(previewCard, new Date());
    }
    return firstSeenPreviews.current[key];
  }, [previewCard, currentEntry?.sessionKey]);

  const handleSpeak = async () => {
    if (!currentEntry) return;
    cancelOverlayAutoplay();
    markInteraction();
    hapticSelection();
    stopRecitation();
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

  const handleHideAnswer = () => {
    markInteraction();
    hapticLight();
    stopRecitation();
    setRevealed(false);
  };

  const handlePreviousWord = () => {
    if (index <= 0) return;
    autoplayOnAdvance.current = false;
    cancelOverlayAutoplay();
    markInteraction();
    hapticLight();
    stopRecitation();
    stopWordPronunciation();
    setIsSpeaking(false);
    const targetIndex = index - 1;
    const target = sessionQueue[targetIndex];
    if (target && isStudyWord(target.word)) {
      const wordId = target.word.id;
      const recorded = sessionGradesByWord.current[wordId];
      if (recorded) {
        revertSessionWord(wordId, preSessionProgress.current[wordId] ?? undefined, {
          countedAsNew: recorded.countedAsNew,
          countedAsReview: recorded.countedAsReview,
        });
        delete sessionGradesByWord.current[wordId];
        setRatingCounts(ratingCountsFromGrades(sessionGradesByWord.current));
      }
      setSessionQueue((prev) =>
        prev.filter((entry, entryIndex) => entryIndex <= targetIndex || entry.word.id !== wordId),
      );
    }
    setIndex(targetIndex);
    setRevealed(false);
  };

  const handleGrade = (grade: GradeName) => {
    if (!currentEntry) return;
    markInteraction();
    setIsSpeaking(false);
    hapticGrade(grade);
    stopRecitation();
    const wordId = currentEntry.word.id;
    const alreadyGraded = sessionGradesByWord.current[wordId];
    // This slot's first-seen card: the original on first pass, or the post-Hard card on a
    // later copy. Going back restores the word first, so a re-rate here is a fresh review.
    const fromCard = firstSeenCards.current[currentEntry.sessionKey] ?? firstSeenByWord.current[wordId];
    const existing = progress[wordId];
    const baseCard = fromCard ?? (existing ? deserializeCard(existing.card) : createNewCard());
    const countedAsReview =
      !alreadyGraded && existing !== undefined && baseCard.state === State.Review;
    const countedAsNew = !alreadyGraded && existing === undefined && isStudyWord(currentEntry.word);
    const nextCard = gradeWord(wordId, grade, {
      ...(fromCard ? { fromCard } : {}),
      replaceSessionGrade: alreadyGraded !== undefined,
    });
    if (isStudyWord(currentEntry.word)) {
      sessionGradesByWord.current[wordId] = {
        grades: [...(alreadyGraded?.grades ?? []), grade],
        countedAsNew: alreadyGraded?.countedAsNew ?? countedAsNew,
        countedAsReview: alreadyGraded?.countedAsReview ?? countedAsReview,
      };
      setRatingCounts(ratingCountsFromGrades(sessionGradesByWord.current));
    }

    // Still Learning/Relearning (not yet graduated to Review) means it's due again in minutes -
    // requeue it at the end of this session, the same "you'll see it again soon" behavior Anki
    // gives a card that hasn't graduated yet, rather than only showing it later this sitting.
    const needsRequeue = nextCard.state !== State.Review && isStudyWord(currentEntry.word);
    let nextQueue = sessionQueue.filter(
      (entry, entryIndex) => entryIndex <= index || entry.word.id !== wordId,
    );
    if (needsRequeue) {
      nextQueue = [...nextQueue, tagEntry({ ...currentEntry, reason: 'due' })];
    }
    if (nextQueue !== sessionQueue) setSessionQueue(nextQueue);

    if (index + 1 < nextQueue.length) {
      autoplayOnAdvance.current = true;
      setIndex(index + 1);
      setRevealed(false);
    } else {
      stopWordPronunciation();
      flushNow();
      setPhase('summary');
    }
  };

  if (phase === 'summary') {
    const unlockedNewStage =
      getStageForLevel(maxUnlockedLevel).id > getStageForLevel(initialMaxUnlockedLevel).id;
    const unlockedNewLevel = maxUnlockedLevel > initialMaxUnlockedLevel || unlockedNewStage;
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
                  {unlockedNewStage
                    ? getStageForLevel(maxUnlockedLevel).kind === 'asma'
                      ? 'The 99 Names unlocked'
                      : `Stage ${getStageForLevel(maxUnlockedLevel).id} unlocked`
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

  const { studyTotal, studyPosition, studyProgress } = sessionStudyProgress(sessionQueue, index, currentEntry);
  const studyKindLabel =
    currentEntry.word.kind === 'grammar'
      ? 'Lesson'
      : currentEntry.reason === 'new'
        ? 'New'
        : previewCard && (previewCard.state === State.Learning || previewCard.state === State.Relearning)
          ? 'Learn'
          : 'Review';

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
              hitSlop={8}
              accessibilityLabel="End session"
              style={styles.chromeButton}>
              <Ionicons name="close" size={22} color={theme.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.topBarCenter}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.progressLabel}>
              {studyTotal === 0 ? '' : `${Math.max(studyPosition, 1)}/${studyTotal}`}
            </ThemedText>
          </View>
          <View style={[styles.topBarSide, styles.topBarSideEnd]}>
            {currentEntry.word.kind !== 'grammar' && revealed ? (
              <Pressable
                onPress={handleHideAnswer}
                hitSlop={8}
                accessibilityLabel="Hide answer"
                style={({ pressed }) => [styles.chromeButton, pressed && styles.chromePressed]}>
                <Ionicons name="eye-off-outline" size={20} color={theme.textSecondary} />
              </Pressable>
            ) : index > 0 ? (
              <Pressable
                onPress={handlePreviousWord}
                hitSlop={8}
                accessibilityLabel="Previous word"
                style={({ pressed }) => [styles.chromeButton, pressed && styles.chromePressed]}>
                <Ionicons name="chevron-back" size={22} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>
          <SessionProgressBar progress={studyProgress} color={theme.primary} trackColor={theme.backgroundElement} />
        </View>

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
            hideArabic={
              currentEntry.word.kind !== 'grammar' &&
              (hideNextSessionPrompts || hidesPromptArabic(currentProgress))
            }
            appearanceKey={currentEntry.sessionKey}
            onSpeak={handleSpeak}
            isSpeaking={isSpeaking}
          />
        </ScrollView>

        <View style={styles.actions}>
          <View style={styles.actionStage}>
            <ThemedText
              type="small"
              themeColor="textMuted"
              numberOfLines={1}
              pointerEvents="none"
              style={styles.actionMeta}>
              Level {currentEntry.levelNumber}
              {' - '}
              {studyKindLabel}
            </ThemedText>
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
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.one,
  },
  topBarSide: {
    minWidth: 72,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarSideEnd: {
    justifyContent: 'flex-end',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
  },
  chromeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chromePressed: {
    opacity: 0.55,
  },
  progressLabel: {
    textAlign: 'center',
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
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
    paddingBottom: Spacing.five,
  },
  actionStage: {
    position: 'relative',
  },
  actionMeta: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '100%',
    marginTop: Spacing.two,
    textAlign: 'center',
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
