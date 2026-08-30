import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { FlashList, type FlashListRef, type ListRenderItemInfo } from '@shopify/flash-list';

import { AyahBlock } from '@/components/quran/ayah-block';
import { BismillahHeader } from '@/components/quran/bismillah-header';
import { SurahNameText } from '@/components/quran/surah-name-text';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { getSurahAyahs, getSurahMeta } from '@/lib/quran-reader';
import type { ReaderAyah, ReaderWord } from '@/lib/quran-reader-types';
import { useRecitationStore } from '@/store/recitation-store';

interface SurahPageProps {
  surahNumber: number;
  showTranslation: boolean;
  showTransliteration: boolean;
  arabicSize: number;
  glossSize: number;
  transliterationSize: number;
  hiddenVocabIds: Set<string>;
  knownWordIds: Set<string>;
  onLongPressWord?: (word: ReaderWord) => void;
  onOpenMarks?: (ayah: number) => void;
  focusAyah?: number;
  isActive?: boolean;
  onVisibleAyah?: (ayah: number) => void;
  /** Retained for callers while virtualization owns the actual render window. */
  initialBatch: number;
  extraBottomPadding?: number;
}

/**
 * A virtualized chapter reader. FlashList recycles off-screen ayahs, so even Al-Baqarah keeps
 * only a small window of native text views mounted. Unlike an incrementally growing ScrollView,
 * the content size is stable and native momentum remains smooth as rows are measured.
 */
