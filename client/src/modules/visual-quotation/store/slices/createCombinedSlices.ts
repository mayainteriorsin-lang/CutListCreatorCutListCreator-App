/**
 * Combined Slices - Store Composition Utility
 *
 * This file demonstrates how to combine all feature slices into a unified store.
 * The main store (visualQuotationStore.ts) can import and spread these slices.
 *
 * Pattern:
 * 1. Create each slice with dependency injection
 * 2. Wire up cross-slice dependencies using getters
 * 3. Return combined state + actions
 *
 * Usage in main store:
 * ```ts
 * const store = create<VisualQuotationState>()(
 *   persist(
 *     (set, get) => ({
 *       ...createCombinedSlices(set, get),
 *       // ... any remaining actions that need full store access
 *     }),
 *     { name: 'visual-quotation-store-v1' }
 *   )
 * );
 * ```
 */

import type { StoreApi } from "zustand";

import {
  createClientSlice,
  initialClientState,
  createPhotoSlice,
  initialPhotoState,
  createConfigSlice,
  initialConfigState,
  createRoomSlice,
  initialRoomState,
  createUnitsSlice,
  initialUnitsState,
  createDrawingSlice,
  initialDrawingState,
} from "./index";

import type { ClientSlice } from "./clientSlice";
import type { PhotoSlice, PhotoSliceDeps } from "./photoSlice";
import type { ConfigSlice, ConfigSliceDeps } from "./configSlice";
import type { RoomSlice, RoomSliceDeps } from "./roomSlice";
import type { UnitsSlice, UnitsSliceDeps } from "./unitsSlice";
import type { DrawingSlice, DrawingSliceDeps } from "./drawingSlice";
import type { DrawnUnit, WardrobeLayout } from "../../types";

/**
 * Combined slice state (all slices merged)
 */
export type CombinedSliceState =
  & ClientSlice
  & PhotoSlice
  & ConfigSlice
  & RoomSlice
  & UnitsSlice
  & DrawingSlice;

/**
 * Combined initial state from all slices
 */
export const combinedInitialState = {
  ...initialClientState,
  ...initialPhotoState,
  ...initialConfigState,
  ...initialRoomState,
  ...initialUnitsState,
  ...initialDrawingState,
};

/**
 * Create all combined slices with properly wired dependencies
 *
 * @param set - Zustand set function
 * @param get - Zustand get function (returns full store state)
 * @returns Combined state and actions from all slices
 */
