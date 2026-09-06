import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticLight, hapticMedium } from '@/lib/haptics';
import {
  dismissWhatsNew,
  loadUndismissedWhatsNew,
  subscribeWhatsNewPreview,
  type WhatsNewAnnouncement,
} from '@/lib/firebase-remote-config';

const STORE_URL = Platform.select({
  ios: 'https://apps.apple.com/us/app/quranki/id6805386348',
  android: 'https://play.google.com/store/apps/details?id=com.quranki.app&hl=en_US',
  default: 'https://apps.apple.com/us/app/quranki/id6805386348',
})!;

interface WhatsNewNoticeProps {
  /** When false (onboarding), don't fetch or show. */
  enabled: boolean;
  /** Hide while another blocking popup (e.g. streak grace) is up. */
  paused?: boolean;
}

/** One-shot update sheet driven by Firebase Remote Config. X or Update now skips this version
 *  until Remote Config advertises a newer one. */
export function WhatsNewNotice({ enabled, paused = false }: WhatsNewNoticeProps) {
  const theme = useTheme();
  const [announcement, setAnnouncement] = useState<WhatsNewAnnouncement | null>(null);
  const [open, setOpen] = useState(false);

  const show = useCallback((next: WhatsNewAnnouncement | null) => {
    setAnnouncement(next);
    setOpen(next != null);
  }, []);

  useEffect(() => {
    if (!enabled) {
      show(null);
      return;
    }
    let cancelled = false;
    void loadUndismissedWhatsNew().then((next) => {
      if (!cancelled) show(next);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, show]);

  useEffect(() => subscribeWhatsNewPreview(show), []);

  const close = () => {
    if (!announcement || !open) return;
    hapticLight();
    void dismissWhatsNew(announcement.id);
    setOpen(false);
  };

  const openStore = () => {
    if (!announcement || !open) return;
    hapticMedium();
    void dismissWhatsNew(announcement.id);
    setOpen(false);
    void Linking.openURL(STORE_URL);
  };

  return (
    <Modal visible={open && !paused} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss" style={styles.close}>
            <Ionicons name="close" size={20} color={theme.textMuted} />
          </Pressable>
          <ThemedText type="smallBold" style={styles.copy}>
            {announcement?.title ?? "What's new"}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.copy}>
            {announcement?.body}
          </ThemedText>
          <Button mode="contained" onPress={openStore}>
            Update now
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  card: { width: '100%', maxWidth: 320, borderRadius: Radius.large, padding: Spacing.four, paddingTop: Spacing.five, gap: Spacing.three, direction: 'ltr' },
  close: { position: 'absolute', top: Spacing.three, right: Spacing.three, zIndex: 1 },
  copy: { textAlign: 'center' },
});
