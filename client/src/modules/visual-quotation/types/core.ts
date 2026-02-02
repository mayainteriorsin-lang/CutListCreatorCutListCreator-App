/**
 * Core types for Visual Quotation module
 * Basic enums, status types, and fundamental interfaces
 */

export type VQStatus = "DRAFT" | "APPROVED";

export type RoomInputType = "PHOTO" | "MANUAL" | "PLAN";

export type WallId = "LEFT" | "RIGHT" | "CENTER" | "FULL";

export type UnitType = string;

export const DEFAULT_UNIT_TYPES = [
  "wardrobe",
  "kitchen",
  "tv_unit",
  "dresser",
  "study_table",
  "shoe_rack",
  "book_shelf",
  "crockery_unit",
  "pooja_unit",
  "vanity",
  "bar_unit",
  "display_unit",
  "other",
] as const;

export type ObstructionType =
  | "BEAM"
  | "SKIRTING"
  | "WINDOW"
  | "SWITCHBOARD"
  | "DOOR_SWING"
  | "PLINTH"
  | "OTHER";

export type Confidence = "HIGH" | "MEDIUM" | "LOW";
export type ViewMode = "CUSTOMER" | "PRODUCTION";
export type CanvasViewMode = "front" | "top" | "isometric" | "perspective" | "3d";

export interface ProductionSettings {
  roundingMm: number;
  widthReductionMm: number;
  heightReductionMm: number;
  includeLoft: boolean;
}

// Gap constants
export const SIDE_GAP_MM = 3;
export const SHUTTER_GAP_MM = 2;
export const LOFT_GAP_MM = 3;
