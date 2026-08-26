import { Ionicons } from '@expo/vector-icons';
import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ArabicTextStyle, Spacing } from '@/constants/theme';
import { useAppColorScheme, useTheme } from '@/hooks/use-theme';
import { glossColor, tajweedColor } from '@/lib/quran-colors';
import type { ReaderWord } from '@/lib/quran-reader-types';

interface WordCellProps {
  word: ReaderWord;
  showTranslation: boolean;
  arabicSize: number;
  glossSize: number;
  /** Study word ids (src/data/quranic-words.json) the user has already mastered - if `word.v` is
   *  in this set, its translation starts hidden and only reveals on tap, so a familiar reader
   *  can test themselves while reading instead of always seeing the crutch. */
  masteredVocabIds: Set<string>;
}

/** Memoized: a surah can have thousands of these, so they should only re-render when their
 *  own word data or the shared display settings actually change. */
export const WordCell = memo(function WordCell({
  word,
  showTranslation,
  arabicSize,
  glossSize,
  masteredVocabIds,
}: WordCellProps) {
  const theme = useTheme();
  const scheme = useAppColorScheme();
  const [revealed, setRevealed] = useState(false);
  const isKnown = word.v !== undefined && masteredVocabIds.has(word.v);
  const isHidden = isKnown && !revealed;

  return (
    <Pressable
      style={styles.cell}
      disabled={!isKnown || !showTranslation}
      onPress={() => setRevealed((v) => !v)}
      hitSlop={4}>
      <Text
        style={[
          styles.arabic,
          ArabicTextStyle,
          { color: theme.text, fontSize: arabicSize, lineHeight: arabicSize * 1.9 },
        ]}>
        {word.ar.map((seg, i) => (
          <Text key={i} style={{ color: tajweedColor(seg.c, scheme, theme.text) }}>
            {/* Zero-width joiners glue this segment to its neighbors. Splitting a word into
             *  sibling <Text> runs per tajweed color is a documented Android/Fabric bug
             *  (facebook/react-native#54434): each run gets shaped in isolation, so letters at
             *  the boundary lose their contextual (initial/medial/final) glyph and the word
             *  visually falls apart, even though the same markup joins correctly on iOS. A ZWJ
             *  is zero-width and invisible everywhere, but tells the Arabic shaper "something
             *  joinable is on this side" even when the actual neighboring letter is outside this
             *  run's shaping context, which restores the correct joined glyph on Android too. */}
            {i > 0 && '\u200D'}
            {seg.t}
            {i < word.ar.length - 1 && '\u200D'}
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
