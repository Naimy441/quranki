import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Semantic haptics: Taptic Engine on iOS, `performAndroidHapticsAsync` on Android. No-op on web. */
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

function run(ios: () => Promise<void>, androidType: Haptics.AndroidHaptics) {
  if (!isNative) return;
  const promise =
    Platform.OS === 'android' ? Haptics.performAndroidHapticsAsync(androidType) : ios();
  void promise.catch(() => {});
}

/** Discrete tick: tab bar, list rows, pickers, sliders. */
export function hapticSelection() {
  run(() => Haptics.selectionAsync(), Haptics.AndroidHaptics.Segment_Tick);
}

/** Light tap: show answer, speaker, small icon buttons. */
export function hapticLight() {
  run(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    Haptics.AndroidHaptics.Keyboard_Tap,
  );
}

/** Confirmed tap: start a session, open a surah, grade Hard. */
export function hapticMedium() {
  run(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    Haptics.AndroidHaptics.Context_Click,
  );
}

/** Strong thud: grade Again. */
export function hapticHeavy() {
  run(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
    Haptics.AndroidHaptics.Reject,
  );
}

/** Hold-to-open: long-press a word in the reader. */
export function hapticLongPress() {
  run(
    () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    Haptics.AndroidHaptics.Long_Press,
  );
}

/** Completed action: copy, mark known, grade Easy, session done. */
export function hapticSuccess() {
  run(
    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    Haptics.AndroidHaptics.Confirm,
  );
}

/** Reversible setback: forget a word, lapse a peek. */
export function hapticWarning() {
  run(
    () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    Haptics.AndroidHaptics.Reject,
  );
}

/** Switch flipped. */
export function hapticToggle(on: boolean) {
  run(
    () => Haptics.selectionAsync(),
    on ? Haptics.AndroidHaptics.Toggle_On : Haptics.AndroidHaptics.Toggle_Off,
  );
}
