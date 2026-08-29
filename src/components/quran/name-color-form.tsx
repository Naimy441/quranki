import { TextInput, StyleSheet, View } from 'react-native';

import { ColorSwatches } from '@/components/quran/color-swatches';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { MARK_NAME_MAX } from '@/lib/quran-marks';

interface NameColorFormProps {
  name: string;
  color: string;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  placeholder?: string;
}

export function NameColorForm({ name, color, onNameChange, onColorChange, placeholder = 'Name' }: NameColorFormProps) {
  const theme = useTheme();

  return (
    <View style={styles.form}>
      <TextInput
        value={name}
        onChangeText={onNameChange}
        placeholder={placeholder}
        placeholderTextColor={theme.textMuted}
        maxLength={MARK_NAME_MAX}
        autoCorrect={false}
        style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
      />
      <ThemedText type="small" themeColor="textMuted">
        Color
      </ThemedText>
      <ColorSwatches value={color} onChange={onColorChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.two,
  },
  input: {
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '500',
  },
});
