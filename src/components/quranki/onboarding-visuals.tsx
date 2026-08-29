import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { GradeButtonRow } from '@/components/quranki/grade-button-row';
import { ThemedText } from '@/components/themed-text';
import { ArabicTextStyle, Radius, Spacing } from '@/constants/theme';
import { useAppColorScheme, useTheme } from '@/hooks/use-theme';
import { createNewCard, previewGrades } from '@/lib/fsrs';
import { hapticSelection } from '@/lib/haptics';
import { getCoverageThroughLevel, LAST_LEVEL_NUMBER, LEVELS, THEMATIC_LEVEL_COUNT, THEMATIC_WORD_COUNT, WORD_COUNT } from '@/lib/levels';
import { glossColor, tajweedColor } from '@/lib/quran-colors';
import { BISMILLAH_WORDS } from '@/lib/quran-reader';
import type { ReaderWord } from '@/lib/quran-reader-types';
import { formatCount } from '@/lib/stats';

const DEMO_WORD = LEVELS[0].words[0];
const HIDDEN_DEMO_IDS = new Set(BISMILLAH_WORDS.filter((word) => word.v).map((word) => word.v as string));

export function OnboardingFlashPreview({
  onSpeak,
  isSpeaking,
}: {
  onSpeak: () => void;
  isSpeaking: boolean;
}) {
  const theme = useTheme();
  const previews = useMemo(() => previewGrades(createNewCard(), new Date()), []);

  return (
    <View style={styles.visualBlock} pointerEvents="box-none">
      <View style={[styles.flashCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ThemedText style={[styles.flashArabic, ArabicTextStyle]}>{DEMO_WORD.arabic}</ThemedText>
        <Pressable
          onPress={onSpeak}
          hitSlop={12}
          accessibilityLabel="Play pronunciation"
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
      <View pointerEvents="none">
        <GradeButtonRow previews={previews} onGrade={() => {}} />
      </View>
    </View>
  );
}

export function OnboardingAyahPreview({
  mode,
}: {
  mode: 'shown' | 'hidden' | 'tap';
}) {
  const theme = useTheme();
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  const hiddenIds = mode === 'shown' ? new Set<string>() : mode === 'hidden' ? HIDDEN_DEMO_IDS : allVocabIds(BISMILLAH_WORDS);
  const inviteId = mode === 'tap' ? BISMILLAH_WORDS[0]?.v : undefined;

  return (
    <View style={[styles.ayahCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.ayahRow}>
        {BISMILLAH_WORDS.map((word) => {
          const id = word.v ?? String(word.p);
          const isHidden = Boolean(word.v && hiddenIds.has(word.v) && !revealed.has(id));
          const invited = mode === 'tap' && word.v === inviteId && isHidden;
          return (
            <PreviewWord
              key={word.p}
              word={word}
              hidden={isHidden}
              invited={invited}
              tappable={mode === 'tap' && Boolean(word.v)}
              onReveal={() => {
                if (!word.v) return;
                hapticSelection();
                setRevealed((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                });
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

function allVocabIds(words: ReaderWord[]): Set<string> {
  const ids = new Set<string>();
  for (const word of words) {
    if (word.v) ids.add(word.v);
  }
  return ids;
}

function PreviewWord({
  word,
  hidden,
  invited,
  tappable,
  onReveal,
}: {
  word: ReaderWord;
  hidden: boolean;
  invited: boolean;
  tappable: boolean;
  onReveal: () => void;
}) {
  const theme = useTheme();
  const scheme = useAppColorScheme();
  const glossClass = word.en.find((seg) => seg.c && seg.c !== 'paren' && seg.c !== 'punc')?.c;
  const english = word.en.map((seg) => seg.t).join('');

  return (
    <Pressable
      disabled={!tappable}
      onPress={onReveal}
      style={({ pressed }) => [
        styles.previewCell,
        invited && { backgroundColor: theme.backgroundSelected },
        pressed && tappable && { backgroundColor: theme.backgroundSelected },
      ]}>
      <Text style={[styles.previewArabic, ArabicTextStyle, { color: theme.text }]}>
        {word.ar.map((seg, i) => (
          <Text key={i} style={{ color: tajweedColor(seg.c, scheme, theme.text) }}>
            {seg.t}
          </Text>
        ))}
      </Text>
      {!hidden && (
        <>
          <View style={[styles.previewDivider, { backgroundColor: theme.border }]} />
          <Animated.Text
            entering={FadeIn.duration(200)}
            style={[styles.previewEnglish, { color: glossColor(glossClass, scheme, theme.textSecondary) }]}>
            {english}
          </Animated.Text>
        </>
      )}
    </Pressable>
  );
}

export function OnboardingCoveragePreview() {
  const theme = useTheme();
  const core = getCoverageThroughLevel(THEMATIC_LEVEL_COUNT);
  const full = getCoverageThroughLevel(LAST_LEVEL_NUMBER);

  return (
    <View style={styles.coverageCol}>
      <View style={[styles.coverageCard, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="title" themeColor="primary" style={styles.coveragePercent}>
          {core.percent}%
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatCount(THEMATIC_WORD_COUNT)} words
        </ThemedText>
      </View>
      <View style={[styles.coverageCard, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="title" themeColor="primary" style={styles.coveragePercent}>
          {full.percent}%
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatCount(WORD_COUNT)} words
        </ThemedText>
      </View>
    </View>
  );
}

export function OnboardingIntentionPreview() {
  const theme = useTheme();
  const arabic = BISMILLAH_WORDS.map((word) => word.ar.map((seg) => seg.t).join('')).join(' ');

  return (
    <View style={[styles.intentionCard, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText style={[styles.intentionArabic, ArabicTextStyle]}>{arabic}</ThemedText>
    </View>
  );
}

export function OnboardingTapHint() {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(400).delay(400)} style={styles.tapHint}>
      <Ionicons name="hand-left-outline" size={16} color={theme.primary} />
      <ThemedText type="smallBold" themeColor="primary">
        Try tapping a word
      </ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  visualBlock: {
    width: '100%',
    gap: Spacing.three,
  },
  flashCard: {
    borderRadius: Radius.large,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    minHeight: 168,
  },
  flashArabic: {
    fontSize: 48,
    lineHeight: 84,
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
  ayahCard: {
    width: '100%',
    borderRadius: Radius.large,
    borderWidth: 1,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.two,
  },
  ayahRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  previewCell: {
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    minWidth: 64,
    borderRadius: Radius.medium,
  },
  previewArabic: {
    fontSize: 28,
    lineHeight: 52,
    textAlign: 'center',
  },
  previewDivider: {
    height: 1,
    width: '70%',
    marginVertical: Spacing.one,
  },
  previewEnglish: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  coverageCol: {
    width: '100%',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  coverageCard: {
    flex: 1,
    borderRadius: Radius.large,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    gap: Spacing.one,
  },
  coveragePercent: {
    fontSize: 44,
    lineHeight: 48,
  },
  intentionCard: {
    width: '100%',
    borderRadius: Radius.large,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
  },
  intentionArabic: {
    fontSize: 28,
    lineHeight: 56,
    textAlign: 'center',
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
});
