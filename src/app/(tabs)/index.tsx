import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GrammarIntroRow } from '@/components/quranki/grammar-intro-row';
import { LevelCard } from '@/components/quranki/level-card';
import { StagePicker } from '@/components/quranki/stage-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatInterval } from '@/lib/fsrs';
import { hapticMedium } from '@/lib/haptics';
import { getKnownLemmaIds } from '@/lib/known-words';
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
import { computeStreak, formatCount, formatStudyDuration, studyTimeForDay } from '@/lib/stats';
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

/** Compact icon + value + label, used in the hero's stats footer (onPrimary background). */
function HeroStat({
  icon,
  value,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.heroStat}>
      <View style={styles.heroStatValueRow}>
        <Ionicons name={icon} size={14} color={color} style={styles.heroStatIcon} />
        <ThemedText themeColor="onPrimary" type="smallBold">
          {value}
        </ThemedText>
      </View>
      <ThemedText themeColor="onPrimary" type="small" style={styles.heroStatLabel}>
        {label}
      </ThemedText>
    </View>
  );
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
  const studyMsByDate = useProgressStore((state) => state.studyMsByDate);
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
  const studyTodayMs = studyTimeForDay(studyMsByDate, now);
  const frontier = getIntroductionFrontier(progress);
  const reachedLevel = Math.max(maxUnlockedLevel, frontier);
  const unlockedStage = getUnlockedStage(reachedLevel);
  const masteredLemmaIds = getMasteredLemmaIds(progress);
  for (const id of getKnownLemmaIds(knownWords)) masteredLemmaIds.add(id);
  const selectedStage = getStage(selectedStageId ?? unlockedStage.id) ?? STAGES[0];
  const selectedUnlocked = isStageUnlocked(selectedStage, reachedLevel);
  const visibleStage = selectedUnlocked ? selectedStage : STAGES[0];
  const rows = rowsForStatuses(getLevelStatusesForStage(visibleStage, progress, now));
  const stageEntries = STAGES.map((stage) => ({
    stage,
    progress: getStageProgress(stage, progress, now),
    unlocked: isStageUnlocked(stage, reachedLevel),
  }));

  if (!hydrated) {
    return <ThemedView style={styles.flex} />;
  }

  const heroHeadline = hasWorkToday
    ? `${studyToday.length} ${studyToday.length === 1 ? 'word' : 'words'} to review`
    : extraSession.length > 0
      ? 'All done for today'
      : 'All caught up';

  const heroSubtitle = hasWorkToday
    ? [dueCount > 0 ? `${dueCount} due` : null, newCount > 0 ? `${newCount} new` : null].filter(Boolean).join(' · ')
    : extraSession.length > 0
      ? 'Study ahead if you want more.'
      : upcoming
        ? `${upcoming.count} ${upcoming.count === 1 ? 'word' : 'words'} come back in ${formatInterval(upcoming.ms)}`
        : newRemaining === 0
          ? 'More new words unlock tomorrow.'
          : 'Nothing due right now.';

  const heroButtonLabel = hasWorkToday ? 'Start session' : extraStudy.length > 0 ? `Study ${extraStudy.length} more` : 'Study more';

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
                <ThemedText themeColor="onPrimary" type="subtitle" style={styles.heroHeadline}>
                  {heroHeadline}
                </ThemedText>
                <ThemedText themeColor="onPrimary" type="small" style={styles.heroSubtitle}>
                  {heroSubtitle}
                </ThemedText>

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
                    {heroButtonLabel}
                  </Button>
                ) : null}

                <View style={[styles.heroDivider, { backgroundColor: theme.onPrimary }]} />
                <View style={styles.heroStatsRow}>
                  <HeroStat
                    icon="checkmark-done"
                    value={formatCount(masteredLemmaIds.size)}
                    label="Mastered"
                    color={theme.onPrimary}
                  />
                  <HeroStat icon="flame" value={String(streak)} label="Day streak" color={theme.onPrimary} />
                  <HeroStat
                    icon="time-outline"
                    value={formatStudyDuration(studyTodayMs)}
                    label="Today"
                    color={theme.onPrimary}
                  />
                </View>
              </View>

              <StagePicker
                entries={stageEntries}
                selectedStageId={visibleStage.id}
                wordsPerDay={wordsPerSession}
                onSelect={setSelectedStageId}
              />
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
    gap: Spacing.four,
  },
  heroCard: {
    gap: Spacing.two,
    borderRadius: Radius.large,
    padding: Spacing.four,
    marginTop: Spacing.one,
  },
  heroHeadline: {
    fontSize: 24,
    lineHeight: 30,
  },
  heroSubtitle: {
    opacity: 0.9,
  },
  heroButton: {
    borderRadius: Radius.medium,
    alignSelf: 'stretch',
    marginTop: Spacing.two,
  },
  heroButtonContent: {
    height: 44,
  },
  heroDivider: {
    height: StyleSheet.hairlineWidth,
    opacity: 0.25,
    marginTop: Spacing.two,
  },
  heroStatsRow: {
    flexDirection: 'row',
    paddingTop: Spacing.three,
  },
  heroStat: {
    flex: 1,
    gap: 2,
  },
  heroStatValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  heroStatIcon: {
    opacity: 0.9,
  },
  heroStatLabel: {
    opacity: 0.75,
  },
  cardWrap: {
    marginBottom: Spacing.two,
  },
  grammarWrap: {
    marginBottom: Spacing.two,
  },
});
