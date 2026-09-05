import { useIsFocused } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AyahUnderstandingHistogram } from '@/components/quranki/ayah-understanding-histogram';
import { MeterBar } from '@/components/quranki/meter-bar';
import { StatCard } from '@/components/quranki/stat-card';
import { StudyTimeChart } from '@/components/quranki/study-time-chart';
import { SurahUnderstandingChart } from '@/components/quranki/surah-understanding-chart';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useFocusedComputation } from '@/hooks/use-focused-computation';
import { useFocusedProgressValue } from '@/hooks/use-focused-meter';
import { useTheme } from '@/hooks/use-theme';
import {
  getIntroductionFrontier,
  getLevelStatusesForStage,
  getMasteredLemmaIds,
  getStage,
  getUnlockedStage,
  isStageUnlocked,
  STAGES,
  type LevelStatus,
} from '@/lib/levels';
import { hapticSelection } from '@/lib/haptics';
import { getKnownLemmaIds } from '@/lib/known-words';
import { countMemorizedQuranWords, getQuranAyahUnderstandingSummary, TOTAL_QURAN_WORDS } from '@/lib/quran-coverage';
import { computeStreak, formatCount, formatStudyDuration, studyTimeWeek } from '@/lib/stats';
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
  const studyMsByDate = useProgressStore((state) => state.studyMsByDate);
  const knownWords = useKnownWordsStore((state) => state.knownWords);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [selectedStudyKey, setSelectedStudyKey] = useState<string | null>(null);

  const { unlockedStage, visibleStage, levelStatuses, masteredLemmas, reachedLevel, streak, memorizedQuranWords, overallProgress, ayahUnderstanding, studyWeek } =
    useFocusedComputation(() => {
      const now = new Date();
      const reachedLevel = Math.max(maxUnlockedLevel, getIntroductionFrontier(progress));
      const unlockedStage = getUnlockedStage(reachedLevel);
      const selectedStage = getStage(selectedStageId ?? unlockedStage.id) ?? STAGES[0];
      const visibleStage = isStageUnlocked(selectedStage, reachedLevel) ? selectedStage : STAGES[0];
      const ids = getMasteredLemmaIds(progress);
      for (const id of getKnownLemmaIds(knownWords)) ids.add(id);
      const streak = computeStreak(reviewDates, streakGraceDates, now);
      const memorizedQuranWords = countMemorizedQuranWords(ids);
      return {
        unlockedStage,
        visibleStage,
        reachedLevel,
        masteredLemmas: ids.size,
        levelStatuses: getLevelStatusesForStage(visibleStage, progress, now),
        streak,
        memorizedQuranWords,
        overallProgress: TOTAL_QURAN_WORDS === 0 ? 0 : memorizedQuranWords / TOTAL_QURAN_WORDS,
        ayahUnderstanding: getQuranAyahUnderstandingSummary(ids),
        studyWeek: studyTimeWeek(studyMsByDate, now),
      };
    });
  const selectedStudyDay =
    studyWeek.find((day) => day.key === selectedStudyKey) ??
    studyWeek.find((day) => day.isToday) ??
    studyWeek[studyWeek.length - 1];

  return (
    <ThemedView style={styles.flex} collapsable={false}>
      <SafeAreaView style={styles.flex} edges={['top']} collapsable={false}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + Spacing.four }]}>


          <View style={styles.statsRow}>
            <StatCard
              icon="checkmark-done"
              label="Words mastered"
              value={formatCount(masteredLemmas)}
            />
            <StatCard icon="flame" label="Day streak" value={String(streak)} />
            <StatCard icon="layers" label="Level" value={String(reachedLevel)} />
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
            <View style={styles.overallHeader}>
              <ThemedText type="smallBold">Study time</ThemedText>
              <ThemedText type="smallBold" themeColor="primary">
                {formatStudyDuration(selectedStudyDay.ms)} {selectedStudyDay.caption}
              </ThemedText>
            </View>
            <StudyTimeChart days={studyWeek} selectedKey={selectedStudyDay.key} onSelect={setSelectedStudyKey} />
            <ThemedText type="small" themeColor="textSecondary">
              Time spent memorizing words each day
            </ThemedText>
          </View>

          <View style={[styles.overallCard, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">Average surah understanding</ThemedText>
            <SurahUnderstandingChart averages={ayahUnderstanding.surahAverages} />
            <ThemedText type="small" themeColor="textSecondary">
              Each bar is one surah, in Quran order
            </ThemedText>
          </View>

          <View style={styles.stageRow}>
            <ThemedText type="smallBold">{visibleStage.title}</ThemedText>
            <View style={[styles.stagePicker, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {STAGES.map((stage) => {
                const selected = visibleStage.id === stage.id;
                const unlocked = isStageUnlocked(stage, reachedLevel);
                return (
                  <Pressable
                    key={stage.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: !unlocked }}
                    accessibilityLabel={stage.title}
                    disabled={!unlocked}
                    onPress={() => {
                      hapticSelection();
                      setSelectedStageId(stage.id);
                    }}
                    style={[
                      styles.stageChip,
                      selected && { backgroundColor: theme.backgroundSelected },
                      !unlocked && styles.stageLocked,
                    ]}>
                    <ThemedText type="smallBold" themeColor={selected ? 'primary' : unlocked ? 'text' : 'textMuted'}>
                      {stage.id}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={styles.grid}>
            {levelStatuses.map((status) => (
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
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  stagePicker: {
    flexDirection: 'row',
    borderRadius: Radius.pill,
    borderWidth: 1,
    padding: 2,
  },
  stageChip: {
    minWidth: 32,
    height: 28,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageLocked: {
    opacity: 0.4,
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
  stageBlock: {
    gap: Spacing.three,
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
