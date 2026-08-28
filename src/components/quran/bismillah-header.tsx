import { StyleSheet, View } from 'react-native';

import { WordCell } from '@/components/quran/word-cell';
import { Spacing } from '@/constants/theme';
import { BISMILLAH_WORDS } from '@/lib/quran-reader';
import type { ReaderWord } from '@/lib/quran-reader-types';

interface BismillahHeaderProps {
  showTranslation: boolean;
  arabicSize: number;
  glossSize: number;
  hiddenVocabIds: Set<string>;
  knownWordIds: Set<string>;
  onLongPressWord?: (word: ReaderWord) => void;
}

/** Decorative Bismillah header shown before ayah 1 for every surah except Al-Fatihah and At-Tawbah. */
export function BismillahHeader({
  showTranslation,
  arabicSize,
  glossSize,
  hiddenVocabIds,
  knownWordIds,
  onLongPressWord,
}: BismillahHeaderProps) {
  return (
    <View style={styles.row}>
      {BISMILLAH_WORDS.map((word) => (
        <WordCell
          key={word.p}
          word={word}
          showTranslation={showTranslation}
          arabicSize={arabicSize}
          glossSize={glossSize}
          hiddenVocabIds={hiddenVocabIds}
          knownWordIds={knownWordIds}
          onLongPressWord={onLongPressWord}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
});
