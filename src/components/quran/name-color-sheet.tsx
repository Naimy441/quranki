import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';

import { NameColorForm } from '@/components/quran/name-color-form';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelection } from '@/lib/haptics';
import { DEFAULT_MARK_COLOR } from '@/lib/quran-marks';

interface NameColorSheetProps {
  visible: boolean;
  title: string;
  initialName: string;
  initialColor: string;
  submitLabel: string;
  deleteLabel?: string;
  onDismiss: () => void;
  onSubmit: (name: string, color: string) => void;
  onDelete?: () => void;
}

export function NameColorSheet({
  visible,
  title,
  initialName,
  initialColor,
  submitLabel,
  deleteLabel,
  onDismiss,
  onSubmit,
  onDelete,
}: NameColorSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      {visible ? (
        <NameColorSheetBody
          key={`${title}:${initialName}:${initialColor}`}
          title={title}
          initialName={initialName}
          initialColor={initialColor}
          submitLabel={submitLabel}
          deleteLabel={deleteLabel}
          onDismiss={onDismiss}
          onSubmit={onSubmit}
          onDelete={onDelete}
        />
      ) : null}
    </Modal>
  );
}

function NameColorSheetBody({
  title,
  initialName,
  initialColor,
  submitLabel,
  deleteLabel = 'Delete',
  onDismiss,
  onSubmit,
  onDelete,
}: Omit<NameColorSheetProps, 'visible'>) {
  const theme = useTheme();
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor || DEFAULT_MARK_COLOR);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.card }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.headerRow}>
            <ThemedText type="smallBold">{title}</ThemedText>
            <Pressable
              onPress={() => {
                hapticSelection();
                onDismiss();
              }}
              hitSlop={10}>
              <Ionicons name="close" size={20} color={theme.textMuted} />
            </Pressable>
          </View>
          <NameColorForm name={name} color={color} onNameChange={setName} onColorChange={setColor} />
          <Button
            mode="contained"
            onPress={() => {
              onSubmit(name, color);
              onDismiss();
            }}>
            {submitLabel}
          </Button>
          {onDelete ? (
            <Pressable
              onPress={() => {
                hapticSelection();
                onDelete();
              }}
              hitSlop={8}
              style={styles.deleteButton}>
              <ThemedText type="smallBold" themeColor="danger">
                {deleteLabel}
              </ThemedText>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
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
  },
  deleteButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});
