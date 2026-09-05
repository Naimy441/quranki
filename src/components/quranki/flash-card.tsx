import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ArabicText } from '@/components/arabic-text';
import { GrammarCard } from '@/components/quranki/grammar-card';
import { VerseExamplePager } from '@/components/quranki/verse-example';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { displayArabic, shapeQpcArabic } from '@/lib/arabic-display';
import type { Word } from '@/lib/levels';
import { exampleSurface, getVocabExamples } from '@/lib/vocab-examples';

interface FlashCardProps {
  word: Word;
  revealed: boolean;
  onSpeak: () => void;
  isSpeaking: boolean;
}

export function FlashCard({ word, revealed, onSpeak, isSpeaking }: FlashCardProps) {
  const theme = useTheme();
  const examples = useMemo(() => getVocabExamples(word), [word.id]);
  if (word.kind === 'grammar') return <GrammarCard word={word} />;
  const spokenSurface = examples[0] ? shapeQpcArabic(exampleSurface(examples[0])) : '';
  const showSpoken = isSpeaking && spokenSurface.length > 0;

  return (
    <View style={styles.wrap}>
      <View style={[styles.prompt, revealed && styles.promptRevealed]}>
        <ArabicText style={[styles.arabicText, revealed && styles.arabicTextRevealed, showSpoken && { color: theme.primary }]}>
          {showSpoken ? spokenSurface : displayArabic(word)}
        </ArabicText>
        <Pressable
          onPress={onSpeak}
          hitSlop={12}
          accessibilityLabel="Play pronunciation"
          style={({ pressed }) => [
            styles.speakerButton,
            revealed && styles.speakerButtonBeside,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}>
          <Ionicons
            name={isSpeaking ? 'volume-high' : 'volume-medium-outline'}
            size={revealed ? 18 : 20}
            color={theme.primary}
          />
        </Pressable>
      </View>

      {revealed ? (
        <Animated.View entering={FadeInDown.duration(280)} style={styles.answer}>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <ThemedText type="subtitle" style={styles.englishText}>
            {word.english}
          </ThemedText>
          {word.contractionOf ? (
            <View style={styles.composition}>
              <ArabicText style={styles.compositionArabic}>{word.contractionOf}</ArabicText>
              {word.contractionEnglish ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.compositionEnglish}>
                  {word.contractionEnglish}
                </ThemedText>
              ) : null}
            </View>
          ) : null}
          {word.note ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
              {word.note}
            </ThemedText>
          ) : null}
          {examples.length > 0 ? <VerseExamplePager word={word} examples={examples} /> : null}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
  },
  prompt: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.four,
  },
  promptRevealed: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Spacing.two,
    gap: Spacing.three,
  },
  arabicText: {
    fontSize: 56,
    lineHeight: 100,
    textAlign: 'center',
  },
  arabicTextRevealed: {
    fontSize: 48,
    lineHeight: 84,
  },
  speakerButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakerButtonBeside: {
    width: 36,
    height: 36,
  },
  pressed: {
    opacity: 0.7,
  },
  answer: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  divider: {
    alignSelf: 'stretch',
    height: StyleSheet.hairlineWidth,
  },
  englishText: {
    fontSize: 22,
    lineHeight: 30,
    textAlign: 'center',
  },
  composition: {
    alignItems: 'center',
    gap: 2,
  },
  compositionArabic: {
    fontSize: 26,
    lineHeight: 44,
    textAlign: 'center',
  },
  compositionEnglish: {
    textAlign: 'center',
  },
  note: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
