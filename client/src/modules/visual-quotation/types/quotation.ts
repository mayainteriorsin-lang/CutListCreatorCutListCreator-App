/**
 * Quotation-related types for Visual Quotation module
 * Client info, quote meta, rooms, audit
 */

import type { UnitType } from "./core";
import type { RoomPhoto, Wall, Obstruction, RoomImage, ScaleCalibration } from "./room";
import type { WardrobeBox, LoftBox, DrawnUnit } from "./wardrobe";

export interface ClientInfo {
  name: string;
  phone: string;
  location: string;
}

export interface QuoteMeta {
  quoteNo: string;
  dateISO: string;
  validTillISO?: string;
  designer?: string;
}

export interface AuditEntry {
  id: string;
  tsISO: string;
  action: string;
  details?: string;
}

/** Room/Area in quotation */
export interface QuotationRoom {
  id: string;
  name: string;
  unitType: UnitType;
  roomPhoto?: RoomPhoto;
  drawnUnits: DrawnUnit[];
  activeUnitIndex: number;
  wardrobeBox?: WardrobeBox;
  loftBox?: LoftBox;
  shutterCount: number;
  shutterDividerXs: number[];
  loftEnabled: boolean;
  loftHeightRatio: number;
  loftShutterCount: number;
  loftDividerXs: number[];
}

/** Room state within the main store */
export interface RoomState {
  inputType: import("./core").RoomInputType;
  image?: RoomImage;
  manualRoom?: { lengthMm: number; widthMm: number; heightMm: number };
  scale: ScaleCalibration;
  walls: Wall[];
  selectedWallId: import("./core").WallId;
  obstructions: Obstruction[];
}

/** Pricing control state */
export interface PricingControl {
  marginPct: number;
  discountPct: number;
  discountLocked: boolean;
  gstPct: number;
  rounding: "NONE" | "NEAREST_10" | "NEAREST_100";
}
