/* eslint-disable react-hooks/immutability -- Reanimated SharedValue.value is written on the UI thread. */
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ArabicText } from '@/components/arabic-text';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAppColorScheme, useTheme } from '@/hooks/use-theme';
import { highlightAffix, shapeQpcArabic } from '@/lib/arabic-display';
import { hapticLight, hapticSelection } from '@/lib/haptics';
import { getWord, type Word } from '@/lib/levels';
import { glossColor } from '@/lib/quran-colors';
import { getSurahMeta } from '@/lib/quran-reader';
import type { ReaderWord } from '@/lib/quran-reader-types';
import { stopWordPronunciation } from '@/lib/word-pronunciation';
import type { VocabExample } from '@/lib/vocab-examples';
import { playAyah, stopRecitation, useRecitationStore } from '@/store/recitation-store';

interface VerseExampleProps {
  word: Word;
  example: VocabExample;
}

function isExampleHit(example: VocabExample, position: number): boolean {
  if (example.hits) return example.hits.includes(position);
  const span = example.n ?? 1;
  return position >= example.p && position < example.p + span;
}

function ExampleWord({
  surface,
  gloss,
  isHit,
  target,
  speaking,
}: {
  surface: string;
  gloss: ReaderWord['en'];
  isHit: boolean;
  target: Word;
  speaking?: boolean;
}) {
  const theme = useTheme();
  const scheme = useAppColorScheme();
  const shaped = shapeQpcArabic(surface);
  const parts = isHit ? highlightAffix(shaped, target) : null;
  const fallback = isHit ? theme.primary : theme.textSecondary;

  return (
    <View style={styles.cell}>
      {parts ? (
        <Text style={styles.arabic}>
          {parts.before ? <ArabicText style={{ color: theme.text }}>{parts.before}</ArabicText> : null}
          <ArabicText style={{ color: theme.primary }}>{parts.hit}</ArabicText>
          {parts.after ? <ArabicText style={{ color: theme.text }}>{parts.after}</ArabicText> : null}
        </Text>
      ) : (
        <ArabicText style={[styles.arabic, { color: theme.text }]}>{shaped}</ArabicText>
      )}
      <View style={[styles.wordDivider, { backgroundColor: speaking || isHit ? theme.primary : theme.border }]} />
      {gloss.length > 0 ? (
        <Text style={styles.gloss} numberOfLines={3}>
          {gloss.map((segment, index) => (
            <Text key={index} style={{ color: glossColor(segment.c, scheme, fallback) }}>
              {segment.t}
            </Text>
          ))}
        </Text>
      ) : null}
    </View>
  );
}

export function VerseExample({ word, example }: VerseExampleProps) {
  const theme = useTheme();
  const target = word.exampleOf ? (getWord(word.exampleOf) ?? word) : word;
  const surah = getSurahMeta(example.s);
  const ref = surah ? `${surah.en} ${example.s}:${example.a}` : `${example.s}:${example.a}`;
  const [downloading, setDownloading] = useState(false);
  const playback = useRecitationStore((s) => {
    const active = s.mode === 'ayah' && s.surahNumber === example.s && s.ayahNumber === example.a;
    if (!active) return 'idle' as const;
    return s.awaitingAudio && !s.playing ? 'loading' as const : s.playing ? 'playing' as const : 'paused' as const;
  });
  const speakingWord = useRecitationStore((s) => (
    s.mode === 'ayah' && s.surahNumber === example.s && s.ayahNumber === example.a ? s.wordNumber : 0
  ));
  const showSpinner = downloading || playback === 'loading';

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
    stopWordPronunciation();
    const state = useRecitationStore.getState();
    const alreadyThisAyah =
      state.visible &&
      state.mode === 'ayah' &&
      state.surahNumber === example.s &&
      state.ayahNumber === example.a &&
      !state.error;
    if (alreadyThisAyah) {
      void playAyah(example.s, example.a);
      return;
    }
    setDownloading(true);
    void playAyah(example.s, example.a).finally(() => setDownloading(false));
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
          accessibilityLabel={
            showSpinner
              ? 'Downloading ayah recitation'
              : playback === 'playing'
                ? 'Pause ayah recitation'
                : 'Play example ayah recitation'
          }
          style={({ pressed }) => [
            styles.speaker,
            { backgroundColor: playback === 'playing' || showSpinner ? theme.backgroundSelected : theme.backgroundElement },
            pressed && styles.pressed,
          ]}>
          {showSpinner ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Ionicons
              name={playback === 'playing' ? 'volume-high' : 'volume-medium-outline'}
              size={15}
              color={theme.primary}
            />
          )}
        </Pressable>
      </View>
      <View style={styles.row}>
        {example.words
          ? example.words.map((item) => (
              <ExampleWord
                key={item.p}
                surface={item.ar.map((seg) => seg.t).join('')}
                gloss={item.en}
                isHit={isExampleHit(example, item.p)}
                target={target}
                speaking={speakingWord === item.p}
              />
            ))
          : example.w.map((raw, i) => (
              <ExampleWord
                key={i + 1}
                surface={raw}
                gloss={[]}
                isHit={isExampleHit(example, i + 1)}
                target={target}
                speaking={speakingWord === i + 1}
              />
            ))}
      </View>
      {example.tr ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.translation}>
          {example.tr}
        </ThemedText>
      ) : null}
    </View>
  );
}

