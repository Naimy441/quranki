import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelection } from '@/lib/haptics';
import { clampReminderHour, clampReminderMinute, formatReminderTime } from '@/lib/practice-reminder';

const PRESETS = [
  { label: 'Morning', hour: 8, minute: 0 },
  { label: 'Midday', hour: 12, minute: 0 },
  { label: 'Evening', hour: 17, minute: 0 },
  { label: 'Night', hour: 20, minute: 0 },
] as const;

const MINUTE_STEPS = [0, 15, 30, 45];

interface ReminderTimePickerProps {
  hour: number;
  minute: number;
  /** When false, presets stay unselected until the user taps a time. */
  selected?: boolean;
  onChange: (hour: number, minute: number) => void;
}

function nextMinute(minute: number, delta: number): number {
  const index = MINUTE_STEPS.findIndex((step) => step >= clampReminderMinute(minute));
  const current = index === -1 ? 0 : index;
  const next = (current + delta + MINUTE_STEPS.length) % MINUTE_STEPS.length;
  return MINUTE_STEPS[next];
}

export function ReminderTimePicker({ hour, minute, selected: hasSelection = true, onChange }: ReminderTimePickerProps) {
  const theme = useTheme();
  const safeHour = clampReminderHour(hour);
  const safeMinute = clampReminderMinute(minute);

  const setTime = (nextHour: number, nextMinute: number) => {
    hapticSelection();
    onChange(clampReminderHour(nextHour), clampReminderMinute(nextMinute));
  };

  return (
    <View style={styles.wrap}>
      <ThemedText type="title" style={styles.time}>
        {formatReminderTime(safeHour, safeMinute)}
      </ThemedText>
      <View style={styles.steppers}>
        <Stepper
          label="Hour"
          onMinus={() => setTime((safeHour + 23) % 24, safeMinute)}
          onPlus={() => setTime((safeHour + 1) % 24, safeMinute)}
        />
        <Stepper
          label="Min"
          onMinus={() => setTime(safeHour, nextMinute(safeMinute, -1))}
          onPlus={() => setTime(safeHour, nextMinute(safeMinute, 1))}
        />
      </View>
      <View style={styles.presets}>
        {PRESETS.map((preset) => {
          const selected = hasSelection && preset.hour === safeHour && preset.minute === safeMinute;
          return (
            <Pressable
              key={preset.label}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setTime(preset.hour, preset.minute)}
              style={({ pressed }) => [
                styles.preset,
                {
                  backgroundColor: selected ? theme.backgroundSelected : theme.card,
                  borderColor: selected ? theme.primary : theme.border,
                },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor={selected ? 'primary' : 'text'}>
                {preset.label}
              </ThemedText>
              <ThemedText type="small" themeColor={selected ? 'primary' : 'textMuted'}>
                {formatReminderTime(preset.hour, preset.minute)}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Stepper({ label, onMinus, onPlus }: { label: string; onMinus: () => void; onPlus: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityLabel={`Earlier ${label}`}
        onPress={onMinus}
        hitSlop={8}
        style={({ pressed }) => [styles.stepButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
        <Ionicons name="remove" size={20} color={theme.text} />
      </Pressable>
      <ThemedText type="small" themeColor="textMuted">
        {label}
      </ThemedText>
      <Pressable
        accessibilityLabel={`Later ${label}`}
        onPress={onPlus}
        hitSlop={8}
        style={({ pressed }) => [styles.stepButton, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}>
        <Ionicons name="add" size={20} color={theme.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  time: {
    fontSize: 40,
    lineHeight: 44,
    textAlign: 'center',
  },
  steppers: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  preset: {
    flexGrow: 1,
    flexBasis: '46%',
    alignItems: 'center',
    gap: 2,
    paddingVertical: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1.5,
  },
  pressed: {
    opacity: 0.8,
  },
});
