import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { AyahUnderstandingHistogramBin } from '@/lib/quran-understanding';

interface AyahUnderstandingHistogramProps {
  bins: AyahUnderstandingHistogramBin[];
  ayahCount: number;
  countLabel?: string;
}

/** Distribution of the same unweighted per-ayah vocabulary estimate shown in the reader. */
export function AyahUnderstandingHistogram({ bins, ayahCount, countLabel = 'ayahs' }: AyahUnderstandingHistogramProps) {
  const theme = useTheme();
  const largestBin = Math.max(...bins.map((bin) => bin.ayahCount), 1);

  return (
    <View accessibilityRole="summary" accessibilityLabel={`Understanding distribution across ${ayahCount} ${countLabel}`}>
      <View style={styles.chart}>
        {bins.map((bin) => (
          <View key={bin.label} style={styles.column} accessibilityLabel={`${bin.label}: ${bin.ayahCount} ${countLabel}`}>
            <View style={[styles.track, { backgroundColor: theme.card }]}>
              {bin.ayahCount > 0 && <View style={[styles.bar, { backgroundColor: theme.primary, height: `${(bin.ayahCount / largestBin) * 100}%` }]} />}
            </View>
            <ThemedText type="small" themeColor="textMuted" style={styles.label} numberOfLines={1}>
              {bin.min}
            </ThemedText>
          </View>
        ))}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: Spacing.one },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 118 },
  column: { flex: 1, height: '100%', justifyContent: 'flex-end', gap: Spacing.one },
  track: { height: 96, borderRadius: Radius.small, overflow: 'hidden', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: Radius.small },
  label: { fontSize: 9, lineHeight: 12, textAlign: 'center' },
  axisLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.one },
});