export function createCombinedSlices<T extends CombinedSliceState>(
  set: StoreApi<T>["setState"],
  get: StoreApi<T>["getState"]
): CombinedSliceState {
  // Helper to get status
  const getStatus = () => get().status;

  // Helper to add audit (from client slice)
  const addAudit = (action: string, details?: string) => {
    // This will be overwritten by clientSlice.addAudit
    // We need to call the actual function from the slice
    const state = get() as unknown as ClientSlice;
    state.addAudit(action, details);
  };

  // Helper to bump version (from client slice)
  const bumpVersion = (reason?: string) => {
    const state = get() as unknown as ClientSlice;
    state.bumpVersion(reason);
  };

  // ========== Create Client Slice (no deps - standalone) ==========
  const clientSlice = createClientSlice(
    set as unknown as StoreApi<ClientSlice>["setState"],
    get as unknown as StoreApi<ClientSlice>["getState"],
    {} as StoreApi<ClientSlice>
  );

  // ========== Create Photo Slice ==========
  const photoDeps: PhotoSliceDeps = {
    getStatus,
    addAudit: (action, details) => clientSlice.addAudit(action, details),
  };
  const photoSlice = createPhotoSlice(photoDeps)(
    set as unknown as StoreApi<PhotoSlice>["setState"],
    get as unknown as StoreApi<PhotoSlice>["getState"],
    {} as StoreApi<PhotoSlice>
  );

  // ========== Create Config Slice ==========
  const configDeps: ConfigSliceDeps = {
    getStatus,
    addAudit: (action, details) => clientSlice.addAudit(action, details),
  };
  const configSlice = createConfigSlice(configDeps)(
    set as unknown as StoreApi<ConfigSlice>["setState"],
    get as unknown as StoreApi<ConfigSlice>["getState"],
    {} as StoreApi<ConfigSlice>
  );

  // ========== Create Room Slice ==========
  const roomDeps: RoomSliceDeps = {
    getStatus,
    addAudit: (action, details) => clientSlice.addAudit(action, details),
    bumpVersion: (reason) => clientSlice.bumpVersion(reason),
    computeAreas: () => {
      // Will be connected to drawing slice
      const state = get() as unknown as DrawingSlice;
      state.computeAreas?.();
    },
  };
  const roomSlice = createRoomSlice(roomDeps)(
    set as unknown as StoreApi<RoomSlice>["setState"],
    get as unknown as StoreApi<RoomSlice>["getState"],
    {} as StoreApi<RoomSlice>
  );

  // ========== Create Drawing Slice ==========
  const drawingDeps: DrawingSliceDeps = {
    getStatus,
    addAudit: (action, details) => clientSlice.addAudit(action, details),
    getScaleRatio: () => {
      const state = get() as unknown as RoomSlice;
      return state.scale?.ratio ?? state.room?.scale?.pxToMm ?? 0;
    },
    computeAreas: () => {
      // Actual computation - this is a cross-slice operation
      // The main store should override this with full implementation
    },
    getRoomPhoto: () => {
      const state = get() as unknown as PhotoSlice;
      return state.roomPhoto;
    },
    getWardrobeLayout: () => {
      const state = get() as unknown as UnitsSlice;
      return state.wardrobeLayout;
    },
    setWardrobeLayout: (layout: WardrobeLayout) => {
      const state = get() as unknown as UnitsSlice;
      state.setWardrobeLayout(layout);
    },
    getUnitType: () => {
      const state = get() as unknown as ClientSlice;
      return state.unitType;
    },
    onClearWardrobeBox: () => {
      // Cross-slice effect: clear units and layout when wardrobe box is cleared
      set((s) => ({
        ...s,
        wardrobeLayout: undefined,
        wardrobeSpec: undefined,
        units: [],
      } as T));
    },
  };
  const drawingSlice = createDrawingSlice(drawingDeps)(
    set as unknown as StoreApi<DrawingSlice>["setState"],
    get as unknown as StoreApi<DrawingSlice>["getState"],
    {} as StoreApi<DrawingSlice>
  );

  // ========== Create Units Slice ==========
  const unitsDeps: UnitsSliceDeps = {
    getStatus,
    addAudit: (action, details) => clientSlice.addAudit(action, details),
    bumpVersion: (reason) => clientSlice.bumpVersion(reason),
    getDrawingState: () => {
      const state = get() as unknown as DrawingSlice & ClientSlice;
      return {
        wardrobeBox: state.wardrobeBox,
        loftBox: state.loftBox,
        shutterCount: state.shutterCount,
        sectionCount: state.sectionCount,
        shutterDividerXs: state.shutterDividerXs,
        loftEnabled: state.loftEnabled,
        loftHeightRatio: state.loftHeightRatio,
        loftShutterCount: state.loftShutterCount,
        loftDividerXs: state.loftDividerXs,
        unitType: state.unitType,
      };
    },
    resetDrawingState: () => {
      set((s) => ({
        ...s,
        wardrobeBox: undefined,
        loftBox: undefined,
        shutterCount: 3,
        sectionCount: 1,
        shutterDividerXs: [],
        loftEnabled: false,
        loftDividerXs: [],
        drawMode: false,
        unitType: "wardrobe",
      } as T));
    },
    loadUnitToDrawingState: (unit: DrawnUnit) => {
      set((s) => ({
        ...s,
        wardrobeBox: { ...unit.box },
        loftBox: unit.loftBox ? { ...unit.loftBox } : undefined,
        shutterCount: unit.shutterCount,
        sectionCount: unit.sectionCount || 1,
        shutterDividerXs: [...unit.shutterDividerXs],
        loftEnabled: unit.loftEnabled,
        loftHeightRatio: unit.loftHeightRatio,
        loftShutterCount: unit.loftShutterCount,
        loftDividerXs: [...unit.loftDividerXs],
        unitType: unit.unitType,
      } as T));
    },
    clearDrawingState: () => {
      set((s) => ({
        ...s,
        wardrobeBox: undefined,
        loftBox: undefined,
      } as T));
    },
    syncToCRM: () => {
      // CRM sync - main store will implement this
    },
    getShutterWidthsContext: () => {
      const state = get() as unknown as RoomSlice & DrawingSlice;
      return {
        pxToMm: state.room?.scale?.pxToMm,
        shutterDividerXs: state.shutterDividerXs,
      };
    },
  };
  const unitsSlice = createUnitsSlice(unitsDeps)(
    set as unknown as StoreApi<UnitsSlice>["setState"],
    get as unknown as StoreApi<UnitsSlice>["getState"],
    {} as StoreApi<UnitsSlice>
  );

  // ========== Combine All Slices ==========
  return {
    // State from all slices
    ...combinedInitialState,

    // Actions from all slices
    ...clientSlice,
    ...photoSlice,
    ...configSlice,
    ...roomSlice,
    ...drawingSlice,
    ...unitsSlice,
  };
}

/**
 * Export slice creators for selective composition
 * (if main store needs to compose slices differently)
 */
export {
  createClientSlice,
  createPhotoSlice,
  createConfigSlice,
  createRoomSlice,
  createUnitsSlice,
  createDrawingSlice,
  initialClientState,
  initialPhotoState,
  initialConfigState,
  initialRoomState,
  initialUnitsState,
  initialDrawingState,
};
