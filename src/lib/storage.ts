interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getStorage(): StorageLike | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  return window.localStorage;
}

export const StorageService = {
  setString(key: string, value: string): void {
    const storage = getStorage();
    if (!storage) return;

    try {
      storage.setItem(key, value);
    } catch {
      // Ignore quota/security errors in client storage.
    }
  },

  getString(key: string): string | null {
    const storage = getStorage();
    if (!storage) return null;

    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  },

  setJson<T>(key: string, value: T): void {
    this.setString(key, JSON.stringify(value));
  },

  getJson<T>(key: string): T | null {
    const raw = this.getString(key);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  remove(key: string): void {
    const storage = getStorage();
    if (!storage) return;

    try {
      storage.removeItem(key);
    } catch {
      // Ignore quota/security errors in client storage.
    }
  },
};
