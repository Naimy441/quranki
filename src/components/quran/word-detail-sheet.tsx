import { Ionicons } from '@expo/vector-icons';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';

import { ArabicText } from '@/components/arabic-text';
import { ThemedText } from '@/components/themed-text';
import { ArabicTextStyle, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelection, hapticSuccess, hapticWarning } from '@/lib/haptics';
import type { Level } from '@/lib/levels';
import { getWordOccurrenceCount } from '@/lib/quran-coverage';
import { getLemmaEntry, getRootEntry, posLabel } from '@/lib/quran-morphology';
import type { ReaderMorphSegment, ReaderWord } from '@/lib/quran-reader-types';
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

const MORPH_COLORS = ['#3A7FC1', '#B95B9D', '#2C9A78', '#C7772F', '#7A67C7', '#B94E52', '#168F9C', '#8A7D38'];

function morphologyColor(index: number): string {
  return MORPH_COLORS[index % MORPH_COLORS.length];
}

const FEATURE_LABELS: Record<string, string> = {
  P: 'preposition',
  CONJ: 'conjunction',
  REM: 'connective',
  DET: 'definite article',
  FUT: 'future particle',
  EMPH: 'emphasis',
  IMPV: 'imperative',
  IMPF: 'imperfect verb',
  PERF: 'perfect verb',
  ACT_PCPL: 'active participle',
  PASS_PCPL: 'passive participle',
  PRON: 'pronoun',
  REL: 'relative pronoun',
  DEM: 'demonstrative',
  NEG: 'negation',
  COND: 'conditional particle',
  INTG: 'question particle',
  SUB: 'subordinating particle',
  CAUS: 'causal particle',
  VOC: 'vocative particle',
  NOM: 'nominative',
  ACC: 'accusative',
  GEN: 'genitive',
  ADJ: 'adjective',
  M: 'masculine',
  F: 'feminine',
  MS: 'masculine singular',
  FS: 'feminine singular',
  MP: 'masculine plural',
  FP: 'feminine plural',
  '1S': 'I',
  '1P': 'we / us',
  '2MS': 'you (masc. singular)',
  '2FS': 'you (fem. singular)',
  '2MP': 'you (masc. plural)',
  '2FP': 'you (fem. plural)',
  '3MS': 'he / it',
  '3FS': 'she / it',
  '3MP': 'they (masc.)',
  '3FP': 'they (fem.)',
  'MOOD:IND': 'indicative',
  'MOOD:SUBJ': 'subjunctive',
  'MOOD:JUS': 'jussive',
};

function morphologyLabel(segment: ReaderMorphSegment): string {
  const tags = segment.f;
  const first =
    tags.includes('FUT') ? 'future particle' :
    segment.k === 'prefix' && tags.includes('EMPH') ? 'emphatic lām' :
    segment.k === 'prefix' && tags.includes('IMPV') ? 'command lām' :
    tags.map((tag) => FEATURE_LABELS[tag] ?? (tag.startsWith('VF:') ? `form ${tag.slice(3)}` : '')).find(Boolean) ??
    (segment.p === 'V' ? 'verb' : segment.p === 'N' ? 'noun' : 'particle');
  const form = tags.find((tag) => tag.startsWith('VF:'));
  const label = form && !first.startsWith('form ') ? `${first} · form ${form.slice(3)}` : first;
  return label.replace(/(^|[\s·])([a-z])/g, (_, boundary: string, letter: string) => `${boundary}${letter.toUpperCase()}`);
}

function RootLetters({ root }: { root: string }) {
  return (
    <View style={styles.rootLetters} accessibilityLabel={`Root letters ${root}`}>
      {Array.from(root).map((letter, index) => (
        <ArabicText key={`${letter}-${index}`} style={styles.rootLetter}>
          {letter}
        </ArabicText>
      ))}
    </View>
  );
}

