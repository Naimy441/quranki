import { StyleSheet, View } from 'react-native';

import { WordCell } from '@/components/quran/word-cell';
import { Spacing } from '@/constants/theme';
import { BISMILLAH_WORDS } from '@/lib/quran-reader';

interface BismillahHeaderProps {
  showTranslation: boolean;
  arabicSize: number;
  glossSize: number;
  masteredVocabIds: Set<string>;
}

/** Decorative Bismillah header shown before ayah 1 for every surah except Al-Fatihah and At-Tawbah. */
export function BismillahHeader({ showTranslation, arabicSize, glossSize, masteredVocabIds }: BismillahHeaderProps) {
  return (
    <View style={styles.row}>
      {BISMILLAH_WORDS.map((word) => (
        <WordCell
          key={word.p}
          word={word}
          showTranslation={showTranslation}
          arabicSize={arabicSize}
          glossSize={glossSize}
          masteredVocabIds={masteredVocabIds}
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
