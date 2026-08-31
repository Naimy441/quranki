import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { useFocusedProgressValue } from '@/hooks/use-focused-meter';

interface MeterBarProps {
  /** Fill amount from 0 to 1. */
  progress: number;
  color: string;
  enabled: boolean;
  axis?: 'x' | 'y';
  style?: StyleProp<ViewStyle>;
}

/** Grows along the track with a transform so the UI thread is not laying out every frame. */
export function MeterBar({ progress, color, enabled, axis = 'y', style }: MeterBarProps) {
  const value = useFocusedProgressValue(progress, enabled);
  const fillStyle = useAnimatedStyle(() =>
    axis === 'x' ? { transform: [{ scaleX: value.value }] } : { transform: [{ scaleY: value.value }] },
  );

  return (
    <View style={axis === 'x' ? styles.trackX : styles.trackY} collapsable={false}>
      <Animated.View
        collapsable={false}
        style={[
          axis === 'x' ? styles.fillX : styles.fillY,
          { backgroundColor: color },
          fillStyle,
          style,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  trackX: { width: '100%', height: '100%' },
  trackY: { width: '100%', height: '100%', justifyContent: 'flex-end' },
  fillX: { width: '100%', height: '100%', transformOrigin: 'left center' },
  fillY: { width: '100%', height: '100%', transformOrigin: 'center bottom' },
});
