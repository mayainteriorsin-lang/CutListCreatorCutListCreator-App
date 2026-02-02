/**
 * Shapes Slice
 * Shapes array, selection, temp shape state and actions
 */

import type { StateCreator } from "zustand";
import type { Shape, Id, AlignmentGuide } from "../../types";

// =============================================================================
// INTERFACE
// =============================================================================

export interface ShapesSlice {
  // State
  shapes: Shape[];
  selectedId: Id | null;
  selectedIds: Set<Id>;
  temp: Partial<Shape> | null;
  isDragging: boolean;
  alignmentGuides: AlignmentGuide[];
  cursorPos: { x: number; y: number } | null;
  hoveredPanelId: Id | null;
  hoveredEdge: "left" | "right" | "top" | "bottom" | null;

  // Actions
  setShapes: (shapes: Shape[]) => void;
  addShape: (shape: Shape) => void;
  updateShape: (id: Id, updates: Partial<Shape>) => void;
  deleteShape: (id: Id) => void;
  deleteSelectedShapes: () => void;
  setSelectedId: (id: Id | null) => void;
  setSelectedIds: (ids: Set<Id>) => void;
  addToSelection: (id: Id) => void;
  removeFromSelection: (id: Id) => void;
  clearSelection: () => void;
  selectAll: () => void;
  setTemp: (temp: Partial<Shape> | null) => void;
  setIsDragging: (dragging: boolean) => void;
  setAlignmentGuides: (guides: AlignmentGuide[]) => void;
  setCursorPos: (pos: { x: number; y: number } | null) => void;
  setHoveredPanelId: (id: Id | null) => void;
  setHoveredEdge: (edge: "left" | "right" | "top" | "bottom" | null) => void;
  clearAll: () => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

export const initialShapesState = {
  shapes: [] as Shape[],
  selectedId: null as Id | null,
  selectedIds: new Set<Id>(),
  temp: null as Partial<Shape> | null,
  isDragging: false,
  alignmentGuides: [] as AlignmentGuide[],
  cursorPos: null as { x: number; y: number } | null,
  hoveredPanelId: null as Id | null,
  hoveredEdge: null as "left" | "right" | "top" | "bottom" | null,
};

// =============================================================================
// SLICE CREATOR (requires HistorySlice for pushHistory)
// =============================================================================

// Type for combined store that includes history
interface StoreWithHistory extends ShapesSlice {
  pushHistory: (shapes: Shape[], description: string) => void;
}

export const createShapesSlice: StateCreator<
  StoreWithHistory,
  [["zustand/devtools", never]],
  [],
  ShapesSlice
> = (set, get) => ({
  ...initialShapesState,

  setShapes: (shapes) => set({ shapes }, false, "setShapes"),

  addShape: (shape) =>
    set(
      (state) => ({ shapes: [...state.shapes, shape] }),
      false,
      "addShape"
    ),

  updateShape: (id, updates) =>
    set(
      (state) => ({
        shapes: state.shapes.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      }),
      false,
      "updateShape"
    ),

  deleteShape: (id) =>
    set(
      (state) => ({
        shapes: state.shapes.filter((s) => s.id !== id),
        selectedId: state.selectedId === id ? null : state.selectedId,
        selectedIds: new Set([...state.selectedIds].filter((i) => i !== id)),
      }),
      false,
      "deleteShape"
    ),

  deleteSelectedShapes: () => {
    const { shapes, selectedId, selectedIds, pushHistory } = get();
    const idsToDelete = new Set(selectedIds);
    if (selectedId) idsToDelete.add(selectedId);

    if (idsToDelete.size === 0) return;

    const newShapes = shapes.filter((s) => !idsToDelete.has(s.id));
    pushHistory(newShapes, "Delete");
    set(
      {
        shapes: newShapes,
        selectedId: null,
        selectedIds: new Set(),
      },
      false,
      "deleteSelectedShapes"
    );
  },

  setSelectedId: (id) => set({ selectedId: id }, false, "setSelectedId"),

  setSelectedIds: (ids) => set({ selectedIds: ids }, false, "setSelectedIds"),

  addToSelection: (id) =>
    set(
      (state) => ({
        selectedIds: new Set([...state.selectedIds, id]),
      }),
      false,
      "addToSelection"
    ),

  removeFromSelection: (id) =>
    set(
      (state) => ({
        selectedIds: new Set([...state.selectedIds].filter((i) => i !== id)),
      }),
      false,
      "removeFromSelection"
    ),

  clearSelection: () =>
    set(
      { selectedId: null, selectedIds: new Set() },
      false,
      "clearSelection"
    ),

  selectAll: () =>
    set(
      (state) => ({
        selectedIds: new Set(state.shapes.map((s) => s.id)),
      }),
      false,
      "selectAll"
    ),

  setTemp: (temp) => set({ temp }, false, "setTemp"),
  setIsDragging: (dragging) => set({ isDragging: dragging }, false, "setIsDragging"),
  setAlignmentGuides: (guides) => set({ alignmentGuides: guides }, false, "setAlignmentGuides"),
  setCursorPos: (pos) => set({ cursorPos: pos }, false, "setCursorPos"),
  setHoveredPanelId: (id) => set({ hoveredPanelId: id }, false, "setHoveredPanelId"),
  setHoveredEdge: (edge) => set({ hoveredEdge: edge }, false, "setHoveredEdge"),

  clearAll: () => {
    const { pushHistory } = get();
    pushHistory([], "Clear All");
    set(
      {
        shapes: [],
        temp: null,
        selectedId: null,
        selectedIds: new Set(),
      },
      false,
      "clearAll"
    );
  },
});
