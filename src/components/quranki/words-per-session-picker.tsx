import { StyleSheet, View } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

const PRESETS = [
  { value: '3', label: '3', sublabel: 'Relaxed' },
  { value: '5', label: '5', sublabel: 'Comfortable' },
  { value: '10', label: '10', sublabel: 'Focused' },
  { value: '15', label: '15', sublabel: 'Intense' },
];

interface WordsPerSessionPickerProps {
  value: number;
  onChange: (value: number) => void;
}

export function WordsPerSessionPicker({ value, onChange }: WordsPerSessionPickerProps) {
  const activePreset = PRESETS.find((preset) => Number(preset.value) === value);

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={activePreset ? activePreset.value : ''}
        onValueChange={(next) => onChange(Number(next))}
        buttons={PRESETS.map((preset) => ({ value: preset.value, label: preset.label }))}
      />
      <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
        {activePreset ? `${activePreset.sublabel} - ${value} new words per session` : `Custom - ${value} new words per session`}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  hint: {
    textAlign: 'center',
  },
});
