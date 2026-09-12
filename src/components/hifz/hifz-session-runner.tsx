import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HifzCardFront } from '@/components/hifz/hifz-card-front';
import { RukuReader } from '@/components/hifz/ruku-reader';
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
  State,
  type GradeName,
} from '@/lib/fsrs';
import { hapticHeavy, hapticLight, hapticMedium, hapticSelection, hapticSuccess } from '@/lib/haptics';
import { playRukuCue, stopRukuCue } from '@/lib/hifz-cue-audio';
import { hifzCardKey, type HifzCardProgress, type HifzSessionCard } from '@/lib/hifz';
import { formatStudyDuration } from '@/lib/stats';
import { useHifzStore } from '@/store/hifz-store';
import { playSurah, stopRecitation } from '@/store/recitation-store';

function hapticGrade(grade: GradeName) {
  if (grade === 'again') hapticHeavy();
  else if (grade === 'hard') hapticMedium();
  else if (grade === 'good') hapticLight();
  else hapticSuccess();
}

const EMPTY_RATING_COUNTS: Record<GradeName, number> = { again: 0, hard: 0, good: 0, easy: 0 };

type QueuedEntry = HifzSessionCard & { sessionKey: string };

let nextSessionKey = 0;
function tagEntry(entry: HifzSessionCard): QueuedEntry {
  nextSessionKey += 1;
  return { ...entry, sessionKey: `h-${nextSessionKey}` };
}

function cloneCardProgress(progress: HifzCardProgress): HifzCardProgress {
  return { ...progress, card: { ...progress.card } };
}

function ratingCountsFromGrades(grades: Record<string, { grade: GradeName }>): Record<GradeName, number> {
  const counts = { ...EMPTY_RATING_COUNTS };
  for (const entry of Object.values(grades)) counts[entry.grade] += 1;
  return counts;
}

interface HifzSessionRunnerProps {
  queue: HifzSessionCard[];
}

