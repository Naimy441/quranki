import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface SurahUnderstandingChartProps {
  averages: number[];
}

/** One vertical bar per surah, ordered from Al-Fatihah through An-Nas. */
export function SurahUnderstandingChart({ averages }: SurahUnderstandingChartProps) {
  const theme = useTheme();

  return (
    <View accessibilityRole="summary" accessibilityLabel={`Average understanding for ${averages.length} surahs`} style={styles.chart}>
      {averages.map((average, index) => (
        <View
          key={`surah-${index + 1}`}
          accessibilityLabel={`Surah ${index + 1}: ${Math.round(average * 100)}% understanding`}
          style={[styles.track, { backgroundColor: theme.card }]}
        >
          <View style={[styles.bar, { backgroundColor: theme.primary, height: `${Math.round(average * 100)}%` }]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 1, height: 96, overflow: 'hidden' },
  track: { flex: 1, minWidth: 1, height: '100%', borderRadius: Radius.small, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: Radius.small },
});
