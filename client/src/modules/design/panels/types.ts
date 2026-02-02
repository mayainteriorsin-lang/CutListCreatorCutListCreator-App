/**
 * Panel Types
 *
 * TypeScript type definitions for panels, posts, and shelves.
 */

import type { RectShape } from "../types";

// =============================================================================
// PANEL TYPES
// =============================================================================

/** Panel information extracted from shape */
export interface PanelInfo {
  id: string;
  key: string;
  label: string;
  shape: RectShape;
}

/** Panels enabled state */
export interface PanelsEnabled {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
  back: boolean;
}

// =============================================================================
// CENTER POST TYPES
// =============================================================================

/** Center post information */
export interface PostInfo {
  id: string;
  index: number;
  shape: RectShape;
}

// =============================================================================
// SHELF TYPES
// =============================================================================

/** Parsed shelf ID information */
export interface ShelfIdInfo {
  sectionIndex: number;
  shelfIndex: number;
}

/** Shelf information */
export interface ShelfInfo {
  id: string;
  sectionIndex: number;
  shelfIndex: number;
  shape: RectShape;
}

/** Shelf movement bounds */
export interface ShelfBounds {
  minY: number;
  maxY: number;
  sectionX: number;
  sectionWidth: number;
}

// =============================================================================
// CARCASS TYPES
// =============================================================================

/** Carcass bounds for constraining movement */
export interface CarcassBounds {
  minX: number;
  maxX: number;
  leftEdge: number;
  rightEdge: number;
}

/** Carcass panels (all four sides) */
export interface CarcassPanels {
  top: RectShape | undefined;
  bottom: RectShape | undefined;
  left: RectShape | undefined;
  right: RectShape | undefined;
}

// =============================================================================
// SECTION TYPES
// =============================================================================

/** Section boundary */
export interface SectionBoundary {
  start: number;
  end: number;
  width: number;
}

// =============================================================================
// ACTION TYPES
// =============================================================================

/** Shape type for specialized behavior */
export type ShapeType = "panel" | "centerPost" | "shelf" | "generic";

/** Action mode */
export type ActionMode = "move" | "resize" | "copy" | "delete" | null;

/** Shape actions configuration */
export interface ShapeActionsConfig {
  selectedId: string | null;
  shapeType: ShapeType;
  panelKey?: string;
}

/** Shape actions interface */
export interface ShapeActions {
  handleCopy: () => void;
  handleMove: () => void;
  handleEdit: () => void;
  handleDelete: () => void;
}
