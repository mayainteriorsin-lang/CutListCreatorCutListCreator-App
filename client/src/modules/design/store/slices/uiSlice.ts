/**
 * UI Slice
 * Panel visibility, 3D preview, measurement state and actions
 */

import type { StateCreator } from "zustand";
import type { ComponentTemplate, MeasurementResult } from "../../types";
import { DEFAULT_PREVIEW_ROTATION } from "../../utils/constants";

// =============================================================================
// INTERFACE
// =============================================================================

export interface UISlice {
  // Component Panel
  showComponentPanel: boolean;
  selectedComponent: ComponentTemplate | null;
  componentFilter: "all" | "cabinet" | "hardware" | "accessory";

  // 3D Preview
  show3DPreview: boolean;
  previewRotation: { x: number; y: number };

  // Measurement Panel
  showMeasurementPanel: boolean;
  measurementResult: MeasurementResult | null;

  // Dimensions
  showAllDimensions: boolean;
  dimensionStart: { x: number; y: number } | null;

  // Actions
  setShowComponentPanel: (show: boolean) => void;
  toggleComponentPanel: () => void;
  setSelectedComponent: (component: ComponentTemplate | null) => void;
  setComponentFilter: (filter: "all" | "cabinet" | "hardware" | "accessory") => void;

  setShow3DPreview: (show: boolean) => void;
  toggle3DPreview: () => void;
  setPreviewRotation: (rotation: { x: number; y: number }) => void;

  setShowMeasurementPanel: (show: boolean) => void;
  toggleMeasurementPanel: () => void;
  setMeasurementResult: (result: MeasurementResult | null) => void;

  setShowAllDimensions: (show: boolean) => void;
  toggleAllDimensions: () => void;
  setDimensionStart: (start: { x: number; y: number } | null) => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

export const initialUIState = {
  showComponentPanel: false,
  selectedComponent: null as ComponentTemplate | null,
  componentFilter: "all" as "all" | "cabinet" | "hardware" | "accessory",
  show3DPreview: false,
  previewRotation: DEFAULT_PREVIEW_ROTATION,
  showMeasurementPanel: false,
  measurementResult: null as MeasurementResult | null,
  showAllDimensions: true,
  dimensionStart: null as { x: number; y: number } | null,
};

// =============================================================================
// SLICE CREATOR
// =============================================================================

export const createUISlice: StateCreator<
  UISlice,
  [["zustand/devtools", never]],
  [],
  UISlice
> = (set) => ({
  ...initialUIState,

  setShowComponentPanel: (show) => set({ showComponentPanel: show }, false, "setShowComponentPanel"),
  toggleComponentPanel: () => set((state) => ({ showComponentPanel: !state.showComponentPanel }), false, "toggleComponentPanel"),
  setSelectedComponent: (component) => set({ selectedComponent: component }, false, "setSelectedComponent"),
  setComponentFilter: (filter) => set({ componentFilter: filter }, false, "setComponentFilter"),

  setShow3DPreview: (show) => set({ show3DPreview: show }, false, "setShow3DPreview"),
  toggle3DPreview: () => set((state) => ({ show3DPreview: !state.show3DPreview }), false, "toggle3DPreview"),
  setPreviewRotation: (rotation) => set({ previewRotation: rotation }, false, "setPreviewRotation"),

  setShowMeasurementPanel: (show) => set({ showMeasurementPanel: show }, false, "setShowMeasurementPanel"),
  toggleMeasurementPanel: () => set((state) => ({ showMeasurementPanel: !state.showMeasurementPanel }), false, "toggleMeasurementPanel"),
  setMeasurementResult: (result) => set({ measurementResult: result }, false, "setMeasurementResult"),

  setShowAllDimensions: (show) => set({ showAllDimensions: show }, false, "setShowAllDimensions"),
  toggleAllDimensions: () => set((state) => ({ showAllDimensions: !state.showAllDimensions }), false, "toggleAllDimensions"),
  setDimensionStart: (start) => set({ dimensionStart: start }, false, "setDimensionStart"),
});
