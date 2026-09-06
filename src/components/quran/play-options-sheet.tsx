import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ReciterSettingsRow } from '@/components/quranki/reciter-picker-sheet';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelection } from '@/lib/haptics';
import { getSurahMeta } from '@/lib/quran-reader';
import { useProgressStore } from '@/store/progress-store';

const ROW_HEIGHT = 40;
const WHEEL_HEIGHT = ROW_HEIGHT * 5;

interface PlayOptionsSheetProps {
  visible: boolean;
  surahNumber: number;
  onDismiss: () => void;
  /** Dismisses this sheet and pushes `/reciter-picker` - see `[surah].tsx`, which reopens this
   *  sheet when the reader comes back. The list can't be embedded inline here: unlike a plain
   *  `View`, wrapping this sheet's content in a `Pressable` (needed elsewhere to swallow
   *  backdrop taps) also swallows a nested scrollable's drag before it ever becomes the touch
   *  responder, which is exactly why the ayah wheels below use a bare `View` + a separate
   *  absolute-fill `Pressable` behind them instead of wrapping the sheet itself. */
  onPressReciter: () => void;
  onPlay: (fromAyah: number, toAyah: number) => void;
}

/** Shown the moment the header play button starts a *fresh* surah session (not on plain
 *  pause/resume - see `[surah].tsx`) - lets the reader narrow which ayahs play (default: the
 *  whole surah) before starting. */
