import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from 'react-native-paper';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ArabicTextStyle, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { buildSessionQueue, getLevel, getLevelStatus, type WordState } from '@/lib/levels';
import { useProgressStore } from '@/store/progress-store';

function wordStatusLabel(state: WordState): { label: string; color: 'primary' | 'textSecondary' | 'danger' } {
  if (state.isMastered) return { label: 'Mastered', color: 'primary' };
  if (state.isNew) return { label: 'New', color: 'textSecondary' };
  if (state.isDue) return { label: 'Due', color: 'danger' };
  return { label: 'Learning', color: 'textSecondary' };
}

export default function LevelDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const levelNumber = Number(id);
  const level = getLevel(levelNumber);

  const theme = useTheme();
  const progress = useProgressStore((state) => state.progress);
  const wordsPerSession = useProgressStore((state) => state.settings.wordsPerSession);
  const maxUnlockedLevel = useProgressStore((state) => state.maxUnlockedLevel);

  const now = new Date();
  const status = level ? getLevelStatus(level, progress, now) : null;
  const queue = level ? buildSessionQueue(level, progress, now, wordsPerSession) : [];
  const isUnlocked = levelNumber <= maxUnlockedLevel;

  if (!level || !status) {
    return <ThemedView style={styles.flex} />;
  }

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: `Level ${level.number}` }} />
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

              <View style={styles.summaryRow}>
                <SummaryPill label="Mastered" value={status.masteredCount} color={theme.primary} />
                <SummaryPill label="Due" value={status.dueCount} color={theme.danger} />
                <SummaryPill label="New" value={status.newCount} color={theme.textSecondary} />
              </View>

              {!isUnlocked && (
                <View style={[styles.lockedBanner, { backgroundColor: theme.backgroundElement }]}>
                  <Ionicons name="lock-closed" size={16} color={theme.textMuted} />
                  <ThemedText type="small" themeColor="textSecondary">
                    Master every word in the previous level to unlock this one.
                  </ThemedText>
                </View>
              )}

              <ThemedText type="smallBold" style={styles.wordsLabel}>
                Words ({status.totalCount})
              </ThemedText>
            </View>
          }
          renderItem={({ item }) => {
            const { label, color } = wordStatusLabel(item);
            return (
              <View style={[styles.wordRow, { borderColor: theme.border }]}>
                <ThemedText style={[styles.wordArabic, ArabicTextStyle]}>{item.word.arabic}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.wordEnglish} numberOfLines={1}>
                  {item.word.english}
                </ThemedText>
                <ThemedText type="small" themeColor={color} style={styles.wordStatus}>
                  {label}
                </ThemedText>
              </View>
            );
          }}
        />

        <View style={[styles.footer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
          {isUnlocked && queue.length > 0 ? (
            <Button
              mode="contained"
              style={styles.startButton}
              contentStyle={styles.startButtonContent}
              onPress={() => router.push(`/session/${level.number}`)}>
              Practice this level ({queue.length} words)
            </Button>
          ) : isUnlocked ? (
            <View style={styles.caughtUp}>
              <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
              <ThemedText themeColor="textSecondary">All caught up here for now.</ThemedText>
            </View>
          ) : (
            <Button mode="contained" disabled style={styles.startButton}>
              Locked
            </Button>
          )}
        </View>
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
  lockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
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
    // Android resolves unset/'auto' textAlign from the app's *layout* direction (LTR here), not
    // from the text's own script the way iOS does - without this, Arabic renders left-aligned.
    textAlign: 'right',
  },
  wordEnglish: {
    flex: 1,
  },
  wordStatus: {
    fontWeight: '600',
  },
  footer: {
    padding: Spacing.four,
    borderTopWidth: 1,
  },
  startButton: {
    borderRadius: Radius.medium,
  },
  startButtonContent: {
    height: 48,
  },
  caughtUp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    height: 48,
  },
});
