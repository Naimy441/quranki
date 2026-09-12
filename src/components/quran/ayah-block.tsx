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
import type { LemmaId } from '@/lib/quran-lemmas';
import { buildAyahShareText } from '@/lib/quran-reader';
import type { ReaderAyah, ReaderWordRef } from '@/lib/quran-reader-types';
import { getAyahUnderstanding } from '@/lib/quran-understanding';
import { getAyahTranslationParts } from '@/lib/translation-dataset';
import { findTranslationOption } from '@/lib/translations';
import { useProgressStore } from '@/store/progress-store';
import { useQuranMarksStore } from '@/store/quran-marks-store';
import { playAyah, setAutoScrollSuspended, useRecitationStore } from '@/store/recitation-store';
import { ensureTranslationDatasetLoaded, useTranslationDatasetStore } from '@/store/translation-store';

const MENU_SIZE = 26;
const TOP_MENU_OFFSET = Spacing.two;
const HEADER_BAND = 40;
const DISSOLVE = 110;

interface AyahBlockProps { ayah: ReaderAyah; surahNumber: number; surahName: string; showTranslation: boolean; showTransliteration: boolean; arabicSize: number; glossSize: number; transliterationSize: number; hiddenLemmaIds: Set<LemmaId>; knownLemmaIds: Set<LemmaId>; recognizedLemmaIds: Set<LemmaId>; showAyahCoverage: boolean; highlighted?: boolean; actionsOpen?: boolean; onToggleActions?: (ayah: number) => void; onLongPressWord?: (ref: ReaderWordRef) => void; onOpenMarks?: (ayah: number) => void; scrollEpoch?: number; settleEpoch?: number; measureToken?: number; onSpeakingWordLayout?: (top: number, height: number) => void; playbackFromAyah?: number; playbackToAyah?: number; }

