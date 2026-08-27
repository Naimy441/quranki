import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { memo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { ArabicTextStyle, Radius, Spacing } from '@/constants/theme';
import { useAppColorScheme, useTheme } from '@/hooks/use-theme';
import { attachLeadingCombiningMarks } from '@/lib/arabic-segments';
import { isCuratedWordId } from '@/lib/known-words';
import { glossColor, tajweedColor } from '@/lib/quran-colors';
import type { ReaderWord } from '@/lib/quran-reader-types';
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
  /** Study word ids (src/data/quranic-words.json) the user has already mastered - if `word.v` is
   *  in this set, its translation starts hidden and only reveals on tap, so a familiar reader
   *  can test themselves while reading instead of always seeing the crutch. */
  masteredVocabIds: Set<string>;
  /** Vocabulary ids (curated or generated "lem:...") the user has manually marked "known" (see
   *  useKnownWordsStore) - combined with `masteredVocabIds` for the same hide/reveal behavior,
   *  so knowledge from outside the curriculum hides a word just as well as curriculum mastery. */
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
  masteredVocabIds,
  knownWordIds,
  onLongPressWord,
}: WordCellProps) {
  const theme = useTheme();
  const scheme = useAppColorScheme();
  const gradeWord = useProgressStore((state) => state.gradeWord);
  const [revealed, setRevealed] = useState(false);
  const [hasNotedForgetting, setHasNotedForgetting] = useState(false);
  const isMasteredByFsrs = word.v !== undefined && isCuratedWordId(word.v) && masteredVocabIds.has(word.v);
  const isKnown = isMasteredByFsrs || (word.v !== undefined && knownWordIds.has(word.v));
  const isHidden = isKnown && !revealed;
  const arabicSegments = attachLeadingCombiningMarks(word.ar);

  const handleLongPress = () => {
    if (word.v === undefined || !onLongPressWord) return;
    Haptics.selectionAsync();
    onLongPressWord(word);
  };

  const handlePress = () => {
    if (!isKnown || !showTranslation) return;
    const nextRevealed = !revealed;
    setRevealed(nextRevealed);
    // Needing to check a word's translation despite the FSRS curriculum considering it
    // "mastered" is itself a real signal it isn't actually recalled right now - so, the same way
    // Anki treats a self-reported miss, grade it "again" here too (once per time this cell gets
    // revealed, not on every re-toggle). That drops it into the (re)learning queue so it comes
    // back up for a real review soon, instead of silently staying "mastered" forever despite
    // evidence to the contrary - see src/components/quranki/session-runner.tsx for the matching
    // same-session requeue this then feeds into.
    if (nextRevealed && isMasteredByFsrs && !hasNotedForgetting && word.v) {
      gradeWord(word.v, 'again');
      setHasNotedForgetting(true);
    }
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

      {showTranslation && (
        <>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          {isHidden ? (
            <Ionicons name="ellipsis-horizontal" size={glossSize} color={theme.textMuted} style={styles.hiddenIcon} />
          ) : (
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
          )}
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
  hiddenIcon: {
    paddingVertical: 2,
  },
});
