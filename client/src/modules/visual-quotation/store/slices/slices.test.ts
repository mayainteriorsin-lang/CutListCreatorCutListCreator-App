/**
 * Unit Tests for Visual Quotation Store Slices
 *
 * Tests focus on:
 * 1. Approval guard behavior (actions blocked when status === "APPROVED")
 * 2. Audit trail behavior (actions trigger addAudit calls)
 * 3. State updates (basic state changes work correctly)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClientSlice, initialClientState } from "./clientSlice";
import { createPhotoSlice, initialPhotoState, type PhotoSliceDeps } from "./photoSlice";
import { createConfigSlice, initialConfigState, type ConfigSliceDeps } from "./configSlice";
import { createRoomSlice, initialRoomState, type RoomSliceDeps } from "./roomSlice";
import { createDrawingSlice, initialDrawingState, type DrawingSliceDeps } from "./drawingSlice";
import { createUnitsSlice, initialUnitsState, type UnitsSliceDeps } from "./unitsSlice";

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Creates a minimal zustand-compatible set/get pair for testing slices
 * For clientSlice, we need to handle the self-referential get().addAudit() pattern
 */
function createTestStore<T extends object>(initialState: T) {
  let state = { ...initialState };
  const set = vi.fn((updater: ((s: T) => Partial<T>) | Partial<T>) => {
    if (typeof updater === "function") {
      state = { ...state, ...updater(state) };
    } else {
      state = { ...state, ...updater };
    }
  });
  const get = vi.fn(() => state);
  const api = {} as never;

  // For clientSlice tests: attach slice actions while preserving current state values
  const attachSlice = <S extends object>(slice: S) => {
    // Only copy functions (actions), not state values
    for (const key of Object.keys(slice)) {
      if (typeof (slice as Record<string, unknown>)[key] === "function") {
        (state as Record<string, unknown>)[key] = (slice as Record<string, unknown>)[key];
      }
    }
  };

  return { set, get, api, getState: () => state, attachSlice };
}

// =============================================================================
// CLIENT SLICE TESTS
// =============================================================================

describe("clientSlice", () => {
  describe("audit behavior", () => {
    it("addAudit adds entry to audit array", () => {
      const { set, get, api } = createTestStore(initialClientState);
      const slice = createClientSlice(set, get, api);

      slice.addAudit("Test action", "test details");

      const state = get();
      expect(state.audit).toHaveLength(1);
      expect(state.audit[0]?.action).toBe("Test action");
      expect(state.audit[0]?.details).toBe("test details");
    });

    it("audit entries have unique ids and timestamps", () => {
      const { set, get, api } = createTestStore(initialClientState);
      const slice = createClientSlice(set, get, api);

      slice.addAudit("Action 1");
      slice.addAudit("Action 2");

      const state = get();
      expect(state.audit).toHaveLength(2);
      expect(state.audit[0]?.id).not.toBe(state.audit[1]?.id);
    });

    it("audit is capped at 200 entries", () => {
      const { set, get, api } = createTestStore(initialClientState);
      const slice = createClientSlice(set, get, api);

      // Add 205 entries
      for (let i = 0; i < 205; i++) {
        slice.addAudit(`Action ${i}`);
      }

      const state = get();
      expect(state.audit).toHaveLength(200);
    });
  });

  describe("version bump", () => {
    it("bumpVersion increments version in DRAFT", () => {
      const { set, get, api, attachSlice } = createTestStore(initialClientState);
      const slice = createClientSlice(set, get, api);
      attachSlice(slice); // Attach so get().addAudit() works

      const initialVersion = get().version;
      slice.bumpVersion("test reason");

      expect(get().version).toBe(initialVersion + 1);
    });

    it("bumpVersion is blocked when APPROVED", () => {
      const { set, get, api, attachSlice } = createTestStore({ ...initialClientState, status: "APPROVED" as const });
      const slice = createClientSlice(set, get, api);
      attachSlice(slice);

      const initialVersion = get().version;
      slice.bumpVersion("test reason");

      expect(get().version).toBe(initialVersion);
    });
  });

  describe("approval guard", () => {
    it("setClientField is blocked when APPROVED", () => {
      const { set, get, api, attachSlice } = createTestStore({ ...initialClientState, status: "APPROVED" as const });
      const slice = createClientSlice(set, get, api);
      attachSlice(slice);

      slice.setClientField("name", "New Name");

      expect(get().client.name).toBe("");
    });

    it("setClientField works in DRAFT", () => {
      const { set, get, api, attachSlice } = createTestStore(initialClientState);
      const slice = createClientSlice(set, get, api);
      attachSlice(slice); // Attach so get().addAudit() works

      slice.setClientField("name", "New Name");

      expect(get().client.name).toBe("New Name");
    });

    it("setRoomType is blocked when APPROVED", () => {
      const { set, get, api, attachSlice } = createTestStore({ ...initialClientState, status: "APPROVED" as const });
      const slice = createClientSlice(set, get, api);
      attachSlice(slice);

      const originalRoomType = get().roomType;
      slice.setRoomType("Kitchen");

      expect(get().roomType).toBe(originalRoomType);
    });

    it("setUnitType is blocked when APPROVED", () => {
      const { set, get, api, attachSlice } = createTestStore({ ...initialClientState, status: "APPROVED" as const });
      const slice = createClientSlice(set, get, api);
      attachSlice(slice);

      const originalUnitType = get().unitType;
      slice.setUnitType("kitchen");

      expect(get().unitType).toBe(originalUnitType);
    });
  });
});