export const AyahBlock = memo(function AyahBlock({ ayah, surahNumber, surahName, showTranslation, showTransliteration, arabicSize, glossSize, transliterationSize, hiddenLemmaIds, knownLemmaIds, recognizedLemmaIds, showAyahCoverage, highlighted = false, actionsOpen = false, onToggleActions, onLongPressWord, onOpenMarks, scrollEpoch = 0, settleEpoch = 0, measureToken = 0, onSpeakingWordLayout, playbackFromAyah, playbackToAyah }: AyahBlockProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const wrapRef = useRef<View>(null);
  const blockRef = useRef<View>(null);
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
  const alwaysShowTranslation = useProgressStore((s) => s.settings.readerAlwaysShowTranslation);
  const selectedTranslationKey = useProgressStore((s) => s.settings.selectedTranslationKey);
  // Only takes the store's dataset once it actually matches the current selection - while
  // switching from one non-bundled translation to another, the store briefly still holds the
  // *previous* pick's dataset (see `ensureTranslationDatasetLoaded`), which would otherwise show
  // mismatched text for a moment instead of falling back to the bundled default below.
  const translationDataset = useTranslationDatasetStore((s) =>
    s.key === selectedTranslationKey ? s.dataset : null,
  );
  useEffect(() => {
    ensureTranslationDatasetLoaded(selectedTranslationKey);
  }, [selectedTranslationKey]);
  // Falls back to the bundled Sahih International text (`ayah.tr`) whenever the selected
  // translation is the bundled default itself, or a non-bundled pick hasn't finished downloading
  // yet - the reader should never show a blank translation panel while that happens in the
  // background (see `ensureTranslationDatasetLoaded`).
  const translationParts =
    (!findTranslationOption(selectedTranslationKey)?.bundled &&
      translationDataset &&
      getAyahTranslationParts(translationDataset, surahNumber, ayah.a)) ||
    ayah.tr;
  const effectiveShowTranslation = alwaysShowTranslation || showFullTranslation;
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
  const autoScrollSuspended = useRecitationStore((s) => s.autoScrollSuspended);
  // Read via a ref rather than depending on the value directly: `updateStickyMenu` must stay
  // stable across a suspend/resume toggle itself, or the moment `onScrollBeginDrag` flips this to
  // true, the changed callback identity would force an immediate re-measurement - at that exact
  // instant the ayah hasn't visually moved yet, so the overlap check below would still pass and
  // instantly flip it back to false, undoing the suspend before the reader's drag even registers.
  const autoScrollSuspendedRef = useRef(autoScrollSuspended);
  useEffect(() => {
    autoScrollSuspendedRef.current = autoScrollSuspended;
  }, [autoScrollSuspended]);
  const updateStickyMenu = useCallback(() => {
    wrapRef.current?.measureInWindow((_x, y, _w, height) => {
      blockRef.current?.measureInWindow((_cx, cy, _cw, ch) => {
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
        // For a really long ayah (spanning several screens), most of a scroll happens with its
        // true bottom edge still far below the viewport - `visibleBottom` above stands in for
        // `bottomClip` for most of that scroll, which kept the sticky menu hovering near the
        // bottom of the screen the *entire* time. Fully visible once the divider is 80% down
        // the viewport; fade across the stretch above that so a flick isn't a pop.
        const fadeRange = windowHeight * 0.2;
        const distanceToAnchor = cy + ch - windowHeight * 0.8;
        const nearEnd = Math.min(1, Math.max(0, 1 - distanceToAnchor / fadeRange));
        const presence = Math.min(eased, leave, nearEnd);
        // Short ayahs keep their top-right trigger in view for the whole time they're on
        // screen, so a second sticky copy would only duplicate it as they scroll off.
        if (ch < windowHeight || presence <= 0.02 || menuTop >= bottomClip) {
          setStickyPresence(0);
          setStickyMenuTop((current) => (current == null ? current : null));
        } else {
          setStickyPresence((current) => (Math.abs(current - presence) < 0.02 ? current : presence));
          setStickyMenuTop((current) => (current != null && Math.abs(current - next) < 1 ? current : next));
        }
      });
    });
  }, [insets.bottom, insets.top, windowHeight]);
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);
  useEffect(() => { setShowFullTranslation(false); setCopied(false); }, [ayah.a]);
  useEffect(() => { if (!highlighted) { highlightOpacity.setValue(0); return; } highlightOpacity.setValue(1); const fade = Animated.timing(highlightOpacity, { toValue: 0, duration: 450, delay: 1400, useNativeDriver: true }); fade.start(); return () => fade.stop(); }, [ayah.a, highlighted, highlightOpacity]);
  useEffect(() => { updateStickyMenu(); }, [scrollEpoch, updateStickyMenu]);
  // Re-engage auto-scroll once the reader has scrolled substantially back to the ayah currently
  // being recited. Deliberately keyed off `settleEpoch` - which only ticks once scrolling has
  // fully stopped (drag *and* any trailing momentum) - rather than the continuous `scrollEpoch`
  // above: checking on every intermediate scroll tick meant the list would yank itself back to
  // the recited ayah mid-gesture, fighting the reader before they'd even finished scrolling past.
  useEffect(() => {
    if (playback === 'idle') return;
    wrapRef.current?.measureInWindow((_x, y, _w, height) => {
      if (!autoScrollSuspendedRef.current) return;
      // "Substantially", not merely a pixel of overlap. FlashList's own viewability threshold
      // (percentage of the item's *own* height that's visible) is the right idea but breaks for
      // a really long ayah - once it's taller than 2 screens, even filling the entire viewport
      // with it can't reach 50% of its own height. Fall back to 50% of the *viewport* for those,
      // while keeping the original per-item percentage for anything within about one screen.
      const viewportHeight = Math.max(0, windowHeight - insets.top - insets.bottom);
      const visiblePixels = Math.max(0, Math.min(y + height, windowHeight - insets.bottom) - Math.max(y, insets.top));
      const referenceHeight = Math.min(height, viewportHeight);
      const overlapRatio = referenceHeight > 0 ? visiblePixels / referenceHeight : 0;
      if (overlapRatio >= 0.5) setAutoScrollSuspended(false);
    });
  }, [settleEpoch, playback, windowHeight, insets.top, insets.bottom]);
  const copy = async () => { await Clipboard.setStringAsync(buildAyahShareText(surahName, ayah)); hapticSuccess(); setCopied(true); if (copyTimer.current) clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => setCopied(false), 1500); };
  const menu = { open: actionsOpen, onToggle: () => onToggleActions?.(ayah.a), bookmarked, copied, playback, showTranslation: effectiveShowTranslation, showTranslationAction: !isOpeningLetters && !alwaysShowTranslation, onSave: () => { onToggleActions?.(ayah.a); onOpenMarks?.(ayah.a); }, onCopy: copy, onPlay: () => { hapticLight(); void playAyah(surahNumber, ayah.a, { fromAyah: playbackFromAyah, toAyah: playbackToAyah }); }, onTranslate: () => { hapticSelection(); setShowFullTranslation((value) => !value); } };
  return <View ref={blockRef} collapsable={false} style={[styles.container, { borderBottomColor: theme.border }]}>
    {playback !== 'idle' ? <View pointerEvents="none" style={[styles.highlight, { backgroundColor: theme.backgroundSelected, opacity: 0.4 }]} /> : null}
    <Animated.View pointerEvents="none" style={[styles.highlight, { backgroundColor: theme.backgroundSelected, opacity: highlightOpacity }]} />
    <View ref={wrapRef} onLayout={updateStickyMenu} collapsable={false} style={styles.body}>
      <AyahNumberBadge number={ayah.a} understanding={showAyahCoverage && understanding.totalWords > 0 ? understanding.ratio : undefined} onNumberWidth={setNumberWidth}>
        {marks.length > 0 ? <View style={styles.markIcons}>{marks.map((mark, index) => mark.kind === 'pin' ? <MaterialCommunityIcons key={`${mark.kind}-${index}`} name="pin" size={13} color={mark.color} /> : <Ionicons key={`${mark.kind}-${index}`} name="bookmark" size={12} color={mark.color} />)}</View> : null}
      </AyahNumberBadge>
      <AyahActionMenu {...menu} />
      {stickyMenuTop != null ? <AyahActionMenu {...menu} direction="up" presence={stickyPresence} style={{ top: stickyMenuTop, left: Spacing.three - 3 + numberWidth / 2 - MENU_SIZE / 2 }} /> : null}
      <View style={styles.row}>{ayah.w.map((word) => <WordCell key={word.p} word={word} showTranslation={showTranslation} hideMeaning={isOpeningLetters} showTransliteration={showTransliteration} arabicSize={arabicSize} glossSize={glossSize} transliterationSize={transliterationSize} hiddenLemmaIds={hiddenLemmaIds} knownLemmaIds={knownLemmaIds} speaking={speakingWord === word.p} onSpeakingLayout={speakingWord === word.p ? onSpeakingWordLayout : undefined} measureToken={measureToken} onLongPressWord={onLongPressWord ? (pressed, translationRevealed) => onLongPressWord({ surah: surahNumber, ayah: ayah.a, word: pressed, translationRevealed }) : undefined} />)}</View>
    </View>
    {effectiveShowTranslation && <AyahTranslation parts={translationParts} fontSize={glossSize} />}
  </View>;
});

const styles = StyleSheet.create({ container: { paddingBottom: Spacing.three, borderBottomWidth: 1 }, body: { paddingTop: Spacing.two }, row: { flexDirection: 'row-reverse', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'flex-start', paddingTop: Spacing.five, paddingBottom: Spacing.one, paddingHorizontal: Spacing.four }, highlight: { ...StyleSheet.absoluteFill }, markIcons: { flexDirection: 'row', alignItems: 'center', gap: 4 } });
