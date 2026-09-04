import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { InlineMeta } from '@/components/inline-meta';
import { GrammarIntroRow } from '@/components/quranki/grammar-intro-row';
import { LevelCard } from '@/components/quranki/level-card';
import { StageCard } from '@/components/quranki/stage-card';
import { StatCard } from '@/components/quranki/stat-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatInterval } from '@/lib/fsrs';
import { hapticMedium } from '@/lib/haptics';
import {
  buildGlobalSessionQueue,
  getGrammarIntro,
  getIntroductionFrontier,
  getLevelStatusesForStage,
  getMasteredLemmaIds,
  getStage,
  getStageProgress,
  getUnlockedStage,
  getUpcomingLearning,
  isStageUnlocked,
  isStudyWord,
  STAGES,
  type LevelStatus,
  type Word,
} from '@/lib/levels';
import { getKnownLemmaIds } from '@/lib/known-words';
import { computeStreak, formatCount } from '@/lib/stats';
import { useKnownWordsStore } from '@/store/known-words-store';
import { newCardsCompletedToday, reviewsCompletedToday, useProgressStore } from '@/store/progress-store';

type LearnRow =
  | { key: string; type: 'grammar'; word: Word }
  | { key: string; type: 'level'; status: LevelStatus };

function rowsForStatuses(statuses: LevelStatus[]): LearnRow[] {
  const rows: LearnRow[] = [];
  for (const status of statuses) {
    const grammar = getGrammarIntro(status.level);
    if (grammar) rows.push({ key: `grammar-${grammar.id}`, type: 'grammar', word: grammar });
    rows.push({ key: status.level.id, type: 'level', status });
  }
  return rows;
}