// =============================================================================
// PHOTO SLICE TESTS
// =============================================================================

describe("photoSlice", () => {
  let mockDeps: PhotoSliceDeps;

  beforeEach(() => {
    mockDeps = {
      getStatus: vi.fn(() => "DRAFT" as const),
      addAudit: vi.fn(),
    };
  });

  describe("approval guard", () => {
    it("setRoomPhoto is blocked when APPROVED", () => {
      mockDeps.getStatus = vi.fn(() => "APPROVED" as const);
      const { set, get, api } = createTestStore(initialPhotoState);
      const slice = createPhotoSlice(mockDeps)(set, get, api);

      slice.setRoomPhoto("data:image/png;base64,test", 100, 100);

      expect(get().roomPhoto).toBeUndefined();
    });

    it("setRoomPhoto works in DRAFT", () => {
      const { set, get, api } = createTestStore(initialPhotoState);
      const slice = createPhotoSlice(mockDeps)(set, get, api);

      slice.setRoomPhoto("data:image/png;base64,test", 100, 100);

      expect(get().roomPhoto).toBeDefined();
      expect(get().roomPhoto?.width).toBe(100);
    });

    it("clearRoomPhoto is blocked when APPROVED", () => {
      mockDeps.getStatus = vi.fn(() => "APPROVED" as const);
      const { set, get, api } = createTestStore({
        ...initialPhotoState,
        roomPhoto: { src: "test", width: 100, height: 100 },
      });
      const slice = createPhotoSlice(mockDeps)(set, get, api);

      slice.clearRoomPhoto();

      expect(get().roomPhoto).toBeDefined();
    });

    it("addReferencePhoto is blocked when APPROVED", () => {
      mockDeps.getStatus = vi.fn(() => "APPROVED" as const);
      const { set, get, api } = createTestStore(initialPhotoState);
      const slice = createPhotoSlice(mockDeps)(set, get, api);

      slice.addReferencePhoto("data:image/png;base64,test", 100, 100);

      expect(get().referencePhotos).toHaveLength(0);
    });

    it("removeReferencePhoto is blocked when APPROVED", () => {
      mockDeps.getStatus = vi.fn(() => "APPROVED" as const);
      const { set, get, api } = createTestStore({
        ...initialPhotoState,
        referencePhotos: [{ id: "ref-1", src: "test", width: 100, height: 100 }],
      });
      const slice = createPhotoSlice(mockDeps)(set, get, api);

      slice.removeReferencePhoto("ref-1");

      expect(get().referencePhotos).toHaveLength(1);
    });
  });

  describe("audit behavior", () => {
    it("setRoomPhoto triggers addAudit", () => {
      const { set, get, api } = createTestStore(initialPhotoState);
      const slice = createPhotoSlice(mockDeps)(set, get, api);

      slice.setRoomPhoto("data:image/png;base64,test", 100, 200);

      expect(mockDeps.addAudit).toHaveBeenCalledWith("Room photo set", "w=100px h=200px");
    });

    it("clearRoomPhoto triggers addAudit", () => {
      const { set, get, api } = createTestStore({
        ...initialPhotoState,
        roomPhoto: { src: "test", width: 100, height: 100 },
      });
      const slice = createPhotoSlice(mockDeps)(set, get, api);

      slice.clearRoomPhoto();

      expect(mockDeps.addAudit).toHaveBeenCalledWith("Room photo cleared");
    });
  });
});

