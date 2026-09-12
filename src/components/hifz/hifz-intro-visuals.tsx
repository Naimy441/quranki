import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { GradeButtonRow } from '@/components/quranki/grade-button-row';
import { ThemedText } from '@/components/themed-text';
import { ArabicTextStyle, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createNewCard, previewGrades } from '@/lib/fsrs';
import { HIFZ_UNLOCK_RATIO, getRuku, getRukuCue } from '@/lib/ruku';

export function HifzIntroUnlockPreview() {
  const theme = useTheme();
  const percent = Math.round(HIFZ_UNLOCK_RATIO * 100);

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.percentRow}>
        <ThemedText type="title" themeColor="primary" style={styles.percent}>
          {percent}
        </ThemedText>
        <ThemedText type="title" themeColor="primary" style={styles.percent} convertDigits={false}>
          %
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        of the words in a ruku
      </ThemedText>
    </View>
  );
}

export function HifzIntroAddPreview() {
  const theme = useTheme();

  return (
    <View style={[styles.listCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.surahRow}>
        <ThemedText type="smallBold">Al-Fatihah</ThemedText>
        <ThemedText type="small" themeColor="primary">
          1 ruku
        </ThemedText>
      </View>
      <View style={[styles.rukuRow, { borderTopColor: theme.border }]}>
        <ThemedText type="smallBold">Ruku 1</ThemedText>
        <View style={styles.rukuRange}>
          <ThemedText type="small" themeColor="textSecondary">
            1
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" convertDigits={false}>
            :
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            1
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" convertDigits={false}>
            –
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            7
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" convertDigits={false}>
            {' - '}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {Math.round(HIFZ_UNLOCK_RATIO * 100)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" convertDigits={false}>
            %
          </ThemedText>
        </View>
        <View style={[styles.add, { backgroundColor: theme.backgroundSelected }]}>
          <Ionicons name="add" size={20} color={theme.primary} />
        </View>
      </View>
    </View>
  );
}

export function HifzIntroCuePreview() {
  const theme = useTheme();
  const ruku = getRuku(1);
  const cue = ruku ? getRukuCue(ruku) : null;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.cueRow}>
        {(cue?.words ?? []).map((word) => (
          <ThemedText key={`${word.ayah}:${word.position}`} style={[styles.cueWord, ArabicTextStyle]}>
            {word.text}
          </ThemedText>
        ))}
        <ThemedText style={styles.ellipsis}>...</ThemedText>
      </View>
    </View>
  );
}

export function HifzIntroGradePreview() {
  const previews = useMemo(() => previewGrades(createNewCard(), new Date()), []);

  return (
    <View style={styles.gradeWrap} pointerEvents="none">
      <GradeButtonRow previews={previews} onGrade={() => undefined} />
    </View>
  );
}

export function HifzIntroStartPreview() {
  const theme = useTheme();

  return (
    <View style={[styles.startCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.startIcon, { backgroundColor: theme.backgroundSelected }]}>
        <Ionicons name="book-outline" size={18} color={theme.primary} />
      </View>
      <View style={styles.startCopy}>
        <ThemedText type="smallBold">Memorize</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Add an unlocked ruku
        </ThemedText>
      </View>
      <Pressable style={[styles.startButton, { backgroundColor: theme.primary }]}>
        <ThemedText type="small" themeColor="onPrimary" style={styles.startLabel}>
          Start
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: Radius.large,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
    gap: Spacing.one,
  },
  percentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  percent: {
    fontSize: 44,
    lineHeight: 48,
  },
  listCard: {
    width: '100%',
    borderRadius: Radius.large,
    borderWidth: 1,
    overflow: 'hidden',
  },
  surahRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rukuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rukuRange: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
  },
  add: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cueRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  cueWord: {
    fontSize: 30,
    lineHeight: 56,
  },
  ellipsis: {
    fontSize: 30,
    lineHeight: 56,
  },
  gradeWrap: {
    width: '100%',
  },
  startCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1,
    padding: Spacing.three,
  },
  startIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startCopy: {
    flex: 1,
    gap: 1,
  },
  startButton: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  startLabel: {
    fontWeight: '700',
  },
});
