import { router } from 'expo-router';
import { SectionList, StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GrammarIntroRow } from '@/components/quranki/grammar-intro-row';
import { LevelCard } from '@/components/quranki/level-card';
import { StatCard } from '@/components/quranki/stat-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatInterval } from '@/lib/fsrs';
import { hapticMedium } from '@/lib/haptics';
import {
  buildGlobalSessionQueue,
  getAllLevelStatuses,
  getGrammarIntro,
  getIntroductionFrontier,
  getUpcomingLearning,
  LEVEL_COUNT,
  THEMATIC_LEVEL_COUNT,
  totalMasteredWords,
  WORD_COUNT,
  type LevelStatus,
  type Word,
} from '@/lib/levels';
import { computeStreak } from '@/lib/stats';
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
  const maxUnlockedLevel = useProgressStore((state) => state.maxUnlockedLevel);
  const reviewDates = useProgressStore((state) => state.reviewDates);
  const hydrated = useProgressStore((state) => state.hydrated);

  const now = new Date();
  const statuses = getAllLevelStatuses(progress, now);
  const todaySession = buildGlobalSessionQueue(
    progress,
    now,
    wordsPerSession,
    reviewsCompletedToday(reviewCountDate, reviewsToday, now),
    newCardsCompletedToday(reviewCountDate, newCardsToday, now),
  );
  const dueCount = todaySession.filter((entry) => entry.reason === 'due').length;
  const newCount = todaySession.filter((entry) => entry.reason === 'new').length;
  const upcoming = getUpcomingLearning(progress, now);
  const newRemaining = Math.max(0, wordsPerSession - newCardsCompletedToday(reviewCountDate, newCardsToday, now));
  const mastered = totalMasteredWords(progress, now);
  const streak = computeStreak(reviewDates, now);
  const frontier = getIntroductionFrontier(progress);
  const sections = [
    { key: 'thematic', title: null as string | null, subtitle: null as string | null, data: rowsForStatuses(statuses.slice(0, THEMATIC_LEVEL_COUNT)) },
    {
      key: 'continued',
      title: 'Keep going',
      subtitle: 'The rest of the Qur’an’s vocabulary, still grouped by theme',
      data: rowsForStatuses(statuses.slice(THEMATIC_LEVEL_COUNT)),
    },
  ];

  if (!hydrated) {
    return <ThemedView style={styles.flex} />;
  }

  return (
    <ThemedView style={styles.flex} collapsable={false}>
      <SafeAreaView style={styles.flex} edges={['top']} collapsable={false}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.key}
          contentContainerStyle={[styles.listContent, { paddingBottom: BottomTabInset + Spacing.four }]}
          style={styles.list}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <View style={styles.header}>



              <View style={[styles.heroCard, { backgroundColor: theme.primary }]}>
                <View style={styles.heroTextBlock}>
                  <ThemedText themeColor="onPrimary" type="smallBold" style={styles.heroLabel}>
                    {todaySession.length > 0 ? "TODAY'S REVIEW" : 'ALL CAUGHT UP'}
                  </ThemedText>
                  <ThemedText themeColor="onPrimary" style={styles.heroCount}>
                    {todaySession.length > 0 ? todaySession.length : '🎉'}
                  </ThemedText>
                  {todaySession.length > 0 ? (
                    <ThemedText themeColor="onPrimary" type="small" style={styles.heroBreakdown}>
                      {dueCount} due for review - {newCount} new
                    </ThemedText>
                  ) : upcoming ? (
                    <ThemedText themeColor="onPrimary" type="small" style={styles.heroBreakdown}>
                      {upcoming.count} {upcoming.count === 1 ? 'word' : 'words'} come back in{' '}
                      {formatInterval(upcoming.ms)}
                    </ThemedText>
                  ) : newRemaining === 0 ? (
                    <ThemedText themeColor="onPrimary" type="small" style={styles.heroBreakdown}>
                      Today&apos;s new words are done. More tomorrow.
                    </ThemedText>
                  ) : (
                    <ThemedText themeColor="onPrimary" type="small" style={styles.heroBreakdown}>
                      Nothing due right now. Check back later.
                    </ThemedText>
                  )}
                </View>
                {todaySession.length > 0 && (
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
                    Start
                  </Button>
                )}
              </View>

              <View style={styles.statsRow}>
                <StatCard icon="checkmark-done" label="Mastered" value={`${mastered}/${WORD_COUNT}`} />
                <StatCard icon="flame" label="Day streak" value={String(streak)} />
                <StatCard icon="albums" label="Level" value={`${maxUnlockedLevel}/${LEVEL_COUNT}`} />
              </View>

              <View style={styles.sectionHeaderRow}>
                <ThemedText type="smallBold">Levels</ThemedText>
              </View>
            </View>
          }
          renderSectionHeader={({ section }) =>
            section.title ? (
              <View style={styles.dividerBlock}>
                <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
                <ThemedText type="smallBold">{section.title}</ThemedText>
                {section.subtitle ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {section.subtitle}
                  </ThemedText>
                ) : null}
              </View>
            ) : null
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
  title: {
    fontSize: 34,
    lineHeight: 40,
  },
  subtitle: {
    marginTop: -Spacing.two,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.large,
    padding: Spacing.four,
    marginTop: Spacing.one,
  },
  heroTextBlock: {
    flex: 1,
    gap: 2,
  },
  heroLabel: {
    letterSpacing: 0.5,
    opacity: 0.85,
  },
  heroCount: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '700',
  },
  heroBreakdown: {
    opacity: 0.9,
  },
  heroButton: {
    borderRadius: Radius.medium,
  },
  heroButtonContent: {
    height: 44,
    paddingHorizontal: Spacing.two,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: Spacing.two,
  },
  cardWrap: {
    marginBottom: Spacing.two,
  },
  grammarWrap: {
    marginBottom: Spacing.two,
  },
  dividerBlock: {
    gap: Spacing.one,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  dividerLine: {
    height: 1,
    marginBottom: Spacing.two,
  },
});