export function PlayOptionsSheet({ visible, surahNumber, onDismiss, onPressReciter, onPlay }: PlayOptionsSheetProps) {
  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const meta = getSurahMeta(surahNumber);
  const ayahCount = meta?.ac ?? 1;
  const ayahs = useMemo(() => Array.from({ length: ayahCount }, (_, index) => index + 1), [ayahCount]);
  const selectedReciterKey = useProgressStore((s) => s.settings.selectedReciterKey);

  const [fromAyah, setFromAyah] = useState(1);
  const [toAyah, setToAyah] = useState(ayahCount);
  const fromRef = useRef<FlatList<number>>(null);
  const toRef = useRef<FlatList<number>>(null);

  const chooseFrom = (offset: number) => {
    const next = Math.max(1, Math.min(ayahCount, Math.round(offset / ROW_HEIGHT) + 1));
    if (next === fromAyah) return;
    hapticSelection();
    setFromAyah(next);
    if (next > toAyah) {
      setToAyah(next);
      requestAnimationFrame(() => toRef.current?.scrollToOffset({ offset: (next - 1) * ROW_HEIGHT, animated: false }));
    }
  };
  const chooseTo = (offset: number) => {
    const next = Math.max(1, Math.min(ayahCount, Math.round(offset / ROW_HEIGHT) + 1));
    if (next === toAyah) return;
    hapticSelection();
    setToAyah(next);
    if (next < fromAyah) {
      setFromAyah(next);
      requestAnimationFrame(() => fromRef.current?.scrollToOffset({ offset: (next - 1) * ROW_HEIGHT, animated: false }));
    }
  };

  const close = () => {
    hapticSelection();
    onDismiss();
  };

  if (!meta) return null;
  const wholeSurah = fromAyah === 1 && toAyah === ayahCount;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        <View style={[styles.sheet, { backgroundColor: theme.card, maxHeight: Math.round(windowHeight * 0.85) }]}>
          <View style={styles.headerRow}>
            <ThemedText type="smallBold" numberOfLines={1} style={styles.title}>
              Play {meta.en}
            </ThemedText>
            <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={20} color={theme.textMuted} />
            </Pressable>
          </View>

          <ReciterSettingsRow selectedKey={selectedReciterKey} onPress={onPressReciter} />

          <View style={styles.rangeSection}>
            <ThemedText type="small" themeColor="textMuted">AYAH RANGE</ThemedText>
            <View style={styles.wheels}>
              <WheelOverlay color={theme.backgroundSelected} />
              <FlatList
                ref={fromRef}
                style={styles.wheel}
                contentContainerStyle={styles.wheelContent}
                // Not `contentOffset` (see the "to" wheel below for why): `initialScrollIndex`
                // is a no-op here since `fromAyah` defaults to 1 (index 0, already the resting
                // scroll position), but stays correct if a reciter-picker round trip preserved a
                // non-default starting ayah.
                initialScrollIndex={fromAyah - 1}
                data={ayahs}
                keyExtractor={String}
                getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
                renderItem={({ item }) => <WheelRow active={item === fromAyah} label={String(item)} />}
                showsVerticalScrollIndicator={false}
                snapToInterval={ROW_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={(event) => chooseFrom(event.nativeEvent.contentOffset.y)}
              />
              <View style={styles.wheelDivider} pointerEvents="none">
                <ThemedText type="small" themeColor="textMuted">to</ThemedText>
              </View>
              <FlatList
                ref={toRef}
                style={styles.wheel}
                contentContainerStyle={styles.wheelContent}
                // `initialScrollIndex` (not `contentOffset`, which only ever applies eagerly on
                // the very first layout pass) waits for VirtualizedList's own
                // `onContentSizeChange` to report a real, non-zero size before scrolling - the
                // exact fix for content sitting inside a `Modal`, where the first layout pass
                // can land before the surface has settled to its final size (the same class of
                // timing issue that once left the reciter-picker sheet blank). It fires once per
                // mount, which - since `ayahCount` is bundled, static `SURAH_INDEX` data (see
                // `lib/quran-reader.ts`), never anything downloaded - is already known and
                // correct on this component's very first render, covering both a genuinely fresh
                // open (a remount via `[surah].tsx`'s `playOptionsOpenId` key, landing on the
                // full range) and the reciter-picker round trip (`fromAyah`/`toAyah` preserved).
                initialScrollIndex={toAyah - 1}
                data={ayahs}
                keyExtractor={String}
                getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })}
                renderItem={({ item }) => <WheelRow active={item === toAyah} label={String(item)} />}
                showsVerticalScrollIndicator={false}
                snapToInterval={ROW_HEIGHT}
                decelerationRate="fast"
                onMomentumScrollEnd={(event) => chooseTo(event.nativeEvent.contentOffset.y)}
              />
            </View>
          </View>

          <Pressable
            onPress={() => {
              hapticSelection();
              onPlay(fromAyah, toAyah);
            }}
            style={({ pressed }) => [styles.go, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
            <Ionicons name="play" size={18} color={theme.onPrimary} />
            <ThemedText type="smallBold" themeColor="onPrimary">
              {wholeSurah ? `Play ${meta.en}` : `Play ayahs ${fromAyah}\u2013${toAyah}`}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function WheelRow({ label, active }: { label: string; active: boolean }) {
  return (
    <View style={styles.wheelRow}>
      <ThemedText type={active ? 'smallBold' : 'small'} themeColor={active ? 'text' : 'textMuted'}>
        {label}
      </ThemedText>
    </View>
  );
}

function WheelOverlay({ color }: { color: string }) {
  return <View pointerEvents="none" style={[styles.selection, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1, marginRight: Spacing.two },
  rangeSection: { gap: Spacing.two },
  wheels: {
    height: WHEEL_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    position: 'relative',
    overflow: 'hidden',
  },
  wheel: { flex: 1, height: WHEEL_HEIGHT },
  wheelContent: { paddingVertical: ROW_HEIGHT * 2 },
  wheelRow: { height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  wheelDivider: { alignItems: 'center', justifyContent: 'center', width: 24 },
  selection: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ROW_HEIGHT * 2,
    height: ROW_HEIGHT,
    borderRadius: Radius.medium,
  },
  go: {
    flexDirection: 'row',
    minHeight: 52,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  pressed: { opacity: 0.75 },
});
