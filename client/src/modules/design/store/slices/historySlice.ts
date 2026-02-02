/**
 * History Slice
 * Undo/redo, clipboard state and actions
 */

import type { StateCreator } from "zustand";
import type { Shape, LineShape, RectShape, HistoryEntry } from "../../types";
import { uid } from "../../utils/geometry";
import { MAX_HISTORY_SIZE, INITIAL_HISTORY_INDEX } from "../../utils/constants";

// =============================================================================
// INTERFACE
// =============================================================================

export interface HistorySlice {
  // State
  history: HistoryEntry[];
  historyIndex: number;
  clipboard: Shape[] | null;

  // Actions
  pushHistory: (shapes: Shape[], description: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  copyToClipboard: () => void;
  pasteFromClipboard: () => void;
  setClipboard: (shapes: Shape[] | null) => void;
  clearHistory: () => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

export const initialHistoryState = {
  history: [] as HistoryEntry[],
  historyIndex: INITIAL_HISTORY_INDEX,
  clipboard: null as Shape[] | null,
};

// =============================================================================
// SLICE CREATOR (requires ShapesSlice for shapes/selection)
// =============================================================================

// Type for combined store that includes shapes
interface StoreWithShapes extends HistorySlice {
  shapes: Shape[];
  selectedId: string | null;
  selectedIds: Set<string>;
}

export const createHistorySlice: StateCreator<
  StoreWithShapes,
  [["zustand/devtools", never]],
  [],
  HistorySlice
> = (set, get) => ({
  ...initialHistoryState,

  pushHistory: (shapes, description) =>
    set(
      (state) => {
        // Trim future history if we're not at the end
        const newHistory = state.history.slice(0, state.historyIndex + 1);

        // Add new entry
        newHistory.push({ shapes: [...shapes], description });

        // Limit history size
        if (newHistory.length > MAX_HISTORY_SIZE) {
          newHistory.shift();
        }

        return {
          history: newHistory,
          historyIndex: newHistory.length - 1,
        };
      },
      false,
      "pushHistory"
    ),

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      set(
        {
          historyIndex: newIndex,
          shapes: [...history[newIndex].shapes],
          selectedId: null,
          selectedIds: new Set(),
        } as Partial<StoreWithShapes>,
        false,
        "undo"
      );
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      set(
        {
          historyIndex: newIndex,
          shapes: [...history[newIndex].shapes],
          selectedId: null,
          selectedIds: new Set(),
        } as Partial<StoreWithShapes>,
        false,
        "redo"
      );
    }
  },

  canUndo: () => {
    const { historyIndex } = get();
    return historyIndex > 0;
  },

  canRedo: () => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },

  copyToClipboard: () => {
    const { shapes, selectedId, selectedIds } = get();
    const idsToSelect = new Set(selectedIds);
    if (selectedId) idsToSelect.add(selectedId);

    if (idsToSelect.size === 0) return;

    const shapesToCopy = shapes.filter((s) => idsToSelect.has(s.id));
    set({ clipboard: shapesToCopy }, false, "copyToClipboard");
  },

  pasteFromClipboard: () => {
    const state = get();
    const { clipboard, shapes } = state;
    const pushHistory = state.pushHistory;

    if (!clipboard || clipboard.length === 0) return;

    // Offset pasted shapes and assign new IDs
    const pastedShapes = clipboard.map((shape) => {
      const newId = uid(shape.type + "-");
      const offset = 20; // Offset in mm

      if (shape.type === "line") {
        const l = shape as LineShape;
        return { ...l, id: newId, x1: l.x1 + offset, y1: l.y1 + offset, x2: l.x2 + offset, y2: l.y2 + offset };
      } else if (shape.type === "rect") {
        const r = shape as RectShape;
        return { ...r, id: newId, x: r.x + offset, y: r.y + offset };
      } else {
        return { ...shape, id: newId };
      }
    });

    const newShapes = [...shapes, ...pastedShapes];
    pushHistory(newShapes, "Paste");

    set(
      {
        shapes: newShapes,
        selectedIds: new Set(pastedShapes.map((s) => s.id)),
        selectedId: pastedShapes.length === 1 ? pastedShapes[0].id : null,
      } as Partial<StoreWithShapes>,
      false,
      "pasteFromClipboard"
    );
  },

  setClipboard: (shapes) => set({ clipboard: shapes }, false, "setClipboard"),

  clearHistory: () =>
    set(
      {
        history: [],
        historyIndex: INITIAL_HISTORY_INDEX,
      },
      false,
      "clearHistory"
    ),
});
