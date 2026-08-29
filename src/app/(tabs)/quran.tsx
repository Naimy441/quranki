import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecentSurahsRow } from '@/components/quran/recent-surahs-row';
import { SurahListRow } from '@/components/quran/surah-list-row';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticLight } from '@/lib/haptics';
import { SURAH_INDEX } from '@/lib/quran-reader';
import { useQuranMarksStore } from '@/store/quran-marks-store';

export default function QuranScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const hasSaved = useQuranMarksStore((s) => s.pinPlacements.length > 0 || s.bookmarks.length > 0);

  const normalized = query.trim().toLowerCase();
  const surahs = normalized
    ? SURAH_INDEX.filter(
        (s) =>
          s.tr.toLowerCase().includes(normalized) ||
          s.en.toLowerCase().includes(normalized) ||
          s.nt.toLowerCase().includes(normalized) ||
          s.ar.includes(normalized) ||
          String(s.n) === normalized,
      )
    : SURAH_INDEX;

  return (
    <ThemedView style={styles.flex} collapsable={false}>
      <SafeAreaView style={styles.flex} edges={['top']} collapsable={false}>
        <FlatList
          data={surahs}
          keyExtractor={(item) => String(item.n)}
          contentContainerStyle={[styles.listContent, { paddingBottom: BottomTabInset + Spacing.four }]}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.header}>
              

              <View style={styles.searchRow}>
                <View style={styles.searchWrap}>
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
                
                <Pressable
                  onPress={() => {
                    hapticLight();
                    router.push('/saved');
                  }}
                  hitSlop={10}
                  accessibilityLabel="Saved pins and bookmarks"
                  style={({ pressed }) => [
                    styles.savedButton,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <Ionicons name={hasSaved ? 'bookmark' : 'bookmark-outline'} size={20} color={theme.primary} />
                </Pressable>
              </View>
              <RecentSurahsRow />
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
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  savedButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  searchWrap: {
    flex: 1,
    minWidth: 0,
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
