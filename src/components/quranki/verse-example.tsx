import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ArabicText } from '@/components/arabic-text';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { highlightAffix, shapeQpcArabic } from '@/lib/arabic-display';
import { hapticLight } from '@/lib/haptics';
import { getWord, type Word } from '@/lib/levels';
import { getSurahMeta } from '@/lib/quran-reader';
import type { VocabExample } from '@/lib/vocab-examples';
import { playAyah, stopRecitation, useRecitationStore } from '@/store/recitation-store';

interface VerseExampleProps {
  word: Word;
  example: VocabExample;
}

export function VerseExample({ word, example }: VerseExampleProps) {
  const theme = useTheme();
  const target = word.exampleOf ? (getWord(word.exampleOf) ?? word) : word;
  const surah = getSurahMeta(example.s);
  const ref = surah ? `${surah.en} ${example.s}:${example.a}` : `${example.s}:${example.a}`;
  const playback = useRecitationStore((s) => {
    const active = s.visible && s.mode === 'ayah' && s.surahNumber === example.s && s.ayahNumber === example.a;
    if (!active) return 'idle' as const;
    if (s.awaitingAudio && !s.playing) return 'loading' as const;
    if (s.playing) return 'playing' as const;
    return 'paused' as const;
  });

  useEffect(
    () => () => {
      const state = useRecitationStore.getState();
      if (state.mode === 'ayah' && state.surahNumber === example.s && state.ayahNumber === example.a) {
        stopRecitation();
      }
    },
    [example.s, example.a],
  );

  const handlePlay = () => {
    hapticLight();
    void Speech.stop();
    void playAyah(example.s, example.a);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
          {ref}
        </ThemedText>
        <Pressable
          onPress={handlePlay}
          hitSlop={10}
          accessibilityLabel={playback === 'playing' ? 'Pause ayah recitation' : 'Play example ayah recitation'}
          style={({ pressed }) => [
            styles.speaker,
            { backgroundColor: playback === 'playing' ? theme.backgroundSelected : theme.backgroundElement },
            pressed && styles.pressed,
          ]}>
          {playback === 'loading' ? (
            <ActivityIndicator size="small" color={theme.primary} style={styles.spinner} />
          ) : (
            <Ionicons
              name={playback === 'playing' ? 'volume-high' : 'volume-medium-outline'}
              size={15}
              color={playback !== 'idle' ? theme.primary : theme.textMuted}
            />
          )}
        </Pressable>
      </View>
      <View style={styles.row}>
        {example.w.map((raw, i) => {
          const surface = shapeQpcArabic(raw);
          const position = i + 1;
          const hitSet = example.hits ? new Set(example.hits) : null;
          const span = example.n ?? 1;
          const isHit = hitSet ? hitSet.has(position) : position >= example.p && position < example.p + span;
          if (!isHit) {
            return (
              <ArabicText key={position} style={[styles.word, { color: theme.text }]}>
                {surface}
              </ArabicText>
            );
          }
          const parts = highlightAffix(surface, target);
          return (
            <Text key={position} style={styles.word}>
              {parts.before ? (
                <ArabicText style={{ color: theme.text }}>{parts.before}</ArabicText>
              ) : null}
              <ArabicText style={{ color: theme.primary }}>{parts.hit}</ArabicText>
              {parts.after ? (
                <ArabicText style={{ color: theme.text }}>{parts.after}</ArabicText>
              ) : null}
            </Text>
          );
        })}
      </View>
      {example.tr ? (
        <ThemedText type="small" themeColor="textMuted" style={styles.translation} numberOfLines={3}>
          {example.tr}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: Spacing.two,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  label: {
    textAlign: 'center',
  },
  speaker: {
    width: 26,
    height: 26,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    transform: [{ scale: 0.7 }],
  },
  pressed: {
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  word: {
    fontSize: 22,
    lineHeight: 40,
  },
  translation: {
    textAlign: 'center',
  },
});
