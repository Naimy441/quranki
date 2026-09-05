import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from 'react-native-paper';

import { ArabicText } from '@/components/arabic-text';
import { ThemedText } from '@/components/themed-text';
import { ArabicTextStyle, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { displayMorphologyArabic } from '@/lib/arabic-display';
import { hapticLight, hapticSelection, hapticSuccess, hapticWarning } from '@/lib/haptics';
import type { Level } from '@/lib/levels';
import { getRootEntry, posLabel } from '@/lib/quran-morphology';
import { getQuranLemma, getWordLemmaIds } from '@/lib/quran-lemmas';
import type { ReaderMorphSegment, ReaderWord, ReaderWordRef } from '@/lib/quran-reader-types';
import { playWordAudio, stopWordAudio } from '@/lib/word-audio';
import { formatCount } from '@/lib/stats';
import { pauseRecitation } from '@/store/recitation-store';

interface WordDetailSheetProps {
  /** The long-pressed word, or null when the sheet should be hidden. */
  selection: ReaderWordRef | null;
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

function titleCase(value: string): string {
  return value.replace(/(^|\s)([a-z])/g, (_, boundary: string, letter: string) => `${boundary}${letter.toUpperCase()}`);
}

function morphologyParts(segment: ReaderMorphSegment): string[] {
  const tags = segment.f;
  const first =
    tags.includes('FUT') ? 'future particle' :
    segment.k === 'prefix' && tags.includes('EMPH') ? 'emphatic lām' :
    segment.k === 'prefix' && tags.includes('IMPV') ? 'command lām' :
    tags.map((tag) => FEATURE_LABELS[tag] ?? (tag.startsWith('VF:') ? `form ${tag.slice(3)}` : '')).find(Boolean) ??
    (segment.p === 'V' ? 'verb' : segment.p === 'N' ? 'noun' : 'particle');
  const form = tags.find((tag) => tag.startsWith('VF:'));
  const parts = form && !first.startsWith('form ') ? [first, `form ${form.slice(3)}`] : [first];
  return parts.map(titleCase);
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

type WordAudioStatus = 'idle' | 'loading' | 'playing' | 'error';

/** Bottom sheet opened by long-pressing a word in the Quran reader. Shows corpus
 *  lemma/root analysis, a speaker control for that word, and lets the user mark
 *  canonical lemma ids as known — hiding translations everywhere those lemmas appear. */
export function WordDetailSheet({ selection, isKnown, masteredLevel, onDismiss, onMarkKnown, onForget }: WordDetailSheetProps) {
  const theme = useTheme();
  const word = selection?.word ?? null;
  const [audioStatus, setAudioStatus] = useState<WordAudioStatus>('idle');
  const wordKey = selection ? `${selection.surah}:${selection.ayah}:${selection.word.p}` : '';

  useEffect(() => {
    stopWordAudio();
    setAudioStatus('idle');
    return () => stopWordAudio();
  }, [wordKey]);

  const shown = { word, isKnown, masteredLevel };
  const arabic = shown.word?.ar.map((seg) => seg.t).join('') ?? '';
  const lemmaIds = getWordLemmaIds(shown.word);
  const lemmaEntries = lemmaIds.map((id) => getQuranLemma(id)).filter((lemma) => lemma !== undefined);
  const rootEntry = getRootEntry(shown.word?.rt);
  const pos = posLabel(shown.word?.ps);
  const rootArabic = shown.word?.rt ?? '';
  const canMarkKnown = lemmaIds.length > 0;
  const morphology = shown.word?.m ?? [];
  const hasMorphology = morphology.length > 0;

  const closeThen = (work?: () => void) => {
    stopWordAudio();
    onDismiss();
    if (work) setTimeout(work, 0);
  };

  const replayWord = () => {
    if (!selection) return;
    hapticLight();
    let settled = false;
    setAudioStatus('loading');
    pauseRecitation();
    void playWordAudio(selection.surah, selection.ayah, selection.word.p, {
      onFinished: () => {
        if (settled) return;
        settled = true;
        setAudioStatus('idle');
      },
      onFailed: () => {
        if (settled) return;
        settled = true;
        setAudioStatus('error');
      },
    }).then((started) => {
      if (settled) return;
      if (!started) {
        settled = true;
        setAudioStatus('error');
        return;
      }
      setAudioStatus('playing');
    });
  };

  const handlePress = () => {
    if (!shown.word || !canMarkKnown) return;
    const target = shown.word;
    if (shown.isKnown) {
      hapticWarning();
      const forget = () => closeThen(() => onForget(target));
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
    closeThen(() => onMarkKnown(target));
  };

  return (
    // "fade" (not "slide") to match the other reader sheets: RN's iOS "slide" transition
    // briefly paints the modal host opaque black before the transparent backdrop shows.
    <Modal visible={selection !== null} transparent animationType="fade" onRequestClose={() => closeThen()}>
      <Pressable style={styles.backdrop} onPress={() => closeThen()}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.card }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.headerRow}>
            <ThemedText type="smallBold">{pos ?? 'Word'}</ThemedText>
            <Pressable
              onPress={() => {
                hapticSelection();
                closeThen();
              }}
              hitSlop={10}
              accessibilityLabel="Close">
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
                        <View style={styles.morphTags}>
                          {morphologyParts(segment).map((part) => (
                            <ThemedText key={part} type="small" style={[styles.morphTag, { color }]}>
                              {part}
                            </ThemedText>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <Pressable
              onPress={replayWord}
              hitSlop={8}
              accessibilityLabel={audioStatus === 'playing' ? 'Playing this word' : 'Play this word'}
              style={({ pressed }) => [
                styles.voiceButton,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}>
              {audioStatus === 'loading' ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Ionicons
                  name={audioStatus === 'playing' ? 'volume-high' : 'volume-medium-outline'}
                  size={22}
                  color={audioStatus === 'error' ? theme.textMuted : theme.primary}
                />
              )}
            </Pressable>
            {audioStatus === 'error' ? (
              <ThemedText type="small" themeColor="textMuted" style={styles.description}>
                Couldn’t play this word. Check your connection and try again.
              </ThemedText>
            ) : null}

            {lemmaEntries.length > 0 || rootEntry ? (
              <View style={styles.stats}>
                {lemmaEntries.map((lemma) => (
                  <View key={lemma.id} style={[styles.statRow, { borderColor: theme.border }]}>
                    <ThemedText type="small" themeColor="textMuted">Lemma</ThemedText>
                    <ArabicText style={styles.statArabic}>{lemma.arabic}</ArabicText>
                    <ThemedText type="smallBold">{lemma.frequency === 1 ? 'once' : `${formatCount(lemma.frequency)} times`}</ThemedText>
                  </View>
                ))}
                {rootEntry ? (
                  <View style={[styles.statRow, { borderColor: theme.border }]}>
                    <ThemedText type="small" themeColor="textMuted">Root</ThemedText>
                    <RootLetters root={rootArabic} />
                    <ThemedText type="smallBold">{formatCount(rootEntry.count)} times</ThemedText>
                  </View>
                ) : null}
              </View>
            ) : null}

            {canMarkKnown ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
                {shown.masteredLevel
                  ? `You\u2019ve already mastered this word in Level ${shown.masteredLevel.number} (${shown.masteredLevel.title}). That\u2019s why its translation is hidden.`
                  : shown.isKnown
                    ? 'Marked as known. Its translation is hidden everywhere this word appears in the Qur\u2019an.'
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
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
    maxHeight: '70%',
    overflow: 'hidden',
    // Arabic in the sheet must not flip chrome (header, buttons) to RTL.
    direction: 'ltr',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  pressed: {
    opacity: 0.7,
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
  morphTags: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.three,
    rowGap: 2,
  },
  morphTag: {
    fontWeight: '500',
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
