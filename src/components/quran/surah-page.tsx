import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    View,
    type LayoutChangeEvent,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
} from 'react-native';

import { AyahBlock } from '@/components/quran/ayah-block';
import { BismillahHeader } from '@/components/quran/bismillah-header';
import { SurahNameText } from '@/components/quran/surah-name-text';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { getSurahAyahs, getSurahMeta } from '@/lib/quran-reader';
import type { ReaderAyah, ReaderWord } from '@/lib/quran-reader-types';
import { useRecitationStore } from '@/store/recitation-store';

// Long surahs (Al-Baqarah has 286 ayahs / 6400+ words) are too heavy to mount all at once, but a
// FlatList/virtualized list re-measures constantly against such wildly variable ayah heights and
// visibly glitches. Instead we render ayahs in growing batches and simply append more as the
// reader scrolls near the bottom - no virtualization library, no re-measuring.
//
// To stop the scrollbar itself from jumping every time a batch mounts, we reserve a spacer below
// the rendered ayahs sized from the *average* measured height per ayah so far times however many
// ayahs are still unrendered. The scrollable area's total size is then always a reasonable
// estimate of the whole surah - each new batch just converts a slice of that reserved space into
// real content (shrinking the spacer by roughly the same amount it grows the content by) instead
// of growing the total abruptly.
const BATCH_SIZE = 12;
const LOAD_MORE_THRESHOLD_PX = 1200;

interface SurahPageProps {
  surahNumber: number;
  showTranslation: boolean;
  arabicSize: number;
  glossSize: number;
  hiddenVocabIds: Set<string>;
  knownWordIds: Set<string>;
  onLongPressWord?: (word: ReaderWord) => void;
  onOpenMarks?: (ayah: number) => void;
  /** Scroll this ayah into view once its layout is known (last-read, pin, bookmark). */
  focusAyah?: number;
  /** Only the on-screen chapter reports last-read as the user scrolls. */
  isActive?: boolean;
  onVisibleAyah?: (ayah: number) => void;
  /** How many ayahs to render up front. The focused surah gets a full batch; the adjacent
   *  surahs a swipe away only need a handful pre-rendered so the page already has real content
   *  the instant it slides fully into view, without paying to mount an entire long surah for a
   *  chapter the user might not even swipe to. */
  initialBatch: number;
  extraBottomPadding?: number;
}

/** One surah's scrollable reading view: Bismillah + title header, then its ayahs, incrementally
 *  rendered. Meant to be mounted three at a time (previous/current/next) side by side so swiping
 *  between chapters is an instant slide instead of an unmount/remount. */
