// Mock implementation of AsyncStorage for browser environment
const storage = new Map();

const AsyncStorage = {
  async getItem(key) {
    return storage.get(key) || null;
  },

  async setItem(key, value) {
    storage.set(key, value);
  },

  async removeItem(key) {
    storage.delete(key);
  },

  async clear() {
    storage.clear();
  },

  async getAllKeys() {
    return Array.from(storage.keys());
  },

  async multiGet(keys) {
    return keys.map((key) => [key, storage.get(key) || null]);
  },

  async multiSet(keyValuePairs) {
    keyValuePairs.forEach(([key, value]) => {
      storage.set(key, value);
    });
  },

  async multiRemove(keys) {
    keys.forEach((key) => storage.delete(key));
  },
};

export default AsyncStorage;
