/**
 * Module Slice
 * Module designer configuration state and actions
 */

import type { StateCreator } from "zustand";
import type { ModuleConfig } from "../../engine/shapeGenerator";
import type { Shape, HistoryEntry } from "../../types";
import { generateModuleShapes } from "../../engine/shapeGenerator";
import { UNIT_TYPE_LABELS } from "@/modules/visual-quotation/constants";
import { DEFAULT_DEPTH, MAX_HISTORY_SIZE } from "../../utils/constants";

// =============================================================================
// INTERFACE
// =============================================================================

export interface ModuleSlice {
  // State
  moduleConfig: ModuleConfig | null;
  showModulePanel: boolean;
  moduleShapeIds: Set<string>;
  customDepth: number;
  depthModified: boolean;

  // Width calculator state
  widthValue: number;
  widthReduction: number;

  // Actions
  setModuleConfig: (config: ModuleConfig | null) => void;
  updateModuleConfig: (updates: Partial<ModuleConfig>) => void;
  setShowModulePanel: (show: boolean) => void;
  toggleModulePanel: () => void;
  setModuleShapeIds: (ids: Set<string>) => void;
  addModuleShapeId: (id: string) => void;
  clearModuleShapeIds: () => void;
  setCustomDepth: (depth: number) => void;
  setDepthModified: (modified: boolean) => void;
  setWidthValue: (value: number) => void;
  setWidthReduction: (reduction: number) => void;
  getCalculatedWidth: () => number;
  regenerateModuleShapes: (config: ModuleConfig) => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

export const initialModuleState = {
  moduleConfig: null as ModuleConfig | null,
  showModulePanel: false,
  moduleShapeIds: new Set<string>(),
  customDepth: DEFAULT_DEPTH,
  depthModified: false,
  widthValue: 200,
  widthReduction: 36,
};

// =============================================================================
// SLICE CREATOR (requires other slices for shapes/history)
// =============================================================================

// Type for combined store
interface StoreWithDeps extends ModuleSlice {
  shapes: Shape[];
  canvasSize: { w: number; h: number };
  history: HistoryEntry[];
  historyIndex: number;
}

export const createModuleSlice: StateCreator<
  StoreWithDeps,
  [["zustand/devtools", never]],
  [],
  ModuleSlice
> = (set, get) => ({
  ...initialModuleState,

  setModuleConfig: (config) => set({ moduleConfig: config }, false, "setModuleConfig"),

  updateModuleConfig: (updates) =>
    set(
      (state) => ({
        moduleConfig: state.moduleConfig
          ? { ...state.moduleConfig, ...updates }
          : null,
      }),
      false,
      "updateModuleConfig"
    ),

  setShowModulePanel: (show) => set({ showModulePanel: show }, false, "setShowModulePanel"),
  toggleModulePanel: () => set((state) => ({ showModulePanel: !state.showModulePanel }), false, "toggleModulePanel"),

  setModuleShapeIds: (ids) => set({ moduleShapeIds: ids }, false, "setModuleShapeIds"),

  addModuleShapeId: (id) =>
    set(
      (state) => ({
        moduleShapeIds: new Set([...state.moduleShapeIds, id]),
      }),
      false,
      "addModuleShapeId"
    ),

  clearModuleShapeIds: () => set({ moduleShapeIds: new Set() }, false, "clearModuleShapeIds"),

  setCustomDepth: (depth) => set({ customDepth: depth }, false, "setCustomDepth"),
  setDepthModified: (modified) => set({ depthModified: modified }, false, "setDepthModified"),
  setWidthValue: (value) => set({ widthValue: value }, false, "setWidthValue"),
  setWidthReduction: (reduction) => set({ widthReduction: reduction }, false, "setWidthReduction"),

  getCalculatedWidth: () => {
    const { widthValue, widthReduction } = get();
    return widthValue - widthReduction;
  },

  regenerateModuleShapes: (config) => {
    const state = get();
    const nonModuleShapes = state.shapes.filter(s => !state.moduleShapeIds.has(s.id));

    // Ensure panelsEnabled is always initialized for wardrobe_carcass
    const configWithPanels = config.unitType === "wardrobe_carcass" && !config.panelsEnabled
      ? { ...config, panelsEnabled: { top: true, bottom: true, left: true, right: true, back: true } }
      : config;

    // Calculate zoom to fit module with padding
    const moduleW = configWithPanels.widthMm;
    const moduleH = configWithPanels.heightMm;
    const padding = 150;

    const availableW = state.canvasSize.w - 100;
    const availableH = state.canvasSize.h - 100;
    const zoomForWidth = availableW / (moduleW + padding * 2);
    const zoomForHeight = availableH / (moduleH + padding * 2);
    const idealZoom = Math.min(1.5, Math.max(0.2, Math.min(zoomForWidth, zoomForHeight)));

    // Calculate origin - position at left edge with small padding
    const viewportH = state.canvasSize.h / idealZoom;
    const originX = 50; // Left edge with 50px padding
    const originY = (viewportH - moduleH) / 2; // Vertically centered
    const origin = { x: originX, y: Math.max(50, originY) };

    // Generate new module shapes
    const newModuleShapes = generateModuleShapes(configWithPanels, origin);
    const newModuleIds = new Set(newModuleShapes.map(s => s.id));

    // Combine shapes
    const allShapes = [...nonModuleShapes, ...newModuleShapes];

    // Push to history
    const newEntry = {
      shapes: allShapes,
      description: `Generate ${UNIT_TYPE_LABELS[config.unitType as keyof typeof UNIT_TYPE_LABELS] || config.unitType}`
    };
    const newHistory = [...state.history.slice(0, state.historyIndex + 1), newEntry].slice(-MAX_HISTORY_SIZE);

    set({
      shapes: allShapes,
      moduleShapeIds: newModuleIds,
      moduleConfig: configWithPanels,
      zoom: idealZoom,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      showModulePanel: true, // Always show config panel when module is generated
    } as Partial<StoreWithDeps>, false, "regenerateModuleShapes");
  },
});
