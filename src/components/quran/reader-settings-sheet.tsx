import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ReaderDisplaySettings, type ReaderDisplaySettingsProps } from '@/components/quran/reader-display-settings';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelection } from '@/lib/haptics';

interface ReaderSettingsSheetProps extends ReaderDisplaySettingsProps {
  visible: boolean;
  onDismiss: () => void;
}

export function ReaderSettingsSheet({ visible, onDismiss, ...displaySettings }: ReaderSettingsSheetProps) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.card }]} onPress={(event) => event.stopPropagation()}>
          <View style={styles.headerRow}>
            <ThemedText type="smallBold">Display settings</ThemedText>
            <Pressable onPress={() => { hapticSelection(); onDismiss(); }} hitSlop={10}>
              <Ionicons name="close" size={20} color={theme.textMuted} />
            </Pressable>
          </View>
          <ReaderDisplaySettings {...displaySettings} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: Radius.large, borderTopRightRadius: Radius.large, padding: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.three },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.one },
});
