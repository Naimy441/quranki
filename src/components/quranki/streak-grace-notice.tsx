import { Modal, Pressable, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface StreakGraceNoticeProps {
  visible: boolean;
  streak: number;
  onDismiss: () => void;
}

/** A brief reminder that yesterday's missed study can be reclaimed today. */
export function StreakGraceNotice({ visible, streak, onDismiss }: StreakGraceNoticeProps) {
  const theme = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={[styles.card, { backgroundColor: theme.card }]} onPress={(event) => event.stopPropagation()}>
          <ThemedText type="smallBold" style={styles.copy}>Your streak can be saved</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.copy}>
            You missed yesterday. Complete a review today to keep your {streak}-day streak going.
          </ThemedText>
          <Button mode="contained" onPress={onDismiss}>Got it</Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  card: { width: '100%', maxWidth: 320, borderRadius: Radius.large, padding: Spacing.four, gap: Spacing.three, direction: 'ltr' },
  copy: { textAlign: 'center' },
});