// =============================================================================
// CONFIG SLICE TESTS
// =============================================================================

describe("configSlice", () => {
  let mockDeps: ConfigSliceDeps;

  beforeEach(() => {
    mockDeps = {
      getStatus: vi.fn(() => "DRAFT" as const),
      addAudit: vi.fn(),
    };
  });

  describe("approval guard", () => {
    it("setPricingControl is blocked when APPROVED", () => {
      mockDeps.getStatus = vi.fn(() => "APPROVED" as const);
      const { set, get, api } = createTestStore(initialConfigState);
      const slice = createConfigSlice(mockDeps)(set, get, api);

      slice.setPricingControl("marginPct", 50);

      expect(get().pricingControl.marginPct).toBe(20); // unchanged
    });

    it("setPricingControl works in DRAFT", () => {
      const { set, get, api } = createTestStore(initialConfigState);
      const slice = createConfigSlice(mockDeps)(set, get, api);

      slice.setPricingControl("marginPct", 50);

      expect(get().pricingControl.marginPct).toBe(50);
    });

    it("setSqftRate works regardless of status", () => {
      mockDeps.getStatus = vi.fn(() => "APPROVED" as const);
      const { set, get, api } = createTestStore(initialConfigState);
      const slice = createConfigSlice(mockDeps)(set, get, api);

      slice.setSqftRate(200);

      expect(get().sqftRate).toBe(200);
    });
  });

  describe("audit behavior", () => {
    it("setPricingControl triggers addAudit", () => {
      const { set, get, api } = createTestStore(initialConfigState);
      const slice = createConfigSlice(mockDeps)(set, get, api);

      slice.setPricingControl("discountPct", 10);

      expect(mockDeps.addAudit).toHaveBeenCalledWith("Pricing control changed", "discountPct=10");
    });
  });
});

// =============================================================================
// ROOM SLICE TESTS
// =============================================================================

describe("roomSlice", () => {
  let mockDeps: RoomSliceDeps;

  beforeEach(() => {
    mockDeps = {
      getStatus: vi.fn(() => "DRAFT" as const),
      addAudit: vi.fn(),
    };
  });

  describe("approval guard", () => {
    it("setRoomInputType is blocked when APPROVED", () => {
      mockDeps.getStatus = vi.fn(() => "APPROVED" as const);
      const { set, get, api } = createTestStore(initialRoomState);
      const slice = createRoomSlice(mockDeps)(set, get, api);

      slice.setRoomInputType("MANUAL");

      expect(get().room.inputType).toBe("PHOTO");
    });

    it("setRoomInputType works in DRAFT", () => {
      const { set, get, api } = createTestStore(initialRoomState);
      const slice = createRoomSlice(mockDeps)(set, get, api);

      slice.setRoomInputType("MANUAL");

      expect(get().room.inputType).toBe("MANUAL");
    });

    it("setSelectedWall is blocked when APPROVED", () => {
      mockDeps.getStatus = vi.fn(() => "APPROVED" as const);
      const { set, get, api } = createTestStore(initialRoomState);
      const slice = createRoomSlice(mockDeps)(set, get, api);

      slice.setSelectedWall("LEFT");

      expect(get().room.selectedWallId).toBe("RIGHT");
    });

    it("setScaleByReference is blocked when APPROVED", () => {
      mockDeps.getStatus = vi.fn(() => "APPROVED" as const);
      const { set, get, api } = createTestStore(initialRoomState);
      const slice = createRoomSlice(mockDeps)(set, get, api);

      slice.setScaleByReference(100, 1000);

      expect(get().room.scale.refPx).toBe(0);
    });

    it("addObstruction is blocked when APPROVED", () => {
      mockDeps.getStatus = vi.fn(() => "APPROVED" as const);
      const { set, get, api } = createTestStore(initialRoomState);
      const slice = createRoomSlice(mockDeps)(set, get, api);

      slice.addObstruction({ type: "WINDOW", label: "Window 1", x: 0, y: 0, width: 100, height: 100 });

      expect(get().room.obstructions).toHaveLength(0);
    });

    it("deleteQuotationRoom is blocked when APPROVED", () => {
      mockDeps.getStatus = vi.fn(() => "APPROVED" as const);
      const { set, get, api } = createTestStore({
        ...initialRoomState,
        quotationRooms: [{ id: "room-1", name: "Room 1", unitType: "wardrobe", roomPhoto: undefined, drawnUnits: [], activeUnitIndex: 0 }],
      });
      const slice = createRoomSlice(mockDeps)(set, get, api);

      slice.deleteQuotationRoom(0);

      expect(get().quotationRooms).toHaveLength(1);
    });
  });

  describe("audit behavior", () => {
    it("setRoomInputType triggers addAudit", () => {
      const { set, get, api } = createTestStore(initialRoomState);
      const slice = createRoomSlice(mockDeps)(set, get, api);

      slice.setRoomInputType("PLAN");

      expect(mockDeps.addAudit).toHaveBeenCalledWith("Room input type", "PLAN");
    });

    it("setScaleByReference triggers addAudit", () => {
      const { set, get, api } = createTestStore(initialRoomState);
      const slice = createRoomSlice(mockDeps)(set, get, api);

      slice.setScaleByReference(100, 1000);

      expect(mockDeps.addAudit).toHaveBeenCalledWith(
        "Scale calibrated",
        expect.stringContaining("refPx=100")
      );
    });
  });
});

