import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ArabicTextStyle, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface FlashCardProps {
  arabic: string;
  english: string;
  revealed: boolean;
  onSpeak: () => void;
  isSpeaking: boolean;
}

export function FlashCard({ arabic, english, revealed, onSpeak, isSpeaking }: FlashCardProps) {
  const theme = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.arabicSection}>
        <ThemedText style={[styles.arabicText, ArabicTextStyle]}>{arabic}</ThemedText>
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
            {english}
          </ThemedText>
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
  },
  englishText: {
    fontSize: 22,
    lineHeight: 30,
    textAlign: 'center',
  },
});