export function HifzSessionRunner({ queue }: HifzSessionRunnerProps) {
  const theme = useTheme();
  const cards = useHifzStore((state) => state.cards);
  const gradeRuku = useHifzStore((state) => state.gradeRuku);
  const revertSessionRuku = useHifzStore((state) => state.revertSessionRuku);

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [phase, setPhase] = useState<'review' | 'summary'>(queue.length === 0 ? 'summary' : 'review');
  const [ratingCounts, setRatingCounts] = useState<Record<GradeName, number>>(EMPTY_RATING_COUNTS);
  const [sessionQueue, setSessionQueue] = useState(() => queue.map(tagEntry));
  const [clock] = useState(() => new Date());
  const { sessionMs, markInteraction, flushNow } = useStudySessionClock(phase === 'review' && queue.length > 0);

  const preSessionProgress = useRef<Record<number, HifzCardProgress | null>>({});
  const sessionGradesByRuku = useRef<Record<number, { grade: GradeName }>>({});

  useEffect(
    () => () => {
      stopRecitation();
      stopRukuCue();
    },
    [],
  );

  const currentEntry = sessionQueue[index];
  const currentRukuId = currentEntry?.ruku.id;
  const currentProgress = currentRukuId !== undefined ? cards[hifzCardKey(currentRukuId)] : undefined;

  const currentCard = useMemo(() => {
    if (!currentEntry) return null;
    return currentProgress ? deserializeCard(currentProgress.card) : createNewCard();
  }, [currentEntry, currentProgress]);

  // Freeze the card for this queue slot so a grade's store write cannot change the
  // intervals still on screen before we advance.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- sessionKey is the slot identity
  const slotCard = useMemo(() => currentCard, [currentEntry?.sessionKey]);
  const previews = useMemo(
    () => (slotCard ? previewGrades(slotCard, clock) : []),
    [clock, slotCard],
  );

  const handleSpeak = async () => {
    if (!currentEntry) return;
    markInteraction();
    hapticSelection();
    stopRecitation();
    if (isSpeaking) {
      stopRukuCue();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    void playRukuCue(currentEntry.ruku, () => setIsSpeaking(false))
      .then((played) => { if (!played) setIsSpeaking(false); })
      .catch(() => setIsSpeaking(false));
  };

  const handleClose = () => {
    if (Platform.OS === 'web') {
      stopRukuCue();
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
          stopRukuCue();
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

  const handlePrevious = () => {
    if (index <= 0) return;
    markInteraction();
    hapticLight();
    stopRecitation();
    stopRukuCue();
    setIsSpeaking(false);
    const targetIndex = index - 1;
    const target = sessionQueue[targetIndex];
    if (target) {
      const rukuId = target.ruku.id;
      const recorded = sessionGradesByRuku.current[rukuId];
      if (recorded) {
        revertSessionRuku(rukuId, preSessionProgress.current[rukuId] ?? undefined);
        delete sessionGradesByRuku.current[rukuId];
        setRatingCounts(ratingCountsFromGrades(sessionGradesByRuku.current));
      }
      setSessionQueue((prev) =>
        prev.filter((entry, entryIndex) => entryIndex <= targetIndex || entry.ruku.id !== rukuId),
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
    stopRukuCue();
    const rukuId = currentEntry.ruku.id;
    if (preSessionProgress.current[rukuId] === undefined) {
      preSessionProgress.current[rukuId] = currentProgress ? cloneCardProgress(currentProgress) : null;
    }
    const nextCard = gradeRuku(rukuId, grade, slotCard ? { fromCard: slotCard } : {});
    sessionGradesByRuku.current[rukuId] = { grade };
    setRatingCounts(ratingCountsFromGrades(sessionGradesByRuku.current));

    const needsRequeue = nextCard.state !== State.Review;
    let nextQueue = sessionQueue.filter(
      (entry, entryIndex) => entryIndex <= index || entry.ruku.id !== rukuId,
    );
    if (needsRequeue) {
      nextQueue = [...nextQueue, tagEntry({ ...currentEntry, reason: 'due' })];
    }
    if (nextQueue !== sessionQueue) setSessionQueue(nextQueue);

    if (index + 1 < nextQueue.length) {
      setIndex(index + 1);
      setRevealed(false);
    } else {
      stopRukuCue();
      flushNow();
      setPhase('summary');
    }
  };

  if (phase === 'summary') {
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
                ? 'Nothing is due in your Quran memorization deck.'
                : `You reviewed ${queue.length} ${queue.length === 1 ? 'ruku' : 'rukus'}${sessionMs > 0 ? ` in ${formatStudyDuration(sessionMs)}` : ''}.`}
            </ThemedText>
            {queue.length > 0 ? <UpcomingHifzNote /> : null}

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

  const studyTotal = sessionQueue.length;
  const studyPosition = index + 1;
  const studyProgress = studyTotal === 0 ? 0 : index / studyTotal;
  const studyKindLabel =
    currentEntry.reason === 'new'
      ? 'New'
      : slotCard && (slotCard.state === State.Learning || slotCard.state === State.Relearning)
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
              {`${studyPosition}/${studyTotal}`}
            </ThemedText>
          </View>
          <View style={[styles.topBarSide, styles.topBarSideEnd]}>
            {revealed ? (
              <>
                <Pressable
                  onPress={() => {
                    hapticLight();
                    markInteraction();
                    stopRukuCue();
                    void playSurah(currentEntry.ruku.surah, currentEntry.ruku.fromAyah, currentEntry.ruku.toAyah);
                  }}
                  hitSlop={8}
                  accessibilityLabel="Play this ruku"
                  style={({ pressed }) => [styles.chromeButton, pressed && styles.chromePressed]}>
                  <Ionicons name="play" size={20} color={theme.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={() => {
                    hapticLight();
                    router.push('/reader-settings');
                  }}
                  hitSlop={8}
                  accessibilityLabel="Reader settings"
                  style={({ pressed }) => [styles.chromeButton, pressed && styles.chromePressed]}>
                  <Ionicons name="settings-outline" size={20} color={theme.textSecondary} />
                </Pressable>
                <Pressable
                  onPress={handleHideAnswer}
                  hitSlop={8}
                  accessibilityLabel="Hide ruku"
                  style={({ pressed }) => [styles.chromeButton, pressed && styles.chromePressed]}>
                  <Ionicons name="eye-off-outline" size={20} color={theme.textSecondary} />
                </Pressable>
              </>
            ) : index > 0 ? (
              <Pressable
                onPress={handlePrevious}
                hitSlop={8}
                accessibilityLabel="Previous ruku"
                style={({ pressed }) => [styles.chromeButton, pressed && styles.chromePressed]}>
                <Ionicons name="chevron-back" size={22} color={theme.textSecondary} />
              </Pressable>
            ) : null}
          </View>
          <SessionProgressBar progress={studyProgress} color={theme.primary} trackColor={theme.backgroundElement} />
        </View>

        {revealed ? (
          <View style={styles.reader}>
            <RukuReader
              key={currentEntry.ruku.id}
              ruku={currentEntry.ruku}
              footer={
                <View style={styles.gradeFooter}>
                  <GradeButtonRow previews={previews} onGrade={handleGrade} />
                  <ThemedText type="small" themeColor="textMuted" style={styles.gradeKind}>
                    {studyKindLabel}
                  </ThemedText>
                </View>
              }
            />
          </View>
        ) : (
          <>
            <ScrollView
              style={styles.prompt}
              contentContainerStyle={styles.promptContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              <HifzCardFront ruku={currentEntry.ruku} onSpeak={handleSpeak} isSpeaking={isSpeaking} />
            </ScrollView>
            <View style={styles.actions}>
              <Button
                mode="contained"
                style={styles.showAnswerButton}
                contentStyle={styles.showAnswerContent}
                onPress={() => {
                  markInteraction();
                  hapticLight();
                  stopRukuCue();
                  setIsSpeaking(false);
                  setRevealed(true);
                }}>
                Show ruku
              </Button>
            </View>
          </>
        )}
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
    width: 108,
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
  prompt: {
    flex: 1,
    minHeight: 0,
  },
  promptContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  reader: {
    flex: 1,
    minHeight: 0,
  },
  actions: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.one,
  },
  gradeFooter: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
  },
  gradeKind: {
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

function UpcomingHifzNote() {
  const cards = useHifzStore((state) => state.cards);
  const [now] = useState(() => Date.now());
  let soonest: number | null = null;
  for (const entry of Object.values(cards)) {
    const due = new Date(entry.card.due).getTime() - now;
    if (due > 0 && (soonest === null || due < soonest)) soonest = due;
  }
  if (soonest === null) return null;
  return (
    <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
      Next ruku comes back in about {formatInterval(soonest)}.
    </ThemedText>
  );
}