export default function LearnScreen() {
  const theme = useTheme();
  const progress = useProgressStore((state) => state.progress);
  const wordsPerSession = useProgressStore((state) => state.settings.wordsPerSession);
  const reviewsToday = useProgressStore((state) => state.reviewsToday);
  const newCardsToday = useProgressStore((state) => state.newCardsToday);
  const reviewCountDate = useProgressStore((state) => state.reviewCountDate);
  const reviewDates = useProgressStore((state) => state.reviewDates);
  const streakGraceDates = useProgressStore((state) => state.streakGraceDates);
  const maxUnlockedLevel = useProgressStore((state) => state.maxUnlockedLevel);
  const hydrated = useProgressStore((state) => state.hydrated);
  const knownWords = useKnownWordsStore((state) => state.knownWords);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);

  const now = new Date();
  const reviewsAlready = reviewsCompletedToday(reviewCountDate, reviewsToday, now);
  const newAlready = newCardsCompletedToday(reviewCountDate, newCardsToday, now);
  const todaySession = buildGlobalSessionQueue(progress, now, wordsPerSession, reviewsAlready, newAlready);
  const extraSession =
    todaySession.length > 0
      ? []
      : buildGlobalSessionQueue(progress, now, wordsPerSession, reviewsAlready, newAlready, true);
  const canStart = todaySession.length > 0 || extraSession.length > 0;
  const studyToday = todaySession.filter((entry) => isStudyWord(entry.word));
  const extraStudy = extraSession.filter((entry) => isStudyWord(entry.word));
  const hasWorkToday = studyToday.length > 0;
  const dueCount = studyToday.filter((entry) => entry.reason === 'due').length;
  const newCount = studyToday.filter((entry) => entry.reason === 'new').length;
  const upcoming = getUpcomingLearning(progress, now);
  const newRemaining = Math.max(0, wordsPerSession - newCardsCompletedToday(reviewCountDate, newCardsToday, now));
  const streak = computeStreak(reviewDates, streakGraceDates, now);
  const frontier = getIntroductionFrontier(progress);
  const reachedLevel = Math.max(maxUnlockedLevel, frontier);
  const unlockedStage = getUnlockedStage(reachedLevel);
  const masteredLemmaIds = getMasteredLemmaIds(progress);
  for (const id of getKnownLemmaIds(knownWords)) masteredLemmaIds.add(id);
  const selectedStage = getStage(selectedStageId ?? unlockedStage.id) ?? STAGES[0];
  const selectedUnlocked = isStageUnlocked(selectedStage, reachedLevel);
  const visibleStage = selectedUnlocked ? selectedStage : STAGES[0];
  const rows = rowsForStatuses(getLevelStatusesForStage(visibleStage, progress, now));

  if (!hydrated) {
    return <ThemedView style={styles.flex} />;
  }

  return (
    <ThemedView style={styles.flex} collapsable={false}>
      <SafeAreaView style={styles.flex} edges={['top']} collapsable={false}>
        <FlatList
          data={rows}
          keyExtractor={(item) => item.key}
          contentContainerStyle={[styles.listContent, { paddingBottom: BottomTabInset + Spacing.four }]}
          style={styles.list}
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={[styles.heroCard, { backgroundColor: theme.primary }]}>
                <View style={styles.heroRow}>
                  <View style={styles.heroIconWrap}>
                    <View style={[styles.heroIconFill, { backgroundColor: theme.onPrimary }]} />
                    <Ionicons
                      name={hasWorkToday ? 'book-outline' : 'checkmark'}
                      size={22}
                      color={theme.onPrimary}
                    />
                  </View>
                  <View style={styles.heroTextBlock}>
                    <ThemedText themeColor="onPrimary" type="smallBold">
                      {hasWorkToday
                        ? "Today's review"
                        : extraSession.length > 0
                          ? 'Session done'
                          : 'All caught up'}
                    </ThemedText>
                    {hasWorkToday ? (
                      <InlineMeta
                        themeColor="onPrimary"
                        items={[
                          dueCount > 0 ? `${dueCount} due` : null,
                          newCount > 0 ? `${newCount} new` : null,
                        ]}
                        style={styles.heroBreakdown}
                      />
                    ) : (
                      <ThemedText themeColor="onPrimary" type="small" style={styles.heroBreakdown}>
                        {extraSession.length > 0
                          ? 'Start another if you want.'
                          : upcoming
                            ? `${upcoming.count} ${upcoming.count === 1 ? 'word' : 'words'} come back in ${formatInterval(upcoming.ms)}`
                            : newRemaining === 0
                              ? 'More new words tomorrow.'
                              : 'Nothing due right now.'}
                      </ThemedText>
                    )}
                  </View>
                </View>
                {hasWorkToday || canStart ? (
                  <Button
                    mode="contained"
                    style={styles.heroButton}
                    contentStyle={styles.heroButtonContent}
                    buttonColor={theme.onPrimary}
                    textColor={theme.primary}
                    onPress={() => {
                      hapticMedium();
                      router.push('/session/review');
                    }}>
                    {hasWorkToday
                      ? `Start ${studyToday.length} ${studyToday.length === 1 ? 'word' : 'words'}`
                      : extraStudy.length > 0
                        ? `Study ${extraStudy.length} more`
                        : 'Study more'}
                  </Button>
                ) : null}
              </View>

              <View style={styles.statsRow}>
                <StatCard
                  icon="checkmark-done"
                  label="Mastered"
                  value={formatCount(masteredLemmaIds.size)}
                />
                <StatCard icon="flame" label="Day streak" value={String(streak)} />
                <StatCard icon="layers" label="Level" value={String(reachedLevel)} />
              </View>

              <View style={[styles.stageGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {STAGES.map((stage) => (
                  <StageCard
                    key={stage.id}
                    stage={stage}
                    progress={getStageProgress(stage, progress, now)}
                    unlocked={isStageUnlocked(stage, reachedLevel)}
                    selected={visibleStage.id === stage.id}
                    onPress={() => setSelectedStageId(stage.id)}
                  />
                ))}
              </View>

              <ThemedText type="smallBold" style={styles.levelsLabel}>
                {visibleStage.title}
              </ThemedText>
            </View>
          }
          renderItem={({ item }) =>
            item.type === 'grammar' ? (
              <View style={styles.grammarWrap}>
                <GrammarIntroRow word={item.word} />
              </View>
            ) : (
              <View style={styles.cardWrap}>
                <LevelCard status={item.status} isCurrent={item.status.level.number === frontier} />
              </View>
            )
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  list: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
  },
  header: {
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.three,
  },
  heroCard: {
    gap: Spacing.three,
    borderRadius: Radius.large,
    padding: Spacing.four,
    marginTop: Spacing.one,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  heroIconWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconFill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: Radius.pill,
    opacity: 0.2,
  },
  heroTextBlock: {
    flex: 1,
    gap: 2,
  },
  heroBreakdown: {
    opacity: 0.9,
  },
  heroButton: {
    borderRadius: Radius.medium,
    alignSelf: 'stretch',
  },
  heroButtonContent: {
    height: 44,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  stageGroup: {
    borderRadius: Radius.large,
    borderWidth: 1,
    padding: Spacing.one,
  },
  levelsLabel: {
    marginTop: Spacing.two,
  },
  cardWrap: {
    marginBottom: Spacing.two,
  },
  grammarWrap: {
    marginBottom: Spacing.two,
  },
});
