import { memo, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ArabicTextStyle, Radius, Spacing } from '@/constants/theme';
import { useAppColorScheme, useTheme } from '@/hooks/use-theme';
import { shapeQpcArabic } from '@/lib/arabic-display';
import { attachLeadingCombiningMarks } from '@/lib/arabic-segments';
import { hapticLongPress, hapticSelection, hapticWarning } from '@/lib/haptics';
import { getHiddenStudyWordIdForLemmas } from '@/lib/levels';
import { glossColor, tajweedColor } from '@/lib/quran-colors';
import { getWordLemmaIds, lemmaPeekKey, type LemmaId } from '@/lib/quran-lemmas';
import type { ReaderWord } from '@/lib/quran-reader-types';
import { useKnownWordsStore } from '@/store/known-words-store';
import { useProgressStore } from '@/store/progress-store';

const glueJoins = Platform.OS === 'android';
interface WordCellProps { word: ReaderWord; showTranslation: boolean; hideMeaning?: boolean; showTransliteration: boolean; arabicSize: number; glossSize: number; transliterationSize: number; hiddenLemmaIds: Set<LemmaId>; knownLemmaIds: Set<LemmaId>; onLongPressWord?: (word: ReaderWord, translationRevealed: boolean) => void; speaking?: boolean; onSpeakingLayout?: (top: number, height: number) => void; measureToken?: number; }

export const WordCell = memo(function WordCell({ word, showTranslation, hideMeaning = false, showTransliteration, arabicSize, glossSize, transliterationSize, hiddenLemmaIds, knownLemmaIds, onLongPressWord, speaking = false, onSpeakingLayout, measureToken = 0 }: WordCellProps) {
  const theme = useTheme();
  const scheme = useAppColorScheme();
  const gradeWord = useProgressStore((state) => state.gradeWord);
  const noteReaderPeek = useProgressStore((state) => state.noteReaderPeek);
  const progress = useProgressStore((state) => state.progress);
  const lemmaIds = getWordLemmaIds(word);
  const peekKey = lemmaPeekKey(lemmaIds);
  const peekCount = useProgressStore((state) => state.readerPeeks[peekKey] ?? 0);
  const unmarkKnown = useKnownWordsStore((state) => state.unmarkKnown);
  const [revealed, setRevealed] = useState(false);
  const cellRef = useRef<View>(null);
  // Report where the actively-speaking word landed on screen so the reader can nudge itself
  // forward when a long, many-line ayah scrolls the current word past the comfortable reading
  // area - a single-shot measurement per word change is cheap since only one cell is ever
  // "speaking" at a time.
  useEffect(() => {
    if (!speaking || !onSpeakingLayout) return;
    cellRef.current?.measureInWindow((_x, y, _w, height) => onSpeakingLayout(y, height));
    // `measureToken` re-fires this without the word itself changing - used right after a
    // resumed-from-suspend jump to ask "where did I actually land?" so the scroll can correct
    // straight to the answer instead of the reader seeing a separate trip to the ayah's top first.
  }, [speaking, onSpeakingLayout, measureToken]);
  const isHideEligible = lemmaIds.length > 0 && peekCount < 2 && lemmaIds.every(
    (id) => hiddenLemmaIds.has(id) || knownLemmaIds.has(id),
  );
  const isHidden = isHideEligible && !revealed;
  const previousEligibility = useRef(isHideEligible);
  useEffect(() => { if (isHideEligible && !previousEligibility.current) setRevealed(false); previousEligibility.current = isHideEligible; }, [isHideEligible]);
  const joinedArabic = shapeQpcArabic(word.ar.map((segment) => segment.t).join(''));
  const keepJoined = /[\u06EA\u06EC]/.test(joinedArabic);
  const segments = keepJoined ? [{ t: joinedArabic }] : attachLeadingCombiningMarks(word.ar);
  const showGloss = showTranslation && !hideMeaning && !isHidden && word.en.length > 0;
  const translationRevealed = showTranslation && !hideMeaning && !isHidden;
  const handlePress = () => {
    if (!isHideEligible || !showTranslation) return;
    if (revealed) { setRevealed(false); return; }
    setRevealed(true);
    if (lemmaIds.length === 0) return;
    const peeks = noteReaderPeek(peekKey);
    if (peeks < 2) { hapticSelection(); return; }
    hapticWarning();
    const studyWordId = getHiddenStudyWordIdForLemmas(lemmaIds, progress);
    if (studyWordId) gradeWord(studyWordId, 'again');
    if (lemmaIds.some((id) => knownLemmaIds.has(id))) unmarkKnown(lemmaIds);
  };
  return <Pressable ref={cellRef} style={({ pressed }) => [styles.cell, pressed && { backgroundColor: theme.backgroundSelected }]} onPress={handlePress} onLongPress={() => { if (onLongPressWord) { hapticLongPress(); onLongPressWord(word, translationRevealed); } }} delayLongPress={350} hitSlop={4}>
    <Text style={[styles.arabic, ArabicTextStyle, { color: theme.text, fontSize: arabicSize, lineHeight: arabicSize * 1.9, includeFontPadding: false }]}>{keepJoined ? joinedArabic : segments.map((segment, index) => <Text key={index} style={{ color: tajweedColor(segment.c, scheme, theme.text) }}>{glueJoins && index > 0 && '\u200D'}{segment.t}{glueJoins && index < segments.length - 1 && '\u200D'}</Text>)}</Text>
    {showTransliteration && word.tl ? <Text style={[styles.transliteration, { color: theme.primary, fontSize: transliterationSize, lineHeight: transliterationSize * 1.3 }]} numberOfLines={2}>{word.tl}</Text> : null}
    {(showGloss || speaking) && <View style={[styles.divider, { backgroundColor: speaking ? theme.primary : theme.border }]} />}
    {showGloss && <Text style={[styles.english, { color: theme.textSecondary, fontSize: glossSize, lineHeight: glossSize * 1.25 }]} numberOfLines={2}>{word.en.map((segment, index) => <Text key={index} style={{ color: glossColor(segment.c, scheme, theme.textSecondary) }}>{segment.t}</Text>)}</Text>}
  </Pressable>;
});
const styles = StyleSheet.create({ cell: { alignItems: 'center', paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, minWidth: 40, maxWidth: 170, borderRadius: Radius.medium }, arabic: { textAlign: 'center' }, transliteration: { textAlign: 'center', fontWeight: '600' }, divider: { height: 1, width: '80%', marginVertical: Spacing.one }, english: { textAlign: 'center', fontWeight: '500' } });
