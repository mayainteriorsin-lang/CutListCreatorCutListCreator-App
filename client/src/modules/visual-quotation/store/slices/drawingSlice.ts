/**
 * Drawing Slice
 * Owns: Canvas drawing state, wardrobe box, loft, shutter dividers, view modes, AI suggestions
 *
 * This slice manages:
 * - Wardrobe box drawing
 * - Loft box and loft resize
 * - Shutter dividers
 * - Canvas view modes
 * - AI suggestions (non-destructive overlays)
 * - Production settings and snapshots
 *
 * NOTE: Some actions like clearWardrobeBox have cross-slice effects
 * (clearing units, layout). The main store orchestrator will handle those.
 */

import type { StateCreator } from "zustand";
import type { DrawingSliceState, DrawingSliceActions } from "../../types/slices";
import type { ViewMode, CanvasViewMode, ProductionSettings } from "../../types";
import type {
  WardrobeBox,
  LoftBox,
  LoftDragEdge,
  WardrobeLayout,
  WardrobeSpec,
} from "../../types";
import type {
  AiSuggestion,
  AiPaidSuggestion,
  AiInteriorSuggestion,
  AiWardrobeLayoutSuggestion,
} from "../../types";

/**
 * Build shutter dividers for a wardrobe box
 */
function buildShutterDividers(
  box: WardrobeBox,
  count: number,
  _pxToMm?: number
): { dividers: number[]; gapsScaled: boolean } {
  const clamped = Math.max(Math.round(count), 1);
  if (box.width <= 0 || clamped <= 1) return { dividers: [], gapsScaled: false };

  const shutterWidth = box.width / clamped;
  const dividers = Array.from({ length: clamped - 1 }, (_, i) => {
    return box.x + shutterWidth * (i + 1);
  });

  return { dividers, gapsScaled: false };
}

/**
 * Initial state for drawing slice
 */
export const initialDrawingState: DrawingSliceState = {
  wardrobeBox: undefined,
  loftBox: undefined,
  shutterCount: 3,
  sectionCount: 1,
  shutterDividerXs: [],
  gapsScaled: false,
  loftEnabled: false,
  loftHeightRatio: 0.17,
  loftShutterCount: 3,
  loftDividerXs: [],
  drawMode: false,
  editMode: "shutter",
  viewMode: "photo",
  canvasViewMode: "2d",
  viewIntensity: 50,
  canvas3DViewEnabled: false,
  productionSettings: {
    showGrid: true,
    showDimensions: true,
    showLabels: true,
  },
  productionCanvasSnapshots: new Map(),
  captureOnlyUnitId: null,
  backgroundImage: null,
  locked: false,
  isCornerResizing: false,
  edgeResizeOnly: false,
  _loftPointer: undefined,
  aiSuggestion: undefined,
  aiPaidSuggestion: undefined,
  aiInteriorSuggestion: undefined,
  aiWardrobeLayoutSuggestion: undefined,
};

/**
 * Drawing slice type (state + actions)
 */
export type DrawingSlice = DrawingSliceState & DrawingSliceActions;

/**
 * Dependencies from other slices that drawing slice needs
 */
export interface DrawingSliceDeps {
  getStatus: () => "DRAFT" | "APPROVED";
  addAudit: (action: string, details?: string) => void;
  // For scale ratio (used in buildShutterDividers)
  getScaleRatio: () => number;
  // For computing areas after box changes
  computeAreas: () => void;
  // For room photo dimensions (used in AI apply)
  getRoomPhoto: () => { width: number; height: number } | undefined;
  // For wardrobe layout (used in AI apply)
  getWardrobeLayout: () => WardrobeLayout | undefined;
  setWardrobeLayout: (layout: WardrobeLayout) => void;
  // For unit type check (used in AI apply)
  getUnitType: () => string;
  // For cross-slice clear effects
  onClearWardrobeBox?: () => void;
}

/**
 * Drawing slice creator with dependency injection
 */
