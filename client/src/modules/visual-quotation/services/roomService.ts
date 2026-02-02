/**
 * Room Service
 *
 * Orchestrates room CRUD operations and state management.
 * Coordinates with store slices for multi-room quotation workflows.
 *
 * Responsibilities:
 * - Create/delete/update rooms
 * - Save and load room states
 * - Manage active room transitions
 * - Validate room operations
 */

import { useDesignCanvasStore } from "../store/v2/useDesignCanvasStore";
import { useRoomStore } from "../store/v2/useRoomStore";
import { useQuotationMetaStore } from "../store/v2/useQuotationMetaStore";
import type { QuotationRoom, UnitType } from "../../types";
import type { ServiceResult, RoomData, RoomCreateParams, RoomSaveResult } from "./types";

// ============================================================================
// Pure Helper Functions
// ============================================================================

/**
 * Generate a unique room ID
 */
function generateRoomId(): string {
  return `room-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

/**
 * Generate a room name based on unit type and existing rooms
 */
function generateRoomName(unitType: UnitType, existingRooms: QuotationRoom[], customName?: string): string {
  if (customName) return customName;

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

  const sameTypeCount = existingRooms.filter(r => r.unitType === unitType).length;
  return `${unitLabels[unitType] || unitType} ${sameTypeCount + 1}`;
}

/**
 * Validate room index is within bounds
 */
function isValidRoomIndex(index: number, roomsLength: number): boolean {
  return index >= 0 && index < roomsLength;
}

// ============================================================================
// Service Functions (Orchestrate Store)
// ============================================================================

/**
 * Get all rooms with their data
 */
export function getAllRooms(): RoomData[] {
  const roomState = useRoomStore.getState();
  const canvasState = useDesignCanvasStore.getState();
  const { quotationRooms, activeRoomIndex } = roomState;
  const { drawnUnits, roomPhoto, referencePhotos, unitType } = canvasState;

  if (quotationRooms.length === 0) {
    // Single room mode (Legacy support or initial state)
    // In V2, we might want to ensure at least one room exists, but for now duplicate logic
    return [{
      id: "default",
      name: "Quotation",
      unitType: unitType,
      units: drawnUnits,
      photo: roomPhoto || undefined,
      referencePhotos: referencePhotos,
    }];
  }

  return quotationRooms.map((room, index) => ({
    id: room.id,
    name: room.name,
    unitType: room.unitType,
    units: index === activeRoomIndex ? drawnUnits : room.drawnUnits,
    photo: (index === activeRoomIndex ? roomPhoto : room.roomPhoto) || undefined,
    referencePhotos: index === activeRoomIndex ? referencePhotos : [],
  }));
}

/**
 * Get active room data
 */
export function getActiveRoom(): RoomData | null {
  const roomState = useRoomStore.getState();
  const canvasState = useDesignCanvasStore.getState();
  const { quotationRooms, activeRoomIndex } = roomState;
  const { drawnUnits, roomPhoto, referencePhotos, unitType } = canvasState;

  if (quotationRooms.length === 0) {
    return {
      id: "default",
      name: "Quotation",
      unitType,
      units: drawnUnits,
      photo: roomPhoto || undefined,
      referencePhotos,
    };
  }

  const room = quotationRooms[activeRoomIndex];
  if (!room) return null;

  return {
    id: room.id,
    name: room.name,
    unitType: room.unitType,
    units: drawnUnits, // Active units are in canvas store
    photo: roomPhoto || undefined,
    referencePhotos,
  };
}

/**
 * Create a new room
 */
export function createRoom(params: RoomCreateParams): ServiceResult<RoomData> {
  const metaState = useQuotationMetaStore.getState();
  if (metaState.status === "APPROVED") {
    return { success: false, error: "Cannot create room: quotation is approved" };
  }

  const roomStore = useRoomStore.getState();
  const roomName = generateRoomName(params.unitType, roomStore.quotationRooms, params.name);

  const newRoom: QuotationRoom = {
    id: generateRoomId(),
    name: roomName,
    unitType: params.unitType,
    drawnUnits: [],
    roomPhoto: null,
    wardrobeBox: null,
    shutterCount: 2,
    sectionCount: 1, // Added default
    shutterDividerXs: [],
    loftEnabled: false,
    loftHeightRatio: 0.2,
    loftShutterCount: 2,
    loftDividerXs: [],
    loftDividerYs: [], // Added default
  };

  roomStore.addRoom(newRoom);

  // If this is the FIRST room (transitioning from single to multi), 
  // we might want to save current state as the first room?
  // Or just add the new one. 
  // The legacy logic: if transitioning, save current as first.
  // We'll leave that determination to the caller or implement here if needed.
  // For now, simple add.

  return {
    success: true,
    data: {
      id: newRoom.id,
      name: newRoom.name,
      unitType: newRoom.unitType,
      units: newRoom.drawnUnits,
      photo: newRoom.roomPhoto,
    },
  };
}

/**
 * Delete a room by index
 */
export function deleteRoom(index: number): ServiceResult<void> {
  const metaState = useQuotationMetaStore.getState();
  if (metaState.status === "APPROVED") {
    return { success: false, error: "Cannot delete room: quotation is approved" };
  }

  const roomStore = useRoomStore.getState();
  if (!isValidRoomIndex(index, roomStore.quotationRooms.length)) {
    return { success: false, error: `Invalid room index: ${index}` };
  }

  // If deleting active room, we need to handle switch
  // But deleteRoom action in store handles index adjustment.
  // However, we might need to load the NEW active room state into canvas?
  // Check store implementation: it updates activeRoomIndex.
  // We should probably sync canvas after deletion if active room changed.

  const wasActive = index === roomStore.activeRoomIndex;
  roomStore.deleteRoom(index);

  if (wasActive) {
    // Load the new active room if exists
    const newState = useRoomStore.getState();
    if (newState.activeRoomIndex !== -1) {
      loadRoomState(newState.activeRoomIndex);
    } else {
      // No rooms left? Reset canvas?
      useDesignCanvasStore.getState().reset();
    }
  }

  return { success: true };
}

/**
 * Update room properties
 */
export function updateRoom(index: number, updates: Partial<Pick<QuotationRoom, "name" | "unitType">>): ServiceResult<void> {
  const metaState = useQuotationMetaStore.getState();
  if (metaState.status === "APPROVED") {
    return { success: false, error: "Cannot update room: quotation is approved" };
  }

  const roomStore = useRoomStore.getState();
  if (!isValidRoomIndex(index, roomStore.quotationRooms.length)) {
    return { success: false, error: `Invalid room index: ${index}` };
  }

  roomStore.updateRoom(index, updates);
  // If active room specifically unitType changed, update canvas unitType?
  if (index === roomStore.activeRoomIndex && updates.unitType) {
    useDesignCanvasStore.getState().setUnitType(updates.unitType);
  }

  return { success: true };
}

/**
 * INTERNAL: Load room state from store into canvas
 */
function loadRoomState(index: number) {
  const roomStore = useRoomStore.getState();
  const room = roomStore.quotationRooms[index];
  if (!room) return;

  useRoomStore.getState().setActiveRoomIndex(index);

  useDesignCanvasStore.setState({
    drawnUnits: room.drawnUnits,
    wardrobeBox: room.wardrobeBox,
    // loftBox? legacy store didn't have separate loftBox for room? 
    // type QuotationRoom has wardrobeBox etc.
    roomPhoto: room.roomPhoto,
    // references? Not in QuotationRoom type usually? 
    // Need to check QuotationRoom type. V2 types might need update if ref photos per room.
    unitType: room.unitType,
    shutterCount: room.shutterCount,
    shutterDividerXs: room.shutterDividerXs,
    loftEnabled: room.loftEnabled,
    loftHeightRatio: room.loftHeightRatio,
    loftShutterCount: room.loftShutterCount,
    loftDividerXs: room.loftDividerXs,
    // Reset interaction
    drawMode: false,
    activeUnitIndex: -1,
    selectedUnitIndices: []
  });
}

/**
 * Switch to a different room
 * Saves current room state before switching
 */
export function switchToRoom(index: number): ServiceResult<RoomData> {
  const roomStore = useRoomStore.getState();
  const { quotationRooms, activeRoomIndex } = roomStore;

  if (!isValidRoomIndex(index, quotationRooms.length)) {
    return { success: false, error: `Invalid room index: ${index}` };
  }

  if (index === activeRoomIndex) {
    // Already on this room
    const room = quotationRooms[index];
    const canvasState = useDesignCanvasStore.getState();
    return {
      success: true,
      data: {
        id: room.id,
        name: room.name,
        unitType: room.unitType,
        units: canvasState.drawnUnits,
        photo: canvasState.roomPhoto || undefined,
        referencePhotos: canvasState.referencePhotos,
      },
    };
  }

  // Save current room state before switching
  saveCurrentRoom();

  // Load the target room
  loadRoomState(index);

  // Get updated state after switch
  const newState = useDesignCanvasStore.getState();
  const newRoomStore = useRoomStore.getState();
  const room = newRoomStore.quotationRooms[index];

  return {
    success: true,
    data: {
      id: room.id,
      name: room.name,
      unitType: room.unitType,
      units: newState.drawnUnits,
      photo: newState.roomPhoto || undefined,
      referencePhotos: newState.referencePhotos,
    },
  };
}

/**
 * Save current room state explicitly
 */
export function saveCurrentRoom(): ServiceResult<RoomSaveResult> {
  const roomStore = useRoomStore.getState();
  const canvasState = useDesignCanvasStore.getState();
  const { quotationRooms, activeRoomIndex } = roomStore;

  if (quotationRooms.length === 0) {
    // No rooms strictly speaking, but we might want to save to 'default' if we supported it.
    // Legacy logic for 'saveCurrentRoomState' did nothing if no rooms.
    return { success: false, error: "No rooms to save (single room mode)" };
  }

  if (!isValidRoomIndex(activeRoomIndex, quotationRooms.length)) {
    return { success: false, error: "Invalid active room index" };
  }

  const room = quotationRooms[activeRoomIndex];

  // Construct partial update
  const roomUpdate: Partial<QuotationRoom> = {
    drawnUnits: canvasState.drawnUnits,
    wardrobeBox: canvasState.wardrobeBox || undefined, // undefined to match optional?
    roomPhoto: canvasState.roomPhoto || undefined,
    shutterCount: canvasState.shutterCount,
    shutterDividerXs: canvasState.shutterDividerXs,
    loftEnabled: canvasState.loftEnabled,
    loftHeightRatio: canvasState.loftHeightRatio,
    loftShutterCount: canvasState.loftShutterCount,
    loftDividerXs: canvasState.loftDividerXs,
    // unitType? Usually active unitType matches room unitType. 
  };

  roomStore.updateRoom(activeRoomIndex, roomUpdate);

  return {
    success: true,
    data: {
      roomId: room.id,
      unitCount: canvasState.drawnUnits.length,
      pricingUpdated: true,
    },
  };
}

/**
 * Get room count
 */
export function getRoomCount(): number {
  const { quotationRooms } = useRoomStore.getState();
  return quotationRooms.length || 1; // At least 1 for single room mode
}

/**
 * Get room by ID
 */
export function getRoomById(roomId: string): RoomData | null {
  const roomStore = useRoomStore.getState();
  const canvasState = useDesignCanvasStore.getState();
  const { quotationRooms, activeRoomIndex } = roomStore;

  if (roomId === "default" && quotationRooms.length === 0) {
    return {
      id: "default",
      name: "Quotation",
      unitType: canvasState.unitType,
      units: canvasState.drawnUnits,
      photo: canvasState.roomPhoto || undefined,
      referencePhotos: canvasState.referencePhotos,
    };
  }

  const roomIndex = quotationRooms.findIndex(r => r.id === roomId);
  if (roomIndex === -1) return null;

  const room = quotationRooms[roomIndex];
  if (!room) return null;

  return {
    id: room.id,
    name: room.name,
    unitType: room.unitType,
    units: roomIndex === activeRoomIndex ? canvasState.drawnUnits : room.drawnUnits,
    photo: (roomIndex === activeRoomIndex ? canvasState.roomPhoto : room.roomPhoto) || undefined,
  };
}

/**
 * Check if in multi-room mode
 */
export function isMultiRoomMode(): boolean {
  const { quotationRooms } = useRoomStore.getState();
  return quotationRooms.length > 0;
}

/**
 * Get units for a specific room
 */
export function getRoomUnits(roomIndex: number): import("../../types").DrawnUnit[] {
  const roomStore = useRoomStore.getState();
  const canvasState = useDesignCanvasStore.getState();
  const { quotationRooms, activeRoomIndex } = roomStore;

  if (quotationRooms.length === 0 && roomIndex === 0) {
    return canvasState.drawnUnits;
  }

  if (!isValidRoomIndex(roomIndex, quotationRooms.length)) {
    return [];
  }

  const room = quotationRooms[roomIndex];
  return roomIndex === activeRoomIndex ? canvasState.drawnUnits : (room?.drawnUnits ?? []);
}

// ============================================================================
// Export Service Object
// ============================================================================

export const roomService = {
  // Read operations
  getAllRooms,
  getActiveRoom,
  getRoomById,
  getRoomCount,
  getRoomUnits,
  isMultiRoomMode,

  // Write operations
  createRoom,
  deleteRoom,
  updateRoom,
  switchToRoom,
  saveCurrentRoom,
};

export default roomService;
