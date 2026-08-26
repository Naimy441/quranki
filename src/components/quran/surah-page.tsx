import { useState } from 'react';
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
import { ThemedText } from '@/components/themed-text';
import { ArabicTextStyle, BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getSurahAyahs, getSurahMeta } from '@/lib/quran-reader';
import type { ReaderAyah } from '@/lib/quran-reader-types';

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
  masteredVocabIds: Set<string>;
  /** How many ayahs to render up front. The focused surah gets a full batch; the adjacent
   *  surahs a swipe away only need a handful pre-rendered so the page already has real content
   *  the instant it slides fully into view, without paying to mount an entire long surah for a
   *  chapter the user might not even swipe to. */
  initialBatch: number;
}

/** One surah's scrollable reading view: Bismillah + title header, then its ayahs, incrementally
 *  rendered. Meant to be mounted three at a time (previous/current/next) side by side so swiping
 *  between chapters is an instant slide instead of an unmount/remount. */
export function SurahPage({ surahNumber, showTranslation, arabicSize, glossSize, masteredVocabIds, initialBatch }: SurahPageProps) {
  const meta = getSurahMeta(surahNumber);
  const [visibleCount, setVisibleCount] = useState(initialBatch);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [renderedHeight, setRenderedHeight] = useState(0); // header + currently-rendered ayahs

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
    if (remainingAyahs <= 0) return;
    const { contentOffset, layoutMeasurement } = nativeEvent;
    const distanceFromRenderedEnd = renderedHeight - (contentOffset.y + layoutMeasurement.height);
    if (distanceFromRenderedEnd < LOAD_MORE_THRESHOLD_PX) {
      setVisibleCount((count) => Math.min(ayahs.length, count + BATCH_SIZE));
    }
  };

  return (
    <ScrollView
      style={styles.list}
      contentContainerStyle={[styles.listContent, { paddingBottom: BottomTabInset + Spacing.four }]}
      onScroll={handleScroll}
      scrollEventThrottle={100}>
      <View onLayout={handleContentLayout}>
        <View style={styles.header} onLayout={handleHeaderLayout}>
          <ThemedText style={[styles.arabicTitle, ArabicTextStyle]}>{meta.ar}</ThemedText>
          <ThemedText type="title" style={styles.title}>
            {meta.tr}
          </ThemedText>

          <View style={styles.metaRow}>
            <MetaPill label={`${meta.ac} ${meta.ac === 1 ? 'ayah' : 'ayahs'}`} />
            <MetaPill label={meta.rp === 'meccan' ? 'Meccan' : 'Medinan'} />
            <MetaPill label={`Surah ${meta.n}`} />
          </View>

          {meta.b && (
            <BismillahHeader
              showTranslation={showTranslation}
              arabicSize={arabicSize}
              glossSize={glossSize}
              masteredVocabIds={masteredVocabIds}
            />
          )}
        </View>

        {visibleAyahs.map((ayah) => (
          <AyahBlock
            key={ayah.a}
            ayah={ayah}
            surahName={meta.tr}
            showTranslation={showTranslation}
            arabicSize={arabicSize}
            glossSize={glossSize}
            masteredVocabIds={masteredVocabIds}
          />
        ))}
      </View>

      {reservedHeight > 0 && <View style={{ height: reservedHeight }} />}
    </ScrollView>
  );
}

function MetaPill({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
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
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    alignItems: 'center',
    gap: Spacing.two,
  },
  arabicTitle: {
    fontSize: 34,
    lineHeight: 64,
    paddingTop: Spacing.two,
    // Android resolves unset/'auto' textAlign from the app's *layout* direction (LTR here), not
    // from the text's own script the way iOS does - without this, Arabic renders left-aligned.
    textAlign: 'right',
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  pill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
});
