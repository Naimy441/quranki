import { Platform, type ViewStyle } from 'react-native';

/**
 * Keep layout LTR beside Arabic text. `direction` inside `StyleSheet.create` is
 * rejected on web ("Invalid style property of direction") and then deleted, so
 * this object is empty there. Native still receives `direction: 'ltr'`.
 */
export const ltrLockStyle: ViewStyle | null = Platform.OS === 'web' ? null : { direction: 'ltr' };
