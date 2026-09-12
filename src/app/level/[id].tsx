import { Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArabicText } from '@/components/arabic-text';
import { GrammarIntroRow } from '@/components/quranki/grammar-intro-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAppDigits } from '@/hooks/use-mastered-arabic-digits';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { displayArabic } from '@/lib/arabic-display';
import { formatLevelLabel, getCoverageThroughLevel, getGrammarIntro, getLevel, getLevelStatus, isAsmaDigitLevel, isAsmaLevel, isQaidaLevel, type WordState } from '@/lib/levels';
import { getQaidaReadableCoverageThroughLevel } from '@/lib/qaida-readable';
import { formatCount } from '@/lib/stats';
import { useProgressStore } from '@/store/progress-store';

function wordStatusLabel(state: WordState): { label: string; color: 'primary' | 'textSecondary' | 'danger' } {
  if (state.isMastered) return { label: 'Mastered', color: 'primary' };
  if (state.isNew) return { label: 'Not yet introduced', color: 'textSecondary' };
  if (state.isDue) return { label: 'Due', color: 'danger' };
  return { label: 'Learning', color: 'textSecondary' };
}

export default function LevelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const levelNumber = Number(id);
  const level = getLevel(levelNumber);

  const theme = useTheme();
  const progress = useProgressStore((state) => state.progress);
  const learnToRead = useProgressStore((state) => state.settings.canReadQuran === false);
  const levelTitle = useAppDigits(level ? formatLevelLabel(level.number, learnToRead) : 'Level');

  const now = useNow();
  const status = level ? getLevelStatus(level, progress, now) : null;
  const coverage = level ? getCoverageThroughLevel(level.number) : null;
  const qaidaCoverage = level && isQaidaLevel(level.number) ? getQaidaReadableCoverageThroughLevel(level.number) : null;
  const grammar = level ? getGrammarIntro(level) : undefined;

  if (!level || !status || !coverage) {
    return <ThemedView style={styles.flex} />;
  }

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: levelTitle }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <FlatList
          data={status.wordStates}
          keyExtractor={(item) => item.word.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.header}>
              <ThemedText type="title" style={styles.title}>
                {level.title}
              </ThemedText>
              {isAsmaDigitLevel(level) ? (
                <ThemedText type="small" themeColor="textSecondary" convertDigits={false}>
                  These ten Arabic digits sit with the 99 names. Master a digit and matching
                  numbers across the app switch to it. 1 becomes ١ as soon as you know 1. 19
                  becomes ١٩ only after you know both 1 and 9.
                </ThemedText>
              ) : isQaidaLevel(level.number) ? (
                <>
                  <ThemedText type="small" themeColor="textSecondary">
                    These cards teach you to read Arabic. See the letter or word, say it, then reveal
                    the name or reading. After Stage 1, Stage 2 begins.
                  </ThemedText>
                  {qaidaCoverage ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {`Once mastered through here, you can read ${formatCount(qaidaCoverage.readable)} of ${formatCount(qaidaCoverage.total)} Quran words`}
                    </ThemedText>
                  ) : null}
                </>
              ) : isAsmaLevel(level.number) ? (
                <ThemedText type="small" themeColor="textSecondary">
                  These names unlock after Stage {learnToRead ? 2 : 1} and are studied as their own stage. When the
                  Quran uses the name itself, that verse is the example; otherwise the verse shows
                  the same meaning. Reviews of names you already know are mixed into the same daily
                  session.
                </ThemedText>
              ) : (
                <>
                  <ThemedText type="small" themeColor="textSecondary">
                    Once mastered through here, {coverage.percent}% of the Quran
                  </ThemedText>
                  <ThemedText type="small" themeColor="textMuted">
                    {formatCount(coverage.quranWords)} words
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    These words are introduced automatically, in this order, during study. Reviews of
                    words you already know are mixed into the same daily session.
                  </ThemedText>
                </>
              )}

              <View style={styles.summaryRow}>
                <SummaryPill label="Mastered" value={status.masteredCount} color={theme.primary} />
                <SummaryPill label="Due" value={status.dueCount} color={theme.danger} />
                <SummaryPill label="Unseen" value={status.newCount} color={theme.textSecondary} />
              </View>

              {grammar ? <GrammarIntroRow word={grammar} /> : null}

              <ThemedText type="smallBold" style={styles.wordsLabel}>
                {isQaidaLevel(level.number) ? 'Cards' : 'Words'} ({status.totalCount})
              </ThemedText>
            </View>
          }
          renderItem={({ item }) => {
            const { label, color } = wordStatusLabel(item);
            return (
              <View style={[styles.wordRow, { borderColor: theme.border }]}>
                <ArabicText style={styles.wordArabic}>{displayArabic(item.word)}</ArabicText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.wordEnglish} numberOfLines={1}>
                  {item.word.transliteration ?? item.word.english}
                </ThemedText>
                <ThemedText type="small" themeColor={color} style={styles.wordStatus}>
                  {label}
                </ThemedText>
              </View>
            );
          }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

function SummaryPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.pill}>
      <View style={[styles.pillDot, { backgroundColor: color }]} />
      <ThemedText type="small" themeColor="textSecondary">
        {value} {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  header: {
    paddingTop: Spacing.two,
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.four,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  pillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  wordsLabel: {
    marginTop: Spacing.two,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  wordArabic: {
    fontSize: 22,
    lineHeight: 46,
    minWidth: 90,
    textAlign: 'right',
  },
  wordEnglish: {
    flex: 1,
  },
  wordStatus: {
    fontWeight: '600',
  },
});
