import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { memo, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { AyahActionMenu } from '@/components/quran/ayah-action-menu';
import { AyahNumberBadge } from '@/components/quran/ayah-number-badge';
import { AyahTranslation } from '@/components/quran/ayah-translation';
import { WordCell } from '@/components/quran/word-cell';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticLight, hapticSelection, hapticSuccess } from '@/lib/haptics';
import { isHurufMuqattaatAyah } from '@/lib/huruf-muqattaat';
import { buildAyahShareText } from '@/lib/quran-reader';
import type { ReaderAyah, ReaderWord } from '@/lib/quran-reader-types';
import { getAyahUnderstanding } from '@/lib/quran-understanding';
import { useQuranMarksStore } from '@/store/quran-marks-store';
import { playAyah, useRecitationStore } from '@/store/recitation-store';

interface AyahBlockProps { ayah: ReaderAyah; surahNumber: number; surahName: string; showTranslation: boolean; showTransliteration: boolean; arabicSize: number; glossSize: number; transliterationSize: number; hiddenVocabIds: Set<string>; knownWordIds: Set<string>; recognizedVocabIds: Set<string>; showAyahCoverage: boolean; highlighted?: boolean; actionsOpen?: boolean; onToggleActions?: (ayah: number) => void; onLongPressWord?: (word: ReaderWord) => void; onOpenMarks?: (ayah: number) => void; }

export const AyahBlock = memo(function AyahBlock({ ayah, surahNumber, surahName, showTranslation, showTransliteration, arabicSize, glossSize, transliterationSize, hiddenVocabIds, knownWordIds, recognizedVocabIds, showAyahCoverage, highlighted = false, actionsOpen = false, onToggleActions, onLongPressWord, onOpenMarks }: AyahBlockProps) {
  const theme = useTheme();
  const isOpeningLetters = isHurufMuqattaatAyah(surahNumber, ayah.a);
  const understanding = getAyahUnderstanding(ayah, recognizedVocabIds, surahNumber);
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
  const playback = useRecitationStore((s) => { const active = s.visible && s.surahNumber === surahNumber && s.ayahNumber === ayah.a; return !active ? 'idle' as const : s.awaitingAudio && !s.playing ? 'loading' as const : s.playing ? 'playing' as const : 'paused' as const; });
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);
  useEffect(() => { setShowFullTranslation(false); setCopied(false); }, [ayah.a]);
  useEffect(() => { if (!highlighted) { highlightOpacity.setValue(0); return; } highlightOpacity.setValue(1); const fade = Animated.timing(highlightOpacity, { toValue: 0, duration: 450, delay: 1400, useNativeDriver: true }); fade.start(); return () => fade.stop(); }, [ayah.a, highlighted, highlightOpacity]);
  const copy = async () => { await Clipboard.setStringAsync(buildAyahShareText(surahName, ayah)); hapticSuccess(); setCopied(true); if (copyTimer.current) clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => setCopied(false), 1500); };
  return <View style={[styles.container, { borderBottomColor: theme.border }, playback !== 'idle' && { backgroundColor: theme.backgroundSelected }]}>
    <Animated.View pointerEvents="none" style={[styles.highlight, { backgroundColor: theme.backgroundSelected, opacity: highlightOpacity }]} />
    <AyahNumberBadge number={ayah.a} understanding={showAyahCoverage && !isOpeningLetters ? understanding.ratio : undefined} />
    {marks.length > 0 && <View style={styles.markIcons}>{marks.map((mark, index) => mark.kind === 'pin' ? <MaterialCommunityIcons key={`${mark.kind}-${index}`} name="pin" size={13} color={mark.color} /> : <Ionicons key={`${mark.kind}-${index}`} name="bookmark" size={11} color={mark.color} />)}</View>}
    <AyahActionMenu open={actionsOpen} onToggle={() => onToggleActions?.(ayah.a)} bookmarked={bookmarked} copied={copied} playback={playback} showTranslation={showFullTranslation} showTranslationAction={!isOpeningLetters} onSave={() => { onToggleActions?.(ayah.a); onOpenMarks?.(ayah.a); }} onCopy={copy} onPlay={() => { hapticLight(); void playAyah(surahNumber, ayah.a); }} onTranslate={() => { hapticSelection(); setShowFullTranslation((value) => !value); }} />
    <View style={styles.row}>{ayah.w.map((word) => <WordCell key={word.p} word={word} showTranslation={showTranslation} hideMeaning={isOpeningLetters} showTransliteration={showTransliteration} arabicSize={arabicSize} glossSize={glossSize} transliterationSize={transliterationSize} hiddenVocabIds={hiddenVocabIds} knownWordIds={knownWordIds} onLongPressWord={onLongPressWord} />)}</View>
    {showFullTranslation && <AyahTranslation parts={ayah.tr} fontSize={glossSize} />}
  </View>;
});

const styles = StyleSheet.create({ container: { paddingTop: Spacing.two, paddingBottom: Spacing.three, borderBottomWidth: 1 }, row: { flexDirection: 'row-reverse', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'flex-start', paddingTop: Spacing.five, paddingBottom: Spacing.one, paddingHorizontal: Spacing.four }, highlight: { ...StyleSheet.absoluteFill }, markIcons: { position: 'absolute', top: Spacing.two + 1, left: Spacing.three + 64, zIndex: 1, flexDirection: 'row', alignItems: 'center', gap: 2 } });
