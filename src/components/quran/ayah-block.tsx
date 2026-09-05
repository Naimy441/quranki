import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AyahActionMenu } from '@/components/quran/ayah-action-menu';
import { AyahNumberBadge } from '@/components/quran/ayah-number-badge';
import { AyahTranslation } from '@/components/quran/ayah-translation';
import { WordCell } from '@/components/quran/word-cell';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticLight, hapticSelection, hapticSuccess } from '@/lib/haptics';
import { isHurufMuqattaatAyah } from '@/lib/huruf-muqattaat';
import { buildAyahShareText } from '@/lib/quran-reader';
import type { ReaderAyah, ReaderWordRef } from '@/lib/quran-reader-types';
import type { LemmaId } from '@/lib/quran-lemmas';
import { getAyahUnderstanding } from '@/lib/quran-understanding';
import { useQuranMarksStore } from '@/store/quran-marks-store';
import { playAyah, useRecitationStore } from '@/store/recitation-store';

const MENU_SIZE = 26;
const TOP_MENU_OFFSET = Spacing.two;
const HEADER_BAND = 40;
const DISSOLVE = 110;

interface AyahBlockProps { ayah: ReaderAyah; surahNumber: number; surahName: string; showTranslation: boolean; showTransliteration: boolean; arabicSize: number; glossSize: number; transliterationSize: number; hiddenLemmaIds: Set<LemmaId>; knownLemmaIds: Set<LemmaId>; recognizedLemmaIds: Set<LemmaId>; showAyahCoverage: boolean; highlighted?: boolean; actionsOpen?: boolean; onToggleActions?: (ayah: number) => void; onLongPressWord?: (ref: ReaderWordRef) => void; onOpenMarks?: (ayah: number) => void; scrollEpoch?: number; }

