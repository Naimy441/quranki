import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface FootnoteSheetProps {
  footnote: { n: string; fn: string } | null;
  onDismiss: () => void;
}

/** A small slide-up sheet showing one footnote's explanation. */
export function FootnoteSheet({ footnote, onDismiss }: FootnoteSheetProps) {
  const theme = useTheme();

  return (
    // "fade" (not "slide") to match the other reader sheets: RN's iOS "slide" transition animates
    // the whole native modal host sliding up from off-screen, whose background briefly renders
    // opaque black before the "transparent" backdrop beneath it can show through - a full black
    // screen momentarily covering everything instead of just the small sheet peeking up.
    <Modal visible={footnote !== null} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.card }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.headerRow}>
            <ThemedText type="smallBold" themeColor="primary">
              Note {footnote ? `[${footnote.n}]` : ''}
            </ThemedText>
            <Pressable onPress={onDismiss} hitSlop={10}>
              <Ionicons name="close" size={20} color={theme.textMuted} />
            </Pressable>
          </View>
          <ScrollView style={styles.scrollBody} bounces={false}>
            <ThemedText style={styles.body}>{footnote?.fn}</ThemedText>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
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
    maxHeight: '70%',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scrollBody: {
    flexShrink: 1,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
});
