import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProgressRing } from '@/components/quranki/progress-ring';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LevelStatus } from '@/lib/levels';

interface LevelCardProps {
  status: LevelStatus;
  isUnlocked: boolean;
  isCurrent: boolean;
}

export function LevelCard({ status, isUnlocked, isCurrent }: LevelCardProps) {
  const theme = useTheme();
  const { level, masteredCount, totalCount, dueCount } = status;
  const progress = totalCount === 0 ? 0 : masteredCount / totalCount;

  return (
    <Pressable
      disabled={!isUnlocked}
      onPress={() => router.push(`/level/${level.number}`)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.card, borderColor: isCurrent ? theme.primary : theme.border },
        pressed && isUnlocked && styles.pressed,
        !isUnlocked && styles.locked,
      ]}>
      <ProgressRing progress={progress} color={theme.primary} trackColor={theme.backgroundElement} size={52} strokeWidth={4}>
        {isUnlocked ? (
          <ThemedText type="smallBold">{level.number}</ThemedText>
        ) : (
          <Ionicons name="lock-closed" size={16} color={theme.textMuted} />
        )}
      </ProgressRing>

      <View style={styles.info}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {level.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {isUnlocked ? `${masteredCount}/${totalCount} mastered` : `${totalCount} words - locked`}
        </ThemedText>
      </View>

      {isUnlocked && dueCount > 0 ? (
        <View style={[styles.badge, { backgroundColor: theme.primary }]}>
          <ThemedText type="small" themeColor="onPrimary" style={styles.badgeText}>
            {dueCount}
          </ThemedText>
        </View>
      ) : isUnlocked ? (
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
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
  locked: {
    opacity: 0.55,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  badge: {
    minWidth: 26,
    height: 26,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  badgeText: {
    fontWeight: '700',
  },
});
