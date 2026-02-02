/**
 * Wardrobe/Unit types for Visual Quotation module
 * Box geometry, layout, configuration
 */

import type { WallId, UnitType } from "./core";
import type { WardrobeConfig, WardrobeAddOn } from "./pricing";

export interface WardrobeBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  source?: "ai" | "manual" | "fallback";
}

export type LoftDragEdge = "left" | "right" | "top" | "bottom" | "move";

export interface LoftBox {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  dragEdge: LoftDragEdge | null;
  isDragging: boolean;
  locked: boolean;
}

export interface WardrobeLayout {
  doors: number;
  loft: boolean;
  divisions: number[];
  loftHeight?: number;
  loftHeightRatio?: number;
}

export interface WardrobeSpec {
  depthMm: number;
  carcassAreaSqft: number;
  shutterAreaSqft: number;
}

export interface WardrobeUnit {
  id: string;
  wallId: WallId;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  loftEnabled: boolean;
  loftHeightMm: number;
  sectionCount: number;
  finish: {
    shutterLaminateCode?: string;
    loftLaminateCode?: string;
    innerLaminateCode?: string;
  };
  doorSwingMode?: "AUTO" | "LEFT" | "RIGHT";
  customShutterWidthsMm?: number[];
  wardrobeConfig?: WardrobeConfig;
}

/** Drawn add-on on canvas */
export interface DrawnAddOn {
  id: string;
  addOnType: WardrobeAddOn;
  box: WardrobeBox;
  areaSqft: number;
  lengthRft: number;
  unitCount: number;
}

/** Drawn unit on canvas */
export interface DrawnUnit {
  id: string;
  unitType: UnitType;
  wallId?: WallId;
  box: WardrobeBox;
  loftBox?: LoftBox;
  shutterCount: number;
  shutterDividerXs: number[];
  loftEnabled: boolean;
  loftOnly?: boolean;
  loftHeightRatio: number;
  loftShutterCount: number;
  loftDividerXs: number[];
  horizontalDividerYs: number[];
  widthMm: number;
  heightMm: number;
  depthMm: number;
  loftWidthMm: number;
  loftHeightMm: number;
  sectionCount: number;
  shelfCount: number;
  drawnAddOns: DrawnAddOn[];
  wardrobeConfig?: WardrobeConfig;
  locked?: boolean;
  groupId?: string;
  flippedH?: boolean;
  flippedV?: boolean;
  finish: {
    shutterLaminateCode?: string;
    loftLaminateCode?: string;
    innerLaminateCode?: string;
  };
  /** Full module config from library - enables carcass-style rendering */
  libraryConfig?: Record<string, unknown>;
}
