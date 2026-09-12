import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Portal } from 'react-native-paper';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSnackbarStore } from '@/store/snackbar-store';

const SHOW_MS = 5000;

/** Bottom snackbar: fades and slides up on show, then fades and slides away. */
export function AppSnackbar() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const visible = useSnackbarStore((state) => state.visible);
  const message = useSnackbarStore((state) => state.message);
  const epoch = useSnackbarStore((state) => state.epoch);
  const hide = useSnackbarStore((state) => state.hide);
  const [mounted, setMounted] = useState(false);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible, epoch]);

  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      progress.value = 0;
      progress.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
      const timer = setTimeout(hide, SHOW_MS);
      return () => clearTimeout(timer);
    }
    progress.value = withTiming(0, { duration: 260, easing: Easing.in(Easing.cubic) }, (finished) => {
      if (finished) runOnJS(setMounted)(false);
    });
  }, [mounted, visible, epoch, hide, progress]);

  const motion = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 20 }],
  }));

  if (!mounted) return null;

  return (
    <Portal>
      <View pointerEvents="box-none" style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Animated.View style={[styles.bar, { backgroundColor: theme.danger }, motion]}>
          <ThemedText type="smallBold" style={styles.copy}>
            {message}
          </ThemedText>
        </Animated.View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
  },
  bar: {
    minHeight: 48,
    borderRadius: Radius.small,
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  copy: {
    color: '#FFFFFF',
  },
});
