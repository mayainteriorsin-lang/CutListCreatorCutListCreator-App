/**
 * Room Slice State Types
 * Owns: Room input, walls, obstructions, scale, multi-room quotation
 */

import type { RoomInputType, WallId, Confidence, UnitType } from "../core";
import type { RoomImage, ScaleCalibration, Wall, Obstruction, ScaleState, ScaleLine } from "../room";
import type { QuotationRoom } from "../quotation";

/**
 * RoomInputState
 * Nested state for room input configuration
 */
export interface RoomInputState {
  inputType: RoomInputType;
  image?: RoomImage;
  manualRoom?: { lengthMm: number; widthMm: number; heightMm: number };
  scale: ScaleCalibration;
  walls: Wall[];
  selectedWallId: WallId;
  obstructions: Obstruction[];
}

/**
 * RoomSliceState
 * Responsible for room configuration and multi-room management
 */
export interface RoomSliceState {
  /* Room input */
  room: RoomInputState;

  /* Scale calibration */
  scale?: ScaleState;
  scaleLine?: ScaleLine;
  scaleDrawMode: boolean;

  /* Multi-room quotation */
  quotationRooms: QuotationRoom[];
  activeRoomIndex: number;
}

/**
 * RoomSliceActions
 * Actions owned by room slice
 */
export interface RoomSliceActions {
  // Room input
  setRoomInputType: (type: RoomInputType) => void;
  setRoomImage: (img: RoomImage) => void;
  setManualRoom: (dims: { lengthMm: number; widthMm: number; heightMm: number }) => void;
  setSelectedWall: (wallId: WallId) => void;

  // Scale calibration
  setScaleByReference: (refPx: number, refMm: number) => void;
  setScaleConfidence: (confidence: Confidence) => void;
  setScale: (px: number, mm: number) => void;
  clearScale: () => void;
  setScaleLine: (line?: ScaleLine) => void;
  setScaleDrawMode: (active: boolean) => void;

  // Obstructions
  addObstruction: (o: Omit<Obstruction, "id">) => void;
  removeObstruction: (id: string) => void;
  clearObstructions: () => void;

  // Multi-room quotation actions
  addQuotationRoom: (unitType: UnitType, name?: string) => void;
  setActiveRoomIndex: (index: number) => void;
  deleteQuotationRoom: (index: number) => void;
  updateQuotationRoom: (index: number, patch: Partial<QuotationRoom>) => void;
  saveCurrentRoomState: () => void;
  loadRoomState: (index: number) => void;
}

export type RoomSlice = RoomSliceState & RoomSliceActions;
