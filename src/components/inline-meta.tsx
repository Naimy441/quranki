import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { ThemedText, type ThemedTextProps } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface InlineMetaProps {
  items: Array<string | null | undefined | false>;
  themeColor?: ThemedTextProps['themeColor'];
  type?: ThemedTextProps['type'];
  color?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

/** Secondary facts in a row, separated by a rule instead of punctuation. */
export function InlineMeta({
  items,
  themeColor = 'textMuted',
  type = 'small',
  color,
  style,
  textStyle,
}: InlineMetaProps) {
  const theme = useTheme();
  const parts = items.filter((item): item is string => Boolean(item));
  if (parts.length === 0) return null;

  const ink = color ?? theme[themeColor];

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={parts.join(', ')}
      style={[styles.row, style]}>
      {parts.map((part, index) => (
        <View key={`${part}-${index}`} style={styles.item}>
          {index > 0 ? <View style={[styles.rule, { backgroundColor: ink }]} /> : null}
          <ThemedText type={type} themeColor={themeColor} style={[{ color: ink }, textStyle]} numberOfLines={1}>
            {part}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rule: {
    width: 1,
    height: 11,
    borderRadius: 1,
    marginHorizontal: Spacing.two,
    opacity: 0.35,
  },
});