// =============================================================================
// DRAWING SLICE TESTS
// =============================================================================

describe("drawingSlice", () => {
  let mockDeps: DrawingSliceDeps;

  beforeEach(() => {
    mockDeps = {
      getStatus: vi.fn(() => "DRAFT" as const),
      addAudit: vi.fn(),
      getScaleRatio: vi.fn(() => 0),
      computeAreas: vi.fn(),
      getRoomPhoto: vi.fn(() => undefined),
      getWardrobeLayout: vi.fn(() => undefined),
      setWardrobeLayout: vi.fn(),
      getUnitType: vi.fn(() => "wardrobe"),
      onClearWardrobeBox: vi.fn(),
    };
  });

  describe("approval guard", () => {
    it("setWardrobeBox is blocked when APPROVED", () => {
      mockDeps.getStatus = vi.fn(() => "APPROVED" as const);
      const { set, get, api } = createTestStore(initialDrawingState);
      const slice = createDrawingSlice(mockDeps)(set, get, api);

      slice.setWardrobeBox({ x: 10, y: 10, width: 100, height: 200, rotation: 0 });

      expect(get().wardrobeBox).toBeUndefined();
    });

    it("setWardrobeBox works in DRAFT", () => {
      const { set, get, api } = createTestStore(initialDrawingState);
      const slice = createDrawingSlice(mockDeps)(set, get, api);

      slice.setWardrobeBox({ x: 10, y: 10, width: 100, height: 200, rotation: 0 });

      expect(get().wardrobeBox).toBeDefined();
      expect(get().wardrobeBox?.width).toBe(100);
    });

    it("clearWardrobeBox is blocked when APPROVED", () => {
      mockDeps.getStatus = vi.fn(() => "APPROVED" as const);
      const { set, get, api } = createTestStore({
        ...initialDrawingState,
        wardrobeBox: { x: 10, y: 10, width: 100, height: 200, rotation: 0 },
      });
      const slice = createDrawingSlice(mockDeps)(set, get, api);

      slice.clearWardrobeBox();

      expect(get().wardrobeBox).toBeDefined();
    });

    it("setDrawMode is blocked when APPROVED", () => {
      mockDeps.getStatus = vi.fn(() => "APPROVED" as const);
      const { set, get, api } = createTestStore(initialDrawingState);
      const slice = createDrawingSlice(mockDeps)(set, get, api);

      slice.setDrawMode(true);

      expect(get().drawMode).toBe(false);
    });

    it("setShutterCount is blocked when APPROVED", () => {
      mockDeps.getStatus = vi.fn(() => "APPROVED" as const);
      const { set, get, api } = createTestStore(initialDrawingState);
      const slice = createDrawingSlice(mockDeps)(set, get, api);

      slice.setShutterCount(5);

      expect(get().shutterCount).toBe(3);
    });

    it("setLoftEnabled is blocked when APPROVED", () => {
      mockDeps.getStatus = vi.fn(() => "APPROVED" as const);
      const { set, get, api } = createTestStore({
        ...initialDrawingState,
        wardrobeBox: { x: 10, y: 100, width: 300, height: 400, rotation: 0 },
      });
      const slice = createDrawingSlice(mockDeps)(set, get, api);

      slice.setLoftEnabled(true);

      expect(get().loftEnabled).toBe(false);
    });

    it("setAiSuggestion is blocked when APPROVED", () => {
      mockDeps.getStatus = vi.fn(() => "APPROVED" as const);
      const { set, get, api } = createTestStore(initialDrawingState);
      const slice = createDrawingSlice(mockDeps)(set, get, api);

      slice.setAiSuggestion({ box: { x: 0, y: 0, width: 100, height: 100, rotation: 0 } });

      expect(get().aiSuggestion).toBeUndefined();
    });
  });

  describe("audit behavior", () => {
    it("setWardrobeBox triggers addAudit", () => {
      const { set, get, api } = createTestStore(initialDrawingState);
      const slice = createDrawingSlice(mockDeps)(set, get, api);

      slice.setWardrobeBox({ x: 10, y: 20, width: 100, height: 200, rotation: 0 });

      expect(mockDeps.addAudit).toHaveBeenCalledWith(
        "Wardrobe area set",
        "x=10, y=20, w=100, h=200"
      );
    });

    it("clearWardrobeBox triggers addAudit", () => {
      const { set, get, api } = createTestStore({
        ...initialDrawingState,
        wardrobeBox: { x: 10, y: 10, width: 100, height: 200, rotation: 0 },
      });
      const slice = createDrawingSlice(mockDeps)(set, get, api);

      slice.clearWardrobeBox();

      expect(mockDeps.addAudit).toHaveBeenCalledWith("Wardrobe area cleared");
    });

    it("setShutterCount triggers addAudit", () => {
      const { set, get, api } = createTestStore(initialDrawingState);
      const slice = createDrawingSlice(mockDeps)(set, get, api);

      slice.setShutterCount(5);

      expect(mockDeps.addAudit).toHaveBeenCalledWith("Shutter count set", "5");
    });
  });

  describe("state updates", () => {
    it("setViewMode updates viewMode", () => {
      const { set, get, api } = createTestStore(initialDrawingState);
      const slice = createDrawingSlice(mockDeps)(set, get, api);

      slice.setViewMode("wireframe");

      expect(get().viewMode).toBe("wireframe");
    });

    it("setEditMode updates editMode", () => {
      const { set, get, api } = createTestStore(initialDrawingState);
      const slice = createDrawingSlice(mockDeps)(set, get, api);

      slice.setEditMode("carcass");

      expect(get().editMode).toBe("carcass");
    });
  });
});

