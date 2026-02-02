/**
 * Room Slice
 * Owns: Room input, scale calibration, obstructions, multi-room management
 *
 * This slice manages:
 * - Room input type (PHOTO, MANUAL, PLAN)
 * - Room image and manual dimensions
 * - Wall selection
 * - Scale calibration (both room.scale and standalone scale)
 * - Scale line and draw mode
 * - Obstructions
 * - Multi-room quotation (quotationRooms array)
 *
 * NOTE: Multi-room actions (save/load) orchestrate across slices.
 * The main store handles the actual cross-slice coordination.
 */

import type { StateCreator } from "zustand";
import type { RoomSliceState, RoomSliceActions, RoomInputState } from "../../types/slices";
import type {
  RoomInputType,
  WallId,
  Confidence,
  RoomImage,
  ScaleLine,
  Obstruction,
  QuotationRoom,
  UnitType,
} from "../../types";

// Utility functions
function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

function computePxToMm(refPx: number, refMm: number): number {
  if (refPx <= 0 || refMm <= 0) return 0;
  return refMm / refPx;
}

function inferConfidence(pxToMm: number): Confidence {
  return pxToMm > 0 ? "MEDIUM" : "LOW";
}

/**
 * Initial room input state
 */
export const initialRoomInputState: RoomInputState = {
  inputType: "PHOTO",
  image: undefined,
  manualRoom: undefined,
  scale: {
    refPx: 0,
    refMm: 0,
    pxToMm: 0,
    confidence: "LOW",
  },
  walls: [
    { id: "LEFT", label: "Left Wall" },
    { id: "RIGHT", label: "Right Wall" },
    { id: "CENTER", label: "Center Wall" },
    { id: "FULL", label: "Full Wall" },
  ],
  selectedWallId: "RIGHT",
  obstructions: [],
};

/**
 * Initial state for room slice
 */
export const initialRoomState: RoomSliceState = {
  room: initialRoomInputState,
  scale: undefined,
  scaleLine: undefined,
  scaleDrawMode: false,
  quotationRooms: [],
  activeRoomIndex: 0,
};

/**
 * Room slice type (state + actions)
 */
export type RoomSlice = RoomSliceState & RoomSliceActions;

/**
 * Dependencies from other slices that room slice needs
 */
export interface RoomSliceDeps {
  getStatus: () => "DRAFT" | "APPROVED";
  addAudit: (action: string, details?: string) => void;
}

/**
 * Room slice creator with dependency injection
 */
