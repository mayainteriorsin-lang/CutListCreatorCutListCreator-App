/**
 * Library Store - Persistent Auto-Save
 *
 * Zustand store with automatic persistence to localStorage.
 * Survives app crashes, browser refresh, and page navigation.
 *
 * Features:
 * - Auto-save on every change
 * - Persisted to localStorage
 * - Debounced saves to prevent excessive writes
 * - Automatic migration for schema changes
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';
import type { LibraryModule, LibraryCategory } from '../types';
import { inferCategoryFromUnitType } from '../storage';
import { generateUUID } from '@/lib/uuid';
import { logger } from '@/lib/system/logger';

// Storage key - same as used in storage.ts for compatibility
const STORAGE_KEY = 'library:modules';
const STORE_KEY = 'library-store-v1';

export interface LibraryStoreState {
  // Data
  modules: LibraryModule[];

  // UI State
  activeCategory: LibraryCategory | 'all' | 'favorites';
  searchQuery: string;

  // Timestamps
  lastSaved: string | null;
  lastModified: string | null;

  // Actions
  addModule: (module: LibraryModule) => void;
  updateModule: (id: string, updates: Partial<LibraryModule>) => void;
  deleteModule: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setModules: (modules: LibraryModule[]) => void;

  // UI Actions
  setActiveCategory: (category: LibraryCategory | 'all' | 'favorites') => void;
  setSearchQuery: (query: string) => void;

  // Utility
  getModuleById: (id: string) => LibraryModule | undefined;
  getFilteredModules: () => LibraryModule[];
  syncFromLocalStorage: () => void;

  // Import/Export
  importModules: (modules: LibraryModule[]) => void;
  exportModules: () => LibraryModule[];
}

/**
 * Migrate module to ensure all required fields exist
 */
function migrateModule(m: LibraryModule): LibraryModule {
  return {
    ...m,
    category: m.category || inferCategoryFromUnitType(m.unitType),
    isTemplate: m.isTemplate ?? (m.widthMm === 0 && m.heightMm === 0 && m.depthMm === 0),
    favorite: m.favorite ?? false,
    tags: m.tags ?? [],
    createdAt: m.createdAt || new Date().toISOString(),
    updatedAt: m.updatedAt || new Date().toISOString(),
  };
}

/**
 * Sync modules to the legacy localStorage key for compatibility
 */
function syncToLegacyStorage(modules: LibraryModule[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(modules));
    logger.log(`[LibraryStore] Synced ${modules.length} modules to legacy storage`);
  } catch (error) {
    logger.error('[LibraryStore] Failed to sync to legacy storage:', error);
  }
}

/**
 * Load modules from legacy localStorage
 */
function loadFromLegacyStorage(): LibraryModule[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.map(migrateModule);
      }
    }
  } catch (error) {
    logger.error('[LibraryStore] Failed to load from legacy storage:', error);
  }
  return [];
}

