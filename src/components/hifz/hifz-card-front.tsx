import { Ionicons } from '@expo/vector-icons';
import { Fragment } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AyahEndMarker } from '@/components/quran/ayah-number-badge';
import { SurahNameText } from '@/components/quran/surah-name-text';
import { ThemedText } from '@/components/themed-text';
import { ArabicTextStyle, Radius, Spacing } from '@/constants/theme';
import { useAppColorScheme, useTheme } from '@/hooks/use-theme';
import { shapeQpcArabic } from '@/lib/arabic-display';
import { attachLeadingCombiningMarks } from '@/lib/arabic-segments';
import { useHifzCuePlayback } from '@/lib/hifz-cue-audio';
import { tajweedColor } from '@/lib/quran-colors';
import { getSurahAyahs, getSurahMeta } from '@/lib/quran-reader';
import type { ReaderWord } from '@/lib/quran-reader-types';
import { formatRukuAyahRange, getRukuCue, type Ruku, type RukuCueWord } from '@/lib/ruku';

const glueJoins = Platform.OS === 'android';

interface HifzCardFrontProps {
  ruku: Ruku;
  onSpeak: () => void;
  isSpeaking: boolean;
}

export function HifzCardFront({ ruku, onSpeak, isSpeaking }: HifzCardFrontProps) {
  const theme = useTheme();
  const meta = getSurahMeta(ruku.surah);
  const cue = getRukuCue(ruku);
  const lastCue = cue.words[cue.words.length - 1];
  const lastAyahWordCount = lastCue
    ? (getSurahAyahs(ruku.surah)[lastCue.ayah - 1]?.w.length ?? 0)
    : 0;
  const cueCutsMidAyah = lastCue != null && lastCue.position < lastAyahWordCount;
  const speakingAyah = useHifzCuePlayback((state) => state.ayah);
  const speakingPosition = useHifzCuePlayback((state) => state.position);
  const cuePlaying = useHifzCuePlayback((state) => state.playing);

  return (
    <View style={styles.wrap}>
      <View style={styles.names}>
        <SurahNameText surahNumber={ruku.surah} style={styles.surahGlyph} />
        <ThemedText type="subtitle" style={styles.surahName}>
          {meta?.en ?? `Surah ${ruku.surah}`}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {`Ruku ${ruku.surahRukuNumber} - ${formatRukuAyahRange(ruku)}`}
        </ThemedText>
      </View>

      <View style={styles.cueBlock}>
        <View style={styles.cueWords}>
          {cue.words.map((word, index) => {
            const next = cue.words[index + 1];
            const ayahWordCount = getSurahAyahs(ruku.surah)[word.ayah - 1]?.w.length ?? 0;
            const showAyahMarker = word.position >= ayahWordCount;
            return (
              <Fragment key={`${word.ayah}:${word.position}`}>
                <CueWordChip
                  item={word}
                  speaking={
                    cuePlaying && speakingAyah === word.ayah && speakingPosition === word.position
                  }
                />
                {showAyahMarker ? (
                  <View style={styles.cueWord}>
                    <AyahEndMarker number={word.ayah} arabicSize={30} compact />
                    <View style={styles.cueUnderline} />
                  </View>
                ) : null}
                {cueCutsMidAyah && next == null ? (
                  <View style={styles.cueWord}>
                    <Text style={[styles.cueEllipsis, { color: theme.text }]}>...</Text>
                    <View style={styles.cueUnderline} />
                  </View>
                ) : null}
              </Fragment>
            );
          })}
        </View>
        <Pressable
          onPress={onSpeak}
          hitSlop={12}
          accessibilityLabel="Play the opening of this ruku"
          style={({ pressed }) => [
            styles.speaker,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}>
          <Ionicons
            name={isSpeaking ? 'volume-high' : 'volume-medium-outline'}
            size={22}
            color={theme.primary}
          />
        </Pressable>
      </View>
    </View>
  );
}

function CueWordChip({ item, speaking }: { item: RukuCueWord; speaking: boolean }) {
  const theme = useTheme();
  return (
    <View style={styles.cueWord}>
      <CueWordText word={item.word} />
      <View
        style={[
          styles.cueUnderline,
          { backgroundColor: speaking ? theme.primary : 'transparent' },
        ]}
      />
    </View>
  );
}

function CueWordText({ word }: { word: ReaderWord }) {
  const theme = useTheme();
  const scheme = useAppColorScheme();
  const joinedArabic = shapeQpcArabic(word.ar.map((segment) => segment.t).join(''));
  const keepJoined = /[\u06EA\u06EC]/.test(joinedArabic);
  const segments = keepJoined ? [{ t: joinedArabic }] : attachLeadingCombiningMarks(word.ar);

  return (
    <Text
      style={[
        ArabicTextStyle,
        styles.cueArabic,
        { color: theme.text },
      ]}>
      {keepJoined
        ? joinedArabic
        : segments.map((segment, index) => (
            <Text key={index} style={{ color: tajweedColor(segment.c, scheme, theme.text) }}>
              {glueJoins && index > 0 && '\u200D'}
              {segment.t}
              {glueJoins && index < segments.length - 1 && '\u200D'}
            </Text>
          ))}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: Spacing.five,
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
  },
  names: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  surahGlyph: {
    fontSize: 42,
    lineHeight: 80,
    includeFontPadding: false,
    marginTop: -8,
    marginBottom: -18,
  },
  surahName: {
    textAlign: 'center',
  },
  cueBlock: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.four,
  },
  cueWords: {
    width: '100%',
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-end',
    columnGap: Spacing.three,
    rowGap: Spacing.one,
  },
  cueWord: {
    alignItems: 'center',
  },
  cueArabic: {
    fontSize: 30,
    lineHeight: 56,
    includeFontPadding: false,
  },
  cueEllipsis: {
    fontSize: 30,
    lineHeight: 56,
    includeFontPadding: false,
    letterSpacing: 1,
  },
  cueUnderline: {
    height: 2,
    alignSelf: 'stretch',
    borderRadius: 1,
    marginTop: 6,
  },
  speaker: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  pressed: {
    opacity: 0.7,
  },
});
