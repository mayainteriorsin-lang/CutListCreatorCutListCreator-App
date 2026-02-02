/**
 * Drawing Slice State Types
 * Owns: Canvas drawing state, wardrobe box, loft, shutter dividers
 */

import type { ViewMode, CanvasViewMode, ProductionSettings } from "../core";
import type { WardrobeBox, LoftBox, LoftDragEdge } from "../wardrobe";
import type {
  AiSuggestion,
  AiPaidSuggestion,
  AiInteriorSuggestion,
  AiWardrobeLayoutSuggestion,
} from "../ai";

/**
 * DrawingSliceState
 * Responsible for canvas drawing and visualization state
 */
export interface DrawingSliceState {
  /* Wardrobe area (px on canvas) */
  wardrobeBox?: WardrobeBox;
  loftBox?: LoftBox;

  /* Shutter layout (px on canvas) */
  shutterCount: number;
  sectionCount: number;
  shutterDividerXs: number[];
  gapsScaled: boolean;
  loftEnabled: boolean;
  loftHeightRatio: number;
  loftShutterCount: number;
  loftDividerXs: number[];

  /* Canvas drawing mode */
  drawMode: boolean;
  editMode: "shutter" | "carcass";

  /* UI view state */
  viewMode: ViewMode;
  canvasViewMode: CanvasViewMode;
  viewIntensity: number;
  canvas3DViewEnabled: boolean;
  productionSettings: ProductionSettings;

  /* Production canvas snapshots */
  productionCanvasSnapshots: Map<string, string>;
  captureOnlyUnitId: string | null;

  /* Background and canvas state */
  backgroundImage: HTMLImageElement | null;
  locked: boolean;
  isCornerResizing: boolean;
  edgeResizeOnly: boolean;
  _loftPointer?: { x: number; y: number };

  /* AI suggestions (non-destructive) */
  aiSuggestion?: AiSuggestion;
  aiPaidSuggestion?: AiPaidSuggestion;
  aiInteriorSuggestion?: AiInteriorSuggestion;
  aiWardrobeLayoutSuggestion?: AiWardrobeLayoutSuggestion;
}

/**
 * DrawingSliceActions
 * Actions owned by drawing slice
 */
export interface DrawingSliceActions {
  // Wardrobe box
  setWardrobeBox: (box: WardrobeBox) => void;
  clearWardrobeBox: () => void;

  // Drawing mode
  setDrawMode: (active: boolean) => void;
  setEditMode: (mode: "shutter" | "carcass") => void;

  // View modes
  setViewMode: (mode: ViewMode) => void;
  setCanvasViewMode: (mode: CanvasViewMode) => void;
  setViewIntensity: (value: number) => void;
  setCanvas3DViewEnabled: (enabled: boolean) => void;
  setProductionSettings: (patch: Partial<ProductionSettings>) => void;
  setProductionCanvasSnapshots: (snapshots: Map<string, string>) => void;
  setCaptureOnlyUnitId: (unitId: string | null) => void;

  // Background and canvas
  setBackgroundImage: (img: HTMLImageElement | null) => void;
  setLocked: (value: boolean) => void;
  setEdgeResizeOnly: (value: boolean) => void;
  toggleEdgeResizeOnly: () => void;

  // Shutter layout
  setShutterCount: (count: number) => void;
  setSectionCount: (count: number) => void;
  setShutterDividerX: (index: number, x: number) => void;
  updateDivisions: (divisions: number[]) => void;
  setDoors: (count: number) => void;
  setDepthMm: (depthMm: number) => void;

  // Loft
  setLoftEnabled: (enabled: boolean) => void;
  setLoftBox: (box: LoftBox | undefined) => void;
  setLoftShutterCount: (count: number) => void;
  ensureLoftBoxForWardrobe: () => void;
  toggleLoft: (on: boolean) => void;
  lockLoft: () => void;
  clearCurrentLoft: () => void;

  // Corner/edge resize
  startCornerResize: () => void;
  stopCornerResize: () => void;
  startLoftDrag: (edge: LoftDragEdge) => void;
  updateLoftDrag: () => void;
  stopLoftDrag: () => void;

  // Computed areas
  computeAreas: () => void;

  // AI suggestions
  setAiSuggestion: (suggestion?: AiSuggestion) => void;
  clearAiSuggestion: () => void;
  applyAiSuggestion: () => void;
  setAiPaidSuggestion: (suggestion?: AiPaidSuggestion | null) => void;
  clearAiPaidSuggestion: () => void;
  applyAiPaidSuggestion: () => void;
  setAiInteriorSuggestion: (suggestion?: AiInteriorSuggestion) => void;
  clearAiInteriorSuggestion: () => void;
  applyAiInteriorSuggestionSoft: () => boolean;
  setAiWardrobeLayoutSuggestion: (suggestion?: AiWardrobeLayoutSuggestion) => void;
  clearAiWardrobeLayoutSuggestion: () => void;
}

export type DrawingSlice = DrawingSliceState & DrawingSliceActions;
