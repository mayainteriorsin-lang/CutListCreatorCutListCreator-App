/**
 * useClientNotesStore
 *
 * Store for managing client notes with photos per unit.
 * Single notes page per client with auto-generated structure from Floor > Room > Unit.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NotePhoto {
  id: string;
  src: string;           // Base64 data URL
  type: 'site' | 'reference' | 'existing' | 'inspiration';
  caption?: string;
  timestamp: Date;
}

export interface UnitNote {
  text: string;
  photos: NotePhoto[];
  priority: 'normal' | 'important' | 'urgent';
}

export interface ClientNotesState {
  // General notes for the entire quotation
  generalNotes: string;
  generalPhotos: NotePhoto[];

  // Per-unit notes keyed by unitId
  unitNotes: Record<string, UnitNote>;

  // Metadata
  lastUpdated: Date | null;

  // Actions
  setGeneralNotes: (notes: string) => void;
  addGeneralPhoto: (photo: Omit<NotePhoto, 'id' | 'timestamp'>) => void;
  removeGeneralPhoto: (photoId: string) => void;

  setUnitNote: (unitId: string, text: string) => void;
  setUnitPriority: (unitId: string, priority: UnitNote['priority']) => void;
  addUnitPhoto: (unitId: string, photo: Omit<NotePhoto, 'id' | 'timestamp'>) => void;
  removeUnitPhoto: (unitId: string, photoId: string) => void;

  // Get note for a unit (returns default if not exists)
  getUnitNote: (unitId: string) => UnitNote;

  // Check if any notes exist
  hasNotes: () => boolean;

  // Count total notes and photos
  getNotesCount: () => { notes: number; photos: number };

  // Clear all notes
  clearAllNotes: () => void;
}

const DEFAULT_UNIT_NOTE: UnitNote = {
  text: '',
  photos: [],
  priority: 'normal',
};

const generateId = () => `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export const useClientNotesStore = create<ClientNotesState>()(
  persist(
    (set, get) => ({
      generalNotes: '',
      generalPhotos: [],
      unitNotes: {},
      lastUpdated: null,

      setGeneralNotes: (notes) => set({
        generalNotes: notes,
        lastUpdated: new Date(),
      }),

      addGeneralPhoto: (photo) => set((state) => ({
        generalPhotos: [
          ...state.generalPhotos,
          {
            ...photo,
            id: generateId(),
            timestamp: new Date(),
          },
        ],
        lastUpdated: new Date(),
      })),

      removeGeneralPhoto: (photoId) => set((state) => ({
        generalPhotos: state.generalPhotos.filter((p) => p.id !== photoId),
        lastUpdated: new Date(),
      })),

      setUnitNote: (unitId, text) => set((state) => ({
        unitNotes: {
          ...state.unitNotes,
          [unitId]: {
            ...DEFAULT_UNIT_NOTE,
            ...state.unitNotes[unitId],
            text,
          },
        },
        lastUpdated: new Date(),
      })),

      setUnitPriority: (unitId, priority) => set((state) => ({
        unitNotes: {
          ...state.unitNotes,
          [unitId]: {
            ...DEFAULT_UNIT_NOTE,
            ...state.unitNotes[unitId],
            priority,
          },
        },
        lastUpdated: new Date(),
      })),

      addUnitPhoto: (unitId, photo) => set((state) => {
        const existingNote = state.unitNotes[unitId] || DEFAULT_UNIT_NOTE;
        return {
          unitNotes: {
            ...state.unitNotes,
            [unitId]: {
              ...existingNote,
              photos: [
                ...existingNote.photos,
                {
                  ...photo,
                  id: generateId(),
                  timestamp: new Date(),
                },
              ],
            },
          },
          lastUpdated: new Date(),
        };
      }),

      removeUnitPhoto: (unitId, photoId) => set((state) => {
        const existingNote = state.unitNotes[unitId];
        if (!existingNote) return state;
        return {
          unitNotes: {
            ...state.unitNotes,
            [unitId]: {
              ...existingNote,
              photos: existingNote.photos.filter((p) => p.id !== photoId),
            },
          },
          lastUpdated: new Date(),
        };
      }),

      getUnitNote: (unitId) => {
        const state = get();
        return state.unitNotes[unitId] || DEFAULT_UNIT_NOTE;
      },

      hasNotes: () => {
        const state = get();
        if (state.generalNotes.trim()) return true;
        if (state.generalPhotos.length > 0) return true;
        for (const note of Object.values(state.unitNotes)) {
          if (note.text.trim() || note.photos.length > 0) return true;
        }
        return false;
      },

      getNotesCount: () => {
        const state = get();
        let notes = 0;
        let photos = state.generalPhotos.length;

        if (state.generalNotes.trim()) notes++;

        for (const note of Object.values(state.unitNotes)) {
          if (note.text.trim()) notes++;
          photos += note.photos.length;
        }

        return { notes, photos };
      },

      clearAllNotes: () => set({
        generalNotes: '',
        generalPhotos: [],
        unitNotes: {},
        lastUpdated: null,
      }),
    }),
    {
      name: 'client-notes-storage',
      partialize: (state) => ({
        generalNotes: state.generalNotes,
        generalPhotos: state.generalPhotos,
        unitNotes: state.unitNotes,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);

export default useClientNotesStore;