export const createDrawingSlice = (
  deps: DrawingSliceDeps
): StateCreator<DrawingSlice, [], [], DrawingSlice> => (set, get) => ({
  ...initialDrawingState,

  /* --------- Wardrobe box ---------- */
  setWardrobeBox: (box) => {
    if (get().isCornerResizing) return;
    if (deps.getStatus() === "APPROVED") return;

    const normalized = { ...box, rotation: box.rotation ?? 0 };
    const ratio = deps.getScaleRatio();
    const { dividers, gapsScaled } = buildShutterDividers(normalized, get().shutterCount, ratio);

    set(() => ({
      wardrobeBox: normalized,
      drawMode: false,
      shutterDividerXs: dividers,
      gapsScaled,
    }));

    deps.addAudit(
      "Wardrobe area set",
      `x=${normalized.x}, y=${normalized.y}, w=${normalized.width}, h=${normalized.height}`
    );
    deps.computeAreas();
  },

  clearWardrobeBox: () => {
    if (deps.getStatus() === "APPROVED") return;
    set(() => ({
      wardrobeBox: undefined,
      loftBox: undefined,
      shutterCount: 3,
      shutterDividerXs: [],
      gapsScaled: false,
      loftEnabled: false,
      loftHeightRatio: 0.17,
      aiSuggestion: undefined,
    }));
    // Cross-slice effects handled by main store
    deps.onClearWardrobeBox?.();
    deps.addAudit("Wardrobe area cleared");
  },

  /* --------- Drawing mode ---------- */
  setDrawMode: (active) => {
    if (deps.getStatus() === "APPROVED") return;
    set(() => ({ drawMode: active }));
  },

  setEditMode: (mode) => {
    set(() => ({ editMode: mode }));
  },

  /* --------- View modes ---------- */
  setViewMode: (mode) => {
    set(() => ({ viewMode: mode }));
    deps.addAudit("View mode changed", mode);
  },

  setCanvasViewMode: (mode) => {
    set(() => ({ canvasViewMode: mode }));
  },

  setViewIntensity: (value) => {
    set(() => ({ viewIntensity: Math.max(0, Math.min(100, value)) }));
  },

  setCanvas3DViewEnabled: (enabled) => {
    set(() => ({ canvas3DViewEnabled: enabled }));
  },

  setProductionSettings: (patch) => {
    set((s) => ({
      productionSettings: { ...s.productionSettings, ...patch },
    }));
  },

  setProductionCanvasSnapshots: (snapshots) => {
    set(() => ({ productionCanvasSnapshots: snapshots }));
  },

  setCaptureOnlyUnitId: (unitId) => {
    set(() => ({ captureOnlyUnitId: unitId }));
  },

  /* --------- Background and canvas ---------- */
  setBackgroundImage: (img) => {
    set(() => ({ backgroundImage: img }));
  },

  setLocked: (value) => {
    set(() => ({ locked: value }));
  },

  setEdgeResizeOnly: (value) => {
    set(() => ({ edgeResizeOnly: value }));
  },

  toggleEdgeResizeOnly: () => {
    set((s) => ({ edgeResizeOnly: !s.edgeResizeOnly }));
  },

  /* --------- Shutter layout ---------- */
  setShutterCount: (count) => {
    if (deps.getStatus() === "APPROVED") return;
    const clamped = Math.max(Math.round(count), 1);
    const ratio = deps.getScaleRatio();
    const state = get();
    const next = state.wardrobeBox
      ? buildShutterDividers(state.wardrobeBox, clamped, ratio)
      : { dividers: [], gapsScaled: ratio > 0 };

    set(() => ({
      shutterCount: clamped,
      shutterDividerXs: next.dividers,
      gapsScaled: next.gapsScaled,
    }));
    deps.addAudit("Shutter count set", String(clamped));
  },

  setSectionCount: (count) => {
    if (deps.getStatus() === "APPROVED") return;
    const clamped = Math.max(Math.round(count), 1);
    set(() => ({ sectionCount: clamped }));
    deps.addAudit("Section count set", String(clamped));
  },

  setShutterDividerX: (index, x) => {
    if (deps.getStatus() === "APPROVED") return;
    set((s) => {
      if (!s.shutterDividerXs.length) return {};
      if (index < 0 || index >= s.shutterDividerXs.length) return {};
      const next = [...s.shutterDividerXs];
      next[index] = x;
      return { shutterDividerXs: next };
    });
  },

  updateDivisions: (divisions) => {
    if (deps.getStatus() === "APPROVED") return;
    const clamped = [...divisions].map((d) => Math.min(Math.max(d, 0), 1)).sort((a, b) => a - b);
    const layout = deps.getWardrobeLayout();
    deps.setWardrobeLayout(
      layout
        ? { ...layout, divisions: clamped }
        : { doors: 3, loft: false, divisions: clamped }
    );
    deps.addAudit("Wardrobe divisions updated", clamped.join(","));
  },

  setDoors: (count) => {
    if (deps.getStatus() === "APPROVED") return;
    const doors = Math.min(Math.max(count, 2), 6);
    const divisions = Array.from({ length: doors - 1 }, (_, i) => (i + 1) / doors);
    const layout = deps.getWardrobeLayout();
    deps.setWardrobeLayout(
      layout
        ? { ...layout, doors, divisions }
        : { doors, loft: false, divisions }
    );
    deps.addAudit("Wardrobe doors set", String(doors));
  },

  setDepthMm: (depthMm) => {
    if (deps.getStatus() === "APPROVED") return;
    const clamped = Math.min(Math.max(depthMm, 300), 900);
    // This affects wardrobeSpec which could be in units slice
    // For now, just audit; main store will coordinate
    deps.addAudit("Wardrobe depth set", `${clamped}mm`);
    deps.computeAreas();
  },

  /* --------- Loft ---------- */
  setLoftEnabled: (enabled) => {
    if (deps.getStatus() === "APPROVED") return;
    const { wardrobeBox, loftShutterCount } = get();

    if (enabled && wardrobeBox) {
      // Create loft box above wardrobe
      const defaultHeight = wardrobeBox.height * 0.25;
      const newLoft: LoftBox = {
        x: wardrobeBox.x,
        width: wardrobeBox.width,
        y: wardrobeBox.y - defaultHeight,
        height: defaultHeight,
        rotation: 0,
        dragEdge: null,
        isDragging: false,
        locked: false,
      };
      // Calculate initial loft dividers
      const dividers = loftShutterCount <= 1 ? [] : Array.from({ length: loftShutterCount - 1 }, (_, i) => {
        return newLoft.x + (newLoft.width / loftShutterCount) * (i + 1);
      });
      set(() => ({ loftEnabled: true, loftBox: newLoft, loftDividerXs: dividers }));
    } else {
      // Remove loft box when disabled
      set(() => ({ loftEnabled: false, loftBox: undefined, loftDividerXs: [] }));
    }
    deps.addAudit("Loft toggled", enabled ? "on" : "off");
  },

  setLoftBox: (box) => {
    set(() => ({ loftBox: box }));
  },

  setLoftShutterCount: (count) => {
    if (deps.getStatus() === "APPROVED") return;
    const clamped = Math.max(Math.round(count), 1);
    set((s) => {
      if (!s.loftBox) return { loftShutterCount: clamped, loftDividerXs: [] };
      const dividers = clamped <= 1 ? [] : Array.from({ length: clamped - 1 }, (_, i) => {
        return s.loftBox!.x + (s.loftBox!.width / clamped) * (i + 1);
      });
      return { loftShutterCount: clamped, loftDividerXs: dividers };
    });
    deps.addAudit("Loft shutter count set", String(clamped));
  },

  ensureLoftBoxForWardrobe: () => {
    set((state) => {
      const { wardrobeBox, loftBox } = state;
      if (!wardrobeBox) return state;
      if (loftBox) return state;

      const defaultHeight = wardrobeBox.height * 0.3;
      const newLoft: LoftBox = {
        x: wardrobeBox.x,
        width: wardrobeBox.width,
        y: wardrobeBox.y - defaultHeight,
        height: defaultHeight,
        rotation: 0,
        dragEdge: null,
        isDragging: false,
        locked: false,
      };

      return { ...state, loftBox: newLoft };
    });
  },

  toggleLoft: (on) => {
    if (deps.getStatus() === "APPROVED") return;
    const layout = deps.getWardrobeLayout() ?? { doors: 3, loft: false, divisions: [1 / 3, 2 / 3] };
    deps.setWardrobeLayout({ ...layout, loft: on });
    deps.addAudit("Wardrobe loft toggled", on ? "on" : "off");
  },

  lockLoft: () => {
    set((state) => {
      if (!state.loftBox) return state;
      return {
        ...state,
        loftBox: { ...state.loftBox, locked: true, dragEdge: null, isDragging: false },
      };
    });
  },

  clearCurrentLoft: () => {
    if (deps.getStatus() === "APPROVED") return;
    set(() => ({
      loftEnabled: false,
      loftBox: undefined,
      loftDividerXs: [],
    }));
    deps.addAudit("Current loft cleared");
  },

  /* --------- Corner/edge resize ---------- */
  startCornerResize: () => {
    set((s) => ({
      isCornerResizing: true,
      loftBox: s.loftBox ? { ...s.loftBox, isDragging: false, dragEdge: null } : undefined,
    }));
  },

  stopCornerResize: () => {
    set((s) => ({
      isCornerResizing: false,
      loftBox: s.loftBox ? { ...s.loftBox, isDragging: false, dragEdge: null } : undefined,
    }));
  },

  startLoftDrag: (edge: LoftDragEdge) => {
    set((state) => {
      if (!state.loftBox || state.loftBox.locked) return state;
      if (deps.getStatus() === "APPROVED") return state;
      return {
        ...state,
        loftBox: { ...state.loftBox, dragEdge: edge, isDragging: true },
      };
    });
  },

  updateLoftDrag: () => {
    set((state) => {
      if (state.isCornerResizing) return state;
      const { loftBox, wardrobeBox, shutterDividerXs, _loftPointer } = state;
      if (!loftBox || loftBox.locked || !loftBox.isDragging) return state;
      if (deps.getStatus() === "APPROVED") return state;
      if (!_loftPointer) return state;

      const SNAP = 10;
      const walls = wardrobeBox
        ? { left: wardrobeBox.x, right: wardrobeBox.x + wardrobeBox.width }
        : { left: loftBox.x, right: loftBox.x + loftBox.width };

      const wardrobeTop = wardrobeBox ? wardrobeBox.y : loftBox.y + loftBox.height;

      const updated: LoftBox = { ...loftBox };
      const oldRight = updated.x + updated.width;
      const oldBottom = updated.y + updated.height;

      const px = _loftPointer.x;
      const py = _loftPointer.y;

      if (updated.dragEdge === "left") {
        updated.x = px;
        updated.width = oldRight - px;
      } else if (updated.dragEdge === "right") {
        updated.width = px - updated.x;
      } else if (updated.dragEdge === "top") {
        updated.y = py;
        updated.height = oldBottom - py;
      } else if (updated.dragEdge === "bottom") {
        updated.height = py - updated.y;
      } else if (updated.dragEdge === "move") {
        const cx = updated.x + updated.width / 2;
        const cy = updated.y + updated.height / 2;
        const dx = px - cx;
        const dy = py - cy;
        updated.x += dx;
        updated.y += dy;
      }

      // prevent negative / tiny sizes
      updated.width = Math.max(40, updated.width);
      updated.height = Math.max(40, updated.height);

      // snap to wardrobe side walls
      if (Math.abs(updated.x - walls.left) < SNAP) {
        updated.x = walls.left;
      }
      if (Math.abs(updated.x + updated.width - walls.right) < SNAP) {
        updated.width = walls.right - updated.x;
      }

      // snap loft bottom to wardrobe top
      const loftBottom = updated.y + updated.height;
      if (Math.abs(loftBottom - wardrobeTop) < SNAP) {
        updated.height = wardrobeTop - updated.y;
      }

      // snap edges to shutter dividers
      if (shutterDividerXs && shutterDividerXs.length > 0) {
        shutterDividerXs.forEach((xPos) => {
          if (Math.abs(updated.x - xPos) < SNAP) {
            const delta = xPos - updated.x;
            updated.x = xPos;
            updated.width -= delta;
          }
          if (Math.abs(updated.x + updated.width - xPos) < SNAP) {
            updated.width = xPos - updated.x;
          }
        });
      }

      return { ...state, loftBox: updated };
    });
  },

  stopLoftDrag: () => {
    set((state) => {
      if (!state.loftBox) return state;
      return {
        ...state,
        loftBox: {
          ...state.loftBox,
          dragEdge: null,
          isDragging: false,
        },
        _loftPointer: undefined,
      };
    });
  },

  /* --------- Computed areas ---------- */
  computeAreas: () => {
    // This is a cross-slice computation that affects wardrobeSpec and units
    // Main store will override this with full implementation
    deps.computeAreas();
  },

  /* --------- AI suggestions ---------- */
  setAiSuggestion: (suggestion) => {
    if (deps.getStatus() === "APPROVED") return;
    set(() => ({ aiSuggestion: suggestion }));
  },

  clearAiSuggestion: () => {
    if (deps.getStatus() === "APPROVED") return;
    set(() => ({ aiSuggestion: undefined }));
  },

  applyAiSuggestion: () => {
    if (deps.getStatus() === "APPROVED") return;
    const s = get();
    const suggestion = s.aiSuggestion;
    if (!suggestion) return;

    if (!s.wardrobeBox && suggestion.box) {
      const normalized = { ...suggestion.box, rotation: suggestion.box.rotation ?? 0 };
      set(() => ({ wardrobeBox: normalized, drawMode: false }));
      deps.addAudit("AI suggestion applied", "wardrobe box set");
    }

    if (!deps.getWardrobeLayout() && (suggestion.doors || suggestion.loft !== undefined)) {
      const doors = suggestion.doors ?? 3;
      const layout: WardrobeLayout = {
        doors,
        loft: suggestion.loft ?? false,
        divisions: Array.from({ length: doors - 1 }, (_, i) => (i + 1) / doors),
      };
      deps.setWardrobeLayout(layout);
      deps.addAudit("AI suggestion applied", `doors=${doors}, loft=${layout.loft}`);
    }

    set(() => ({ aiSuggestion: undefined }));
    deps.computeAreas();
  },

  setAiPaidSuggestion: (suggestion) => {
    if (deps.getStatus() === "APPROVED") return;
    set(() => ({ aiPaidSuggestion: suggestion || undefined }));
    if (suggestion?.detected) {
      deps.addAudit("AI paid suggestion", `confidence=${suggestion.confidence}`);
      const roomPhoto = deps.getRoomPhoto();
      if (!get().wardrobeBox && roomPhoto && deps.getUnitType() === "wardrobe") {
        get().applyAiPaidSuggestion();
      }
    }
  },

  clearAiPaidSuggestion: () => {
    if (deps.getStatus() === "APPROVED") return;
    set(() => ({ aiPaidSuggestion: undefined }));
  },

  applyAiPaidSuggestion: () => {
    const s = get();
    if (deps.getStatus() === "APPROVED") return;
    if (!s.aiPaidSuggestion?.detected) return;
    if (s.wardrobeBox) return;

    const CANVAS_WIDTH = 900;
    const CANVAS_HEIGHT = 500;
    const roomPhoto = deps.getRoomPhoto();

    let width = 360;
    let height = 320;
    if (roomPhoto) {
      const scale = Math.min(CANVAS_WIDTH / roomPhoto.width, CANVAS_HEIGHT / roomPhoto.height);
      const renderWidth = roomPhoto.width * scale;
      const renderHeight = roomPhoto.height * scale;
      width = Math.max(180, Math.min(renderWidth * 0.6, CANVAS_WIDTH * 0.9));
      height = Math.max(160, Math.min(renderHeight * 0.6, CANVAS_HEIGHT * 0.9));
    }
    const x = (CANVAS_WIDTH - width) / 2;
    const y = (CANVAS_HEIGHT - height) / 2;

    const doors = s.aiPaidSuggestion.wardrobe?.doors ?? 3;
    const loft = s.aiPaidSuggestion.wardrobe?.hasLoft ?? false;

    const box: WardrobeBox = { x, y, width, height, rotation: 0 };
    set(() => ({ wardrobeBox: box }));

    if (!deps.getWardrobeLayout()) {
      deps.setWardrobeLayout({
        doors,
        loft,
        divisions: Array.from({ length: doors - 1 }, (_, i) => (i + 1) / doors),
      });
    }

    deps.addAudit("AI paid suggestion applied", `doors=${doors}, loft=${loft}`);
    deps.computeAreas();
  },

  setAiInteriorSuggestion: (suggestion) => {
    if (deps.getStatus() === "APPROVED") return;
    set(() => ({ aiInteriorSuggestion: suggestion }));
    if (suggestion?.detected && !get().wardrobeBox && deps.getUnitType() === "wardrobe") {
      get().applyAiInteriorSuggestionSoft();
    }
  },

  clearAiInteriorSuggestion: () => {
    if (deps.getStatus() === "APPROVED") return;
    set(() => ({ aiInteriorSuggestion: undefined }));
  },

  applyAiInteriorSuggestionSoft: () => {
    const s = get();
    if (deps.getStatus() === "APPROVED") return false;
    if (!s.aiInteriorSuggestion?.detected) return false;
    const roomPhoto = deps.getRoomPhoto();
    if (!roomPhoto) return false;
    if (s.wardrobeBox) return false;
    if (deps.getUnitType() !== "wardrobe") return false;

    const CANVAS_WIDTH = 900;
    const CANVAS_HEIGHT = 500;
    const primary = s.aiInteriorSuggestion.primaryBox;

    const boxPx = {
      x: primary.xNorm * roomPhoto.width,
      y: primary.yNorm * roomPhoto.height,
      width: primary.wNorm * roomPhoto.width,
      height: primary.hNorm * roomPhoto.height,
    };

    const scale = Math.min(CANVAS_WIDTH / roomPhoto.width, CANVAS_HEIGHT / roomPhoto.height);
    const renderWidth = roomPhoto.width * scale;
    const renderHeight = roomPhoto.height * scale;
    const offsetX = (CANVAS_WIDTH - renderWidth) / 2;
    const offsetY = (CANVAS_HEIGHT - renderHeight) / 2;

    const x = offsetX + boxPx.x * scale;
    const y = offsetY + boxPx.y * scale;
    const width = boxPx.width * scale;
    const height = boxPx.height * scale;

    const box: WardrobeBox = { x, y, width, height, rotation: 0 };

    // Use setWardrobeBox to get proper divider calculation
    get().setWardrobeBox(box);

    if (!deps.getWardrobeLayout()) {
      const doors = s.aiInteriorSuggestion.suggestions?.doors ?? 3;
      const loft = s.aiInteriorSuggestion.suggestions?.hasLoft ?? false;
      deps.setWardrobeLayout({
        doors,
        loft,
        divisions: Array.from({ length: doors - 1 }, (_, i) => (i + 1) / doors),
      });
    }

    deps.addAudit("AI interior suggestion applied", `unitType=${s.aiInteriorSuggestion.unitType}`);
    return true;
  },

  setAiWardrobeLayoutSuggestion: (suggestion) => {
    if (deps.getStatus() === "APPROVED") return;
    set(() => ({ aiWardrobeLayoutSuggestion: suggestion }));
  },

  clearAiWardrobeLayoutSuggestion: () => {
    if (deps.getStatus() === "APPROVED") return;
    set(() => ({ aiWardrobeLayoutSuggestion: undefined }));
  },
});
