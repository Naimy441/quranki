import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MemorizeEntryRow } from '@/components/hifz/memorize-entry-row';
import { QuranRukuRow } from '@/components/hifz/quran-ruku-row';
import { RecentSurahsRow } from '@/components/quran/recent-surahs-row';
import { QuranJumpSheet } from '@/components/quran/quran-jump-sheet';
import { SurahListRow } from '@/components/quran/surah-list-row';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useHifzAvailable } from '@/hooks/use-hifz-tab';
import { useTheme } from '@/hooks/use-theme';
import { formatInterval } from '@/lib/fsrs';
import { hapticLight, hapticSelection } from '@/lib/haptics';
import { hifzCardKey, type HifzProgressMap } from '@/lib/hifz';
import { getRecognizedLemmaIds, groupUnlockedRukusBySurah, type Ruku } from '@/lib/ruku';
import { openQuranLocation } from '@/lib/quran-nav';
import { SURAH_INDEX } from '@/lib/quran-reader';
import type { SurahIndexEntry } from '@/lib/quran-reader-types';
import { useHifzStore } from '@/store/hifz-store';
import { useKnownWordsStore } from '@/store/known-words-store';
import { useProgressStore } from '@/store/progress-store';
import { useQuranMarksStore } from '@/store/quran-marks-store';

const EMPTY_UNLOCKED: { ruku: Ruku; coverage: number }[] = [];

const SurahRukuCard = memo(function SurahRukuCard({
  surah,
  unlocked,
  open,
  enrolledSet,
  dueByRukuId,
  cards,
  now,
  onToggle,
  onEnroll,
  onUnenroll,
}: {
  surah: SurahIndexEntry;
  unlocked: { ruku: Ruku; coverage: number }[];
  open: boolean;
  enrolledSet: Set<number>;
  dueByRukuId: Map<number, string>;
  cards: HifzProgressMap;
  now: number;
  onToggle: (surahNumber: number) => void;
  onEnroll: (rukuId: number) => void;
  onUnenroll: (rukuId: number) => void;
}) {
  return (
    <View style={styles.cardWrap}>
      <SurahListRow
        surah={surah}
        unlockedRukus={unlocked.length}
        rukusOpen={open}
        onToggleRukus={unlocked.length > 0 ? () => onToggle(surah.n) : undefined}>
        {open
          ? unlocked.map((entry) => (
              <QuranRukuRow
                key={entry.ruku.id}
                ruku={entry.ruku}
                coverage={entry.coverage}
                enrolled={enrolledSet.has(entry.ruku.id)}
                dueLabel={dueByRukuId.get(entry.ruku.id) ?? null}
                onOpen={() => {
                  const stored = cards[hifzCardKey(entry.ruku.id)];
                  const due = stored && new Date(stored.card.due).getTime() - now <= 0;
                  if (enrolledSet.has(entry.ruku.id) && due) {
                    router.push('/session/hifz');
                    return;
                  }
                  openQuranLocation(entry.ruku.surah, entry.ruku.fromAyah);
                }}
                onEnroll={() => {
                  hapticSelection();
                  onEnroll(entry.ruku.id);
                }}
                onUnenroll={() => {
                  hapticSelection();
                  onUnenroll(entry.ruku.id);
                }}
              />
            ))
          : null}
      </SurahListRow>
    </View>
  );
});

export default function QuranScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [jumpVisible, setJumpVisible] = useState(false);
  const [openSurah, setOpenSurah] = useState<number | null>(null);
  const [now] = useState(() => Date.now());
  const hasSaved = useQuranMarksStore((s) => s.pinPlacements.length > 0 || s.bookmarks.length > 0);
  const hifzAvailable = useHifzAvailable();
  const hifzHydrated = useHifzStore((state) => state.hydrated);
  const hifzIntroSeen = useHifzStore((state) => state.introSeen);
  const presentedHifzIntro = useRef(false);
  const progress = useProgressStore((state) => state.progress);
  const knownWords = useKnownWordsStore((state) => state.knownWords);
  const enrolledRukuIds = useHifzStore((state) => state.enrolledRukuIds);
  const cards = useHifzStore((state) => state.cards);
  const enrollRuku = useHifzStore((state) => state.enrollRuku);
  const unenrollRuku = useHifzStore((state) => state.unenrollRuku);
  const enrolledSet = useMemo(() => new Set(enrolledRukuIds), [enrolledRukuIds]);
  const toggleSurahRukus = useCallback((surahNumber: number) => {
    hapticSelection();
    setOpenSurah((current) => (current === surahNumber ? null : surahNumber));
  }, []);

  useEffect(() => {
    if (!hifzHydrated || !hifzAvailable || hifzIntroSeen || presentedHifzIntro.current) return;
    presentedHifzIntro.current = true;
    router.push('/hifz-intro');
  }, [hifzAvailable, hifzHydrated, hifzIntroSeen]);

  const recognized = useMemo(
    () => (hifzAvailable ? getRecognizedLemmaIds(progress, knownWords) : null),
    [hifzAvailable, knownWords, progress],
  );
  const unlockedBySurah = useMemo(
    () => (recognized ? groupUnlockedRukusBySurah(recognized) : new Map()),
    [recognized],
  );

  const dueByRukuId = useMemo(() => {
    const labels = new Map<number, string>();
    if (!hifzAvailable) return labels;
    for (const id of enrolledRukuIds) {
      const stored = cards[hifzCardKey(id)];
      if (!stored) continue;
      const dueMs = new Date(stored.card.due).getTime() - now;
      labels.set(id, dueMs <= 0 ? 'Due now' : `Due in ${formatInterval(dueMs)}`);
    }
    return labels;
  }, [cards, enrolledRukuIds, hifzAvailable, now]);

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
          extraData={`${openSurah}:${enrolledRukuIds.join(',')}`}
          initialNumToRender={16}
          maxToRenderPerBatch={8}
          windowSize={7}
          updateCellsBatchingPeriod={50}
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
                  onPress={() => setJumpVisible(true)}
                  hitSlop={10}
                  accessibilityLabel="Jump to surah and ayah"
                  style={({ pressed }) => [styles.iconButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
                  <Ionicons name="navigate-outline" size={21} color={theme.primary} />
                </Pressable>

                <Pressable
                  onPress={() => {
                    hapticLight();
                    router.push('/saved');
                  }}
                  hitSlop={10}
                  accessibilityLabel="Saved pins and bookmarks"
                  style={({ pressed }) => [
                    styles.iconButton,
                    { backgroundColor: theme.backgroundElement },
                    pressed && styles.pressed,
                  ]}>
                  <Ionicons name={hasSaved ? 'bookmark' : 'bookmark-outline'} size={20} color={theme.primary} />
                </Pressable>
              </View>
              <RecentSurahsRow />
              <MemorizeEntryRow />
            </View>
          }
          renderItem={({ item }) => (
            <SurahRukuCard
              surah={item}
              unlocked={unlockedBySurah.get(item.n) ?? EMPTY_UNLOCKED}
              open={openSurah === item.n}
              enrolledSet={enrolledSet}
              dueByRukuId={dueByRukuId}
              cards={cards}
              now={now}
              onToggle={toggleSurahRukus}
              onEnroll={enrollRuku}
              onUnenroll={unenrollRuku}
            />
          )}
        />
        <QuranJumpSheet
          visible={jumpVisible}
          initialSurah={1}
          onDismiss={() => setJumpVisible(false)}
          onJump={(surah, ayah) => {
            setJumpVisible(false);
            openQuranLocation(surah, ayah);
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
  iconButton: {
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
