import { memo, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ArabicTextStyle, Radius, Spacing } from '@/constants/theme';
import { useAppColorScheme, useTheme } from '@/hooks/use-theme';
import { attachLeadingCombiningMarks } from '@/lib/arabic-segments';
import { hapticLongPress, hapticSelection, hapticWarning } from '@/lib/haptics';
import { isCuratedWordId } from '@/lib/known-words';
import { glossColor, tajweedColor } from '@/lib/quran-colors';
import type { ReaderWord } from '@/lib/quran-reader-types';
import { useKnownWordsStore } from '@/store/known-words-store';
import { useProgressStore } from '@/store/progress-store';

/** Android Fabric shapes each nested <Text> in isolation (facebook/react-native#54434), so a
 *  ZWJ is needed to restore joining forms. iOS reshapes nested runs as one string, and a ZWJ
 *  there would sit in the combined text - including between a letter and its harakat. */
const glueJoins = Platform.OS === 'android';

interface WordCellProps {
  word: ReaderWord;
  showTranslation: boolean;
  arabicSize: number;
  glossSize: number;
  /** Vocabulary ids whose translations start hidden: FSRS Review/Learning (see getHiddenVocabIds)
   *  plus anything in `knownWordIds`. A tap reveals this cell only; a second reveal of the same
   *  id lapses the card so every occurrence unhides. */
  hiddenVocabIds: Set<string>;
  /** Vocabulary ids (curated or generated "lem:...") the user has manually marked "known" (see
   *  useKnownWordsStore) - combined with `hiddenVocabIds` for the same hide/reveal behavior,
   *  so knowledge from outside the curriculum hides a word just as well as FSRS progress. */
  knownWordIds: Set<string>;
  /** Long-press entry point opening the word detail sheet - omitted (no-op) for a word with no
   *  resolvable `word.v`, since there's nothing to show or generalize a "known" mark to. */
  onLongPressWord?: (word: ReaderWord) => void;
}

/** Memoized: a surah can have thousands of these, so they should only re-render when their
 *  own word data or the shared display settings actually change. */
export const WordCell = memo(function WordCell({
  word,
  showTranslation,
  arabicSize,
  glossSize,
  hiddenVocabIds,
  knownWordIds,
  onLongPressWord,
}: WordCellProps) {
  const theme = useTheme();
  const scheme = useAppColorScheme();
  const gradeWord = useProgressStore((state) => state.gradeWord);
  const noteReaderPeek = useProgressStore((state) => state.noteReaderPeek);
  const peekCount = useProgressStore((state) => (word.v ? (state.readerPeeks[word.v] ?? 0) : 0));
  const unmarkKnown = useKnownWordsStore((state) => state.unmarkKnown);
  const [revealed, setRevealed] = useState(false);
  // Hide while FSRS/known-words say we should, until this vocab id has been peeked twice
  // (first peek is a free local hint; the second lapses it and unhides every occurrence).
  const isHideEligible =
    word.v !== undefined &&
    peekCount < 2 &&
    (hiddenVocabIds.has(word.v) || knownWordIds.has(word.v));
  const isHidden = isHideEligible && !revealed;
  const wasHideEligible = useRef(isHideEligible);

  useEffect(() => {
    // Only force-hide when a word *becomes* hide-eligible again (e.g. after a passing review).
    // Do not reset on a free first peek - that keeps isHideEligible true the whole time.
    if (isHideEligible && !wasHideEligible.current) setRevealed(false);
    wasHideEligible.current = isHideEligible;
  }, [isHideEligible]);
  const arabicSegments = attachLeadingCombiningMarks(word.ar);

  const handleLongPress = () => {
    if (word.v === undefined || !onLongPressWord) return;
    hapticLongPress();
    onLongPressWord(word);
  };

  const handlePress = () => {
    if (!isHideEligible || !showTranslation) return;
    if (revealed) {
      setRevealed(false);
      return;
    }
    setRevealed(true);
    if (word.v === undefined) return;
    // First peek is a free local hint. The second time this vocab id is revealed (this cell
    // after hiding, or another occurrence) is treated as a real miss: lapse curated cards so
    // they unhide everywhere, and drop a manual "known" mark the same way.
    const peeks = noteReaderPeek(word.v);
    if (peeks < 2) {
      hapticSelection();
      return;
    }
    hapticWarning();
    if (isCuratedWordId(word.v) && hiddenVocabIds.has(word.v)) gradeWord(word.v, 'again');
    if (knownWordIds.has(word.v)) unmarkKnown(word.v);
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.cell, pressed && { backgroundColor: theme.backgroundSelected }]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={350}
      hitSlop={4}>
      <Text
        style={[
          styles.arabic,
          ArabicTextStyle,
          { color: theme.text, fontSize: arabicSize, lineHeight: arabicSize * 1.9 },
        ]}>
        {arabicSegments.map((seg, i) => (
          <Text key={i} style={{ color: tajweedColor(seg.c, scheme, theme.text) }}>
            {glueJoins && i > 0 && '\u200D'}
            {seg.t}
            {glueJoins && i < arabicSegments.length - 1 && '\u200D'}
          </Text>
        ))}
      </Text>

      {showTranslation && !isHidden && (
        <>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <Text
            style={[
              styles.english,
              { color: theme.textSecondary, fontSize: glossSize, lineHeight: glossSize * 1.25 },
            ]}
            numberOfLines={2}>
            {word.en.length > 0 ? (
              word.en.map((seg, i) => (
                <Text key={i} style={{ color: glossColor(seg.c, scheme, theme.textSecondary) }}>
                  {seg.t}
                </Text>
              ))
            ) : (
              <Text style={{ color: theme.textMuted }}>-</Text>
            )}
          </Text>
        </>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    minWidth: 40,
    maxWidth: 170,
    borderRadius: Radius.medium,
  },
  arabic: {
    textAlign: 'center',
  },
  divider: {
    height: 1,
    width: '80%',
    marginVertical: Spacing.one,
  },
  english: {
    textAlign: 'center',
    fontWeight: '500',
  },
});
