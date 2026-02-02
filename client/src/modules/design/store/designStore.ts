/**
 * Design Module - Zustand Store
 *
 * Central store combining all design-related state slices.
 * Replaces the 44 useState hooks in DesignCenter.tsx.
 *
 * Slices:
 * - Canvas: grid, zoom, pan, canvas size
 * - Tools: mode, line settings, snap settings
 * - Shapes: shapes array, selection, temp shape
 * - History: undo/redo, clipboard
 * - Module: module designer configuration
 * - UI: panel visibility, measurement results
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import type { Id } from "../types";

// Import slice types and initial states
import {
  type CanvasSlice,
  type ToolsSlice,
  type ShapesSlice,
  type HistorySlice,
  type ModuleSlice,
  type UISlice,
  initialCanvasState,
  initialToolsState,
  initialShapesState,
  initialHistoryState,
  initialModuleState,
  initialUIState,
  createCanvasSlice,
  createToolsSlice,
  createShapesSlice,
  createHistorySlice,
  createModuleSlice,
  createUISlice,
} from "./slices";

// Re-export types from engine (single source of truth)
export type { ModuleConfig, WardrobeSection, WardrobeSectionType } from "../engine/shapeGenerator";

// =============================================================================
// COMBINED STORE TYPE
// =============================================================================

export interface DesignStore
  extends CanvasSlice,
    ToolsSlice,
    ShapesSlice,
    HistorySlice,
    ModuleSlice,
    UISlice {
  // Combined/utility actions
  resetStore: () => void;
}

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useDesignStore = create<DesignStore>()(
  devtools(
    subscribeWithSelector((set, get, api) => ({
      // Spread all slice implementations
      ...createCanvasSlice(set as never, get as never, api as never),
      ...createToolsSlice(set as never, get as never, api as never),
      ...createShapesSlice(set as never, get as never, api as never),
      ...createHistorySlice(set as never, get as never, api as never),
      ...createModuleSlice(set as never, get as never, api as never),
      ...createUISlice(set as never, get as never, api as never),

      // Combined/utility actions
      resetStore: () =>
        set(
          {
            ...initialCanvasState,
            ...initialToolsState,
            ...initialShapesState,
            ...initialHistoryState,
            ...initialModuleState,
            ...initialUIState,
          },
          false,
          "resetStore"
        ),
    })),
    { name: "design-store" }
  )
);

// =============================================================================
// SELECTOR HOOKS (for optimized re-renders)
// =============================================================================

/** Select only canvas-related state */
export const useCanvasState = () =>
  useDesignStore((state) => ({
    gridSize: state.gridSize,
    gridVisible: state.gridVisible,
    zoom: state.zoom,
    canvasSize: state.canvasSize,
    panPosition: state.panPosition,
  }));

/** Select only tool-related state */
export const useToolsState = () =>
  useDesignStore((state) => ({
    mode: state.mode,
    actionMode: state.actionMode,
    lineThickness: state.lineThickness,
    lineColor: state.lineColor,
    lineMarker: state.lineMarker,
    angleSnap: state.angleSnap,
    orthoMode: state.orthoMode,
  }));

/** Select only shapes-related state */
export const useShapesState = () =>
  useDesignStore((state) => ({
    shapes: state.shapes,
    selectedId: state.selectedId,
    selectedIds: state.selectedIds,
    temp: state.temp,
  }));

/** Select only history-related state */
export const useHistoryState = () =>
  useDesignStore((state) => ({
    historyIndex: state.historyIndex,
    historyLength: state.history.length,
    clipboard: state.clipboard,
  }));

/** Select only module-related state */
export const useModuleState = () =>
  useDesignStore((state) => ({
    moduleConfig: state.moduleConfig,
    showModulePanel: state.showModulePanel,
    customDepth: state.customDepth,
  }));

/** Select only UI-related state */
export const useUIState = () =>
  useDesignStore((state) => ({
    showComponentPanel: state.showComponentPanel,
    show3DPreview: state.show3DPreview,
    showMeasurementPanel: state.showMeasurementPanel,
    showAllDimensions: state.showAllDimensions,
  }));

// =============================================================================
// ACTION HOOKS (for components that only need actions)
// =============================================================================

/** Get canvas actions only */
export const useCanvasActions = () =>
  useDesignStore((state) => ({
    setGridSize: state.setGridSize,
    toggleGrid: state.toggleGrid,
    setZoom: state.setZoom,
    zoomIn: state.zoomIn,
    zoomOut: state.zoomOut,
  }));

/** Get shape actions only */
export const useShapeActions = () =>
  useDesignStore((state) => ({
    addShape: state.addShape,
    updateShape: state.updateShape,
    deleteShape: state.deleteShape,
    deleteSelectedShapes: state.deleteSelectedShapes,
    setSelectedId: state.setSelectedId,
    selectAll: state.selectAll,
    clearSelection: state.clearSelection,
  }));

/** Get history actions only */
export const useHistoryActions = () =>
  useDesignStore((state) => ({
    pushHistory: state.pushHistory,
    undo: state.undo,
    redo: state.redo,
    copyToClipboard: state.copyToClipboard,
    pasteFromClipboard: state.pasteFromClipboard,
  }));

// =============================================================================
// UTILITY SELECTORS
// =============================================================================

/** Check if any shapes are selected */
export const useHasSelection = () =>
  useDesignStore(
    (state) => state.selectedId !== null || state.selectedIds.size > 0
  );

/** Get selected shapes */
export const useSelectedShapes = () =>
  useDesignStore((state) => {
    const ids = new Set(state.selectedIds);
    if (state.selectedId) ids.add(state.selectedId);
    return state.shapes.filter((s) => ids.has(s.id));
  });

/** Get shape by ID */
export const useShapeById = (id: Id | null) =>
  useDesignStore((state) =>
    id ? state.shapes.find((s) => s.id === id) ?? null : null
  );
