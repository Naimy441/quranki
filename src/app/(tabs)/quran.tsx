import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SurahListRow } from '@/components/quran/surah-list-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { SURAH_INDEX } from '@/lib/quran-reader';

export default function QuranScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');

  const normalized = query.trim().toLowerCase();
  const surahs = normalized
    ? SURAH_INDEX.filter(
        (s) =>
          s.tr.toLowerCase().includes(normalized) ||
          s.en.toLowerCase().includes(normalized) ||
          s.ar.includes(normalized) ||
          String(s.n) === normalized,
      )
    : SURAH_INDEX;

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <FlatList
          data={surahs}
          keyExtractor={(item) => String(item.n)}
          contentContainerStyle={[styles.listContent, { paddingBottom: BottomTabInset + Spacing.four }]}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.header}>
              <ThemedText type="title" style={styles.title}>
                Qur&apos;an
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                All 114 surahs, word by word with tajweed.
              </ThemedText>
              <Searchbar
                placeholder="Search surahs"
                onChangeText={setQuery}
                value={query}
                style={[styles.search, { backgroundColor: theme.backgroundElement }]}
                inputStyle={styles.searchInput}
                iconColor={theme.textMuted}
                placeholderTextColor={theme.textMuted}
                elevation={0}
              />
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <SurahListRow surah={item} />
            </View>
          )}
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
  search: {
    borderRadius: 16,
  },
  searchInput: {
    minHeight: 0,
  },
  cardWrap: {
    marginBottom: Spacing.two,
  },
});
