export const FIREBASE_PROJECT_ID = 'quranki-506915';

/** The mobile app's iOS key, which it also uses for web builds. */
const WEB_API_KEY = 'AIzaSyDF7zLexThLA3SbEUN64YiGDeLWLQURtnE';

export function firebaseApiKey(): string | null {
  return WEB_API_KEY;
}
