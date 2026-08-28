import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelection } from '@/lib/haptics';

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  caption?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface ChoiceGridProps<T extends string> {
  options: ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** How many tiles per row. Defaults to the number of options (a single row). */
  columns?: number;
  /** Larger numeric labels - used for the session-length grid where the count is the choice. */
  prominent?: boolean;
}

/** Equal-width selectable tiles used by Settings - selected state uses the same selected-green
 *  treatment as the rest of the app rather than react-native-paper's SegmentedButtons, which
 *  crowd four labels into an unreadable strip on a phone. */
export function ChoiceGrid<T extends string>({ options, value, onChange, columns, prominent }: ChoiceGridProps<T>) {
  const theme = useTheme();
  const cols = columns ?? options.length;
  const rows: ChoiceOption<T>[][] = [];
  for (let i = 0; i < options.length; i += cols) {
    rows.push(options.slice(i, i + cols));
  }

  return (
    <View style={styles.grid}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((option) => {
            const selected = option.value === value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  if (option.value === value) return;
                  hapticSelection();
                  onChange(option.value);
                }}
                style={({ pressed }) => [
                  styles.tile,
                  {
                    backgroundColor: selected ? theme.backgroundSelected : theme.card,
                    borderColor: selected ? theme.primary : theme.border,
                  },
                  pressed && styles.pressed,
                ]}>
                {option.icon && (
                  <Ionicons name={option.icon} size={18} color={selected ? theme.primary : theme.textSecondary} />
                )}
                <ThemedText
                  type={prominent ? 'title' : 'smallBold'}
                  themeColor={selected ? 'primary' : 'text'}
                  style={prominent ? styles.prominentLabel : styles.label}>
                  {option.label}
                </ThemedText>
                {option.caption ? (
                  <ThemedText type="small" themeColor={selected ? 'primary' : 'textMuted'} style={styles.caption}>
                    {option.caption}
                  </ThemedText>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.medium,
    borderWidth: 1.5,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  label: {
    textAlign: 'center',
  },
  prominentLabel: {
    textAlign: 'center',
    fontSize: 26,
    lineHeight: 30,
  },
  caption: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
  },
});
