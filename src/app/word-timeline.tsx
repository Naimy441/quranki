import { Stack, router } from 'expo-router';
import { Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArabicText } from '@/components/arabic-text';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { displayArabic } from '@/lib/arabic-display';
import { formatInterval } from '@/lib/fsrs';
import { hapticSelection } from '@/lib/haptics';
import { getWordReviewTimeline, type TimelineWord } from '@/lib/levels';
import { useProgressStore } from '@/store/progress-store';

function rowDueLabel(item: TimelineWord): string | null {
  if (item.dueMs <= 0) return 'Due';
  if (item.dueMs < 86_400_000) return formatInterval(item.dueMs);
  return null;
}

export default function WordTimelineScreen() {
  const theme = useTheme();
  const progress = useProgressStore((state) => state.progress);
  const buckets = getWordReviewTimeline(progress, new Date());
  const sections = buckets.map((bucket) => ({
    key: bucket.key,
    title: bucket.title,
    data: bucket.words,
  }));
  const total = buckets.reduce((sum, bucket) => sum + bucket.words.length, 0);
  const dueNow = buckets[0]?.key === 'due' ? buckets[0].words.length : 0;

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: 'Word Timeline', headerBackTitle: 'Back' }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.word.id}
          stickySectionHeadersEnabled
          style={styles.list}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.intro}>
              <ThemedText type="small" themeColor="textSecondary">
                {total === 0
                  ? 'Words you study show up here with the day they come back for review.'
                  : dueNow > 0
                    ? `${total} scheduled - ${dueNow} due now`
                    : `${total} scheduled`}
              </ThemedText>
            </View>
          }
          ListEmptyComponent={
            <ThemedText type="small" themeColor="textMuted" style={styles.empty}>
              Nothing scheduled yet. Start a session and reviews will land on this timeline.
            </ThemedText>
          }
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
              <ThemedText type="smallBold">{section.title}</ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                {section.data.length}
              </ThemedText>
            </View>
          )}
          renderItem={({ item }) => {
            const when = rowDueLabel(item);
            return (
              <Pressable
                onPress={() => {
                  hapticSelection();
                  router.push(`/level/${item.levelNumber}`);
                }}
                style={({ pressed }) => [
                  styles.wordRow,
                  { borderColor: theme.border },
                  pressed && styles.pressed,
                ]}>
                <ArabicText style={styles.wordArabic}>{displayArabic(item.word)}</ArabicText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.wordEnglish} numberOfLines={1}>
                  {item.word.transliteration ?? item.word.english}
                </ThemedText>
                {when ? (
                  <ThemedText type="small" themeColor={item.dueMs <= 0 ? 'danger' : 'textSecondary'} style={styles.when}>
                    {when}
                  </ThemedText>
                ) : null}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  intro: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  empty: {
    paddingTop: Spacing.four,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
  },
  pressed: {
    opacity: 0.75,
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
  when: {
    fontWeight: '600',
  },
});
