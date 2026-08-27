import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatCard } from '@/components/quranki/stat-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getAllLevelStatuses, getMasteredVocabIds, totalMasteredWords, WORD_COUNT } from '@/lib/levels';
import { countMemorizedQuranWords, TOTAL_QURAN_WORDS } from '@/lib/quran-coverage';
import { computeStreak, formatCount } from '@/lib/stats';
import { useKnownWordsStore } from '@/store/known-words-store';
import { useProgressStore } from '@/store/progress-store';

export default function ProgressScreen() {
  const theme = useTheme();
  const progress = useProgressStore((state) => state.progress);
  const maxUnlockedLevel = useProgressStore((state) => state.maxUnlockedLevel);
  const reviewDates = useProgressStore((state) => state.reviewDates);
  const knownWords = useKnownWordsStore((state) => state.knownWords);

  const now = new Date();
  const statuses = getAllLevelStatuses(progress, now);
  const mastered = totalMasteredWords(progress, now);
  const streak = computeStreak(reviewDates, now);

  // "Overall memorization" is real Qur'an text coverage, not just "N of 547 vocab items": one
  // mastered word like "the/that" can single-handedly cover thousands of on-screen occurrences,
  // so this is a very different (and much more telling) number than the vocab-list stat above.
  // Unioned with manually-marked-known word ids (see useKnownWordsStore) so a word the user
  // already recognized outside the 547-word curriculum - which has no FSRS review of its own to
  // "master" - still counts toward real text coverage here, the same way it already does for
  // hiding its translation in the reader.
  const recognizedVocabIds = useMemo(() => {
    const ids = getMasteredVocabIds(progress);
    for (const id of Object.keys(knownWords)) ids.add(id);
    return ids;
  }, [progress, knownWords]);
  const memorizedQuranWords = useMemo(() => countMemorizedQuranWords(recognizedVocabIds), [recognizedVocabIds]);
  const overallProgress = TOTAL_QURAN_WORDS === 0 ? 0 : memorizedQuranWords / TOTAL_QURAN_WORDS;

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + Spacing.four }]}>
          <ThemedText type="title" style={styles.title}>
            Progress
          </ThemedText>

          <View style={styles.statsRow}>
            <StatCard icon="checkmark-done" label="Words mastered" value={`${mastered}/${WORD_COUNT}`} accent />
            <StatCard icon="flame" label="Day streak" value={String(streak)} />
            <StatCard icon="albums" label="Level reached" value={`${maxUnlockedLevel}/47`} />
          </View>

          <View style={[styles.overallCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.overallHeader}>
              <ThemedText type="smallBold">Overall memorization</ThemedText>
              <ThemedText type="smallBold" themeColor="primary">
                {Math.round(overallProgress * 100)}%
              </ThemedText>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.card }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: theme.primary, width: `${Math.round(overallProgress * 100)}%` },
                ]}
              />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {formatCount(memorizedQuranWords)} of {formatCount(TOTAL_QURAN_WORDS)} words in the Qur&apos;an
            </ThemedText>
          </View>

          <ThemedText type="smallBold" style={styles.sectionLabel}>
            Levels
          </ThemedText>
          <View style={styles.grid}>
            {statuses.map((status) => {
              const isUnlocked = status.level.number <= maxUnlockedLevel;
              const cellColor = !isUnlocked
                ? theme.backgroundElement
                : status.isMastered
                  ? theme.primary
                  : status.masteredCount > 0
                    ? theme.backgroundSelected
                    : theme.card;
              return (
                <View
                  key={status.level.id}
                  style={[styles.gridCell, { backgroundColor: cellColor, borderColor: theme.border }]}>
                  <ThemedText
                    type="small"
                    themeColor={status.isMastered ? 'onPrimary' : isUnlocked ? 'text' : 'textMuted'}>
                    {status.level.number}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  content: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    marginTop: Spacing.three,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  overallCard: {
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  overallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTrack: {
    height: 10,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  sectionLabel: {
    marginTop: -Spacing.two,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  gridCell: {
    width: 40,
    height: 40,
    borderRadius: Radius.small,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
