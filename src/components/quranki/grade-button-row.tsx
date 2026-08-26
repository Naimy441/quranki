import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GradeColors, Radius, Spacing } from '@/constants/theme';
import { useAppColorScheme } from '@/hooks/use-theme';
import type { GradeName, GradePreview } from '@/lib/fsrs';

interface GradeButtonRowProps {
  previews: GradePreview[];
  onGrade: (grade: GradeName) => void;
}

const LABELS: Record<GradeName, string> = {
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
};

export function GradeButtonRow({ previews, onGrade }: GradeButtonRowProps) {
  const scheme = useAppColorScheme();

  return (
    <View style={styles.row}>
      {previews.map((preview) => {
        const color = GradeColors[preview.grade][scheme];
        return (
          <Pressable
            key={preview.grade}
            onPress={() => onGrade(preview.grade)}
            style={({ pressed }) => [styles.button, { backgroundColor: color }, pressed && styles.pressed]}>
            <Text style={styles.label}>{LABELS[preview.grade]}</Text>
            <Text style={styles.interval}>{preview.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  button: {
    flex: 1,
    borderRadius: Radius.medium,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    gap: 2,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  interval: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '500',
  },
});
