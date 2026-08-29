import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Centered in-app confirm. Used instead of `Alert.alert` so copy stays LTR and spacing is ours. */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  destructive,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[styles.card, { backgroundColor: theme.card }]}
          onPress={(e) => e.stopPropagation()}>
          <ThemedText type="smallBold" style={styles.copy}>
            {title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.copy}>
            {message}
          </ThemedText>
          <View style={styles.actions}>
            <Button mode="outlined" onPress={onCancel} style={styles.action}>
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={onConfirm}
              style={styles.action}
              buttonColor={destructive ? theme.danger : undefined}
              textColor={destructive ? '#FFFFFF' : undefined}>
              {confirmLabel}
            </Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.two,
    direction: 'ltr',
  },
  copy: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  action: {
    flex: 1,
  },
});
