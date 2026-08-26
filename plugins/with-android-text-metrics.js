// @ts-check
const { withAndroidStyles } = require('expo/config-plugins');

const STYLE_NAME = 'Widget.App.TextView';

/**
 * Android 15 (API 35) changed `TextView`'s default width measurement to `useBoundsForWidth`,
 * which sizes a line by the glyphs' visual ink bounds instead of their advance widths. That's a
 * deliberate fix for italics whose slanted strokes overhang their own advance box - but any glyph
 * with overhanging ink trips the same codepath, including our custom Arabic font's alef-madda
 * (`آ`, U+0622, the first letter of "Aal 'Imraan") and letters like `ع`/`ن` later in a run. In a
 * *content-hugging* box (no explicit width - exactly what `arabicName`/`arabicTitle`/`wordArabic`
 * are: they size to fit the text, not a fixed width), the ink-bounds measurement and the
 * advance-bounds layout width disagree by a few pixels, and Android silently drops whichever
 * glyph or trailing word doesn't fit the (slightly too narrow) box - see
 * https://github.com/facebook/react-native/issues/53286 and
 * https://github.com/facebook/react-native/issues/58064 for the upstream bug reports (this hits
 * plenty of non-Arabic custom fonts too, not just ours).
 *
 * There's no JS-side fix - the dropped glyph is decided during native measurement, before any
 * prop reaches our code. Explicitly reverting these four `TextView` attributes to their pre-15
 * defaults, via a theme-wide style Android actually reads (unlike a runtime prop, this survives
 * because it's baked into the generated theme every prebuild), restores the old, correct-for-us
 * behavior. Bare `expo prebuild` regenerates android/, so this has to be a config plugin rather
 * than a one-off edit to the generated styles.xml.
 */
module.exports = function withAndroidTextMetrics(config) {
  return withAndroidStyles(config, (config) => {
    const styles = config.modResults;
    styles.resources.style = styles.resources.style ?? [];

    let textViewStyle = styles.resources.style.find((s) => s.$.name === STYLE_NAME);
    if (!textViewStyle) {
      textViewStyle = { $: { name: STYLE_NAME, parent: 'Widget.AppCompat.TextView' }, item: [] };
      styles.resources.style.push(textViewStyle);
    }
    textViewStyle.item = textViewStyle.item ?? [];
    setStyleItem(textViewStyle, 'android:useBoundsForWidth', 'false');
    setStyleItem(textViewStyle, 'android:elegantTextHeight', 'false');
    setStyleItem(textViewStyle, 'android:shiftDrawingOffsetForStartOverhang', 'false');
    setStyleItem(textViewStyle, 'android:useLocalePreferredLineHeightForMinimum', 'false');

    const appTheme = styles.resources.style.find((s) => s.$.name === 'AppTheme');
    if (appTheme) {
      setStyleItem(appTheme, 'android:textViewStyle', `@style/${STYLE_NAME}`);
    }

    return config;
  });
};

function setStyleItem(style, name, value) {
  const existing = style.item.find((item) => item.$.name === name);
  if (existing) {
    existing._ = value;
  } else {
    style.item.push({ _: value, $: { name } });
  }
}