export const createRoomSlice = (
  deps: RoomSliceDeps
): StateCreator<RoomSlice, [], [], RoomSlice> => (set, get) => ({
  ...initialRoomState,

  // Room input type
  setRoomInputType: (type: RoomInputType) => {
    if (deps.getStatus() === "APPROVED") return;
    set((s) => ({
      room: { ...s.room, inputType: type },
    }));
    deps.addAudit("Room input type", type);
  },

  // Room image
  setRoomImage: (img: RoomImage) => {
    if (deps.getStatus() === "APPROVED") return;
    set((s) => ({
      room: {
        ...s.room,
        image: img,
        // Reset scale when image changes
        scale: {
          refPx: 0,
          refMm: 0,
          pxToMm: 0,
          confidence: "LOW",
        },
      },
    }));
    deps.addAudit("Room image set", `w=${img.widthPx}px h=${img.heightPx}px`);
  },

  // Manual room dimensions
  setManualRoom: (dims: { lengthMm: number; widthMm: number; heightMm: number }) => {
    if (deps.getStatus() === "APPROVED") return;
    set((s) => ({
      room: { ...s.room, manualRoom: dims },
    }));
    deps.addAudit("Manual room set", JSON.stringify(dims));
  },

  // Wall selection
  setSelectedWall: (wallId: WallId) => {
    if (deps.getStatus() === "APPROVED") return;
    set((s) => ({
      room: { ...s.room, selectedWallId: wallId },
    }));
    deps.addAudit("Selected wall", wallId);
  },

  // Scale by reference (updates room.scale)
  setScaleByReference: (refPx: number, refMm: number) => {
    if (deps.getStatus() === "APPROVED") return;
    const pxToMm = computePxToMm(refPx, refMm);
    set((s) => ({
      room: {
        ...s.room,
        scale: {
          refPx,
          refMm,
          pxToMm,
          confidence: inferConfidence(pxToMm),
        },
      },
      scale: refPx > 0 && refMm > 0 ? { px: refPx, mm: refMm, ratio: pxToMm } : undefined,
    }));
    deps.addAudit("Scale calibrated", `refPx=${refPx}, refMm=${refMm}, pxToMm=${pxToMm}`);
  },

  // Scale confidence
  setScaleConfidence: (confidence: Confidence) => {
    if (deps.getStatus() === "APPROVED") return;
    set((s) => ({
      room: { ...s.room, scale: { ...s.room.scale, confidence } },
    }));
    deps.addAudit("Scale confidence", confidence);
  },

  // Standalone scale (for canvas calibration)
  setScale: (px: number, mm: number) => {
    if (deps.getStatus() === "APPROVED") return;
    if (px <= 0 || mm <= 0) return;
    const ratio = mm / px;
    set((s) => ({
      scale: { px, mm, ratio },
      scaleDrawMode: false,
    }));
    deps.addAudit("Scale set", `px=${px}, mm=${mm}, ratio=${ratio.toFixed(4)}`);
  },

  // Clear scale
  clearScale: () => {
    if (deps.getStatus() === "APPROVED") return;
    set(() => ({
      scale: undefined,
      scaleLine: undefined,
      scaleDrawMode: false,
    }));
    deps.addAudit("Scale cleared");
  },

  // Scale line
  setScaleLine: (line?: ScaleLine) => {
    if (deps.getStatus() === "APPROVED") return;
    set(() => ({ scaleLine: line, scaleDrawMode: false }));
    if (line) {
      deps.addAudit("Scale line set", `px=${line.lengthPx.toFixed(2)}`);
    }
  },

  // Scale draw mode
  setScaleDrawMode: (active: boolean) => {
    if (deps.getStatus() === "APPROVED") return;
    set(() => ({ scaleDrawMode: active }));
    if (active) {
      deps.addAudit("Scale draw mode", "activated");
    }
  },

  // Obstructions
  addObstruction: (o: Omit<Obstruction, "id">) => {
    if (deps.getStatus() === "APPROVED") return;
    const newO: Obstruction = { ...o, id: uid("OBS") };
    set((s) => ({
      room: { ...s.room, obstructions: [...s.room.obstructions, newO] },
    }));
    deps.addAudit("Obstruction added", `${newO.type} (${newO.label})`);
  },

  removeObstruction: (id: string) => {
    if (deps.getStatus() === "APPROVED") return;
    set((s) => ({
      room: { ...s.room, obstructions: s.room.obstructions.filter((x) => x.id !== id) },
    }));
    deps.addAudit("Obstruction removed", id);
  },

  clearObstructions: () => {
    if (deps.getStatus() === "APPROVED") return;
    set((s) => ({
      room: { ...s.room, obstructions: [] },
    }));
    deps.addAudit("Obstructions cleared");
  },

  // Multi-room quotation - simplified actions
  // Cross-slice coordination handled by main store
  addQuotationRoom: (unitType: UnitType, name?: string) => {
    if (deps.getStatus() === "APPROVED") return;

    const state = get();
    const unitLabels: Record<string, string> = {
      wardrobe: "Wardrobe",
      kitchen: "Kitchen",
      tv_unit: "TV Unit",
      dresser: "Dresser",
      study_table: "Study Table",
      shoe_rack: "Shoe Rack",
      book_shelf: "Book Shelf",
      crockery_unit: "Crockery Unit",
      pooja_unit: "Pooja Unit",
      vanity: "Vanity",
      bar_unit: "Bar Unit",
      display_unit: "Display Unit",
      other: "Other",
    };
    const roomName = name || `${unitLabels[unitType] || unitType} ${state.quotationRooms.filter(r => r.unitType === unitType).length + 1}`;

    const newRoom: QuotationRoom = {
      id: uid("ROOM"),
      name: roomName,
      unitType,
      roomPhoto: undefined,
      drawnUnits: [],
      activeUnitIndex: 0,
      wardrobeBox: undefined,
      loftBox: undefined,
      shutterCount: 3,
      shutterDividerXs: [],
      loftEnabled: false,
      loftHeightRatio: 0.17,
      loftShutterCount: 2,
      loftDividerXs: [],
    };

    const newRooms = [...state.quotationRooms, newRoom];
    set(() => ({
      quotationRooms: newRooms,
      activeRoomIndex: newRooms.length - 1,
    }));

    deps.addAudit("Room added", `${roomName} (${unitType})`);
  },

  setActiveRoomIndex: (index: number) => {
    const state = get();
    if (index < 0 || index >= state.quotationRooms.length) return;
    if (index === state.activeRoomIndex) return;
    set(() => ({ activeRoomIndex: index }));
  },

  deleteQuotationRoom: (index: number) => {
    if (deps.getStatus() === "APPROVED") return;
    const state = get();
    if (index < 0 || index >= state.quotationRooms.length) return;

    const deletedRoom = state.quotationRooms[index];
    const newRooms = state.quotationRooms.filter((_, i) => i !== index);

    if (newRooms.length === 0) {
      set(() => ({
        quotationRooms: [],
        activeRoomIndex: 0,
      }));
    } else {
      const newActiveIndex = Math.min(state.activeRoomIndex, newRooms.length - 1);
      set(() => ({
        quotationRooms: newRooms,
        activeRoomIndex: newActiveIndex,
      }));
    }

    deps.addAudit("Room deleted", deletedRoom?.name || `Room ${index + 1}`);
  },

  updateQuotationRoom: (index: number, patch: Partial<QuotationRoom>) => {
    if (deps.getStatus() === "APPROVED") return;
    const state = get();
    if (index < 0 || index >= state.quotationRooms.length) return;

    set((s) => ({
      quotationRooms: s.quotationRooms.map((room, i) =>
        i === index ? { ...room, ...patch } : room
      ),
    }));
  },

  // Save/load room state - simplified versions
  // Full cross-slice coordination in main store
  saveCurrentRoomState: () => {
    const state = get();
    if (state.quotationRooms.length === 0) return;
    if (state.activeRoomIndex < 0 || state.activeRoomIndex >= state.quotationRooms.length) return;
    // Actual save logic requires reading from other slices
    // Main store will override this with full implementation
  },

  loadRoomState: (index: number) => {
    const state = get();
    if (index < 0 || index >= state.quotationRooms.length) return;
    set(() => ({ activeRoomIndex: index }));
    // Actual load logic requires writing to other slices
    // Main store will override this with full implementation
  },
});
