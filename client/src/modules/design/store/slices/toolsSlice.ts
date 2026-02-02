/**
 * Tools Slice
 * Mode, line settings, snap settings state and actions
 */

import type { StateCreator } from "zustand";
import type { Mode, ActionMode } from "../../types";
import {
  DEFAULT_LINE_THICKNESS,
  DEFAULT_LINE_COLOR,
  DEFAULT_LINE_MARKER,
} from "../../utils/constants";
import { DEFAULT_DIMENSION_FONT_SIZE } from "../../dimensions";

// =============================================================================
// LOCAL STORAGE HELPERS
// =============================================================================

const STORAGE_KEY_DIM_FONT_SIZE = "design:dimFontSize";

function loadDimFontSize(): number {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_DIM_FONT_SIZE);
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= 24 && parsed <= 80) {
        return parsed;
      }
    }
  } catch {
    // Ignore localStorage errors
  }
  return DEFAULT_DIMENSION_FONT_SIZE; // 58px from dimensionConfig
}

function saveDimFontSize(size: number): void {
  try {
    localStorage.setItem(STORAGE_KEY_DIM_FONT_SIZE, String(size));
  } catch {
    // Ignore localStorage errors
  }
}

// =============================================================================
// INTERFACE
// =============================================================================

export interface ToolsSlice {
  // State
  mode: Mode;
  actionMode: ActionMode;
  lineThickness: number;
  lineColor: string;
  lineMarker: "none" | "arrow" | "circle";
  angleSnap: boolean;
  orthoMode: boolean;
  showLineAngle: boolean;
  showLineCoords: boolean;
  smartSnapEnabled: boolean;
  showDistanceIndicators: boolean;
  dimFontSize: number;

  // Actions
  setMode: (mode: Mode) => void;
  setActionMode: (actionMode: ActionMode) => void;
  setLineThickness: (thickness: number) => void;
  setLineColor: (color: string) => void;
  setLineMarker: (marker: "none" | "arrow" | "circle") => void;
  toggleAngleSnap: () => void;
  setAngleSnap: (enabled: boolean) => void;
  toggleOrthoMode: () => void;
  setOrthoMode: (enabled: boolean) => void;
  toggleShowLineAngle: () => void;
  toggleShowLineCoords: () => void;
  toggleSmartSnap: () => void;
  setSmartSnapEnabled: (enabled: boolean) => void;
  toggleDistanceIndicators: () => void;
  setDimFontSize: (size: number) => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

// Load persisted dimFontSize from localStorage (runs once at module load)
const persistedDimFontSize = typeof window !== "undefined" ? loadDimFontSize() : 28;

export const initialToolsState = {
  mode: "select" as Mode,
  actionMode: null as ActionMode,
  lineThickness: DEFAULT_LINE_THICKNESS,
  lineColor: DEFAULT_LINE_COLOR,
  lineMarker: DEFAULT_LINE_MARKER,
  angleSnap: true,
  orthoMode: false,
  showLineAngle: true,
  showLineCoords: false,
  smartSnapEnabled: true,
  showDistanceIndicators: true,
  dimFontSize: persistedDimFontSize,
};

// =============================================================================
// SLICE CREATOR
// =============================================================================

export const createToolsSlice: StateCreator<
  ToolsSlice,
  [["zustand/devtools", never]],
  [],
  ToolsSlice
> = (set) => ({
  ...initialToolsState,

  setMode: (mode) => set({ mode, temp: null } as Partial<ToolsSlice>, false, "setMode"),
  setActionMode: (actionMode) => set({ actionMode }, false, "setActionMode"),
  setLineThickness: (thickness) => set({ lineThickness: Math.max(1, thickness) }, false, "setLineThickness"),
  setLineColor: (color) => set({ lineColor: color }, false, "setLineColor"),
  setLineMarker: (marker) => set({ lineMarker: marker }, false, "setLineMarker"),
  toggleAngleSnap: () => set((state) => ({ angleSnap: !state.angleSnap }), false, "toggleAngleSnap"),
  setAngleSnap: (enabled) => set({ angleSnap: enabled }, false, "setAngleSnap"),
  toggleOrthoMode: () => set((state) => ({ orthoMode: !state.orthoMode }), false, "toggleOrthoMode"),
  setOrthoMode: (enabled) => set({ orthoMode: enabled }, false, "setOrthoMode"),
  toggleShowLineAngle: () => set((state) => ({ showLineAngle: !state.showLineAngle }), false, "toggleShowLineAngle"),
  toggleShowLineCoords: () => set((state) => ({ showLineCoords: !state.showLineCoords }), false, "toggleShowLineCoords"),
  toggleSmartSnap: () => set((state) => ({ smartSnapEnabled: !state.smartSnapEnabled }), false, "toggleSmartSnap"),
  setSmartSnapEnabled: (enabled) => set({ smartSnapEnabled: enabled }, false, "setSmartSnapEnabled"),
  toggleDistanceIndicators: () => set((state) => ({ showDistanceIndicators: !state.showDistanceIndicators }), false, "toggleDistanceIndicators"),
  setDimFontSize: (size) => {
    const clamped = Math.max(24, Math.min(80, size));
    saveDimFontSize(clamped);
    set({ dimFontSize: clamped }, false, "setDimFontSize");
  },
});
