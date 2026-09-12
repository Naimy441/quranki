import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useHifzAvailable } from '@/hooks/use-hifz-tab';
import { useTheme } from '@/hooks/use-theme';
import { hapticMedium } from '@/lib/haptics';
import { countDueHifzCards } from '@/lib/hifz';
import { useHifzStore } from '@/store/hifz-store';

/** Slim Quran-tab entry. Hidden until a ruku unlocks so readers are not interrupted. */
export function MemorizeEntryRow() {
  const theme = useTheme();
  const available = useHifzAvailable();
  const enrolledRukuIds = useHifzStore((state) => state.enrolledRukuIds);
  const cards = useHifzStore((state) => state.cards);
  const { due, next } = useMemo(
    () => countDueHifzCards({ enrolledRukuIds, cards }),
    [cards, enrolledRukuIds],
  );
  const sessionSize = due + next;

  if (!available) return null;

  const subtitle =
    sessionSize > 0
      ? [due > 0 ? `${due} due` : null, next > 0 ? `${next} new` : null].filter(Boolean).join(' - ')
      : enrolledRukuIds.length > 0
        ? 'Nothing due right now'
        : 'Add an unlocked ruku';

  const startSession = () => {
    if (sessionSize === 0) return;
    hapticMedium();
    router.push('/session/hifz');
  };

  return (
    <View style={[styles.row, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Pressable
        onPress={startSession}
        disabled={sessionSize === 0}
        accessibilityRole="button"
        accessibilityLabel={`Memorize, ${subtitle}`}
        style={({ pressed }) => [styles.main, pressed && sessionSize > 0 && styles.pressed]}>
        <View style={[styles.iconWrap, { backgroundColor: theme.backgroundSelected }]}>
          <Ionicons name="book-outline" size={18} color={theme.primary} />
        </View>
        <View style={styles.copy}>
          <ThemedText type="smallBold">Memorize</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        </View>
      </Pressable>
      {sessionSize > 0 ? (
        <Pressable
          onPress={startSession}
          hitSlop={6}
          accessibilityLabel="Start memorization session"
          style={({ pressed }) => [
            styles.start,
            { backgroundColor: theme.primary },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="small" themeColor="onPrimary" style={styles.startLabel}>
            Start
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.75,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  start: {
    height: 28,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startLabel: {
    fontSize: 12,
  },
});