export const AyahBlock = memo(function AyahBlock({ ayah, surahNumber, surahName, showTranslation, showTransliteration, arabicSize, glossSize, transliterationSize, hiddenLemmaIds, knownLemmaIds, recognizedLemmaIds, showAyahCoverage, highlighted = false, actionsOpen = false, onToggleActions, onLongPressWord, onOpenMarks, scrollEpoch = 0 }: AyahBlockProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const wrapRef = useRef<View>(null);
  const [stickyMenuTop, setStickyMenuTop] = useState<number | null>(null);
  const [stickyPresence, setStickyPresence] = useState(0);
  const [numberWidth, setNumberWidth] = useState(() => (ayah.a < 10 ? 10 : ayah.a < 100 ? 18 : 26));
  const isOpeningLetters = isHurufMuqattaatAyah(surahNumber, ayah.a);
  const understanding = getAyahUnderstanding(ayah, recognizedLemmaIds);
  const marksKey = useQuranMarksStore((s) => {
    const pins = s.pinPlacements.filter((entry) => entry.surah === surahNumber && entry.ayah === ayah.a).map((entry) => s.pins.find((pin) => pin.id === entry.pinId)?.color).filter((color): color is string => Boolean(color)).map((color) => `pin:${color}`);
    const bookmarks = s.bookmarks.filter((bookmark) => bookmark.surah === surahNumber && bookmark.ayah === ayah.a).map((bookmark) => s.collections.find((collection) => collection.id === bookmark.collectionId)?.color).filter((color): color is string => Boolean(color)).map((color) => `bookmark:${color}`);
    return [...pins, ...bookmarks].join(',');
  });
  const bookmarked = useQuranMarksStore((s) => s.bookmarks.some((bookmark) => bookmark.surah === surahNumber && bookmark.ayah === ayah.a));
  const marks = marksKey ? marksKey.split(',').map((entry) => { const separator = entry.indexOf(':'); return { kind: entry.slice(0, separator) as 'pin' | 'bookmark', color: entry.slice(separator + 1) }; }) : [];
  const [showFullTranslation, setShowFullTranslation] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightOpacity = useRef(new Animated.Value(0)).current;
  const playback = useRecitationStore((s) => {
    const active = s.visible && s.surahNumber === surahNumber && s.ayahNumber === ayah.a && !s.playingBismillah;
    if (!active) return 'idle' as const;
    return s.awaitingAudio && !s.playing ? 'loading' as const : s.playing ? 'playing' as const : 'paused' as const;
  });
  const speakingWord = useRecitationStore((s) => (
    s.visible && s.surahNumber === surahNumber && s.ayahNumber === ayah.a && !s.playingBismillah ? s.wordNumber : 0
  ));
  const updateStickyMenu = useCallback(() => {
    wrapRef.current?.measureInWindow((_x, y, _w, height) => {
      const topClip = insets.top + 52;
      const bottomClip = windowHeight - Math.max(insets.bottom, 8) - 8;
      const visibleBottom = Math.min(y + height, bottomClip);
      const next = Math.min(height - MENU_SIZE - TOP_MENU_OFFSET, visibleBottom - y - MENU_SIZE - TOP_MENU_OFFSET);
      const menuTop = y + next;
      const menuBottom = menuTop + MENU_SIZE;
      const offBy = topClip - (y + HEADER_BAND);
      const enter = Math.min(1, Math.max(0, offBy / DISSOLVE));
      const eased = enter * enter * enter;
      const leave = Math.min(1, Math.max(0, (menuBottom - topClip) / MENU_SIZE));
      const presence = Math.min(eased, leave);
      if (presence <= 0.02 || menuTop >= bottomClip) {
        setStickyPresence(0);
        setStickyMenuTop((current) => (current == null ? current : null));
        return;
      }
      setStickyPresence((current) => (Math.abs(current - presence) < 0.02 ? current : presence));
      setStickyMenuTop((current) => (current != null && Math.abs(current - next) < 1 ? current : next));
    });
  }, [insets.bottom, insets.top, windowHeight]);
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);
  useEffect(() => { setShowFullTranslation(false); setCopied(false); }, [ayah.a]);
  useEffect(() => { if (!highlighted) { highlightOpacity.setValue(0); return; } highlightOpacity.setValue(1); const fade = Animated.timing(highlightOpacity, { toValue: 0, duration: 450, delay: 1400, useNativeDriver: true }); fade.start(); return () => fade.stop(); }, [ayah.a, highlighted, highlightOpacity]);
  useEffect(() => { updateStickyMenu(); }, [scrollEpoch, updateStickyMenu]);
  const copy = async () => { await Clipboard.setStringAsync(buildAyahShareText(surahName, ayah)); hapticSuccess(); setCopied(true); if (copyTimer.current) clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => setCopied(false), 1500); };
  const menu = { open: actionsOpen, onToggle: () => onToggleActions?.(ayah.a), bookmarked, copied, playback, showTranslation: showFullTranslation, showTranslationAction: !isOpeningLetters, onSave: () => { onToggleActions?.(ayah.a); onOpenMarks?.(ayah.a); }, onCopy: copy, onPlay: () => { hapticLight(); void playAyah(surahNumber, ayah.a); }, onTranslate: () => { hapticSelection(); setShowFullTranslation((value) => !value); } };
  return <View style={[styles.container, { borderBottomColor: theme.border }]}>
    {playback !== 'idle' ? <View pointerEvents="none" style={[styles.highlight, { backgroundColor: theme.backgroundSelected, opacity: 0.4 }]} /> : null}
    <Animated.View pointerEvents="none" style={[styles.highlight, { backgroundColor: theme.backgroundSelected, opacity: highlightOpacity }]} />
    <View ref={wrapRef} onLayout={updateStickyMenu} collapsable={false} style={styles.body}>
      <AyahNumberBadge number={ayah.a} understanding={showAyahCoverage && understanding.totalWords > 0 ? understanding.ratio : undefined} onNumberWidth={setNumberWidth}>
        {marks.length > 0 ? <View style={styles.markIcons}>{marks.map((mark, index) => mark.kind === 'pin' ? <MaterialCommunityIcons key={`${mark.kind}-${index}`} name="pin" size={13} color={mark.color} /> : <Ionicons key={`${mark.kind}-${index}`} name="bookmark" size={12} color={mark.color} />)}</View> : null}
      </AyahNumberBadge>
      <AyahActionMenu {...menu} />
      {stickyMenuTop != null ? <AyahActionMenu {...menu} direction="up" presence={stickyPresence} style={{ top: stickyMenuTop, left: Spacing.three - 3 + numberWidth / 2 - MENU_SIZE / 2 }} /> : null}
      <View style={styles.row}>{ayah.w.map((word) => <WordCell key={word.p} word={word} showTranslation={showTranslation} hideMeaning={isOpeningLetters} showTransliteration={showTransliteration} arabicSize={arabicSize} glossSize={glossSize} transliterationSize={transliterationSize} hiddenLemmaIds={hiddenLemmaIds} knownLemmaIds={knownLemmaIds} speaking={speakingWord === word.p} onLongPressWord={onLongPressWord ? (pressed) => onLongPressWord({ surah: surahNumber, ayah: ayah.a, word: pressed }) : undefined} />)}</View>
    </View>
    {showFullTranslation && <AyahTranslation parts={ayah.tr} fontSize={glossSize} />}
  </View>;
});

const styles = StyleSheet.create({ container: { paddingBottom: Spacing.three, borderBottomWidth: 1 }, body: { paddingTop: Spacing.two }, row: { flexDirection: 'row-reverse', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'flex-start', paddingTop: Spacing.five, paddingBottom: Spacing.one, paddingHorizontal: Spacing.four }, highlight: { ...StyleSheet.absoluteFill }, markIcons: { flexDirection: 'row', alignItems: 'center', gap: 4 } });