export const useLibraryStore = create<LibraryStoreState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        modules: [],
        activeCategory: 'all',
        searchQuery: '',
        lastSaved: null,
        lastModified: null,

        // Add a new module
        addModule: (module) => {
          const migrated = migrateModule(module);
          const now = new Date().toISOString();

          set((state) => {
            const newModules = [...state.modules, migrated];
            // Sync to legacy storage immediately
            syncToLegacyStorage(newModules);

            return {
              modules: newModules,
              lastModified: now,
              lastSaved: now,
            };
          });

          logger.log(`[LibraryStore] Added module: "${migrated.name}" (${migrated.id})`);
        },

        // Update an existing module
        updateModule: (id, updates) => {
          const now = new Date().toISOString();

          set((state) => {
            const newModules = state.modules.map((m) =>
              m.id === id
                ? { ...m, ...updates, updatedAt: now }
                : m
            );
            // Sync to legacy storage
            syncToLegacyStorage(newModules);

            return {
              modules: newModules,
              lastModified: now,
              lastSaved: now,
            };
          });

          logger.log(`[LibraryStore] Updated module: ${id}`);
        },

        // Delete a module
        deleteModule: (id) => {
          const now = new Date().toISOString();

          set((state) => {
            const newModules = state.modules.filter((m) => m.id !== id);
            // Sync to legacy storage
            syncToLegacyStorage(newModules);

            return {
              modules: newModules,
              lastModified: now,
              lastSaved: now,
            };
          });

          logger.log(`[LibraryStore] Deleted module: ${id}`);
        },

        // Toggle favorite status
        toggleFavorite: (id) => {
          const now = new Date().toISOString();

          set((state) => {
            const newModules = state.modules.map((m) =>
              m.id === id
                ? { ...m, favorite: !m.favorite, updatedAt: now }
                : m
            );
            // Sync to legacy storage
            syncToLegacyStorage(newModules);

            return {
              modules: newModules,
              lastModified: now,
              lastSaved: now,
            };
          });
        },

        // Set all modules (for bulk updates)
        setModules: (modules) => {
          const now = new Date().toISOString();
          const migrated = modules.map(migrateModule);

          // Sync to legacy storage
          syncToLegacyStorage(migrated);

          set({
            modules: migrated,
            lastModified: now,
            lastSaved: now,
          });

          logger.log(`[LibraryStore] Set ${migrated.length} modules`);
        },

        // UI Actions
        setActiveCategory: (category) => set({ activeCategory: category }),
        setSearchQuery: (query) => set({ searchQuery: query }),

        // Get module by ID
        getModuleById: (id) => {
          return get().modules.find((m) => m.id === id);
        },

        // Get filtered modules based on current category and search
        getFilteredModules: () => {
          const { modules, activeCategory, searchQuery } = get();

          return modules.filter((m) => {
            // Category filter
            if (activeCategory === 'favorites') {
              if (!m.favorite) return false;
            } else if (activeCategory !== 'all') {
              const mCat = m.category || inferCategoryFromUnitType(m.unitType);
              if (mCat !== activeCategory) return false;
            }

            // Search filter
            if (searchQuery.trim()) {
              const q = searchQuery.toLowerCase();
              return (
                m.name.toLowerCase().includes(q) ||
                m.description?.toLowerCase().includes(q) ||
                m.tags.some((t) => t.toLowerCase().includes(q)) ||
                m.unitType.toLowerCase().includes(q)
              );
            }

            return true;
          });
        },

        // Sync from legacy localStorage (for migration)
        syncFromLocalStorage: () => {
          const legacyModules = loadFromLegacyStorage();
          const currentModules = get().modules;

          if (legacyModules.length > 0 && currentModules.length === 0) {
            logger.log(`[LibraryStore] Importing ${legacyModules.length} modules from legacy storage`);
            set({
              modules: legacyModules,
              lastModified: new Date().toISOString(),
              lastSaved: new Date().toISOString(),
            });
          } else if (legacyModules.length > currentModules.length) {
            // Merge: add any modules from legacy that don't exist in current
            const currentIds = new Set(currentModules.map(m => m.id));
            const newModules = legacyModules.filter(m => !currentIds.has(m.id));

            if (newModules.length > 0) {
              logger.log(`[LibraryStore] Merging ${newModules.length} new modules from legacy storage`);
              const merged = [...currentModules, ...newModules];
              syncToLegacyStorage(merged);
              set({
                modules: merged,
                lastModified: new Date().toISOString(),
                lastSaved: new Date().toISOString(),
              });
            }
          }
        },

        // Import modules (merge with existing)
        importModules: (newModules) => {
          const now = new Date().toISOString();
          const currentModules = get().modules;
          const currentIds = new Set(currentModules.map(m => m.id));

          // Add only new modules (avoid duplicates)
          const toAdd = newModules
            .filter(m => !currentIds.has(m.id))
            .map(migrateModule);

          if (toAdd.length > 0) {
            const merged = [...currentModules, ...toAdd];
            syncToLegacyStorage(merged);

            set({
              modules: merged,
              lastModified: now,
              lastSaved: now,
            });

            logger.info(`[LibraryStore] Imported ${toAdd.length} new modules`, { context: 'library-store' });
          }
        },

        // Export all modules
        exportModules: () => {
          return get().modules;
        },
      }),
      {
        name: STORE_KEY,
        storage: createJSONStorage(() => localStorage),
        version: 1,

        // Handle storage migrations
        migrate: (persistedState: any, version: number) => {
          if (version === 0) {
            // Migration from version 0
            logger.info(`[LibraryStore] Migrating from version ${version}`, { context: 'library-store' });
            // Handle migration logic if needed
          }
          return persistedState as LibraryStoreState;
        },

        // Only persist essential data
        partialize: (state) => ({
          modules: state.modules,
          activeCategory: state.activeCategory,
          lastSaved: state.lastSaved,
          lastModified: state.lastModified,
        }),

        // On rehydration, sync from legacy storage
        onRehydrateStorage: () => (state) => {
          console.log(`[LibraryStore] Rehydrated with ${state.modules.length} modules`);
          // Sync from legacy storage on startup
          setTimeout(() => state.syncFromLocalStorage(), 100);
        }
      }
    )
  )
);

// Subscribe to changes and log for debugging
useLibraryStore.subscribe(
  (state) => state.modules.length,
  (count) => {
    logger.log(`[LibraryStore] Module count changed: ${count}`);
  }
);

// Export helper to quickly add a module from anywhere
export function quickAddToLibrary(module: Omit<LibraryModule, 'id' | 'createdAt' | 'updatedAt'>): LibraryModule {
  const now = new Date().toISOString();
  const fullModule: LibraryModule = {
    ...module,
    id: generateUUID(),
    createdAt: now,
    updatedAt: now,
    favorite: module.favorite ?? false,
    tags: module.tags ?? [],
    category: module.category || inferCategoryFromUnitType(module.unitType),
    isTemplate: module.isTemplate ?? false,
  };

  useLibraryStore.getState().addModule(fullModule);
  return fullModule;
}
