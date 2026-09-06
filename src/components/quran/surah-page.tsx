import { FlashList, type FlashListRef, type ListRenderItemInfo } from '@shopify/flash-list';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AyahBlock } from '@/components/quran/ayah-block';
import { BismillahHeader } from '@/components/quran/bismillah-header';
import { RECITATION_PLAYER_BAR_HEIGHT } from '@/components/quran/recitation-player';
import { SurahNameText } from '@/components/quran/surah-name-text';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import type { LemmaId } from '@/lib/quran-lemmas';
import { getSurahAyahs, getSurahMeta } from '@/lib/quran-reader';
import type { ReaderAyah, ReaderWordRef } from '@/lib/quran-reader-types';
import { setAutoScrollSuspended, useRecitationStore } from '@/store/recitation-store';

/** How close to the very top (in content pixels) counts as "back at the Bismillah header" for
 *  resuming auto-scroll - roughly the header's height, generous enough to not require pixel-
 *  perfect scrolling. */
const BISMILLAH_RESUME_OFFSET = 200;

interface SurahPageProps {
  surahNumber: number;
  showTranslation: boolean;
  showTransliteration: boolean;
  arabicSize: number;
  glossSize: number;
  transliterationSize: number;
  hiddenLemmaIds: Set<LemmaId>;
  knownLemmaIds: Set<LemmaId>;
  recognizedLemmaIds: Set<LemmaId>;
  showAyahCoverage: boolean;
  onLongPressWord?: (ref: ReaderWordRef) => void;
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
  hiddenLemmaIds,
  knownLemmaIds,
  recognizedLemmaIds,
  showAyahCoverage,
  onLongPressWord,
  onOpenMarks,
  focusAyah = 0,
  isActive = false,
  onVisibleAyah,
  extraBottomPadding = 0,
}: SurahPageProps) {
  const meta = getSurahMeta(surahNumber);
  const ayahs = getSurahAyahs(surahNumber);
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlashListRef<ReaderAyah>>(null);
  const scrollOffsetRef = useRef(0);
  // Ayah 1 belongs at the reader's actual beginning, where the surah heading and Bismillah are visible.
  const [initialFocusAyah] = useState(focusAyah === 1 ? 0 : focusAyah);
  const [contentReady, setContentReady] = useState(initialFocusAyah === 0);
  const didFocus = useRef(false);
  const [openActionsAyah, setOpenActionsAyah] = useState(0);
  const [scrollEpoch, setScrollEpoch] = useState(0);
  const lastScrollBump = useRef(0);
  const bumpScrollEpoch = useCallback(() => {
    const now = Date.now();
    if (now - lastScrollBump.current < 48) return;
    lastScrollBump.current = now;
    setScrollEpoch((value) => value + 1);
  }, []);
  // Ticks only once scrolling has fully settled (debounced off the *last* scroll tick, so it
  // naturally covers a drag that trails into momentum) - separate from `scrollEpoch` above, which
  // ticks continuously while scrolling and is only meant for cosmetic re-layout (the sticky action
  // menu). Anything that reacts to "the reader arrived back at the recited ayah" needs to wait for
  // settleEpoch, or it fires mid-gesture and yanks the list back before the reader has finished
  // scrolling - it felt like the reader was fighting the list.
  const [settleEpoch, setSettleEpoch] = useState(0);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSettleCheck = useCallback(() => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => setSettleEpoch((value) => value + 1), 140);
  }, []);
  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);
  // Bumped right after a resumed-from-suspend jump lands, to ask the currently-speaking word to
  // re-report its position so `handleSpeakingWordLayout` below can correct straight to it.
  const [measureToken, setMeasureToken] = useState(0);
  const onVisibleAyahRef = useRef(onVisibleAyah);
  const recitationAyah = useRecitationStore((s) =>
    s.visible && s.surahNumber === surahNumber ? s.ayahNumber : 0,
  );
  // Bismillah plays with `ayahNumber` at 0 (it isn't a real ayah), so `recitationAyah` alone goes
  // to 0 during that clip - track it separately so the opening still scrolls to the top instead
  // of no-op'ing until the first real ayah kicks in.
  const recitationBismillah = useRecitationStore((s) =>
    s.visible && s.surahNumber === surahNumber ? s.playingBismillah : false,
  );
  const autoScrollSuspended = useRecitationStore((s) => s.autoScrollSuspended);
  // Read inside the (stable) viewability callback instead of depending on it directly - FlashList
  // warns/misbehaves if `onViewableItemsChanged`'s identity changes across renders.
  const recitationAyahRef = useRef(recitationAyah);
  const recitationBismillahRef = useRef(recitationBismillah);
  // Also read via a ref in the settle-check effect below (rather than depending on the value
  // directly) - the effect must stay stable across a suspend/resume toggle itself, or the moment
  // `onScrollBeginDrag` flips this to true, the changed identity would force an immediate re-check
  // before the reader's drag has actually moved anything, instantly undoing the suspend.
  const autoScrollSuspendedRef = useRef(autoScrollSuspended);

  useEffect(() => {
    onVisibleAyahRef.current = onVisibleAyah;
  }, [onVisibleAyah]);

  useEffect(() => {
    recitationAyahRef.current = recitationAyah;
  }, [recitationAyah]);

  useEffect(() => {
    recitationBismillahRef.current = recitationBismillah;
  }, [recitationBismillah]);

  useEffect(() => {
    autoScrollSuspendedRef.current = autoScrollSuspended;
  }, [autoScrollSuspended]);

  useEffect(() => {
    didFocus.current = false;
  }, [focusAyah, surahNumber]);

  const scrollToAyah = useCallback(
    (ayahNumber: number, animated: boolean, viewPosition = 0.12) => {
      const index = ayahNumber - 1;
      if (index < 0 || index >= ayahs.length) return;
      listRef.current?.scrollToIndex({ index, animated, viewPosition });
    },
    [ayahs.length],
  );

  const scrollToSurahStart = useCallback((animated = false) => {
    listRef.current?.scrollToOffset({ offset: 0, animated });
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
      bumpScrollEpoch();
      scheduleSettleCheck();
    },
    [bumpScrollEpoch, scheduleSettleCheck],
  );

  // Bismillah has no list row of its own (it lives in the header above ayah 1), so the per-ayah
  // resume check in `AyahBlock` can't see it - treat "settled back near the very top" as the
  // equivalent signal here. Gated by `settleEpoch` for the same reason as that check: firing on
  // every continuous scroll tick instead would yank the list back before a manual scroll away
  // even finished.
  useEffect(() => {
    if (!autoScrollSuspendedRef.current || !recitationBismillahRef.current) return;
    if (scrollOffsetRef.current <= BISMILLAH_RESUME_OFFSET) setAutoScrollSuspended(false);
  }, [settleEpoch]);

  // A really long ayah (e.g. many lines of a long verse) can scroll the actively-speaking word
  // right off the readable area well before the *next* ayah change would normally trigger a
  // re-scroll - or, right after a resume, the word can simply already be wherever the reader left
  // the list. Either way, only step in once it's genuinely off-screen (not merely near an edge),
  // so this never nudges the reader while they can still see exactly where the recitation is.
  const handleSpeakingWordLayout = useCallback(
    (wordTop: number, wordHeight: number) => {
      if (!isActive || autoScrollSuspended) return;
      const readableTop = insets.top + 56;
      const readableBottom = windowHeight - insets.bottom - RECITATION_PLAYER_BAR_HEIGHT - Spacing.four;
      if (readableBottom <= readableTop) return;
      const wordBottom = wordTop + wordHeight;
      // Landing it a comfortable quarter of the way into the readable area (not right at the
      // edge it crossed) means a few upcoming/preceding lines stay in view, so this doesn't need
      // to re-trigger on every single word.
      const targetTop = readableTop + (readableBottom - readableTop) * 0.25;
      if (wordBottom > readableBottom) {
        const delta = wordTop - targetTop;
        if (delta > 0) listRef.current?.scrollToOffset({ offset: scrollOffsetRef.current + delta, animated: true });
      } else if (wordTop < readableTop) {
        const delta = wordTop - targetTop;
        if (delta < 0) listRef.current?.scrollToOffset({ offset: Math.max(0, scrollOffsetRef.current + delta), animated: true });
      }
    },
    [autoScrollSuspended, insets.bottom, insets.top, isActive, windowHeight],
  );

  // Distinguishes *why* the effect below is running: a fresh ayah change should animate a clean
  // pin to the top, but resuming from a manual scroll-away mid-ayah shouldn't force any jump at
  // all - the reader may still be looking right at the current word. Just ask it to report where
  // it already is and let `handleSpeakingWordLayout` above decide, from there, whether it's
  // actually off-screen and needs correcting.
  const wasSuspendedRef = useRef(autoScrollSuspended);

  useEffect(() => {
    if (autoScrollSuspended) {
      wasSuspendedRef.current = true;
      return;
    }
    const isResume = wasSuspendedRef.current;
    wasSuspendedRef.current = false;
    if (isResume) {
      setMeasureToken((value) => value + 1);
      return;
    }
    if (recitationBismillah) {
      // Bismillah lives in the header above ayah 1, not in a list row, so pressing play at the
      // start of a surah needs a real scroll-to-top rather than `scrollToAyah`, which would only
      // ever target ayah rows and leave the reader wherever they already were scrolled to.
      scrollToSurahStart(true);
      return;
    }
    if (recitationAyah > 0) scrollToAyah(recitationAyah, true, 0);
  }, [recitationAyah, recitationBismillah, autoScrollSuspended, scrollToAyah, scrollToSurahStart]);

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
        hiddenLemmaIds={hiddenLemmaIds}
        knownLemmaIds={knownLemmaIds}
        recognizedLemmaIds={recognizedLemmaIds}
        showAyahCoverage={showAyahCoverage}
        highlighted={focusAyah === item.a}
        actionsOpen={openActionsAyah === item.a}
        onToggleActions={(ayah) => setOpenActionsAyah((current) => current === ayah ? 0 : ayah)}
        onLongPressWord={onLongPressWord}
        onOpenMarks={onOpenMarks}
        scrollEpoch={scrollEpoch}
        settleEpoch={settleEpoch}
        measureToken={measureToken}
        onSpeakingWordLayout={handleSpeakingWordLayout}
      />
    ),
    [arabicSize, focusAyah, glossSize, handleSpeakingWordLayout, hiddenLemmaIds, knownLemmaIds, measureToken, meta, onLongPressWord, onOpenMarks, openActionsAyah, recognizedLemmaIds, scrollEpoch, settleEpoch, showAyahCoverage, showTranslation, showTransliteration, surahNumber, transliterationSize],
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: { item: ReaderAyah; isViewable: boolean }[] }) => {
      if (!isActive) return;
      const first = viewableItems.find((item) => item.isViewable);
      if (!first) return;
      onVisibleAyahRef.current?.(first.item.a);
      // Re-engaging auto-scroll on its own lives in the settle-gated effects above/in `AyahBlock`
      // - FlashList calls this back continuously while scrolling, so acting on it here too would
      // yank the list back mid-gesture instead of waiting for the reader to actually stop.
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
                {`${meta.ac} ${meta.ac === 1 ? 'ayah' : 'ayahs'}`}
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted" style={styles.metaLine}>
                {meta.rp === 'meccan' ? 'Meccan' : 'Medinan'}
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
              hiddenLemmaIds={hiddenLemmaIds}
              knownLemmaIds={knownLemmaIds}
              onLongPressWord={onLongPressWord}
            />
          )}
        </View>
      }
      onViewableItemsChanged={onViewableItemsChanged}
      onScroll={handleScroll}
      onScrollEndDrag={() => setScrollEpoch((value) => value + 1)}
      onMomentumScrollEnd={() => setScrollEpoch((value) => value + 1)}
      scrollEventThrottle={16}
      onScrollBeginDrag={() => {
        setOpenActionsAyah(0);
        // A manual drag while this surah's playback is what's driving the current scroll -
        // stop auto-scroll from fighting the reader until they either scroll back to the
        // playing ayah or tap the player title to jump straight back to it.
        if (recitationAyahRef.current > 0 || recitationBismillahRef.current) setAutoScrollSuspended(true);
      }}
      viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
      // Each ayah is a dense tree of word cells, so a modest flick easily outruns a ~1-screen
      // buffer and you get blank holes that fill in a beat later. Prefetch a few screens so
      // upcoming rows are already mounted. Don't set `removeClippedSubviews` — it detaches
      // those already-drawn rows the moment they leave the clip rect, which undoes this.
      drawDistance={windowHeight * 4}
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
