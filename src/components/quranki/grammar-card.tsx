import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { ArabicText } from '@/components/arabic-text';
import { VerseExample } from '@/components/quranki/verse-example';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { displayArabic } from '@/lib/arabic-display';
import type { Word } from '@/lib/levels';
import { getVocabExample } from '@/lib/vocab-examples';

interface GrammarCardProps {
  word: Word;
}

const ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g;
/** Keep mixed English notes in LTR order; isolates must sit in the system font, not Uthmanic. */
const LRM = '\u200E';
const LRI = '\u2066';
const RLI = '\u2067';
const PDI = '\u2069';

function splitNoteRuns(text: string): { text: string; arabic: boolean }[] {
  const runs: { text: string; arabic: boolean }[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(ARABIC_SCRIPT.source, 'g');
  while ((match = re.exec(text))) {
    if (match.index > last) runs.push({ text: text.slice(last, match.index), arabic: false });
    runs.push({ text: match[0], arabic: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last), arabic: false });
  return runs.filter((run) => run.text.length > 0);
}

function LessonNote({ text, color }: { text: string; color: string }) {
  const runs = splitNoteRuns(text);
  return (
    <Text style={[styles.note, { color }]}>
      {LRM}
      {LRI}
      {runs.map((run, i) =>
        run.arabic ? (
          <Text key={i}>
            {RLI}
            <ArabicText style={[styles.noteArabic, { color }]}>{run.text}</ArabicText>
            {PDI}
            {LRM}
          </Text>
        ) : (
          <Text key={i}>{run.text}</Text>
        ),
      )}
      {PDI}
    </Text>
  );
}

export function GrammarCard({ word }: GrammarCardProps) {
  const theme = useTheme();
  const example = getVocabExample(word);

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.kicker, { backgroundColor: theme.backgroundSelected }]}>
        <Ionicons name="sparkles-outline" size={16} color={theme.text} />
        <ThemedText type="smallBold">
          A pattern to notice
        </ThemedText>
      </View>

      <View style={styles.body}>
        <ArabicText style={styles.arabic}>{displayArabic(word)}</ArabicText>
        <ThemedText type="subtitle" style={styles.title}>
          {word.english}
        </ThemedText>
        {word.note ? <LessonNote text={word.note} color={theme.text} /> : null}

        {example ? (
          <View style={[styles.exampleBox, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" themeColor="textMuted" style={styles.exampleLabel}>
              In the Quran
            </ThemedText>
            <VerseExample word={word} example={example} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.large,
    borderWidth: 1,
    overflow: 'hidden',
  },
  kicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  body: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
  },
  arabic: {
    fontSize: 44,
    lineHeight: 80,
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    textAlign: 'center',
  },
  note: {
    width: '100%',
    alignSelf: 'stretch',
    fontSize: 16,
    lineHeight: 26,
    fontWeight: '500',
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  noteArabic: {
    fontSize: 22,
    lineHeight: 32,
  },
  exampleBox: {
    width: '100%',
    marginTop: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    gap: Spacing.two,
  },
  exampleLabel: {
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
