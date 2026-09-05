import { StyleSheet, Text, View } from 'react-native';

import { ArabicText } from '@/components/arabic-text';
import { VerseExamplePager } from '@/components/quranki/verse-example';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { displayArabic } from '@/lib/arabic-display';
import type { Word } from '@/lib/levels';
import { getVocabExamples } from '@/lib/vocab-examples';

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
  const examples = getVocabExamples(word);

  return (
    <View style={styles.wrap}>
      <View style={styles.prompt}>
        <ArabicText style={styles.arabic}>{displayArabic(word)}</ArabicText>
      </View>
      <View style={[styles.divider, { backgroundColor: theme.border }]} />
      <ThemedText type="subtitle" style={styles.title}>
        {word.english}
      </ThemedText>
      {word.note ? <LessonNote text={word.note} color={theme.text} /> : null}
      {examples.length > 0 ? <VerseExamplePager word={word} examples={examples} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  prompt: {
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.one,
  },
  arabic: {
    fontSize: 48,
    lineHeight: 84,
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  divider: {
    alignSelf: 'stretch',
    height: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 22,
    lineHeight: 30,
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
    fontSize: 19,
    lineHeight: 26,
  },
});
