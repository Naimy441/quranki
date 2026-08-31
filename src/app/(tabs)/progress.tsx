import { useIsFocused } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AyahUnderstandingHistogram } from '@/components/quranki/ayah-understanding-histogram';
import { MeterBar } from '@/components/quranki/meter-bar';
import { StatCard } from '@/components/quranki/stat-card';
import { SurahUnderstandingChart } from '@/components/quranki/surah-understanding-chart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useFocusedComputation } from '@/hooks/use-focused-computation';
import { useFocusedProgressValue } from '@/hooks/use-focused-meter';
import { useTheme } from '@/hooks/use-theme';
import { getAllLevelStatuses, getMasteredVocabIds, LEVEL_COUNT, THEMATIC_LEVEL_COUNT, totalMasteredWords, WORD_COUNT, type LevelStatus } from '@/lib/levels';
import { countMemorizedQuranWords, TOTAL_QURAN_WORDS } from '@/lib/quran-coverage';
import { getQuranAyahUnderstandingSummary } from '@/lib/quran-understanding';
import { computeStreak, formatCount } from '@/lib/stats';
import { useKnownWordsStore } from '@/store/known-words-store';
import { useProgressStore } from '@/store/progress-store';

function LevelCell({
  status,
  theme,
  enabled,
}: {
  status: LevelStatus;
  theme: ReturnType<typeof useTheme>;
  enabled: boolean;
}) {
  const ratio = useFocusedProgressValue(status.totalCount === 0 ? 0 : status.masteredCount / status.totalCount, enabled);
  const from = theme.backgroundElement;
  const to = theme.primary;
  const onPrimary = theme.onPrimary;
  const text = theme.text;
  const cellStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(ratio.value, [0, 1], [from, to]),
  }));
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(ratio.value, [0, 0.45, 0.55, 1], [text, text, onPrimary, onPrimary]),
  }));

  return (
    <Animated.View style={[styles.gridCell, { borderColor: theme.border }, cellStyle]}>
      <Animated.Text style={[styles.cellLabel, labelStyle]}>{status.level.number}</Animated.Text>
    </Animated.View>
  );
}

export default function ProgressScreen() {
  const theme = useTheme();
  const focused = useIsFocused();
  const progress = useProgressStore((state) => state.progress);
  const maxUnlockedLevel = useProgressStore((state) => state.maxUnlockedLevel);
  const reviewDates = useProgressStore((state) => state.reviewDates);
  const streakGraceDates = useProgressStore((state) => state.streakGraceDates);
  const knownWords = useKnownWordsStore((state) => state.knownWords);

  const { statuses, mastered, streak, memorizedQuranWords, overallProgress, ayahUnderstanding } = useFocusedComputation(
    () => {
      const now = new Date();
      const statuses = getAllLevelStatuses(progress, now);
      const mastered = totalMasteredWords(progress, now);
      const streak = computeStreak(reviewDates, streakGraceDates, now);
      const ids = getMasteredVocabIds(progress);
      for (const id of Object.keys(knownWords)) ids.add(id);
      const memorizedQuranWords = countMemorizedQuranWords(ids);
      return {
        statuses,
        mastered,
        streak,
        memorizedQuranWords,
        overallProgress: TOTAL_QURAN_WORDS === 0 ? 0 : memorizedQuranWords / TOTAL_QURAN_WORDS,
        ayahUnderstanding: getQuranAyahUnderstandingSummary(ids),
      };
    },
  );

  return (
    <ThemedView style={styles.flex} collapsable={false}>
      <SafeAreaView style={styles.flex} edges={['top']} collapsable={false}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + Spacing.four }]}>


          <View style={styles.statsRow}>
            <StatCard icon="checkmark-done" label="Words mastered" value={`${mastered}/${WORD_COUNT}`} />
            <StatCard icon="flame" label="Day streak" value={String(streak)} />
            <StatCard icon="albums" label="Level reached" value={`${maxUnlockedLevel}/${LEVEL_COUNT}`} />
          </View>

          <View style={[styles.overallCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.overallHeader}>
              <ThemedText type="smallBold">Overall memorization</ThemedText>
              <ThemedText type="smallBold" themeColor="primary">
                {Math.round(overallProgress * 100)}%
              </ThemedText>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.card }]}>
              <MeterBar axis="x" progress={overallProgress} color={theme.primary} enabled={focused} />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {formatCount(memorizedQuranWords)} of {formatCount(TOTAL_QURAN_WORDS)} words in the Quran
            </ThemedText>
          </View>

          <View style={[styles.overallCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.overallHeader}>
              <ThemedText type="smallBold">Average ayah understanding</ThemedText>
              <ThemedText type="smallBold" themeColor="primary">
                {Math.round(ayahUnderstanding.average * 100)}%
              </ThemedText>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.card }]}>
              <MeterBar axis="x" progress={ayahUnderstanding.average} color={theme.primary} enabled={focused} />
            </View>
            <AyahUnderstandingHistogram bins={ayahUnderstanding.histogram} ayahCount={ayahUnderstanding.ayahCount} />
            <ThemedText type="small" themeColor="textSecondary">
              The share of vocabulary you know in a typical ayah
            </ThemedText>
          </View>

          <View style={[styles.overallCard, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">Average surah understanding</ThemedText>
            <SurahUnderstandingChart averages={ayahUnderstanding.surahAverages} />
            <ThemedText type="small" themeColor="textSecondary">
              Each bar is one surah, in Quran order
            </ThemedText>
          </View>

          <ThemedText type="smallBold" style={styles.sectionLabel}>
            Levels
          </ThemedText>
          <View style={styles.grid}>
            {statuses.slice(0, THEMATIC_LEVEL_COUNT).map((status) => (
              <LevelCell key={status.level.id} status={status} theme={theme} enabled={focused} />
            ))}
            <View style={styles.gridDivider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>
            {statuses.slice(THEMATIC_LEVEL_COUNT).map((status) => (
              <LevelCell key={status.level.id} status={status} theme={theme} enabled={focused} />
            ))}
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
  cellLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  sectionLabel: {
    marginTop: -Spacing.two,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  gridDivider: {
    width: '100%',
    gap: Spacing.one,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  dividerLine: {
    height: 1,
    marginBottom: Spacing.one,
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
