import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArabicText } from '@/components/arabic-text';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { displayArabic } from '@/lib/arabic-display';
import { hapticWarning } from '@/lib/haptics';
import { isCuratedWordId } from '@/lib/known-words';
import { getMasteredVocabIds, getWord } from '@/lib/levels';
import { getWordOccurrenceCount } from '@/lib/quran-coverage';
import { formatCount } from '@/lib/stats';
import { useKnownWordsStore } from '@/store/known-words-store';
import { useProgressStore } from '@/store/progress-store';

const HARAKAT = /[\u0640\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const INITIAL_RENDER_COUNT = 80;
const RENDER_BATCH_SIZE = 120;
function fold(text: string): string {
  return text.replace(HARAKAT, '').toLowerCase();
}

export default function KnownWordsScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const knownWords = useKnownWordsStore((state) => state.knownWords);
  const unmarkKnown = useKnownWordsStore((state) => state.unmarkKnown);
  const clearAllKnown = useKnownWordsStore((state) => state.clearAllKnown);
  const progress = useProgressStore((state) => state.progress);
  const masteredWordIds = useMemo(() => getMasteredVocabIds(progress), [progress]);

  const entries = useMemo(() => {
    const ids = new Set([...masteredWordIds, ...Object.keys(knownWords)]);
    const rows = [...ids]
      .map((id) => {
        const entry = knownWords[id];
        const studyWord = isCuratedWordId(id) ? getWord(id) : undefined;
        const arabic = studyWord ? displayArabic(studyWord) : entry?.sampleArabic ?? id;
        const english = studyWord ? studyWord.english : `${formatCount(getWordOccurrenceCount(id))} occurrences`;
        return { id, arabic, english, addedAt: entry?.addedAt ?? '', manuallyKnown: entry !== undefined };
      })
      .sort((a, b) => a.english.localeCompare(b.english, 'en', { sensitivity: 'base' }) || a.arabic.localeCompare(b.arabic));

    const needle = fold(query.trim());
    if (!needle) return rows;
    return rows.filter(
      (row) => fold(row.arabic).includes(needle) || fold(row.english).includes(needle),
    );
  }, [knownWords, masteredWordIds, query]);
  const knownCount = entries.length;
  const [renderLimit, setRenderLimit] = useState(INITIAL_RENDER_COUNT);
  const visibleEntries = entries.slice(0, renderLimit);

  useEffect(() => {
    if (renderLimit >= entries.length) return;
    const timer = setTimeout(() => {
      setRenderLimit((current) => Math.min(current + RENDER_BATCH_SIZE, entries.length));
    }, 16);
    return () => clearTimeout(timer);
  }, [entries.length, renderLimit]);

  const confirmAction = (title: string, message: string, confirmLabel: string, onConfirm: () => void) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`${title}\n${message}`)) onConfirm();
      return;
    }
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: confirmLabel, style: 'destructive', onPress: onConfirm },
    ]);
  };

  const handleClear = () => {
    confirmAction(
      'Clear all known words?',
      'This un-hides every word you’ve manually marked as known in the Qur’an reader. This cannot be undone.',
      'Clear',
      () => clearAllKnown(),
    );
  };

  const handleForget = (id: string) => {
    confirmAction(
      'Forget this word?',
      'Its translation will show again in the Qur’an reader.',
      'Forget',
      () => unmarkKnown(id),
    );
  };

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen
        options={{
          title: 'Known words',
          headerRight:
            Object.keys(knownWords).length > 0
              ? () => (
                  <Pressable
                    onPress={() => {
                      hapticWarning();
                      handleClear();
                    }}
                    hitSlop={10}
                    accessibilityLabel="Clear all known words">
                    <Ionicons name="trash-outline" size={22} color={theme.danger} />
                  </Pressable>
                )
              : undefined,
        }}
      />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <ThemedText type="small" themeColor="textSecondary">
              {knownCount === 0
                ? 'No recognized words yet'
                : query.trim()
                  ? `${formatCount(entries.length)} of ${formatCount(knownCount)} recognized ${knownCount === 1 ? 'word' : 'words'}`
                  : `${formatCount(knownCount)} recognized ${knownCount === 1 ? 'word' : 'words'}`}
            </ThemedText>
            <Searchbar
              placeholder="Search recognized words"
              onChangeText={setQuery}
              value={query}
              style={[styles.search, { backgroundColor: theme.backgroundElement }]}
              inputStyle={styles.searchInput}
              iconColor={theme.textMuted}
              placeholderTextColor={theme.textMuted}
              elevation={0}
            />
          </View>
          {entries.length === 0 ? (
            <ThemedText type="small" themeColor="textMuted" style={styles.empty}>
              {query.trim()
                ? 'No known words match that search.'
                : 'Long-press a word in the Qur\u2019an to hide it.'}
            </ThemedText>
          ) : visibleEntries.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.row,
                { backgroundColor: theme.card, borderColor: theme.border },
                index === 0 && styles.rowFirst,
                index === visibleEntries.length - 1 && visibleEntries.length === entries.length && styles.rowLast,
                index > 0 && { borderTopWidth: StyleSheet.hairlineWidth },
              ]}>
              <View style={styles.textCol}>
                <ArabicText style={styles.arabic}>{item.arabic}</ArabicText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.english}
                </ThemedText>
              </View>
              {item.manuallyKnown ? (
                <Pressable
                  onPress={() => {
                    hapticWarning();
                    handleForget(item.id);
                  }}
                  hitSlop={10}
                  accessibilityLabel="Forget this word">
                  <Ionicons name="close-circle" size={22} color={theme.textMuted} />
                </Pressable>
              ) : (
                <ThemedText type="small" themeColor="textMuted">Mastered</ThemedText>
              )}
            </View>
          ))}
          {visibleEntries.length < entries.length ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : null}
        </ScrollView>
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
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
    flexGrow: 1,
  },
  header: {
    gap: Spacing.two,
    marginBottom: Spacing.three,
  },
  search: {
    borderRadius: Radius.medium,
  },
  searchInput: {
    minHeight: 0,
  },
  empty: {
    paddingVertical: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  rowFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: Radius.medium,
    borderTopRightRadius: Radius.medium,
  },
  rowLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: Radius.medium,
    borderBottomRightRadius: Radius.medium,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  arabic: {
    fontSize: 22,
    lineHeight: 36,
  },
  loadingMore: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
});