export function SurahPage({
  surahNumber,
  showTranslation,
  showTransliteration,
  arabicSize,
  glossSize,
  transliterationSize,
  hiddenVocabIds,
  knownWordIds,
  onLongPressWord,
  onOpenMarks,
  focusAyah = 0,
  isActive = false,
  onVisibleAyah,
  extraBottomPadding = 0,
}: SurahPageProps) {
  const meta = getSurahMeta(surahNumber);
  const ayahs = getSurahAyahs(surahNumber);
  const listRef = useRef<FlashListRef<ReaderAyah>>(null);
  // Ayah 1 belongs at the reader's actual beginning, where the surah heading and Bismillah are visible.
  const [initialFocusAyah] = useState(focusAyah === 1 ? 0 : focusAyah);
  const [contentReady, setContentReady] = useState(initialFocusAyah === 0);
  const didFocus = useRef(false);
  const [openActionsAyah, setOpenActionsAyah] = useState(0);
  const onVisibleAyahRef = useRef(onVisibleAyah);
  const recitationAyah = useRecitationStore((s) =>
    s.visible && s.surahNumber === surahNumber ? s.ayahNumber : 0,
  );

  useEffect(() => {
    onVisibleAyahRef.current = onVisibleAyah;
  }, [onVisibleAyah]);

  useEffect(() => {
    didFocus.current = false;
  }, [focusAyah, surahNumber]);

  const scrollToAyah = useCallback(
    (ayahNumber: number, animated: boolean) => {
      const index = ayahNumber - 1;
      if (index < 0 || index >= ayahs.length) return;
      listRef.current?.scrollToIndex({ index, animated, viewPosition: 0.12 });
    },
    [ayahs.length],
  );

  const scrollToSurahStart = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);

  useEffect(() => {
    if (recitationAyah > 0) scrollToAyah(recitationAyah, true);
  }, [recitationAyah, scrollToAyah]);

  useEffect(() => {
    if (!isActive || focusAyah <= 0 || focusAyah === initialFocusAyah || didFocus.current) return;
    didFocus.current = true;
    requestAnimationFrame(() => {
      if (focusAyah === 1) scrollToSurahStart();
      else scrollToAyah(focusAyah, false);
    });
  }, [focusAyah, initialFocusAyah, isActive, scrollToAyah, scrollToSurahStart]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ReaderAyah>) => (
      <AyahBlock
        ayah={item}
        surahNumber={surahNumber}
        surahName={meta?.tr ?? ''}
        showTranslation={showTranslation}
        showTransliteration={showTransliteration}
        arabicSize={arabicSize}
        glossSize={glossSize}
        transliterationSize={transliterationSize}
        hiddenVocabIds={hiddenVocabIds}
        knownWordIds={knownWordIds}
        highlighted={focusAyah === item.a}
        actionsOpen={openActionsAyah === item.a}
        onToggleActions={(ayah) => setOpenActionsAyah((current) => current === ayah ? 0 : ayah)}
        onLongPressWord={onLongPressWord}
        onOpenMarks={onOpenMarks}
      />
    ),
    [arabicSize, focusAyah, glossSize, hiddenVocabIds, knownWordIds, meta, onLongPressWord, onOpenMarks, openActionsAyah, showTranslation, showTransliteration, surahNumber, transliterationSize],
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { item: ReaderAyah; isViewable: boolean }[] }) => {
      if (!isActive) return;
      const first = viewableItems.find((item) => item.isViewable);
      if (first) {
        onVisibleAyahRef.current?.(first.item.a);
      }
    },
    [isActive],
  );

  if (!meta) return null;

  return (
    <FlashList
      ref={listRef}
      data={ayahs}
      initialScrollIndex={initialFocusAyah > 1 ? initialFocusAyah - 1 : undefined}
      renderItem={renderItem}
      keyExtractor={(ayah) => String(ayah.a)}
      style={{ ...styles.list, opacity: contentReady ? 1 : 0 }}
      contentContainerStyle={[styles.listContent, { paddingBottom: BottomTabInset + Spacing.four + extraBottomPadding }]}
      maintainVisibleContentPosition={{ disabled: true }}
      onLoad={() => {
        if (initialFocusAyah > 0) requestAnimationFrame(() => setContentReady(true));
      }}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.englishInfo}>
              <ThemedText type="smallBold" style={styles.transliteration}>{meta.en}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.meaning}>{meta.nt}</ThemedText>
              <ThemedText type="small" themeColor="textMuted" style={styles.metaLine}>
                {`${meta.ac} ${meta.ac === 1 ? 'ayah' : 'ayahs'}  ·  ${meta.rp === 'meccan' ? 'Meccan' : 'Medinan'}`}
              </ThemedText>
            </View>
            <View style={styles.arabicTitleWrap}>
              <SurahNameText surahNumber={surahNumber} style={styles.arabicTitle} />
            </View>
          </View>
          {meta.b && (
            <BismillahHeader
              surahNumber={surahNumber}
              showTranslation={showTranslation}
              showTransliteration={showTransliteration}
              arabicSize={arabicSize}
              glossSize={glossSize}
              transliterationSize={transliterationSize}
              hiddenVocabIds={hiddenVocabIds}
              knownWordIds={knownWordIds}
              onLongPressWord={onLongPressWord}
            />
          )}
        </View>
      }
      onViewableItemsChanged={onViewableItemsChanged}
      onScrollBeginDrag={() => setOpenActionsAyah(0)}
      viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
      drawDistance={900}
      removeClippedSubviews
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: MaxContentWidth },
  listContent: { paddingBottom: Spacing.six },
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.one, gap: Spacing.two },
  titleRow: { flexDirection: 'row', alignItems: 'stretch', gap: Spacing.three },
  englishInfo: { flex: 1, minWidth: 0, justifyContent: 'center', gap: Spacing.half },
  arabicTitleWrap: { justifyContent: 'center', paddingTop: 6 },
  arabicTitle: { fontSize: 42, lineHeight: 80, includeFontPadding: false, flexShrink: 0, textAlign: 'right', marginTop: -8, marginBottom: -18, transform: [{ translateY: 12 }] },
  transliteration: { fontSize: 18, lineHeight: 24, letterSpacing: 0.2 },
  meaning: { fontSize: 15, lineHeight: 21 },
  metaLine: { fontSize: 13, lineHeight: 18 },
});
