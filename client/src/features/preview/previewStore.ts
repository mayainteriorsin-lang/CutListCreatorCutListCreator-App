/**
 * PATCH 28: Preview State Isolation
 *
 * Zustand slice for preview-only state.
 * Manages deleted sheets/panels and selection state.
 * Preview dialog open/close is in uiStore.
 */

import { create } from "zustand";

interface PreviewState {
  // Deleted items tracking
  deletedSheets: Set<string>;
  deletedPanels: Set<string>;

  // Selection state
  selectedSheetId: string | null;
  selectedPanelId: string | null;
  selectedSheetContext: {
    brand: string;
    laminateCode: string;
    isBackPanel: boolean;
    sheetId: string;
  } | null;

  // Actions
  deleteSheet: (id: string) => void;
  restoreSheet: (id: string) => void;

  deletePanel: (sheetId: string, panelId: string) => void;
  restorePanel: (sheetId: string, panelId: string) => void;

  setSelectedSheetContext: (ctx: PreviewState["selectedSheetContext"]) => void;

  clearSelections: () => void;
  clearAll: () => void;
}

export const usePreviewStore = create<PreviewState>((set, get) => ({
  deletedSheets: new Set(),
  deletedPanels: new Set(),

  selectedSheetId: null,
  selectedPanelId: null,
  selectedSheetContext: null,

  deleteSheet: (id) =>
    set((s) => ({
      deletedSheets: new Set([...s.deletedSheets, id]),
    })),

  restoreSheet: (id) =>
    set((s) => {
      const next = new Set(s.deletedSheets);
      next.delete(id);
      return { deletedSheets: next };
    }),

  deletePanel: (sheetId, panelId) =>
    set((s) => ({
      deletedPanels: new Set([...s.deletedPanels, `${sheetId}-${panelId}`]),
    })),

  restorePanel: (sheetId, panelId) =>
    set((s) => {
      const key = `${sheetId}-${panelId}`;
      const next = new Set(s.deletedPanels);
      next.delete(key);
      return { deletedPanels: next };
    }),

  setSelectedSheetContext: (ctx) => set({ selectedSheetContext: ctx }),

  clearSelections: () =>
    set({
      selectedSheetId: null,
      selectedPanelId: null,
      selectedSheetContext: null,
    }),

  clearAll: () =>
    set({
      deletedSheets: new Set(),
      deletedPanels: new Set(),
      selectedSheetId: null,
      selectedPanelId: null,
      selectedSheetContext: null,
    }),
}));
