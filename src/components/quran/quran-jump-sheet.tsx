import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelection } from '@/lib/haptics';
import { SURAH_INDEX } from '@/lib/quran-reader';

const ROW_HEIGHT = 44;
const WHEEL_HEIGHT = ROW_HEIGHT * 5;

interface QuranJumpSheetProps {
  visible: boolean;
  initialSurah: number;
  initialAyah?: number;
  onDismiss: () => void;
  onJump: (surah: number, ayah: number) => void;
}

/** Linked wheels for jumping anywhere in the Quran without leaving the current screen first. */
export function QuranJumpSheet({ visible, initialSurah, initialAyah = 1, onDismiss, onJump }: QuranJumpSheetProps) {
  const theme = useTheme();
  const [surah, setSurah] = useState(initialSurah);
  const [ayah, setAyah] = useState(initialAyah);
  const surahRef = useRef<FlatList<(typeof SURAH_INDEX)[number]>>(null);
  const ayahRef = useRef<FlatList<number>>(null);
  const ayahCount = SURAH_INDEX[surah - 1]?.ac ?? 1;
  const ayahs = useMemo(() => Array.from({ length: ayahCount }, (_, index) => index + 1), [ayahCount]);

  useEffect(() => {
    if (!visible) return;
    const nextSurah = Math.max(1, Math.min(SURAH_INDEX.length, initialSurah));
    const nextAyah = Math.max(1, Math.min(SURAH_INDEX[nextSurah - 1]?.ac ?? 1, initialAyah));
    const frame = requestAnimationFrame(() => {
      setSurah(nextSurah);
      setAyah(nextAyah);
      requestAnimationFrame(() => {
        surahRef.current?.scrollToOffset({ offset: (nextSurah - 1) * ROW_HEIGHT, animated: false });
        ayahRef.current?.scrollToOffset({ offset: (nextAyah - 1) * ROW_HEIGHT, animated: false });
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [initialAyah, initialSurah, visible]);

  const chooseSurah = (offset: number) => {
    const next = Math.max(1, Math.min(SURAH_INDEX.length, Math.round(offset / ROW_HEIGHT) + 1));
    if (next === surah) return;
    hapticSelection();
    setSurah(next);
    setAyah(1);
    requestAnimationFrame(() => ayahRef.current?.scrollToOffset({ offset: 0, animated: false }));
  };
  const chooseAyah = (offset: number) => {
    const next = Math.max(1, Math.min(ayahCount, Math.round(offset / ROW_HEIGHT) + 1));
    if (next !== ayah) hapticSelection();
    setAyah(next);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        <View style={[styles.sheet, { backgroundColor: theme.card }]}>
          <View style={styles.header}>
            <ThemedText type="smallBold">Jump to ayah</ThemedText>
            <Pressable onPress={onDismiss} hitSlop={10}><ThemedText type="smallBold" themeColor="primary">Cancel</ThemedText></Pressable>
          </View>
          <View style={styles.labels}>
            <View style={styles.surahLabel}><ThemedText type="small" themeColor="textMuted" style={styles.columnLabel}>SURAH</ThemedText></View>
            <View style={styles.ayahLabel}><ThemedText type="small" themeColor="textMuted" style={styles.columnLabel}>AYAH</ThemedText></View>
          </View>
          <View style={styles.wheels}>
            <WheelOverlay color={theme.backgroundSelected} />
            <FlatList ref={surahRef} style={styles.surahWheel} contentContainerStyle={styles.wheelContent} nestedScrollEnabled data={SURAH_INDEX} keyExtractor={(item) => String(item.n)} getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })} renderItem={({ item }) => <WheelRow active={item.n === surah} label={`${item.n}. ${item.en}`} />} showsVerticalScrollIndicator={false} snapToInterval={ROW_HEIGHT} decelerationRate="fast" onMomentumScrollEnd={(event) => chooseSurah(event.nativeEvent.contentOffset.y)} />
            <FlatList ref={ayahRef} style={styles.ayahWheel} contentContainerStyle={styles.wheelContent} nestedScrollEnabled data={ayahs} keyExtractor={String} getItemLayout={(_, index) => ({ length: ROW_HEIGHT, offset: ROW_HEIGHT * index, index })} renderItem={({ item }) => <WheelRow centered active={item === ayah} label={String(item)} />} showsVerticalScrollIndicator={false} snapToInterval={ROW_HEIGHT} decelerationRate="fast" onMomentumScrollEnd={(event) => chooseAyah(event.nativeEvent.contentOffset.y)} />
          </View>
          <Pressable onPress={() => { hapticSelection(); onJump(surah, ayah); }} style={({ pressed }) => [styles.go, { backgroundColor: theme.primary }, pressed && styles.pressed]}>
            <ThemedText type="smallBold" themeColor="onPrimary">
              Go to {SURAH_INDEX[surah - 1]?.en ?? ''}
            </ThemedText>
            <ThemedText type="small" themeColor="onPrimary" style={styles.goDetail}>
              Ayah {ayah}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function WheelRow({ label, active, centered = false }: { label: string; active: boolean; centered?: boolean }) { return <View style={[styles.wheelRow, centered && styles.centeredWheelRow]}><ThemedText type={active ? 'smallBold' : 'small'} themeColor={active ? 'text' : 'textMuted'} style={[styles.wheelText, centered && styles.centeredWheelText]} numberOfLines={1}>{label}</ThemedText></View>; }
function WheelOverlay({ color }: { color: string }) { return <View pointerEvents="none" style={[styles.selection, { backgroundColor: color }]} />; }
const styles = StyleSheet.create({ backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }, sheet: { borderTopLeftRadius: Radius.large, borderTopRightRadius: Radius.large, padding: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.two }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, labels: { flexDirection: 'row', gap: Spacing.three, marginBottom: -Spacing.one }, surahLabel: { flex: 2, alignItems: 'flex-start' }, ayahLabel: { flex: 1, alignItems: 'flex-start' }, columnLabel: { alignSelf: 'flex-start', textAlign: 'left' }, wheels: { height: WHEEL_HEIGHT, flexDirection: 'row', gap: Spacing.three, position: 'relative', overflow: 'hidden' }, surahWheel: { flex: 2 }, ayahWheel: { flex: 1 }, wheelContent: { paddingVertical: ROW_HEIGHT * 2 }, wheelRow: { height: ROW_HEIGHT, justifyContent: 'center', alignItems: 'flex-start', paddingLeft: 0, paddingRight: Spacing.two }, centeredWheelRow: { alignItems: 'center', paddingHorizontal: 0 }, wheelText: { alignSelf: 'flex-start', textAlign: 'left' }, centeredWheelText: { alignSelf: 'center', textAlign: 'center' }, selection: { position: 'absolute', left: 0, right: 0, top: ROW_HEIGHT * 2, height: ROW_HEIGHT, borderRadius: Radius.medium }, go: { minHeight: 52, borderRadius: Radius.medium, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, gap: 2 }, goDetail: { opacity: 0.85 }, pressed: { opacity: 0.75 } });
