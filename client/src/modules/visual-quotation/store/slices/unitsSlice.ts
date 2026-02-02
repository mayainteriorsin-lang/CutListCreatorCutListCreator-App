/**
 * Units Slice
 * Owns: Drawn units, unit selection, legacy wardrobe units, add-ons
 *
 * This slice manages:
 * - Legacy WardrobeUnit CRUD (for design objects)
 * - DrawnUnit array and CRUD
 * - Unit selection (active, multi-select)
 * - Add-on drawing mode and add-on CRUD
 *
 * NOTE: Actions like saveCurrentUnitAndAddNew and setActiveUnitIndex
 * need drawing state (wardrobeBox, shutterDividerXs, etc.) which is
 * owned by drawingSlice. The main store orchestrator will handle
 * cross-slice coordination.
 */

import type { StateCreator } from "zustand";
import type { UnitsSliceState, UnitsSliceActions } from "../../types/slices";
import type { WardrobeUnit, DrawnUnit, DrawnAddOn, WardrobeLayout } from "../../types";
import type { WardrobeConfig, WardrobeAddOn } from "../../types";
import type { WallId } from "../../types";
import { logger } from "../../services/logger";

/**
 * Initial state for units slice
 */
export const initialUnitsState: UnitsSliceState = {
  units: [],
  drawnUnits: [],
  activeUnitIndex: -1,
  selectedUnitIndices: [],
  activeEditPart: "shutter",
  wardrobeLayout: undefined,
  wardrobeSpec: undefined,
  addOnDrawMode: null,
};

/**
 * Units slice type (state + actions)
 */
export type UnitsSlice = UnitsSliceState & UnitsSliceActions;

/**
 * Dependencies from other slices that units slice needs
 */
export interface UnitsSliceDeps {
  getStatus: () => "DRAFT" | "APPROVED";
  addAudit: (action: string, details?: string) => void;
  bumpVersion: (reason?: string) => void;
  // Drawing state for saveCurrentUnitAndAddNew
  getDrawingState: () => {
    wardrobeBox?: { x: number; y: number; width: number; height: number; rotation: number };
    loftBox?: { x: number; y: number; width: number; height: number; rotation: number; dragEdge: string | null; isDragging: boolean; locked: boolean } | undefined;
    shutterCount: number;
    sectionCount: number;
    shutterDividerXs: number[];
    loftEnabled: boolean;
    loftHeightRatio: number;
    loftShutterCount: number;
    loftDividerXs: number[];
    unitType: string;
  };
  // Called after saveCurrentUnitAndAddNew to reset drawing state
  resetDrawingState: () => void;
  // Called after setActiveUnitIndex to load unit into drawing state
  loadUnitToDrawingState: (unit: DrawnUnit) => void;
  // Called after deleteDrawnUnit/deleteSelectedUnits to clear or load drawing state
  clearDrawingState: () => void;
  // For CRM sync
  syncToCRM?: () => void;
  // For custom shutter widths calculation
  getShutterWidthsContext?: () => {
    pxToMm?: number;
    shutterDividerXs: number[];
  };
}

/**
 * Units slice creator with dependency injection
 */
