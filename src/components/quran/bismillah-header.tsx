import { StyleSheet, View } from 'react-native';

import { WordCell } from '@/components/quran/word-cell';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { BISMILLAH_WORDS } from '@/lib/quran-reader';
import type { ReaderWordRef } from '@/lib/quran-reader-types';
import type { LemmaId } from '@/lib/quran-lemmas';
import { useRecitationStore } from '@/store/recitation-store';

interface BismillahHeaderProps {
  surahNumber: number;
  showTranslation: boolean;
  showTransliteration: boolean;
  arabicSize: number;
  glossSize: number;
  transliterationSize: number;
  hiddenLemmaIds: Set<LemmaId>;
  knownLemmaIds: Set<LemmaId>;
  onLongPressWord?: (ref: ReaderWordRef) => void;
}

/** Decorative Bismillah header shown before ayah 1 for every surah except Al-Fatihah and At-Tawbah. */
export function BismillahHeader({
  surahNumber,
  showTranslation,
  showTransliteration,
  arabicSize,
  glossSize,
  transliterationSize,
  hiddenLemmaIds,
  knownLemmaIds,
  onLongPressWord,
}: BismillahHeaderProps) {
  const theme = useTheme();
  const reciting = useRecitationStore(
    (s) => s.visible && s.surahNumber === surahNumber && s.playingBismillah,
  );

  return (
    <View
      style={[
        styles.row,
        reciting && { backgroundColor: theme.backgroundSelected, borderRadius: Radius.medium },
      ]}>
      {BISMILLAH_WORDS.map((word) => (
        <WordCell
          key={word.p}
          word={word}
          showTranslation={showTranslation}
          showTransliteration={showTransliteration}
          arabicSize={arabicSize}
          glossSize={glossSize}
          transliterationSize={transliterationSize}
          hiddenLemmaIds={hiddenLemmaIds}
          knownLemmaIds={knownLemmaIds}
          onLongPressWord={
            onLongPressWord ? (pressed) => onLongPressWord({ surah: 1, ayah: 1, word: pressed }) : undefined
          }
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
