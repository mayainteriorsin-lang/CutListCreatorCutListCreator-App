/**
 * Units Slice State Types
 * Owns: Drawn units, unit selection, unit CRUD
 */

import type { WallId } from "../core";
import type { WardrobeUnit, DrawnUnit, DrawnAddOn, WardrobeLayout, WardrobeSpec } from "../wardrobe";
import type { WardrobeAddOn, WardrobeConfig } from "../pricing";

/**
 * UnitsSliceState
 * Responsible for all unit/wardrobe data
 */
export interface UnitsSliceState {
  /* Legacy units (design objects) */
  units: WardrobeUnit[];

  /* Multi-unit canvas drawing */
  drawnUnits: DrawnUnit[];
  activeUnitIndex: number;
  selectedUnitIndices: number[];
  activeEditPart: "shutter" | "loft";

  /* Wardrobe layout suggestions */
  wardrobeLayout?: WardrobeLayout;

  /* Wardrobe spec (derived from photo + scale) */
  wardrobeSpec?: WardrobeSpec;

  /* Add-on drawing mode */
  addOnDrawMode: WardrobeAddOn | null;
}

/**
 * UnitsSliceActions
 * Actions owned by units slice
 */
export interface UnitsSliceActions {
  // Legacy unit CRUD
  addWardrobeUnit: (u: Partial<WardrobeUnit> & { wallId: WallId }) => void;
  updateWardrobeUnit: (id: string, patch: Partial<WardrobeUnit>) => void;
  updateWardrobeUnitConfig: (id: string, config: WardrobeConfig) => void;
  removeWardrobeUnit: (id: string) => void;
  clearUnits: () => void;

  // Multi-unit canvas actions
  saveCurrentUnitAndAddNew: () => void;
  setActiveUnitIndex: (index: number) => void;
  selectAllUnits: () => void;
  clearUnitSelection: () => void;
  setSelectedUnitIndices: (indices: number[]) => void;
  deleteDrawnUnit: (index: number) => void;
  deleteSelectedUnits: () => void;
  updateActiveDrawnUnit: (patch: Partial<DrawnUnit>) => void;
  updateDrawnUnitById: (unitId: string, patch: Partial<DrawnUnit>) => void;
  updateQuotationRoomUnit: (roomIndex: number, unitId: string, patch: Partial<DrawnUnit>) => void;

  // Unit position/loft actions (used by canvas)
  nudgeDrawnUnit: (index: number, dx: number, dy: number) => void;
  removeLoftFromUnit: (index: number) => void;
  setUnitShelfCount: (index: number, count: number) => void;

  // Edit part selection
  setActiveEditPart: (part: "shutter" | "loft") => void;
  setWardrobeLayout: (layout: WardrobeLayout) => void;

  // Add-on drawing actions
  setAddOnDrawMode: (addOnType: WardrobeAddOn | null) => void;
  addDrawnAddOn: (addOn: Omit<DrawnAddOn, "id">) => void;
  removeDrawnAddOn: (addOnId: string) => void;
  updateDrawnAddOn: (addOnId: string, patch: Partial<DrawnAddOn>) => void;
}

export type UnitsSlice = UnitsSliceState & UnitsSliceActions;
