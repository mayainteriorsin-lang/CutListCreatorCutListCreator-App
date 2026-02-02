/**
 * Persistence Module Exports
 */

export {
  default as storageAdapter,
  getString,
  setString,
  getJSON,
  setJSON,
  remove,
  clearPrefixed,
  getStorageUsage,
  isStorageAvailable,
  createNamespacedAdapter,
  STORAGE_KEYS,
  type StorageKey,
} from "./storageAdapter";

// Database persistence (Phase 1: SaaS Refactoring)
export { QuotationRepository } from './QuotationRepository';
export { useAutoSave } from './useAutoSave';
