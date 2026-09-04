import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ArabicText } from '@/components/arabic-text';
import { GrammarCard } from '@/components/quranki/grammar-card';
import { VerseExample } from '@/components/quranki/verse-example';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { displayArabic, shapeQpcArabic } from '@/lib/arabic-display';
import type { Word } from '@/lib/levels';
import { getVocabExample } from '@/lib/vocab-examples';

interface FlashCardProps {
  word: Word;
  revealed: boolean;
  onSpeak: () => void;
  isSpeaking: boolean;
}

export function FlashCard({ word, revealed, onSpeak, isSpeaking }: FlashCardProps) {
  const theme = useTheme();
  const example = getVocabExample(word);
  if (word.kind === 'grammar') return <GrammarCard word={word} />;
  const spokenSurface = example ? shapeQpcArabic(example.w[example.p - 1] ?? '') : '';
  const showSpoken = isSpeaking && spokenSurface.length > 0;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.arabicSection, revealed && example ? styles.arabicSectionCompact : null]}>
        <ArabicText style={[styles.arabicText, showSpoken && { color: theme.primary }]}>
          {showSpoken ? spokenSurface : displayArabic(word)}
        </ArabicText>
        <Pressable
          onPress={onSpeak}
          hitSlop={12}
          style={({ pressed }) => [
            styles.speakerButton,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}>
          <Ionicons
            name={isSpeaking ? 'volume-high' : 'volume-medium-outline'}
            size={20}
            color={theme.primary}
          />
        </Pressable>
      </View>

      {revealed && (
        <Animated.View
          entering={FadeInDown.duration(280)}
          style={[styles.answerSection, { borderTopColor: theme.border }]}>
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
          {example ? <VerseExample word={word} example={example} /> : null}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large,
    borderWidth: 1,
    overflow: 'hidden',
  },
  arabicSection: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
    gap: Spacing.four,
  },
  arabicSectionCompact: {
    minHeight: 140,
    paddingVertical: Spacing.four,
  },
  arabicText: {
    fontSize: 52,
    lineHeight: 96,
    textAlign: 'center',
  },
  speakerButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  answerSection: {
    borderTopWidth: 1,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
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
