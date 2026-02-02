/**
 * Storage Adapter
 *
 * Wraps localStorage with error handling and type safety.
 * Provides a consistent interface for persistence across the module.
 */

import { logger } from '../services/logger';

// Storage key prefix for namespacing
const STORAGE_PREFIX = "vq-";

// Known storage keys for better type safety
export const STORAGE_KEYS = {
  // Main store (managed by Zustand persist)
  MAIN_STORE: "visual-quotation-store-v1",

  // Production page materials
  SHUTTER_MATERIAL: `${STORAGE_PREFIX}shutter-material`,
  LOFT_MATERIAL: `${STORAGE_PREFIX}loft-material`,
  PANEL_OVERRIDES: `${STORAGE_PREFIX}panel-overrides`,
  GADDI_SETTINGS: `${STORAGE_PREFIX}gaddi-settings`,
  UNIT_GAP_SETTINGS: `${STORAGE_PREFIX}unit-gap-settings`,
  DELETED_PANELS: `${STORAGE_PREFIX}deleted-panels`,
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS] | string;

/**
 * Check if localStorage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const test = "__storage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get a string value from localStorage
 * @param key - Storage key
 * @param fallback - Default value if key doesn't exist or error occurs
 * @returns The stored value or fallback
 */
export function getString(key: StorageKey, fallback: string = ""): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch (error) {
    logger.warn('Storage getString failed', { key, error: String(error), context: 'storage-adapter' });
    return fallback;
  }
}

/**
 * Set a string value in localStorage
 * @param key - Storage key
 * @param value - Value to store
 * @returns true if successful, false otherwise
 */
export function setString(key: StorageKey, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    logger.warn('Storage setString failed', { key, error: String(error), context: 'storage-adapter' });
    return false;
  }
}

/**
 * Get a JSON value from localStorage with type safety
 * @param key - Storage key
 * @param fallback - Default value if key doesn't exist, is invalid, or error occurs
 * @returns The parsed value or fallback
 */
export function getJSON<T>(key: StorageKey, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;

    const parsed = JSON.parse(stored);
    return parsed as T;
  } catch (error) {
    logger.warn('Storage getJSON failed', { key, error: String(error), context: 'storage-adapter' });
    return fallback;
  }
}

/**
 * Set a JSON value in localStorage
 * @param key - Storage key
 * @param value - Value to store (will be JSON.stringify'd)
 * @returns true if successful, false otherwise
 */
export function setJSON<T>(key: StorageKey, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.warn('Storage setJSON failed', { key, error: String(error), context: 'storage-adapter' });
    return false;
  }
}

/**
 * Remove a key from localStorage
 * @param key - Storage key
 * @returns true if successful, false otherwise
 */
export function remove(key: StorageKey): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    logger.warn('Storage remove failed', { key, error: String(error), context: 'storage-adapter' });
    return false;
  }
}

/**
 * Clear all keys with the vq- prefix
 * @returns true if successful, false otherwise
 */
export function clearPrefixed(): boolean {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    return true;
  } catch (error) {
    logger.warn('Storage clearPrefixed failed', { error: String(error), context: 'storage-adapter' });
    return false;
  }
}

/**
 * Get the current storage usage in bytes (approximate)
 */
export function getStorageUsage(): { used: number; keys: number } {
  try {
    let totalSize = 0;
    let keyCount = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += key.length + value.length;
          keyCount++;
        }
      }
    }
    return { used: totalSize * 2, keys: keyCount }; // *2 for UTF-16
  } catch {
    return { used: 0, keys: 0 };
  }
}

/**
 * Create a namespaced storage adapter for a specific feature
 * @param namespace - Namespace prefix for keys
 */
export function createNamespacedAdapter(namespace: string) {
  const prefix = `${STORAGE_PREFIX}${namespace}-`;

  return {
    getString: (key: string, fallback: string = "") => getString(`${prefix}${key}`, fallback),
    setString: (key: string, value: string) => setString(`${prefix}${key}`, value),
    getJSON: <T>(key: string, fallback: T) => getJSON<T>(`${prefix}${key}`, fallback),
    setJSON: <T>(key: string, value: T) => setJSON<T>(`${prefix}${key}`, value),
    remove: (key: string) => remove(`${prefix}${key}`),
    clear: () => {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(prefix)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
        return true;
      } catch {
        return false;
      }
    },
  };
}

// Default export as a storage adapter object
export const storageAdapter = {
  isAvailable: isStorageAvailable,
  getString,
  setString,
  getJSON,
  setJSON,
  remove,
  clearPrefixed,
  getStorageUsage,
  createNamespacedAdapter,
  KEYS: STORAGE_KEYS,
};

export default storageAdapter;
