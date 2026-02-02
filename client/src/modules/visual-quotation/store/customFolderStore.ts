/**
 * Custom Folder Store
 *
 * Zustand store for managing custom folders with localStorage persistence.
 * Same pattern as rateCardStore for consistency.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Storage key
const STORAGE_KEY = "vq_custom_folders";

// Custom folder type
export interface CustomFolder {
  id: string;
  name: string;
  icon: string;
  color: string;
  createdAt: string;
}

// Store state
interface CustomFolderState {
  folders: CustomFolder[];
  isLoaded: boolean;
}

// Store actions
interface CustomFolderActions {
  addFolder: (folder: CustomFolder) => void;
  updateFolder: (id: string, updates: Partial<CustomFolder>) => void;
  removeFolder: (id: string) => void;
  setFolders: (folders: CustomFolder[]) => void;
  loadFromStorage: () => void;
}

// Combined store type
type CustomFolderStore = CustomFolderState & CustomFolderActions;

// Initial state
const initialState: CustomFolderState = {
  folders: [],
  isLoaded: false,
};

// Create the store with persist middleware
export const useCustomFolderStore = create<CustomFolderStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      addFolder: (folder: CustomFolder) => {
        set((state) => ({
          folders: [...state.folders, folder],
        }));
      },

      updateFolder: (id: string, updates: Partial<CustomFolder>) => {
        set((state) => ({
          folders: state.folders.map((folder) =>
            folder.id === id ? { ...folder, ...updates } : folder
          ),
        }));
      },

      removeFolder: (id: string) => {
        set((state) => ({
          folders: state.folders.filter((folder) => folder.id !== id),
        }));
      },

      setFolders: (folders: CustomFolder[]) => {
        set({ folders });
      },

      loadFromStorage: () => {
        set({ isLoaded: true });
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isLoaded = true;
        }
      },
    }
  )
);

// Selectors
export const selectFolders = (state: CustomFolderStore) => state.folders;
export const selectIsLoaded = (state: CustomFolderStore) => state.isLoaded;
export const selectFolderById = (id: string) => (state: CustomFolderStore) =>
  state.folders.find((f) => f.id === id);
