import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';

import { ArabicText } from '@/components/arabic-text';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelection, hapticSuccess, hapticWarning } from '@/lib/haptics';
import type { Level } from '@/lib/levels';
import { getWordOccurrenceCount } from '@/lib/quran-coverage';
import { getLemmaEntry, getRootEntry, posLabel } from '@/lib/quran-morphology';
import type { ReaderWord } from '@/lib/quran-reader-types';
import { formatCount } from '@/lib/stats';

interface WordDetailSheetProps {
  /** The long-pressed word, or null when the sheet should be hidden. */
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

const POS_DOT: Record<string, string> = {
  N: '#E6B325',
  V: '#5AA6E0',
  P: '#94A39B',
};

/** Small centered sheet opened by long-pressing a word in the Qur'an reader. Shows corpus
 *  lemma/root analysis when morphology is attached, and lets the user mark a resolvable vocab
 *  id as known — hiding its translation everywhere that same word appears. */
export function WordDetailSheet({ word, isKnown, masteredLevel, onDismiss, onMarkKnown, onForget }: WordDetailSheetProps) {
  const theme = useTheme();
  const shownRef = useRef({ word, isKnown, masteredLevel });
  if (word) shownRef.current = { word, isKnown, masteredLevel };
  const shown = shownRef.current;
  const arabic = shown.word?.ar.map((seg) => seg.t).join('') ?? '';
  const lemmaEntry = getLemmaEntry(shown.word?.lm);
  const rootEntry = getRootEntry(shown.word?.rt ?? lemmaEntry?.root);
  const pos = posLabel(shown.word?.ps ?? lemmaEntry?.pos);
  const lemmaCount = lemmaEntry?.count ?? 0;
  const rootArabic = shown.word?.rt ?? lemmaEntry?.root ?? '';
  const vOccurrences = shown.word?.v ? getWordOccurrenceCount(shown.word.v) : 0;
  const canMarkKnown = shown.word?.v !== undefined;

  const handlePress = () => {
    if (!shown.word || !canMarkKnown) return;
    if (shown.isKnown) {
      hapticWarning();
      const target = shown.word;
      const forget = () => {
        onForget(target);
        onDismiss();
      };
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.confirm('Forget this word?\nIts translation will show again in the Qur’an reader.')) {
          forget();
        }
        return;
      }
      Alert.alert(
        'Forget this word?',
        'Its translation will show again in the Qur’an reader.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Forget', style: 'destructive', onPress: forget },
        ],
      );
      return;
    }
    hapticSuccess();
    onMarkKnown(shown.word);
    onDismiss();
  };

  return (
    <Modal visible={word !== null} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.card }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.headerRow}>
            <ThemedText type="smallBold">Word</ThemedText>
            <Pressable
              onPress={() => {
                hapticSelection();
                onDismiss();
              }}
              hitSlop={10}>
              <Ionicons name="close" size={20} color={theme.textMuted} />
            </Pressable>
          </View>

          <ScrollView bounces={false} style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <ArabicText style={styles.arabic}>{arabic}</ArabicText>

            {pos ? (
              <View style={styles.posRow}>
                <View
                  style={[
                    styles.posDot,
                    { backgroundColor: POS_DOT[shown.word?.ps ?? lemmaEntry?.pos ?? ''] ?? theme.textMuted },
                  ]}
                />
                <ThemedText type="smallBold" themeColor="textSecondary">
                  {pos}
                </ThemedText>
              </View>
            ) : null}

            {lemmaEntry ? (
              <View style={styles.stats}>
                <View style={[styles.statRow, { borderColor: theme.border }]}>
                  <ThemedText type="small" themeColor="textMuted">
                    Lemma
                  </ThemedText>
                  <ArabicText style={styles.statArabic}>{lemmaEntry.arabic}</ArabicText>
                  <ThemedText type="smallBold">
                    {lemmaCount === 1 ? 'once' : `${formatCount(lemmaCount)} times`}
                  </ThemedText>
                </View>
                {rootEntry ? (
                  <View style={[styles.statRow, { borderColor: theme.border }]}>
                    <ThemedText type="small" themeColor="textMuted">
                      Root
                    </ThemedText>
                    <ArabicText style={styles.statArabic}>{rootArabic}</ArabicText>
                    <ThemedText type="smallBold">
                      {formatCount(rootEntry.count)} times · {formatCount(rootEntry.lemmas.length)}{' '}
                      {rootEntry.lemmas.length === 1 ? 'form' : 'forms'}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            ) : vOccurrences > 0 ? (
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.occurrences}>
                {vOccurrences === 1
                  ? 'Appears once in the Qur\u2019an'
                  : `Appears ${formatCount(vOccurrences)} times in the Qur\u2019an`}
              </ThemedText>
            ) : null}

            {rootEntry && rootEntry.lemmas.length > 1 ? (
              <View style={styles.formList}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Derived forms
                </ThemedText>
                {rootEntry.lemmas.map((form) => {
                  const active = form.lemma === shown.word?.lm;
                  return (
                    <View
                      key={form.lemma}
                      style={[
                        styles.formRow,
                        { borderColor: theme.border },
                        active && { backgroundColor: theme.backgroundSelected },
                      ]}>
                      <ArabicText style={styles.formArabic}>{form.arabic}</ArabicText>
                      <ThemedText type="small" themeColor={active ? 'text' : 'textSecondary'}>
                        {formatCount(form.count)} {form.count === 1 ? 'time' : 'times'}
                      </ThemedText>
                    </View>
                  );
                })}
              </View>
            ) : null}

            {canMarkKnown ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
                {shown.masteredLevel
                  ? `You\u2019ve already mastered this word in Level ${shown.masteredLevel.number} (${shown.masteredLevel.title}) - that\u2019s why its translation is hidden.`
                  : shown.isKnown
                    ? 'Marked as known - its translation is hidden everywhere this word appears in the Qur\u2019an.'
                    : 'Marking it known hides its translation everywhere it appears.'}
              </ThemedText>
            ) : null}
          </ScrollView>

          {canMarkKnown && !shown.masteredLevel ? (
            <Button mode={shown.isKnown ? 'outlined' : 'contained'} onPress={handlePress}>
              {shown.isKnown ? 'Forget this word' : 'I already know this word'}
            </Button>
          ) : null}
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
    maxHeight: '80%',
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.three,
    // Arabic in the sheet must not flip chrome (header, buttons) to RTL.
    direction: 'ltr',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: Spacing.three,
  },
  arabic: {
    fontSize: 32,
    lineHeight: 48,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  posRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  posDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stats: {
    gap: Spacing.two,
  },
  statRow: {
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statArabic: {
    fontSize: 22,
    lineHeight: 36,
  },
  formList: {
    gap: Spacing.one,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.small,
    borderWidth: StyleSheet.hairlineWidth,
  },
  formArabic: {
    fontSize: 20,
    lineHeight: 32,
  },
  occurrences: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 18,
  },
});
