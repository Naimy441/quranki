import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProgressRing } from '@/components/quranki/progress-ring';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelection } from '@/lib/haptics';
import { getCoverageThroughLevel, type LevelStatus } from '@/lib/levels';
import { formatCount } from '@/lib/stats';

interface LevelCardProps {
  status: LevelStatus;
  /** True for the level sequential new-card introduction is currently drawing from. */
  isCurrent: boolean;
}

export function LevelCard({ status, isCurrent }: LevelCardProps) {
  const theme = useTheme();
  const { level, masteredCount, totalCount, dueCount, newCount } = status;
  const progress = totalCount === 0 ? 0 : masteredCount / totalCount;
  const introduced = totalCount - newCount;
  const coverage = getCoverageThroughLevel(level.number);

  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        router.push(`/level/${level.number}`);
      }}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.card, borderColor: isCurrent ? theme.primary : theme.border },
        pressed && styles.pressed,
      ]}>
      <ProgressRing progress={progress} color={theme.primary} trackColor={theme.backgroundElement} size={52} strokeWidth={4}>
        <ThemedText type="smallBold">{level.number}</ThemedText>
      </ProgressRing>

      <View style={styles.info}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {level.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {introduced === 0
            ? `${totalCount} words - not yet introduced`
            : `${masteredCount}/${totalCount} mastered`}
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted">
          {coverage.percent}% · {formatCount(coverage.quranWords)} words
        </ThemedText>
      </View>

      {dueCount > 0 ? (
        <View style={[styles.badge, { backgroundColor: theme.primary }]}>
          <ThemedText type="small" themeColor="onPrimary" style={styles.badgeText}>
            {dueCount}
          </ThemedText>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
      )}
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