export const createUnitsSlice = (
  deps: UnitsSliceDeps
): StateCreator<UnitsSlice, [], [], UnitsSlice> => (set, get) => ({
  ...initialUnitsState,

  /* --------- Legacy WardrobeUnit CRUD ---------- */
  addWardrobeUnit: (u: Partial<WardrobeUnit> & { wallId: WallId }) => {
    if (deps.getStatus() === "APPROVED") return;

    const id = `UNIT-${Math.random().toString(16).slice(2)}-${Date.now()}`;

    // Custom Width Calculation
    let customShutterWidthsMm: number[] | undefined = undefined;
    const drawingState = deps.getDrawingState();
    const widthsContext = deps.getShutterWidthsContext?.();
    const box = drawingState.wardrobeBox;
    const xs = widthsContext?.shutterDividerXs;
    const pxToMm = widthsContext?.pxToMm;

    if (box && pxToMm && xs && xs.length > 0) {
      const sortedXs = [...xs].sort((a, b) => a - b);
      const startX = box.x;
      const endX = box.x + box.width;
      const boundaries = [startX, ...sortedXs, endX];
      customShutterWidthsMm = [];
      for (let i = 0; i < boundaries.length - 1; i++) {
        const curr = boundaries[i];
        const next = boundaries[i + 1];
        if (curr !== undefined && next !== undefined) {
          const diffPx = next - curr;
          customShutterWidthsMm.push(Math.round(diffPx * pxToMm));
        }
      }
    }

    const base: WardrobeUnit = {
      id,
      wallId: u.wallId,
      widthMm: u.widthMm ?? 1800,
      heightMm: u.heightMm ?? 2400,
      depthMm: u.depthMm ?? 600,
      loftEnabled: u.loftEnabled ?? false,
      loftHeightMm: u.loftHeightMm ?? 450,
      sectionCount: u.sectionCount ?? 3,
      finish: {
        shutterLaminateCode: u.finish?.shutterLaminateCode,
        loftLaminateCode: u.finish?.loftLaminateCode,
        innerLaminateCode: u.finish?.innerLaminateCode,
      },
      doorSwingMode: u.doorSwingMode ?? "AUTO",
      customShutterWidthsMm,
    };

    set((s) => ({
      units: [...s.units, base],
    }));

    deps.addAudit("Wardrobe unit added", `${id} on ${base.wallId}`);
    deps.bumpVersion("Unit added");
    deps.syncToCRM?.();
  },

  updateWardrobeUnit: (id, patch) => {
    if (deps.getStatus() === "APPROVED") return;
    set((s) => ({
      units: s.units.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    }));
    deps.addAudit("Wardrobe unit updated", `${id} patch=${Object.keys(patch).join(",")}`);
    deps.bumpVersion("Unit updated");
    deps.syncToCRM?.();
  },

  updateWardrobeUnitConfig: (id, config: WardrobeConfig) => {
    if (deps.getStatus() === "APPROVED") return;
    set((s) => ({
      units: s.units.map((u) => (u.id === id ? { ...u, wardrobeConfig: config } : u)),
    }));
    deps.addAudit("Wardrobe config updated", `${id} type=${config.wardrobeType}`);
    deps.bumpVersion("Config updated");
    deps.syncToCRM?.();
  },

  removeWardrobeUnit: (id) => {
    if (deps.getStatus() === "APPROVED") return;
    set((s) => ({
      units: s.units.filter((u) => u.id !== id),
    }));
    deps.addAudit("Wardrobe unit removed", id);
    deps.bumpVersion("Unit removed");
    deps.syncToCRM?.();
  },

  clearUnits: () => {
    if (deps.getStatus() === "APPROVED") return;
    set(() => ({ units: [] }));
    deps.addAudit("Units cleared");
    deps.bumpVersion("Units cleared");
    deps.syncToCRM?.();
  },

  /* --------- Multi-unit canvas actions ---------- */
  saveCurrentUnitAndAddNew: () => {
    if (deps.getStatus() === "APPROVED") return;

    const drawingState = deps.getDrawingState();
    if (!drawingState.wardrobeBox) return;

    // Create a new drawn unit from current drawing state
    const sectionCount = drawingState.sectionCount || 1;
    const boxHeight = drawingState.wardrobeBox.height;
    const boxY = drawingState.wardrobeBox.y;
    const horizontalDividerYs = sectionCount > 1
      ? Array.from({ length: sectionCount - 1 }, (_, i) => boxY + (boxHeight / sectionCount) * (i + 1))
      : [];

    const newUnit: DrawnUnit = {
      id: `unit-${Date.now()}`,
      unitType: drawingState.unitType,
      box: { ...drawingState.wardrobeBox },
      loftBox: drawingState.loftBox ? { ...drawingState.loftBox } : undefined,
      shutterCount: drawingState.shutterCount,
      shutterDividerXs: [...drawingState.shutterDividerXs],
      loftEnabled: drawingState.loftEnabled,
      loftHeightRatio: drawingState.loftHeightRatio,
      loftShutterCount: drawingState.loftShutterCount,
      loftDividerXs: [...drawingState.loftDividerXs],
      horizontalDividerYs,
      // Start with blank dimensions - user will enter them
      widthMm: 0,
      heightMm: 0,
      depthMm: 0,
      // Separate loft dimensions
      loftWidthMm: 0,
      loftHeightMm: 0,
      sectionCount,
      shelfCount: 0,
      // Initialize empty add-ons array
      drawnAddOns: [],
    };

    // Add to drawnUnits array
    set((s) => ({
      drawnUnits: [...s.drawnUnits, newUnit],
      activeUnitIndex: s.drawnUnits.length, // Point to the newly saved unit
    }));

    // Reset drawing state (handled by main store orchestrator)
    deps.resetDrawingState();
    deps.addAudit("Unit saved", `Added ${newUnit.unitType} unit`);
  },

  setActiveUnitIndex: (index) => {
    const state = get();
    if (index < 0 || index >= state.drawnUnits.length) return;

    const unit = state.drawnUnits[index];
    if (!unit) return;

    // Update unit selection
    set(() => ({
      activeUnitIndex: index,
      selectedUnitIndices: [index],
    }));

    // Load unit into drawing state (handled by main store orchestrator)
    deps.loadUnitToDrawingState(unit);
  },

  selectAllUnits: () => {
    const state = get();
    if (state.drawnUnits.length === 0) return;

    // Select all units
    const allIndices = state.drawnUnits.map((_, i) => i);
    set(() => ({
      selectedUnitIndices: allIndices,
      activeUnitIndex: 0,
    }));
  },

  clearUnitSelection: () => {
    set(() => ({
      selectedUnitIndices: [],
      activeUnitIndex: -1,
    }));
  },

  setSelectedUnitIndices: (indices) => {
    const state = get();
    // Filter to valid indices
    const validIndices = indices.filter(i => i >= 0 && i < state.drawnUnits.length);
    set(() => ({
      selectedUnitIndices: validIndices,
      activeUnitIndex: validIndices.length > 0 ? validIndices[0]! : -1,
    }));
  },

  deleteDrawnUnit: (index) => {
    if (deps.getStatus() === "APPROVED") return;
    const state = get();
    if (index < 0 || index >= state.drawnUnits.length) return;

    const newUnits = state.drawnUnits.filter((_, i) => i !== index);
    const newActiveIndex = Math.min(state.activeUnitIndex, Math.max(0, newUnits.length - 1));

    set(() => ({
      drawnUnits: newUnits,
      activeUnitIndex: newActiveIndex,
    }));

    // Handle drawing state update
    if (newUnits.length === 0) {
      deps.clearDrawingState();
    } else if (newUnits[newActiveIndex]) {
      deps.loadUnitToDrawingState(newUnits[newActiveIndex]!);
    }

    deps.addAudit("Unit deleted", `Removed unit at index ${index}`);
  },

  deleteSelectedUnits: () => {
    if (deps.getStatus() === "APPROVED") return;
    const state = get();
    if (state.selectedUnitIndices.length === 0) return;

    const newUnits = state.drawnUnits.filter((_, i) => !state.selectedUnitIndices.includes(i));

    set(() => ({
      drawnUnits: newUnits,
      selectedUnitIndices: [],
      activeUnitIndex: newUnits.length > 0 ? 0 : -1,
    }));

    // Handle drawing state update
    if (newUnits.length === 0) {
      deps.clearDrawingState();
    } else {
      deps.loadUnitToDrawingState(newUnits[0]!);
    }

    deps.addAudit("Units deleted", `Removed ${state.selectedUnitIndices.length} selected units`);
  },

  updateActiveDrawnUnit: (patch) => {
    if (deps.getStatus() === "APPROVED") return;
    const state = get();
    if (state.drawnUnits.length === 0) return;

    set((s) => {
      const activeUnit = s.drawnUnits[s.activeUnitIndex];
      if (!activeUnit) return {};

      // If shutter count changed, recalculate dividers
      let newDividers = patch.shutterDividerXs;
      if (patch.shutterCount !== undefined && patch.shutterCount !== activeUnit.shutterCount) {
        const box = activeUnit.box;
        const count = patch.shutterCount;
        if (count > 1 && box.width > 0) {
          const shutterWidth = box.width / count;
          newDividers = Array.from({ length: count - 1 }, (_, i) => box.x + shutterWidth * (i + 1));
        } else {
          newDividers = [];
        }
      }

      // If loftEnabled changed, create or remove loft box
      let newLoftBox = patch.loftBox;
      let newLoftDividers = patch.loftDividerXs;
      let newLoftShutterCount: number | undefined;
      if (patch.loftEnabled !== undefined && patch.loftEnabled !== activeUnit.loftEnabled) {
        if (patch.loftEnabled) {
          // Create loft box above the wardrobe
          const box = activeUnit.box;
          const defaultHeight = box.height * 0.25;
          newLoftBox = {
            x: box.x,
            width: box.width,
            y: box.y - defaultHeight,
            height: defaultHeight,
            rotation: 0,
            dragEdge: null,
            isDragging: false,
            locked: false,
          };
          // Match loft shutter count to wardrobe shutter count on first enable
          const loftCount = activeUnit.shutterCount || 3;
          newLoftShutterCount = loftCount;
          newLoftDividers = loftCount <= 1 ? [] : Array.from({ length: loftCount - 1 }, (_, i) => {
            return newLoftBox!.x + (newLoftBox!.width / loftCount) * (i + 1);
          });
        } else {
          // Remove loft box
          newLoftBox = undefined;
          newLoftDividers = [];
        }
      }

      // If loftShutterCount changed, recalculate loft dividers
      if (patch.loftShutterCount !== undefined && patch.loftShutterCount !== activeUnit.loftShutterCount) {
        const loftBox = newLoftBox !== undefined ? newLoftBox : activeUnit.loftBox;
        if (loftBox && activeUnit.loftEnabled) {
          const count = patch.loftShutterCount;
          if (count > 1 && loftBox.width > 0) {
            newLoftDividers = Array.from({ length: count - 1 }, (_, i) => loftBox.x + (loftBox.width / count) * (i + 1));
          } else {
            newLoftDividers = [];
          }
        }
      }

      const updatedUnit = {
        ...activeUnit,
        ...patch,
        ...(newDividers !== undefined ? { shutterDividerXs: newDividers } : {}),
        ...(newLoftBox !== undefined ? { loftBox: newLoftBox } : {}),
        ...(newLoftDividers !== undefined ? { loftDividerXs: newLoftDividers } : {}),
        ...(newLoftShutterCount !== undefined ? { loftShutterCount: newLoftShutterCount } : {}),
      };

      return {
        drawnUnits: s.drawnUnits.map((unit, i) =>
          i === s.activeUnitIndex ? updatedUnit : unit
        ),
      };
    });
  },

  updateDrawnUnitById: (unitId, patch) => {
    if (deps.getStatus() === "APPROVED") return;

    set((s) => ({
      drawnUnits: s.drawnUnits.map((unit) =>
        unit.id === unitId ? { ...unit, ...patch } : unit
      ),
    }));
  },

  updateQuotationRoomUnit: (_roomIndex, _unitId, _patch) => {
    // This is a cross-slice action that needs to update quotationRooms
    // which is owned by roomSlice. Main store will override this.
    logger.warn('Cross-slice action detected: updateQuotationRoomUnit', { context: 'units-slice' });
  },

  nudgeDrawnUnit: (index, dx, dy) => {
    if (deps.getStatus() === "APPROVED") return;
    const state = get();
    if (index < 0 || index >= state.drawnUnits.length) return;

    set((s) => {
      const units = [...s.drawnUnits];
      const unit = units[index];
      if (!unit) return s;

      units[index] = {
        ...unit,
        box: {
          ...unit.box,
          x: unit.box.x + dx,
          y: unit.box.y + dy,
        },
        // Also nudge loft box if it exists
        ...(unit.loftBox ? {
          loftBox: {
            ...unit.loftBox,
            x: unit.loftBox.x + dx,
            y: unit.loftBox.y + dy,
          },
        } : {}),
      };

      return { drawnUnits: units };
    });
  },

  removeLoftFromUnit: (index) => {
    if (deps.getStatus() === "APPROVED") return;
    const state = get();
    if (index < 0 || index >= state.drawnUnits.length) return;

    const unit = state.drawnUnits[index];
    if (!unit || !unit.loftEnabled) return;

    set((s) => {
      const units = [...s.drawnUnits];
      units[index] = {
        ...units[index]!,
        loftEnabled: false,
        loftBox: undefined,
        loftDividerXs: [],
        loftWidthMm: 0,
        loftHeightMm: 0,
      };

      return { drawnUnits: units };
    });

    deps.addAudit("Loft removed from unit", `unit index=${index}`);
  },

  setUnitShelfCount: (index, count) => {
    if (deps.getStatus() === "APPROVED") return;
    const state = get();
    if (index < 0 || index >= state.drawnUnits.length) return;

    // Clamp count between 0 and 10
    const clampedCount = Math.max(0, Math.min(10, count));

    set((s) => {
      const units = [...s.drawnUnits];
      units[index] = {
        ...units[index]!,
        shelfCount: clampedCount,
      };
      return { drawnUnits: units };
    });

    deps.addAudit("Shelf count updated", `unit index=${index}, shelves=${clampedCount}`);
  },

  /* --------- Edit part selection ---------- */
  setActiveEditPart: (part) => {
    set(() => ({ activeEditPart: part }));
  },

  setWardrobeLayout: (layout: WardrobeLayout) => {
    set(() => ({ wardrobeLayout: layout }));
  },

  /* --------- Add-on drawing actions ---------- */
  setAddOnDrawMode: (addOnType: WardrobeAddOn | null) => {
    if (deps.getStatus() === "APPROVED") return;
    set(() => ({
      addOnDrawMode: addOnType,
    }));
    if (addOnType) {
      deps.addAudit("Add-on draw mode", `Drawing ${addOnType}`);
    }
  },

  addDrawnAddOn: (addOn) => {
    if (deps.getStatus() === "APPROVED") return;
    const state = get();
    if (state.drawnUnits.length === 0 || state.activeUnitIndex >= state.drawnUnits.length) return;

    const newAddOn: DrawnAddOn = {
      id: `addon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...addOn,
    };

    set((s) => {
      const units = [...s.drawnUnits];
      const activeUnit = units[s.activeUnitIndex];
      if (!activeUnit) return s;

      // Initialize drawnAddOns array if it doesn't exist
      const drawnAddOns = activeUnit.drawnAddOns || [];

      units[s.activeUnitIndex] = {
        ...activeUnit,
        drawnAddOns: [...drawnAddOns, newAddOn],
      };

      return {
        drawnUnits: units,
        addOnDrawMode: null, // Exit draw mode after drawing
      };
    });

    deps.addAudit("Add-on drawn", `${addOn.addOnType}: ${addOn.areaSqft.toFixed(2)} sqft`);
  },

  removeDrawnAddOn: (addOnId) => {
    if (deps.getStatus() === "APPROVED") return;
    const state = get();
    if (state.drawnUnits.length === 0 || state.activeUnitIndex >= state.drawnUnits.length) return;

    set((s) => {
      const units = [...s.drawnUnits];
      const activeUnit = units[s.activeUnitIndex];
      if (!activeUnit || !activeUnit.drawnAddOns) return s;

      units[s.activeUnitIndex] = {
        ...activeUnit,
        drawnAddOns: activeUnit.drawnAddOns.filter(a => a.id !== addOnId),
      };

      return { drawnUnits: units };
    });

    deps.addAudit("Add-on removed", `id=${addOnId}`);
  },

  updateDrawnAddOn: (addOnId, patch) => {
    if (deps.getStatus() === "APPROVED") return;
    const state = get();
    if (state.drawnUnits.length === 0 || state.activeUnitIndex >= state.drawnUnits.length) return;

    set((s) => {
      const units = [...s.drawnUnits];
      const activeUnit = units[s.activeUnitIndex];
      if (!activeUnit || !activeUnit.drawnAddOns) return s;

      units[s.activeUnitIndex] = {
        ...activeUnit,
        drawnAddOns: activeUnit.drawnAddOns.map(a =>
          a.id === addOnId ? { ...a, ...patch } : a
        ),
      };

      return { drawnUnits: units };
    });
  },
});
