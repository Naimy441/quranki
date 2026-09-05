import { useIsFocused } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { MeterBar } from '@/components/quranki/meter-bar';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelection } from '@/lib/haptics';
import { formatStudyDuration, type StudyDay } from '@/lib/stats';

const EMPTY_SCALE_MS = 10 * 60_000;

interface StudyTimeChartProps {
  days: StudyDay[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

/** Last seven local days of memorization-session time. */
export function StudyTimeChart({ days, selectedKey, onSelect }: StudyTimeChartProps) {
  const theme = useTheme();
  const focused = useIsFocused();
  const scale = Math.max(...days.map((day) => day.ms), EMPTY_SCALE_MS);

  return (
    <View
      accessibilityRole="summary"
      accessibilityLabel={days
        .map((day) => `${day.isToday ? 'Today' : day.weekday}: ${formatStudyDuration(day.ms)}`)
        .join(', ')}
      style={styles.chart}>
      {days.map((day) => {
        const selected = day.key === selectedKey;
        return (
          <Pressable
            key={day.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${day.isToday ? 'Today' : day.caption}: ${formatStudyDuration(day.ms)}`}
            onPress={() => {
              hapticSelection();
              onSelect(day.key);
            }}
            style={styles.column}>
            <View style={[styles.track, { backgroundColor: theme.card }]}>
              <MeterBar
                progress={day.ms / scale}
                color={selected ? theme.primary : theme.primaryDark}
                enabled={focused}
                style={styles.bar}
              />
            </View>
            <ThemedText
              type="small"
              themeColor={selected ? 'primary' : 'textMuted'}
              style={[styles.label, selected && styles.selectedLabel]}
              numberOfLines={1}>
              {day.weekday}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 118 },
  column: { flex: 1, height: '100%', justifyContent: 'flex-end', gap: Spacing.one },
  track: { height: 96, borderRadius: Radius.small, overflow: 'hidden', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: Radius.small },
  label: { fontSize: 9, lineHeight: 12, textAlign: 'center' },
  selectedLabel: { fontWeight: '700' },
});
