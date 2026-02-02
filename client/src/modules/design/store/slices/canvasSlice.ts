/**
 * Canvas Slice
 * Grid, zoom, pan, canvas size state and actions
 */

import type { StateCreator } from "zustand";
import {
  DEFAULT_GRID_SIZE,
  DEFAULT_ZOOM,
  DEFAULT_CANVAS_SIZE,
} from "../../utils/constants";

// =============================================================================
// INTERFACE
// =============================================================================

export interface CanvasSlice {
  // State
  gridSize: number;
  gridVisible: boolean;
  zoom: number;
  canvasSize: { w: number; h: number };
  panPosition: { x: number; y: number };

  // Actions
  setGridSize: (size: number) => void;
  setGridVisible: (visible: boolean) => void;
  toggleGrid: () => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setCanvasSize: (size: { w: number; h: number }) => void;
  setPanPosition: (pos: { x: number; y: number }) => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

export const initialCanvasState = {
  gridSize: DEFAULT_GRID_SIZE,
  gridVisible: true,
  zoom: DEFAULT_ZOOM,
  canvasSize: DEFAULT_CANVAS_SIZE,
  panPosition: { x: 0, y: 0 },
};

// =============================================================================
// SLICE CREATOR
// =============================================================================

export const createCanvasSlice: StateCreator<
  CanvasSlice,
  [["zustand/devtools", never]],
  [],
  CanvasSlice
> = (set) => ({
  ...initialCanvasState,

  setGridSize: (size) => set({ gridSize: Math.max(1, size) }, false, "setGridSize"),
  setGridVisible: (visible) => set({ gridVisible: visible }, false, "setGridVisible"),
  toggleGrid: () => set((state) => ({ gridVisible: !state.gridVisible }), false, "toggleGrid"),
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(10, zoom)) }, false, "setZoom"),
  zoomIn: () => set((state) => ({ zoom: Math.min(10, state.zoom * 1.2) }), false, "zoomIn"),
  zoomOut: () => set((state) => ({ zoom: Math.max(0.1, state.zoom / 1.2) }), false, "zoomOut"),
  resetZoom: () => set({ zoom: DEFAULT_ZOOM }, false, "resetZoom"),
  setCanvasSize: (size) => set({ canvasSize: size }, false, "setCanvasSize"),
  setPanPosition: (pos) => set({ panPosition: pos }, false, "setPanPosition"),
});
