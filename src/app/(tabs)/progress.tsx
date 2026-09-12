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
import { useAppDigits } from '@/hooks/use-mastered-arabic-digits';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import {
  getIntroductionFrontier,
  getLevelStatusesForStage,
  getMasteredLemmaIds,
  getQaidaIntroductionFrontier,
  getStage,
  getStageProgress,
  getTrackContext,
  QAIDA_STAGE,
  getUnlockedStage,
  getVisibleStages,
  isStageUnlocked,
  levelDisplayNumber,
  stageDisplayTitle,
  stagePillLabel,
  type LevelStatus,
} from '@/lib/levels';
import { hapticSelection } from '@/lib/haptics';
import { getKnownLemmaIds } from '@/lib/known-words';
import { getQaidaReadableCoverage } from '@/lib/qaida-readable';
import { countMemorizedQuranWords, getQuranAyahUnderstandingSummary, TOTAL_QURAN_WORDS } from '@/lib/quran-coverage';
import { computeStreak, formatCount, formatStudyDuration, studyTimeWeek } from '@/lib/stats';
import { useKnownWordsStore } from '@/store/known-words-store';
import { useProgressStore } from '@/store/progress-store';

function LevelCell({
  status,
  theme,
  enabled,
  learnToRead,
}: {
  status: LevelStatus;
  theme: ReturnType<typeof useTheme>;
  enabled: boolean;
  learnToRead: boolean;
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
  const label = useAppDigits(String(levelDisplayNumber(status.level.number, learnToRead)));

  return (
    <Animated.View style={[styles.gridCell, { borderColor: theme.border }, cellStyle]}>
      <Animated.Text style={[styles.cellLabel, labelStyle]}>{label}</Animated.Text>
    </Animated.View>
  );
}

export default function ProgressScreen() {
  const theme = useTheme();
  const focused = useIsFocused();
  const progress = useProgressStore((state) => state.progress);
  const maxUnlockedLevel = useProgressStore((state) => state.maxUnlockedLevel);
  const canReadQuran = useProgressStore((state) => state.settings.canReadQuran);
  const reviewDates = useProgressStore((state) => state.reviewDates);
  const streakGraceDates = useProgressStore((state) => state.streakGraceDates);
  const studyMsByDate = useProgressStore((state) => state.studyMsByDate);
  const knownWords = useKnownWordsStore((state) => state.knownWords);
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [selectedStudyKey, setSelectedStudyKey] = useState<string | null>(null);
  const now = useNow();

  const {
    unlockedStage,
    visibleStage,
    levelStatuses,
    masteredLemmas,
    reachedLevel,
    streak,
    memorizedQuranWords,
    overallProgress,
    ayahUnderstanding,
    studyWeek,
    showQaidaReadable,
    qaidaReadable,
    qaidaReadProgress,
  } = useFocusedComputation(() => {
      const track = getTrackContext(progress, canReadQuran);
      const visibleStages = getVisibleStages(track.learnToRead);
      const frontier =
        track.learnToRead && !track.qaidaComplete
          ? getQaidaIntroductionFrontier(progress)
          : getIntroductionFrontier(progress);
      const reachedLevel =
        track.learnToRead && !track.qaidaComplete ? frontier : Math.max(maxUnlockedLevel, getIntroductionFrontier(progress));
      const unlockedStage = getUnlockedStage(reachedLevel, track);
      const selectedStage = getStage(selectedStageId ?? unlockedStage.id) ?? visibleStages[0] ?? unlockedStage;
      const visibleStage = isStageUnlocked(selectedStage, reachedLevel, track)
        ? selectedStage
        : (visibleStages[0] ?? unlockedStage);
      const ids = getMasteredLemmaIds(progress);
      for (const id of getKnownLemmaIds(knownWords)) ids.add(id);
      const streak = computeStreak(reviewDates, streakGraceDates, now);
      const memorizedQuranWords = countMemorizedQuranWords(ids);
      const showQaidaReadable = track.learnToRead && !track.qaidaComplete;
      const qaidaReadable = showQaidaReadable ? getQaidaReadableCoverage(progress) : null;
      const qaidaReadProgress =
        qaidaReadable && qaidaReadable.total > 0 ? qaidaReadable.readable / qaidaReadable.total : 0;
      const masteredCount = showQaidaReadable ? getStageProgress(QAIDA_STAGE, progress, now).mastered : ids.size;
      return {
        unlockedStage,
        visibleStage,
        reachedLevel,
        masteredLemmas: masteredCount,
        levelStatuses: getLevelStatusesForStage(visibleStage, progress, now),
        streak,
        memorizedQuranWords,
        overallProgress: TOTAL_QURAN_WORDS === 0 ? 0 : memorizedQuranWords / TOTAL_QURAN_WORDS,
        ayahUnderstanding: getQuranAyahUnderstandingSummary(ids),
        studyWeek: studyTimeWeek(studyMsByDate, now),
        showQaidaReadable,
        qaidaReadable,
        qaidaReadProgress,
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
              label={showQaidaReadable ? 'Mastered' : 'Words mastered'}
              value={formatCount(masteredLemmas)}
            />
            <StatCard icon="flame" label="Day streak" value={String(streak)} />
            <StatCard
              icon="layers"
              label="Level"
              value={String(levelDisplayNumber(reachedLevel, !canReadQuran))}
            />
          </View>

          <View style={[styles.overallCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.overallHeader}>
              <ThemedText type="smallBold">
                {showQaidaReadable ? 'Quran you can read' : 'Overall memorization'}
              </ThemedText>
              <ThemedText type="smallBold" themeColor="primary">
                {Math.round((showQaidaReadable ? qaidaReadProgress : overallProgress) * 100)}%
              </ThemedText>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.card }]}>
              <MeterBar
                axis="x"
                progress={showQaidaReadable ? qaidaReadProgress : overallProgress}
                color={theme.primary}
                enabled={focused}
              />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {showQaidaReadable
                ? `${formatCount(qaidaReadable?.readable ?? 0)} of ${formatCount(qaidaReadable?.total ?? 0)} words in the Quran`
                : `${formatCount(memorizedQuranWords)} of ${formatCount(TOTAL_QURAN_WORDS)} words in the Quran`}
            </ThemedText>
          </View>

          {showQaidaReadable ? null : (
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
          )}

          <View style={[styles.overallCard, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.overallHeader}>
              <ThemedText type="smallBold">Study time</ThemedText>
              <ThemedText type="smallBold" themeColor="primary">
                {formatStudyDuration(selectedStudyDay.ms)} {selectedStudyDay.caption}
              </ThemedText>
            </View>
            <StudyTimeChart days={studyWeek} selectedKey={selectedStudyDay.key} onSelect={setSelectedStudyKey} />
            <ThemedText type="small" themeColor="textSecondary">
              {showQaidaReadable ? 'Time spent studying each day' : 'Time spent memorizing words each day'}
            </ThemedText>
          </View>

          {showQaidaReadable ? null : (
            <View style={[styles.overallCard, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">Average surah understanding</ThemedText>
              <SurahUnderstandingChart averages={ayahUnderstanding.surahAverages} />
              <ThemedText type="small" themeColor="textSecondary">
                Each bar is one surah, in Quran order
              </ThemedText>
            </View>
          )}

          <View style={styles.stageRow}>
            <ThemedText type="smallBold">{stageDisplayTitle(visibleStage, !canReadQuran)}</ThemedText>
            <View style={[styles.stagePicker, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {getVisibleStages(!canReadQuran).map((stage) => {
                const selected = visibleStage.id === stage.id;
                const unlocked = isStageUnlocked(stage, reachedLevel, getTrackContext(progress, canReadQuran));
                return (
                  <Pressable
                    key={stage.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: !unlocked }}
                    accessibilityLabel={stageDisplayTitle(stage, !canReadQuran)}
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
                      {stagePillLabel(stage, !canReadQuran)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={styles.grid}>
            {levelStatuses.map((status) => (
              <LevelCell
                key={status.level.id}
                status={status}
                theme={theme}
                enabled={focused}
                learnToRead={!canReadQuran}
              />
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
