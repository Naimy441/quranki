import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ArabicText } from '@/components/arabic-text';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { displayArabic } from '@/lib/arabic-display';
import { hapticSelection } from '@/lib/haptics';
import type { Word } from '@/lib/levels';

interface GrammarIntroRowProps {
  word: Word;
}

export function GrammarIntroRow({ word }: GrammarIntroRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        router.push(`/grammar/${word.id}`);
      }}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.card, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.icon, { backgroundColor: theme.backgroundSelected }]}>
        <Ionicons name="sparkles-outline" size={18} color={theme.primary} />
      </View>
      <View style={styles.info}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {word.english}
        </ThemedText>
        <View style={styles.subtitle}>
          <ArabicText style={styles.arabic}>{displayArabic(word)}</ArabicText>
          <ThemedText type="small" themeColor="textMuted">
            Pattern
          </ThemedText>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.75,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  subtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  arabic: {
    fontSize: 18,
    lineHeight: 28,
  },
});
