import * as Speech from 'expo-speech';
import type { Voice } from 'expo-speech';

/**
 * Picks the best installed voice for a given `Speech.getAvailableVoicesAsync()` result, or
 * `undefined` if the device has no Arabic voice at all.
 *
 * Passing `language: 'ar-SA'` straight to `Speech.speak()` only works if some installed voice's
 * language string matches *exactly*. On Android that's not a given: the system TTS engine (and
 * this varies a lot by manufacturer/region) commonly reports its Arabic voice under a different
 * tag entirely - `ar`, `ar-XA`, `ar-EG`, whatever region the engine's language pack shipped for -
 * and on a mismatch some engines fall back to silently emitting nothing rather than erroring,
 * which is indistinguishable from "the button didn't do anything" (matches what's being seen: it
 * works on iOS, where AVSpeechSynthesizer ships a Arabic voice out of the box under the exact
 * `ar-SA` tag we ask for). Passing an explicit `voice` identifier sidesteps the language-string
 * match entirely, so we search whatever's actually installed instead of assuming a tag.
 */
export function pickArabicVoice(voices: Voice[]): Voice | undefined {
  const arabicVoices = voices.filter((v) => v.language.toLowerCase().startsWith('ar'));
  if (arabicVoices.length === 0) return undefined;

  const exact = arabicVoices.find((v) => v.language.toLowerCase() === 'ar-sa');
  const enhanced = arabicVoices.find((v) => v.quality === 'Enhanced');
  return exact ?? enhanced ?? arabicVoices[0];
}

let arabicVoicePromise: Promise<Voice | undefined> | null = null;

/** Cached across calls - the device's installed voice list can't change mid-session, so there's
 *  no reason to re-query the native module (and re-trigger its own async engine-init dance) every
 *  time the user taps the speaker button. */
export function getArabicVoiceAsync(): Promise<Voice | undefined> {
  if (!arabicVoicePromise) {
    arabicVoicePromise = Speech.getAvailableVoicesAsync()
      .then(pickArabicVoice)
      .catch(() => undefined);
  }
  return arabicVoicePromise;
}

/**
 * Turns a vocabulary word's display text into something a device TTS voice can actually say.
 *
 * `quranic-words.json`'s `arabic` field is written for *reading*, not speech: it carries full
 * Qur'anic tashkeel (short-vowel marks, tanween, shadda) so a learner can see exactly how a word
 * is vocalized, and a handful of entries pack in extra reading-only notation (comma-separated
 * synonym lists, an ellipsis standing in for "...", a literal `+` joining a grammatical pattern's
 * pieces). The on-device voices `expo-speech` drives (Android's system TTS engine, iOS's
 * AVSpeechSynthesizer) are trained on ordinary undiacritized Arabic and don't reliably know what
 * to do with tashkeel - unlike advanced cloud neural voices, they're liable to stumble on marks
 * like the dagger alef (`ٰ`) that barely appear outside Qur'anic typesetting, garbling a word
 * that would otherwise be one of the most common in the language. Stripping the marks back to
 * plain orthography (`هَٰذَا` -> `هذا`) hands the engine exactly the spelling it already knows how
 * to read.
 */
export function toSpeechText(arabic: string): string {
  return arabic
    .split(/[,\u060c]/)[0] // Synonym lists ("أَنْبِيَاءَ , نَبِيِّيْن" or "لِ، لَ") - the first is enough to speak.
    .replace(/\.{2,}|…/g, ' ') // Ellipsis standing in for an omitted word in a grammar pattern.
    .replace(/\+/g, '') // Literal '+' joining pieces of a grammatical pattern.
    .replace(/\u0640/g, '') // Tatweel on affix cards (ـهُ) is visual, not spoken.
    .replace(/\u0671/g, '\u0627') // Alef wasla (ٱ) -> plain alef: same sound, far more TTS-recognized.
    .replace(/[\u064B-\u065F\u0670]/g, '') // Tashkeel: tanween, fatha/damma/kasra, shadda, sukun, dagger alef.
    .replace(/[\u200B-\u200F]/g, '') // Stray zero-width/direction-mark artifacts from the source data.
    .replace(/\s+/g, ' ')
    .trim();
}
