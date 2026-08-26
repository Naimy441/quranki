import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** The ayah number, pinned to the top-left corner of each ayah block (Mushaf convention). */
export function AyahNumberBadge({ number }: { number: number }) {
  const theme = useTheme();

  return (
    <View style={styles.marker}>
      <Text style={[styles.text, { color: theme.textMuted }]}>{number}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  marker: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.three,
    zIndex: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});
