import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LevelCard } from '@/components/quranki/level-card';
import { StatCard } from '@/components/quranki/stat-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { buildGlobalSessionQueue, getAllLevelStatuses, totalMasteredWords, WORD_COUNT } from '@/lib/levels';
import { computeStreak } from '@/lib/stats';
import { useProgressStore } from '@/store/progress-store';

export default function LearnScreen() {
  const theme = useTheme();
  const progress = useProgressStore((state) => state.progress);
  const wordsPerSession = useProgressStore((state) => state.settings.wordsPerSession);
  const maxUnlockedLevel = useProgressStore((state) => state.maxUnlockedLevel);
  const reviewDates = useProgressStore((state) => state.reviewDates);
  const hydrated = useProgressStore((state) => state.hydrated);

  const now = new Date();
  const statuses = getAllLevelStatuses(progress, now);
  const todaySession = buildGlobalSessionQueue(progress, now, wordsPerSession, maxUnlockedLevel);
  const dueCount = todaySession.filter((entry) => entry.reason === 'due').length;
  const newCount = todaySession.filter((entry) => entry.reason === 'new').length;
  const mastered = totalMasteredWords(progress, now);
  const streak = computeStreak(reviewDates, now);

  if (!hydrated) {
    return <ThemedView style={styles.flex} />;
  }

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <FlatList
          data={statuses}
          keyExtractor={(item) => item.level.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: BottomTabInset + Spacing.four }]}
          style={styles.list}
          ListHeaderComponent={
            <View style={styles.header}>
              <ThemedText type="title" style={styles.title}>
                Quranki
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                {WORD_COUNT} Quranic words, 47 levels, at your own pace.
              </ThemedText>

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
                    onPress={() => router.push('/session/review')}>
                    Start
                  </Button>
                )}
              </View>

              <View style={styles.statsRow}>
                <StatCard icon="checkmark-done" label="Mastered" value={`${mastered}/${WORD_COUNT}`} />
                <StatCard icon="flame" label="Day streak" value={String(streak)} />
                <StatCard icon="albums" label="Level" value={`${maxUnlockedLevel}/47`} />
              </View>

              <View style={styles.sectionHeaderRow}>
                <ThemedText type="smallBold">Levels</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Tap to practice one directly
                </ThemedText>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <LevelCard
                status={item}
                isUnlocked={item.level.number <= maxUnlockedLevel}
                isCurrent={item.level.number === maxUnlockedLevel}
              />
            </View>
          )}
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
});
