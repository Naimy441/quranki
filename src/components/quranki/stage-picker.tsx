import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelection } from '@/lib/haptics';
import { getCoverageThroughLevel, type Stage, type StageProgress } from '@/lib/levels';
import { daysAtPace, formatCount, formatDaysAtPace } from '@/lib/stats';

export interface StageEntry {
  stage: Stage;
  progress: StageProgress;
  unlocked: boolean;
}

interface StagePickerProps {
  entries: StageEntry[];
  selectedStageId: number;
  wordsPerDay: number;
  onSelect: (stageId: number) => void;
}

/**
 * Full-width segmented control for the curriculum's stages, styled like a tab bar so it reads
 * unambiguously as a filter (not navigation). Locked stages show a lock glyph instead of a
 * number. The selected stage's progress collapses into a single detail line below, instead of
 * repeating mastered/coverage/pace on every row like the old stacked stage list.
 */
export function StagePicker({ entries, selectedStageId, wordsPerDay, onSelect }: StagePickerProps) {
  const theme = useTheme();
  const selected = entries.find((entry) => entry.stage.id === selectedStageId) ?? entries[0];

  if (!selected) return null;

  const { stage, progress, unlocked } = selected;
  const { mastered, total } = progress;
  const coverage = getCoverageThroughLevel(stage.lastLevel);
  const daysLabel = unlocked ? formatDaysAtPace(daysAtPace(total - mastered, wordsPerDay)) : undefined;

  return (
    <View style={styles.wrap}>
      <View style={[styles.pills, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {entries.map(({ stage: entryStage, unlocked: entryUnlocked }) => {
          const isSelected = entryStage.id === selectedStageId;
          return (
            <Pressable
              key={entryStage.id}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled: !entryUnlocked }}
              accessibilityLabel={entryUnlocked ? entryStage.title : `${entryStage.title}, locked`}
              accessibilityHint={entryUnlocked ? "Show this stage's levels" : undefined}
              disabled={!entryUnlocked}
              onPress={() => {
                hapticSelection();
                onSelect(entryStage.id);
              }}
              style={({ pressed }) => [
                styles.pill,
                isSelected && { backgroundColor: theme.backgroundSelected },
                pressed && entryUnlocked && !isSelected && styles.pressed,
              ]}>
              {entryUnlocked ? (
                <ThemedText type="smallBold" themeColor={isSelected ? 'primary' : 'textSecondary'}>
                  {entryStage.id}
                </ThemedText>
              ) : (
                <Ionicons name="lock-closed" size={13} color={theme.textMuted} />
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.detail}>
        <ThemedText type="smallBold" style={styles.detailTitle}>
          {stage.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {unlocked
            ? `${formatCount(mastered)} of ${formatCount(total)} mastered · ${coverage.percent}% of the Quran`
            : `${stage.subtitle} · ${formatCount(total)} words · unlocks as you progress`}
        </ThemedText>
        {daysLabel ? (
          <ThemedText type="small" themeColor="textMuted">
            {daysLabel} left at your pace
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  pills: {
    flexDirection: 'row',
    borderRadius: Radius.medium,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  pill: {
    flex: 1,
    height: 36,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  detail: {
    gap: 1,
    paddingHorizontal: Spacing.one,
  },
  detailTitle: {
    paddingTop: Spacing.one,
  },
});
