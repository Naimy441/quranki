import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';

import { ThemedText } from '@/components/themed-text';
import { ArabicTextStyle, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Level } from '@/lib/levels';
import { getWordOccurrenceCount } from '@/lib/quran-coverage';
import type { ReaderWord } from '@/lib/quran-reader-types';
import { formatCount } from '@/lib/stats';

interface WordDetailSheetProps {
  /** The long-pressed word, or null when the sheet should be hidden. Always has `word.v` set -
   *  WordCell only invokes its long-press callback for words with a resolvable vocabulary id. */
  word: ReaderWord | null;
  isKnown: boolean;
  /** Set when this word's translation is hidden because the user genuinely mastered it through
   *  flashcard review (rather than manually marking it "known" here) - the level it belongs to,
   *  so the sheet can explain *why* it's hidden instead of offering the redundant "I already know
   *  this word" action for something the curriculum already tracked. Takes priority over
   *  `isKnown` when set. */
  masteredLevel?: Level;
  onDismiss: () => void;
  onMarkKnown: (word: ReaderWord) => void;
  onForget: (word: ReaderWord) => void;
}

/** Small centered sheet opened by long-pressing a word in the Qur'an reader, letting the user
 *  mark a word they already recognize as "known" - hiding its translation everywhere that same
 *  word (or, for words outside the 547-word curriculum, everywhere that dictionary lemma)
 *  appears across the whole Qur'an - or forget a word they'd previously marked. For a word
 *  that's hidden purely because it was genuinely mastered via flashcard review, it's read-only:
 *  just a note about which level taught it, no action to take here. */
export function WordDetailSheet({ word, isKnown, masteredLevel, onDismiss, onMarkKnown, onForget }: WordDetailSheetProps) {
  const theme = useTheme();
  const arabic = word?.ar.map((seg) => seg.t).join('') ?? '';
  const occurrences = word?.v ? getWordOccurrenceCount(word.v) : 0;

  const handlePress = () => {
    if (!word) return;
    if (isKnown) onForget(word);
    else onMarkKnown(word);
    onDismiss();
  };

  return (
    <Modal visible={word !== null} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.card }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.headerRow}>
            <ThemedText type="smallBold">Word</ThemedText>
            <Pressable onPress={onDismiss} hitSlop={10}>
              <Ionicons name="close" size={20} color={theme.textMuted} />
            </Pressable>
          </View>

          <ThemedText style={[styles.arabic, ArabicTextStyle]}>{arabic}</ThemedText>

          <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
            {masteredLevel
              ? `You\u2019ve already mastered this word in Level ${masteredLevel.number} (${masteredLevel.title}) - that\u2019s why its translation is hidden.`
              : isKnown
                ? 'Marked as known - its translation is hidden everywhere this word appears in the Qur\u2019an.'
                : occurrences > 1
                  ? `Appears ${formatCount(occurrences)} times across the Qur\u2019an. Marking it known hides its translation everywhere it appears.`
                  : 'Marking it known hides its translation wherever this word appears.'}
          </ThemedText>

          {!masteredLevel && (
            <Button mode={isKnown ? 'outlined' : 'contained'} onPress={handlePress}>
              {isKnown ? 'Forget this word' : 'I already know this word'}
            </Button>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arabic: {
    fontSize: 32,
    lineHeight: 48,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 18,
  },
});
