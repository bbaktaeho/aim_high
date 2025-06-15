// Chrome Extension에서는 localStorage를 사용하므로, AsyncStorage는 빈 구현으로 모킹
const AsyncStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
  clear: async () => {},
  getAllKeys: async () => [],
  multiGet: async () => [],
  multiSet: async () => {},
  multiRemove: async () => {},
};

export default AsyncStorage;
