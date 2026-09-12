import { Ionicons } from '@expo/vector-icons';
import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { Spacing } from '@/constants/theme';
import { useMasteredArabicDigits } from '@/hooks/use-mastered-arabic-digits';
import { useTheme } from '@/hooks/use-theme';
import { formatAppDigits } from '@/lib/arabic-digits';
import { formatRukuAyahRange, formatRukuTitle, type Ruku } from '@/lib/ruku';

export const QuranRukuRow = memo(function QuranRukuRow({
  ruku,
  coverage,
  enrolled,
  dueLabel,
  onOpen,
  onEnroll,
  onUnenroll,
}: {
  ruku: Ruku;
  coverage: number;
  enrolled: boolean;
  dueLabel: string | null;
  onOpen: () => void;
  onEnroll: () => void;
  onUnenroll: () => void;
}) {
  const theme = useTheme();
  const mastered = useMasteredArabicDigits();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const numberLabel = formatAppDigits(`Ruku ${ruku.surahRukuNumber}`, mastered);
  const rangeLabel = formatAppDigits(
    `${formatRukuAyahRange(ruku)} - ${Math.round(coverage * 100)}`,
    mastered,
  );
  const due = dueLabel ? formatAppDigits(dueLabel, mastered) : null;

  return (
    <>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`Ruku ${ruku.surahRukuNumber}, ${formatRukuAyahRange(ruku)}${enrolled ? ', enrolled' : ''}`}
        style={({ pressed }) => [
          styles.row,
          { borderTopColor: theme.border },
          pressed && styles.pressed,
        ]}>
        <Text style={[styles.number, { color: theme.text }]}>{numberLabel}</Text>
        <View style={styles.copy}>
          <View style={styles.range}>
            <Text style={[styles.meta, { color: theme.textSecondary }]}>{rangeLabel}</Text>
            <Text style={[styles.meta, { color: theme.textSecondary }]}>%</Text>
          </View>
          {enrolled && due ? (
            <Text style={[styles.meta, { color: theme.primary }]}>{due}</Text>
          ) : null}
        </View>
        {enrolled ? (
          <Pressable
            onPress={() => setConfirmRemove(true)}
            hitSlop={8}
            accessibilityLabel={`Remove ruku ${ruku.surahRukuNumber} from memorization`}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
            <Ionicons name="remove" size={20} color={theme.danger} />
          </Pressable>
        ) : (
          <Pressable
            onPress={onEnroll}
            hitSlop={8}
            accessibilityLabel={`Add ruku ${ruku.surahRukuNumber} to memorize`}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
            <Ionicons name="add" size={20} color={theme.primary} />
          </Pressable>
        )}
      </Pressable>
      {confirmRemove ? (
        <ConfirmDialog
          visible
          title="Remove this ruku?"
          message={`${formatRukuTitle(ruku)} will leave memorization, and its review history will be cleared.`}
          confirmLabel="Remove"
          destructive
          onCancel={() => setConfirmRemove(false)}
          onConfirm={() => {
            setConfirmRemove(false);
            onUnenroll();
          }}
        />
      ) : null}
    </>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.75,
  },
  number: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    width: 64,
  },
  meta: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  range: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    direction: 'ltr',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  action: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
