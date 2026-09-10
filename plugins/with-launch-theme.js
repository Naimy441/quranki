// @ts-check
const { withAppDelegate } = require('expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

const THEME_KEY = 'quranki.themePreference';

const IOS_APPLY_CALL = '    applyQurankiLaunchTheme(to: window)';

const IOS_APPLY_FN = `
private func applyQurankiLaunchTheme(to window: UIWindow?) {
  switch UserDefaults.standard.string(forKey: "${THEME_KEY}") {
  case "dark":
    window?.overrideUserInterfaceStyle = .dark
  case "light":
    window?.overrideUserInterfaceStyle = .light
  default:
    window?.overrideUserInterfaceStyle = .unspecified
  }
}
`;

/**
 * Styles the native window from the persisted in-app theme *before* React Native starts,
 * so a Dark setting does not sit on the light splash until JS hydrates.
 */
module.exports = function withLaunchTheme(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') return config;
    let src = config.modResults.contents;
    if (!src.includes('applyQurankiLaunchTheme(to: window)')) {
      src = mergeContents({
        src,
        tag: 'quranki-launch-theme-window',
        anchor: /window = UIWindow\(frame: UIScreen\.main\.bounds\)/,
        offset: 1,
        comment: '//',
        newSrc: IOS_APPLY_CALL,
      }).contents;
    }
    if (!src.includes('private func applyQurankiLaunchTheme')) {
      src = mergeContents({
        src,
        tag: 'quranki-launch-theme-fn',
        anchor: /^class ReactNativeDelegate:/m,
        offset: 0,
        comment: '//',
        newSrc: IOS_APPLY_FN.trim(),
      }).contents;
    }
    config.modResults.contents = src;
    return config;
  });
};