/** U+06DF is an Uthmanic orthography marker, not part of the word's morphology. */
function displayMorphologyArabic(text: string): string {
  return text.replace(/\u06DF/g, '');
}

/** Small centered sheet opened by long-pressing a word in the Qur'an reader. Shows corpus
 *  lemma/root analysis when morphology is attached, and lets the user mark a resolvable vocab
 *  id as known — hiding its translation everywhere that same word appears. */
export function WordDetailSheet({ word, isKnown, masteredLevel, onDismiss, onMarkKnown, onForget }: WordDetailSheetProps) {
  const theme = useTheme();
  const shown = { word, isKnown, masteredLevel };
  const arabic = shown.word?.ar.map((seg) => seg.t).join('') ?? '';
  const lemmaEntry = getLemmaEntry(shown.word?.lm);
  const rootEntry = getRootEntry(shown.word?.rt ?? lemmaEntry?.root);
  const pos = posLabel(shown.word?.ps ?? lemmaEntry?.pos);
  const lemmaCount = lemmaEntry?.count ?? 0;
  const rootArabic = shown.word?.rt ?? lemmaEntry?.root ?? '';
  const vOccurrences = shown.word?.v ? getWordOccurrenceCount(shown.word.v) : 0;
  const canMarkKnown = shown.word?.v !== undefined;
  const morphology = shown.word?.m ?? [];
  const hasMorphology = morphology.length > 0;

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
            <ThemedText type="smallBold">{pos ?? 'Word'}</ThemedText>
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
            {!hasMorphology ? <ArabicText style={styles.arabic}>{arabic}</ArabicText> : null}

            {hasMorphology ? (
              <View style={styles.morphology}>
                <Text style={[styles.morphWord, ArabicTextStyle, { color: theme.text }]}>
                  {morphology.map((segment, index) => {
                    const color = morphologyColor(index);
                    return (
                      <Text key={`${segment.t}-${index}`} style={{ color }}>
                        {displayMorphologyArabic(segment.t)}
                      </Text>
                    );
                  })}
                </Text>
                <View style={styles.morphologyKey}>
                  {morphology.map((segment, index) => {
                    const color = morphologyColor(index);
                    return (
                      <View key={`${segment.t}-${index}`} style={styles.morphologyKeyRow}>
                        <View style={[styles.morphologyDot, { backgroundColor: color }]} />
                        <ThemedText type="small" style={[styles.morphKeyLabel, { color }]}>
                          {morphologyLabel(segment)}
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {lemmaEntry || rootEntry ? (
              <View style={styles.stats}>
                {lemmaEntry ? (
                  <View style={[styles.statRow, { borderColor: theme.border }]}>
                    <ThemedText type="small" themeColor="textMuted">Lemma</ThemedText>
                    <ArabicText style={styles.statArabic}>{lemmaEntry.arabic}</ArabicText>
                    <ThemedText type="smallBold">{lemmaCount === 1 ? 'once' : `${formatCount(lemmaCount)} times`}</ThemedText>
                  </View>
                ) : null}
                {rootEntry ? (
                  <View style={[styles.statRow, { borderColor: theme.border }]}>
                    <ThemedText type="small" themeColor="textMuted">Root</ThemedText>
                    <RootLetters root={rootArabic} />
                    <ThemedText type="smallBold">{formatCount(rootEntry.count)} times</ThemedText>
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
  morphology: {
    gap: Spacing.two,
  },
  morphWord: {
    fontSize: 34,
    lineHeight: 50,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  morphologyKey: {
    gap: Spacing.one,
  },
  morphologyKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  morphologyDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
  },
  morphKeyLabel: {
    flex: 1,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statRow: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statArabic: {
    fontSize: 22,
    lineHeight: 36,
  },
  rootLetters: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: Spacing.one,
  },
  rootLetter: {
    fontSize: 22,
    lineHeight: 34,
  },
  occurrences: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 18,
  },
});
