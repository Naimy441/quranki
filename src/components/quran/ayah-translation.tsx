import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FootnoteSheet } from '@/components/quran/footnote-sheet';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { TranslationPart } from '@/lib/quran-reader-types';

interface AyahTranslationProps {
  parts: TranslationPart[];
  fontSize: number;
}

type Token = { key: string; text: string; footnote?: { n: string; fn: string } };

/** Splits translation parts into individual words (plus one token per footnote marker) so each
 *  can be laid out as its own flex item. Word-level `Text` siblings in a `flexWrap` row reproduce
 *  normal paragraph wrapping, while giving the footnote marker a real `Pressable` - nested `Text`
 *  `onPress` handlers have long-standing, unreliable hit-testing on both iOS and Android
 *  (especially once the outer `Text` has padding), so a tiny tappable footnote number embedded
 *  inline would often silently miss touches. */
function tokenize(parts: TranslationPart[]): Token[] {
  const tokens: Token[] = [];
  parts.forEach((part, i) => {
    if (part.t !== undefined) {
      part.t
        .split(/\s+/)
        .filter(Boolean)
        .forEach((word, j) => tokens.push({ key: `${i}-${j}`, text: word }));
    } else {
      tokens.push({ key: `${i}`, text: `[${part.n}]`, footnote: { n: part.n ?? '', fn: part.fn ?? '' } });
    }
  });
  return tokens;
}

/** The full Sahih International ayah translation, with tappable `[n]` footnote markers. */
export function AyahTranslation({ parts, fontSize }: AyahTranslationProps) {
  const theme = useTheme();
  const [activeFootnote, setActiveFootnote] = useState<{ n: string; fn: string } | null>(null);
  const tokens = tokenize(parts);

  return (
    <>
      <View style={[styles.wrap, { borderTopColor: theme.border }]}>
        {tokens.map((token) =>
          token.footnote ? (
            <Pressable
              key={token.key}
              onPress={() => setActiveFootnote(token.footnote!)}
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}>
              <Text style={[styles.word, styles.footnote, { color: theme.primary, fontSize: fontSize * 0.85 }]}>
                {token.text}
              </Text>
            </Pressable>
          ) : (
            <Text
              key={token.key}
              style={[styles.word, { color: theme.text, fontSize, lineHeight: fontSize * 1.6 }]}>
              {token.text}
            </Text>
          ),
        )}
      </View>

      <FootnoteSheet footnote={activeFootnote} onDismiss={() => setActiveFootnote(null)} />
    </>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    marginHorizontal: Spacing.three,
    borderTopWidth: 1,
  },
  word: {
    marginRight: 4,
    marginBottom: 2,
  },
  footnote: {
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.6,
  },
});
