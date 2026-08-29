import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { hapticSelection } from '@/lib/haptics';
import { MARK_COLORS } from '@/lib/quran-marks';

interface ColorSwatchesProps {
  value: string;
  onChange: (color: string) => void;
  compact?: boolean;
}

export function ColorSwatches({ value, onChange, compact = false }: ColorSwatchesProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {MARK_COLORS.map((color) => {
        const selected = color === value;
        return (
          <Pressable
            key={color}
            onPress={() => {
              if (selected) return;
              hapticSelection();
              onChange(color);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Color ${color}`}
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              compact ? styles.swatchCompact : styles.swatch,
              { backgroundColor: color, borderColor: selected ? theme.text : 'transparent' },
              pressed && styles.pressed,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
  },
  swatchCompact: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.94 }],
  },
});
