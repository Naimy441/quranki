import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Switch } from 'react-native-paper';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ReaderSettingsSheetProps {
  visible: boolean;
  onDismiss: () => void;
  arabicSize: number;
  onArabicSizeChange: (size: number) => void;
  arabicSizeRange: { min: number; max: number; step: number };
  glossSize: number;
  onGlossSizeChange: (size: number) => void;
  glossSizeRange: { min: number; max: number; step: number };
  showTranslation: boolean;
  onShowTranslationChange: (value: boolean) => void;
}

export function ReaderSettingsSheet({
  visible,
  onDismiss,
  arabicSize,
  onArabicSizeChange,
  arabicSizeRange,
  glossSize,
  onGlossSizeChange,
  glossSizeRange,
  showTranslation,
  onShowTranslationChange,
}: ReaderSettingsSheetProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.card }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.headerRow}>
            <ThemedText type="smallBold">Display settings</ThemedText>
            <Pressable onPress={onDismiss} hitSlop={10}>
              <Ionicons name="close" size={20} color={theme.textMuted} />
            </Pressable>
          </View>

          <SizeStepper
            label="Arabic text"
            value={arabicSize}
            min={arabicSizeRange.min}
            max={arabicSizeRange.max}
            step={arabicSizeRange.step}
            onChange={onArabicSizeChange}
          />

          <SizeStepper
            label="Word-by-word translation"
            value={glossSize}
            min={glossSizeRange.min}
            max={glossSizeRange.max}
            step={glossSizeRange.step}
            onChange={onGlossSizeChange}
          />

          <View style={[styles.toggleRow, { borderTopColor: theme.border }]}>
            <ThemedText type="small">Show word-by-word translation</ThemedText>
            <Switch value={showTranslation} onValueChange={onShowTranslationChange} color={theme.primary} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SizeStepper({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (size: number) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.stepperRow}>
      <ThemedText type="small" style={styles.stepperLabel}>
        {label}
      </ThemedText>
      <View style={styles.stepperControls}>
        <StepperButton
          icon="remove"
          disabled={value <= min}
          onPress={() => onChange(Math.max(min, value - step))}
        />
        <ThemedText type="smallBold" style={styles.stepperValue}>
          {value}
        </ThemedText>
        <StepperButton icon="add" disabled={value >= max} onPress={() => onChange(Math.min(max, value + step))} />
      </View>
    </View>
  );

  function StepperButton({ icon, disabled, onPress }: { icon: 'remove' | 'add'; disabled: boolean; onPress: () => void }) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        hitSlop={8}
        style={({ pressed }) => [
          styles.stepperButton,
          { backgroundColor: theme.backgroundElement },
          pressed && !disabled && styles.pressed,
        ]}>
        <Ionicons name={icon} size={16} color={disabled ? theme.textMuted : theme.text} />
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.one,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperLabel: {
    flex: 1,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  stepperButton: {
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    minWidth: 24,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.three,
    borderTopWidth: 1,
  },
});
