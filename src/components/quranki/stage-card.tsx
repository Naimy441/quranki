import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { InlineMeta } from '@/components/inline-meta';
import { ProgressRing } from '@/components/quranki/progress-ring';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelection } from '@/lib/haptics';
import { getCoverageThroughLevel, type Stage, type StageProgress } from '@/lib/levels';
import { formatCount } from '@/lib/stats';

interface StageCardProps {
  stage: Stage;
  progress: StageProgress;
  unlocked: boolean;
  selected?: boolean;
  onPress?: () => void;
}

export function StageCard({ stage, progress, unlocked, selected = false, onPress }: StageCardProps) {
  const theme = useTheme();
  const { mastered, total } = progress;
  const coverage = getCoverageThroughLevel(stage.lastLevel);
  const ratio = total === 0 ? 0 : mastered / total;

  const body = (
    <>
      <ProgressRing
        progress={ratio}
        color={unlocked ? theme.primary : theme.textMuted}
        trackColor={selected ? theme.card : theme.backgroundElement}
        size={40}
        strokeWidth={3}>
        <ThemedText type="smallBold" themeColor={unlocked ? 'text' : 'textMuted'}>
          {stage.id}
        </ThemedText>
      </ProgressRing>
      <View style={styles.info}>
        <ThemedText type="smallBold" themeColor={selected ? 'primary' : unlocked ? 'text' : 'textSecondary'}>
          {stage.title}
        </ThemedText>
        <InlineMeta
          themeColor={selected ? 'textSecondary' : 'textMuted'}
          items={
            unlocked
              ? [`${formatCount(mastered)}/${formatCount(total)}`, `${coverage.percent}% of the Quran`]
              : [stage.subtitle, `${formatCount(total)} words`]
          }
        />
      </View>
      {unlocked ? (
        <Ionicons
          name={selected ? 'checkmark' : 'chevron-forward'}
          size={18}
          color={selected ? theme.primary : theme.textMuted}
        />
      ) : (
        <ThemedText type="small" themeColor="textMuted">
          Locked
        </ThemedText>
      )}
    </>
  );

  const rowStyle = [
    styles.row,
    selected && { backgroundColor: theme.backgroundSelected },
    !unlocked && styles.locked,
  ];

  if (!onPress) {
    return <View style={rowStyle}>{body}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !unlocked }}
      accessibilityLabel={stage.title}
      accessibilityHint={unlocked ? "Show this stage's levels" : undefined}
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      disabled={!unlocked}
      style={({ pressed }) => [rowStyle, pressed && unlocked && styles.pressed]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  locked: {
    opacity: 0.7,
  },
  pressed: {
    opacity: 0.7,
  },
});