export function SurahPage({
  surahNumber,
  showTranslation,
  arabicSize,
  glossSize,
  hiddenVocabIds,
  knownWordIds,
  onLongPressWord,
  onOpenMarks,
  focusAyah = 0,
  isActive = false,
  onVisibleAyah,
  initialBatch,
  extraBottomPadding = 0,
}: SurahPageProps) {
  const meta = getSurahMeta(surahNumber);
  const [scrolledCount, setScrolledCount] = useState(() =>
    focusAyah > 0 ? Math.max(initialBatch, focusAyah + BATCH_SIZE) : initialBatch,
  );
  const [openActionsAyah, setOpenActionsAyah] = useState(0);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [renderedHeight, setRenderedHeight] = useState(0); // header + currently-rendered ayahs
  const scrollRef = useRef<ScrollView>(null);
  const ayahY = useRef(new Map<number, number>());
  const bismillahY = useRef(0);
  const scrollY = useRef(0);
  const dragging = useRef(false);
  const didFocusScroll = useRef(false);
  const onVisibleAyahRef = useRef(onVisibleAyah);
  const recitationAyah = useRecitationStore((s) =>
    s.visible && s.surahNumber === surahNumber ? s.ayahNumber : 0,
  );
  const recitationBismillah = useRecitationStore(
    (s) => s.visible && s.surahNumber === surahNumber && s.playingBismillah,
  );
  const ayahCount = meta?.ac ?? 0;
  const visibleCount = Math.max(
    scrolledCount,
    recitationAyah > 0 ? Math.min(ayahCount, recitationAyah + BATCH_SIZE) : 0,
    focusAyah > 0 ? Math.min(ayahCount, focusAyah + BATCH_SIZE) : 0,
    recitationBismillah ? 1 : 0,
  );

  const scrollToRecitation = (y: number) => {
    if (dragging.current) return;
    const target = Math.max(0, y - Spacing.three);
    if (Math.abs(target - scrollY.current) < 20) return;
    scrollRef.current?.scrollTo({ y: target, animated: true });
  };

  useEffect(() => {
    onVisibleAyahRef.current = onVisibleAyah;
  }, [onVisibleAyah]);

  const reportVisibleAyah = useCallback((fallback: number) => {
    const report = onVisibleAyahRef.current;
    if (!isActive || !report) return;
    const y = scrollY.current + 80;
    let found = fallback;
    let best = -Infinity;
    for (const [ayah, top] of ayahY.current) {
      if (top <= y && top >= best) {
        best = top;
        found = ayah;
      }
    }
    report(found);
  }, [isActive]);

  const scrollToFocusAyah = (y: number) => {
    if (didFocusScroll.current) return;
    didFocusScroll.current = true;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - Spacing.three), animated: false });
  };

  useEffect(() => {
    didFocusScroll.current = false;
  }, [focusAyah, surahNumber]);

  useEffect(() => {
    if (!isActive) setOpenActionsAyah(0);
  }, [isActive]);

  const handleToggleActions = useCallback((ayah: number) => {
    setOpenActionsAyah((current) => (current === ayah ? 0 : ayah));
  }, []);

  useEffect(() => {
    if (recitationBismillah) {
      scrollToRecitation(bismillahY.current);
      return;
    }
    if (recitationAyah > 0) {
      const y = ayahY.current.get(recitationAyah);
      if (y != null) scrollToRecitation(y);
      return;
    }
    if (focusAyah > 0) {
      const y = ayahY.current.get(focusAyah);
      if (y != null) scrollToFocusAyah(y);
    }
  }, [recitationAyah, recitationBismillah, focusAyah]);

  useEffect(() => {
    if (!isActive || focusAyah <= 0) return;
    onVisibleAyahRef.current?.(focusAyah);
  }, [isActive, focusAyah, surahNumber]);

  if (!meta) return null;

  const ayahs: ReaderAyah[] = getSurahAyahs(surahNumber);
  const visibleAyahs = ayahs.slice(0, visibleCount);
  const remainingAyahs = ayahs.length - visibleAyahs.length;
  const ayahsHeight = Math.max(renderedHeight - headerHeight, 0);
  const avgAyahHeight = visibleAyahs.length > 0 ? ayahsHeight / visibleAyahs.length : 0;
  const reservedHeight = remainingAyahs > 0 ? avgAyahHeight * remainingAyahs : 0;

  const handleContentLayout = (e: LayoutChangeEvent) => setRenderedHeight(e.nativeEvent.layout.height);
  const handleHeaderLayout = (e: LayoutChangeEvent) => setHeaderHeight(e.nativeEvent.layout.height);

  const handleScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = nativeEvent.contentOffset.y;
    reportVisibleAyah(1);
    if (remainingAyahs <= 0) return;
    const { contentOffset, layoutMeasurement } = nativeEvent;
    const distanceFromRenderedEnd = renderedHeight - (contentOffset.y + layoutMeasurement.height);
    if (distanceFromRenderedEnd < LOAD_MORE_THRESHOLD_PX) {
      setScrolledCount((count) => Math.min(ayahs.length, count + BATCH_SIZE));
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.list}
      contentContainerStyle={[styles.listContent, { paddingBottom: BottomTabInset + Spacing.four + extraBottomPadding }]}
      onScroll={handleScroll}
      onScrollBeginDrag={() => {
        dragging.current = true;
        setOpenActionsAyah(0);
      }}
      onScrollEndDrag={() => {
        dragging.current = false;
      }}
      onMomentumScrollEnd={() => {
        dragging.current = false;
      }}
      scrollEventThrottle={100}>
      <View onLayout={handleContentLayout}>
        <View style={styles.header} onLayout={handleHeaderLayout}>
          <View style={styles.titleRow}>
            <View style={styles.englishInfo}>
              <ThemedText type="smallBold" style={styles.transliteration}>
                {meta.en}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.meaning}>
                {meta.nt}
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted" style={styles.metaLine}>
                {`${meta.ac} ${meta.ac === 1 ? 'ayah' : 'ayahs'}  ·  ${meta.rp === 'meccan' ? 'Meccan' : 'Medinan'}`}
              </ThemedText>
            </View>
            <View style={styles.arabicTitleWrap}>
              <SurahNameText surahNumber={surahNumber} style={styles.arabicTitle} />
            </View>
          </View>

          {meta.b && (
            <View
              onLayout={(e) => {
                bismillahY.current = e.nativeEvent.layout.y;
                if (recitationBismillah) scrollToRecitation(e.nativeEvent.layout.y);
              }}>
              <BismillahHeader
                surahNumber={surahNumber}
                showTranslation={showTranslation}
                arabicSize={arabicSize}
                glossSize={glossSize}
                hiddenVocabIds={hiddenVocabIds}
                knownWordIds={knownWordIds}
                onLongPressWord={onLongPressWord}
              />
            </View>
          )}
        </View>

        {visibleAyahs.map((ayah) => (
          <View
            key={ayah.a}
            style={openActionsAyah === ayah.a ? { zIndex: 4 } : undefined}
            onLayout={(e) => {
              ayahY.current.set(ayah.a, e.nativeEvent.layout.y);
              if (recitationAyah === ayah.a && !recitationBismillah) {
                scrollToRecitation(e.nativeEvent.layout.y);
              } else if (focusAyah === ayah.a && recitationAyah === 0 && !recitationBismillah) {
                scrollToFocusAyah(e.nativeEvent.layout.y);
              }
            }}>
            <AyahBlock
              ayah={ayah}
              surahNumber={surahNumber}
              surahName={meta.tr}
              showTranslation={showTranslation}
              arabicSize={arabicSize}
              glossSize={glossSize}
              hiddenVocabIds={hiddenVocabIds}
              knownWordIds={knownWordIds}
              highlighted={focusAyah === ayah.a}
              actionsOpen={openActionsAyah === ayah.a}
              onToggleActions={handleToggleActions}
              onLongPressWord={onLongPressWord}
              onOpenMarks={onOpenMarks}
            />
          </View>
        ))}
      </View>

      {reservedHeight > 0 && <View style={{ height: reservedHeight }} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  listContent: {
    paddingBottom: Spacing.six,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
    gap: Spacing.two,
    overflow: 'visible',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.three,
    overflow: 'visible',
  },
  englishInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    gap: Spacing.half,
  },
  arabicTitleWrap: {
    justifyContent: 'center',
    overflow: 'visible',
    paddingTop: 6,
  },
  arabicTitle: {
    fontSize: 42,
    lineHeight: 80,
    includeFontPadding: false,
    flexShrink: 0,
    textAlign: 'right',
    // Collapse extra space below so the 3-line stack still owns the row height,
    // but leave the top of the line box intact so tall flourishes are not clipped.
    marginTop: -8,
    marginBottom: -18,
    transform: [{ translateY: 12 }],
  },
  transliteration: {
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  meaning: {
    fontSize: 15,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  metaLine: {
    marginTop: Spacing.one,
    letterSpacing: 0.3,
  },
});
