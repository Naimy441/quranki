import { Ionicons } from '@expo/vector-icons';
import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelection } from '@/lib/haptics';

const BUTTON = 28;
const GAP = 8;
const SLOT = BUTTON + GAP;
const OPEN_MS = 220;
const CLOSE_MS = 160;
const SNAP = Easing.bezier(0.2, 0.85, 0.25, 1);

export interface SlideOutAction {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}

interface SlideOutActionsProps {
  open: boolean;
  onToggle: () => void;
  actions: SlideOutAction[];
  triggerLabel: string;
}

export function SlideOutActions({ open, onToggle, actions, triggerLabel }: SlideOutActionsProps) {
  const theme = useTheme();
  const progress = useSharedValue(open ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, {
      duration: open ? OPEN_MS : CLOSE_MS,
      easing: SNAP,
    });
  }, [open, progress]);

  return (
    <View style={styles.cluster} pointerEvents="box-none">
      {actions.map((action, index) => (
        <SlidingAction key={action.key} index={index} progress={progress} open={open}>
          <Pressable
            onPress={action.onPress}
            accessibilityLabel={action.label}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}>
            <Ionicons name={action.icon} size={16} color={action.color} />
          </Pressable>
        </SlidingAction>
      ))}
      <Pressable
        onPress={() => {
          hapticSelection();
          onToggle();
        }}
        hitSlop={12}
        accessibilityLabel={open ? 'Hide actions' : triggerLabel}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [
          styles.button,
          styles.trigger,
          open && { backgroundColor: theme.backgroundSelected },
          pressed && styles.pressed,
        ]}>
        <Ionicons
          name={open ? 'close' : 'ellipsis-horizontal'}
          size={20}
          color={open ? theme.primary : theme.textMuted}
        />
      </Pressable>
    </View>
  );
}

function SlidingAction({
  index,
  progress,
  open,
  children,
}: {
  index: number;
  progress: SharedValue<number>;
  open: boolean;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    const start = index * 0.08;
    const t = interpolate(progress.value, [start, start + 0.55], [0, 1], Extrapolation.CLAMP);
    const rest = (index + 1) * SLOT;
    return {
      opacity: t,
      transform: [{ translateX: (1 - t) * rest }, { scale: 0.45 + 0.55 * t }],
    };
  });

  return (
    <Animated.View
      pointerEvents={open ? 'auto' : 'none'}
      style={[styles.slide, { right: BUTTON + GAP + index * SLOT }, style]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cluster: {
    width: BUTTON,
    height: BUTTON,
    overflow: 'visible',
    zIndex: 2,
  },
  slide: {
    position: 'absolute',
    top: 0,
  },
  trigger: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  button: {
    width: BUTTON,
    height: BUTTON,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