// =============================================================================
// UNITS SLICE TESTS
// =============================================================================

describe("unitsSlice", () => {
  let mockDeps: UnitsSliceDeps;

  beforeEach(() => {
    mockDeps = {
      getStatus: vi.fn(() => "DRAFT" as const),
      addAudit: vi.fn(),
      bumpVersion: vi.fn(),
      getDrawingState: vi.fn(() => ({
        wardrobeBox: undefined,
        loftBox: undefined,
        shutterCount: 3,
        sectionCount: 1,
        shutterDividerXs: [],
        loftEnabled: false,
        loftHeightRatio: 0.17,
        loftShutterCount: 3,
        loftDividerXs: [],
        unitType: "wardrobe",
      })),
      resetDrawingState: vi.fn(),
      loadUnitToDrawingState: vi.fn(),
      clearDrawingState: vi.fn(),
      syncToCRM: vi.fn(),
    };
  });

  describe("approval guard", () => {
    it("addWardrobeUnit is blocked when APPROVED", () => {
      mockDeps.getStatus = vi.fn(() => "APPROVED" as const);
      const { set, get, api } = createTestStore(initialUnitsState);
      const slice = createUnitsSlice(mockDeps)(set, get, api);

      slice.addWardrobeUnit({ wallId: "LEFT" });

      expect(get().units).toHaveLength(0);
    });

    it("addWardrobeUnit works in DRAFT", () => {
      const { set, get, api } = createTestStore(initialUnitsState);
      const slice = createUnitsSlice(mockDeps)(set, get, api);

      slice.addWardrobeUnit({ wallId: "LEFT" });

      expect(get().units).toHaveLength(1);
    });

    it("updateWardrobeUnit is blocked when APPROVED", () => {
      mockDeps.getStatus = vi.fn(() => "APPROVED" as const);
      const { set, get, api } = createTestStore({
        ...initialUnitsState,
        units: [{ id: "unit-1", wallId: "LEFT", widthMm: 1800, heightMm: 2400, depthMm: 600 }],
      });
      const slice = createUnitsSlice(mockDeps)(set, get, api);

      slice.updateWardrobeUnit("unit-1", { widthMm: 2000 });

      expect(get().units[0]?.widthMm).toBe(1800);
    });

    it("removeWardrobeUnit is blocked when APPROVED", () => {
      mockDeps.getStatus = vi.fn(() => "APPROVED" as const);
      const { set, get, api } = createTestStore({
        ...initialUnitsState,
        units: [{ id: "unit-1", wallId: "LEFT", widthMm: 1800, heightMm: 2400, depthMm: 600 }],
      });
      const slice = createUnitsSlice(mockDeps)(set, get, api);

      slice.removeWardrobeUnit("unit-1");

      expect(get().units).toHaveLength(1);
    });

    it("deleteDrawnUnit is blocked when APPROVED", () => {
      mockDeps.getStatus = vi.fn(() => "APPROVED" as const);
      const { set, get, api } = createTestStore({
        ...initialUnitsState,
        drawnUnits: [{
          id: "drawn-1",
          unitType: "wardrobe",
          box: { x: 0, y: 0, width: 100, height: 200, rotation: 0 },
          shutterCount: 3,
          shutterDividerXs: [],
          loftEnabled: false,
          loftHeightRatio: 0.17,
          loftShutterCount: 3,
          loftDividerXs: [],
          horizontalDividerYs: [],
          widthMm: 1800,
          heightMm: 2400,
          depthMm: 600,
          loftWidthMm: 0,
          loftHeightMm: 0,
          sectionCount: 1,
          drawnAddOns: [],
        }],
        activeUnitIndex: 0,
      });
      const slice = createUnitsSlice(mockDeps)(set, get, api);

      slice.deleteDrawnUnit(0);

      expect(get().drawnUnits).toHaveLength(1);
    });

    it("setAddOnDrawMode is blocked when APPROVED", () => {
      mockDeps.getStatus = vi.fn(() => "APPROVED" as const);
      const { set, get, api } = createTestStore(initialUnitsState);
      const slice = createUnitsSlice(mockDeps)(set, get, api);

      slice.setAddOnDrawMode("LOFT");

      expect(get().addOnDrawMode).toBeNull();
    });
  });

  describe("audit behavior", () => {
    it("addWardrobeUnit triggers addAudit", () => {
      const { set, get, api } = createTestStore(initialUnitsState);
      const slice = createUnitsSlice(mockDeps)(set, get, api);

      slice.addWardrobeUnit({ wallId: "RIGHT" });

      expect(mockDeps.addAudit).toHaveBeenCalledWith(
        "Wardrobe unit added",
        expect.stringContaining("on RIGHT")
      );
    });

    it("removeWardrobeUnit triggers addAudit", () => {
      const { set, get, api } = createTestStore({
        ...initialUnitsState,
        units: [{ id: "unit-1", wallId: "LEFT", widthMm: 1800, heightMm: 2400, depthMm: 600 }],
      });
      const slice = createUnitsSlice(mockDeps)(set, get, api);

      slice.removeWardrobeUnit("unit-1");

      expect(mockDeps.addAudit).toHaveBeenCalledWith("Wardrobe unit removed", "unit-1");
    });
  });

  describe("version bump", () => {
    it("addWardrobeUnit triggers bumpVersion", () => {
      const { set, get, api } = createTestStore(initialUnitsState);
      const slice = createUnitsSlice(mockDeps)(set, get, api);

      slice.addWardrobeUnit({ wallId: "CENTER" });

      expect(mockDeps.bumpVersion).toHaveBeenCalledWith("Unit added");
    });

    it("clearUnits triggers bumpVersion", () => {
      const { set, get, api } = createTestStore({
        ...initialUnitsState,
        units: [{ id: "unit-1", wallId: "LEFT", widthMm: 1800, heightMm: 2400, depthMm: 600 }],
      });
      const slice = createUnitsSlice(mockDeps)(set, get, api);

      slice.clearUnits();

      expect(mockDeps.bumpVersion).toHaveBeenCalledWith("Units cleared");
    });
  });

  describe("state updates", () => {
    it("setActiveEditPart updates activeEditPart", () => {
      const { set, get, api } = createTestStore(initialUnitsState);
      const slice = createUnitsSlice(mockDeps)(set, get, api);

      slice.setActiveEditPart("carcass");

      expect(get().activeEditPart).toBe("carcass");
    });

    it("setWardrobeLayout updates wardrobeLayout", () => {
      const { set, get, api } = createTestStore(initialUnitsState);
      const slice = createUnitsSlice(mockDeps)(set, get, api);

      slice.setWardrobeLayout({ doors: 4, loft: true, divisions: [0.25, 0.5, 0.75] });

      expect(get().wardrobeLayout?.doors).toBe(4);
      expect(get().wardrobeLayout?.loft).toBe(true);
    });
  });
});
