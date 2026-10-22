/**
 * Same semantic haptics as the mobile app. Browsers that support the Vibration API (Android
 * Chrome) get a short pulse; everywhere else these are no-ops.
 */

function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    // Ignore unsupported devices.
  }
}

export function hapticSelection() {}
export function hapticLight() {
  vibrate(8);
}
export function hapticMedium() {
  vibrate(12);
}
export function hapticHeavy() {
  vibrate(22);
}
export function hapticLongPress() {
  vibrate(14);
}
export function hapticSuccess() {
  vibrate([10, 40, 14]);
}
export function hapticWarning() {
  vibrate([18, 50, 18]);
}
export function hapticToggle(_on: boolean) {}