const SLIDE_MS = 280;
const COMMIT_DISTANCE_FRACTION = 0.22;
const COMMIT_VELOCITY = 650;

function rubber(value: number, min: number, max: number): number {
  'worklet';
  if (value > max) return max + (value - max) * 0.32;
  if (value < min) return min + (value - min) * 0.32;
  return value;
}

export function VerseExamplePager({ word, examples }: { word: Word; examples: VocabExample[] }) {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const [pageWidth, setPageWidth] = useState(0);
  const count = examples.length;
  const safeIndex = Math.min(index, Math.max(count - 1, 0));
  const offset = useSharedValue(0);
  const startOffset = useSharedValue(0);
  const widthSV = useSharedValue(0);
  const indexSV = useSharedValue(0);

  const settleTo = useCallback(
    (next: number, haptic: boolean) => {
      const clamped = Math.max(0, Math.min(count - 1, next));
      const width = widthSV.value;
      if (haptic && clamped !== indexSV.value) hapticSelection();
      indexSV.value = clamped;
      setIndex(clamped);
      offset.value = withTiming(-clamped * width, {
        duration: SLIDE_MS,
        easing: Easing.out(Easing.cubic),
      });
    },
    [count, indexSV, offset, widthSV],
  );

  useEffect(() => {
    indexSV.value = 0;
    offset.value = 0;
    setIndex(0);
  }, [word.id, indexSV, offset]);

  useEffect(() => {
    stopRecitation();
  }, [safeIndex, word.id]);

  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .enabled(count > 1 && pageWidth > 0)
        .activeOffsetX([-16, 16])
        .failOffsetY([-14, 14])
        .onStart(() => {
          startOffset.value = offset.value;
        })
        .onUpdate((event) => {
          const width = widthSV.value;
          if (width <= 0) return;
          offset.value = rubber(startOffset.value + event.translationX, -(count - 1) * width, 0);
        })
        .onEnd((event) => {
          const width = widthSV.value;
          if (width <= 0) return;
          const current = indexSV.value;
          const goingNext =
            current < count - 1 &&
            (event.translationX <= -width * COMMIT_DISTANCE_FRACTION || event.velocityX <= -COMMIT_VELOCITY);
          const goingPrev =
            current > 0 &&
            (event.translationX >= width * COMMIT_DISTANCE_FRACTION || event.velocityX >= COMMIT_VELOCITY);
          const next = goingNext ? current + 1 : goingPrev ? current - 1 : current;
          indexSV.value = next;
          offset.value = withTiming(-next * width, {
            duration: SLIDE_MS,
            easing: Easing.out(Easing.cubic),
          });
          if (next !== current) runOnJS(hapticSelection)();
          runOnJS(setIndex)(next);
        }),
    [count, indexSV, offset, pageWidth, startOffset, widthSV],
  );

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  if (count === 0) return null;

  return (
    <View style={styles.pager}>
      <View
        style={styles.pagerClip}
        onLayout={(event) => {
          const width = event.nativeEvent.layout.width;
          if (width <= 0 || width === pageWidth) return;
          setPageWidth(width);
          widthSV.value = width;
          offset.value = -indexSV.value * width;
        }}>
        {count === 1 || pageWidth === 0 ? (
          <VerseExample word={word} example={examples[safeIndex]} />
        ) : (
          <GestureDetector gesture={swipe}>
            <Animated.View style={[styles.strip, { width: pageWidth * count }, stripStyle]}>
              {examples.map((item) => (
                <View key={`${item.s}:${item.a}:${item.p}`} style={[styles.page, { width: pageWidth }]}>
                  <VerseExample word={word} example={item} />
                </View>
              ))}
            </Animated.View>
          </GestureDetector>
        )}
      </View>
      {count > 1 ? (
        <View style={styles.dots} accessibilityRole="adjustable" accessibilityLabel="Example ayah">
          {examples.map((item, i) => (
            <Pressable
              key={`${item.s}:${item.a}:${item.p}`}
              onPress={() => settleTo(i, true)}
              hitSlop={8}
              accessibilityLabel={`Example ${i + 1} of ${count}`}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: i === safeIndex ? theme.primary : theme.border },
                  i === safeIndex && styles.dotActive,
                ]}
              />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: Spacing.three,
  },
  pager: {
    width: '100%',
    gap: Spacing.three,
  },
  pagerClip: {
    width: '100%',
    overflow: 'hidden',
  },
  strip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  page: {
    paddingHorizontal: 0,
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
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  cell: {
    alignItems: 'center',
    minWidth: 52,
    maxWidth: 128,
    paddingHorizontal: 2,
  },
  arabic: {
    fontSize: 30,
    lineHeight: 52,
    textAlign: 'center',
  },
  wordDivider: {
    height: 1,
    width: '80%',
    marginVertical: Spacing.one,
  },
  gloss: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  translation: {
    textAlign: 'center',
    lineHeight: 20,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: Radius.pill,
  },
  dotActive: {
    width: 8,
    height: 8,
  },
});
