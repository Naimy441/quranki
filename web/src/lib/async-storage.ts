/**
 * Promise-based key-value storage with the same surface as
 * `@react-native-async-storage/async-storage`, backed by localStorage. Lets the web app share the
 * mobile app's storage modules and keys unchanged.
 */

function store(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

const AsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    return store()?.getItem(key) ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      store()?.setItem(key, value);
    } catch (error) {
      console.warn('Could not save', key, error);
    }
  },
  async removeItem(key: string): Promise<void> {
    store()?.removeItem(key);
  },
  async multiRemove(keys: readonly string[]): Promise<void> {
    const s = store();
    for (const key of keys) s?.removeItem(key);
  },
};

export default AsyncStorage;
