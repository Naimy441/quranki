import { Platform } from 'react-native';

export const FIREBASE_PROJECT_ID = 'quranki-506915';

const ANDROID_APP = {
  apiKey: 'AIzaSyAZzXdGtzfwAdOtcIDejZGLJ7ruw3jHY5o',
  appId: '1:840813317138:android:1f1e664357848bc0375ccb',
};

const IOS_APP = {
  apiKey: 'AIzaSyDF7zLexThLA3SbEUN64YiGDeLWLQURtnE',
  appId: '1:840813317138:ios:9c9ba27b9bf44a19375ccb',
};

export function firebaseAppConfig(): { apiKey: string; appId: string } | null {
  if (Platform.OS === 'android') return ANDROID_APP;
  if (Platform.OS === 'ios') return IOS_APP;
  return null;
}

export function firebaseApiKey(): string | null {
  if (Platform.OS === 'android') return ANDROID_APP.apiKey;
  if (Platform.OS === 'ios' || Platform.OS === 'web') return IOS_APP.apiKey;
  return null;
}
