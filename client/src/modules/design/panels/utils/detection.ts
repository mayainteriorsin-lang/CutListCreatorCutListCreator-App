/**
 * Detection Utilities
 *
 * Functions to detect and parse panel/post/shelf IDs.
 */

import { POST_ID_PREFIX, SHELF_ID_PREFIX, PANEL_LABELS } from "../config";
import type { ShelfIdInfo, PanelInfo } from "../types";
import type { RectShape, Shape } from "../../types";

// =============================================================================
// PANEL DETECTION
// =============================================================================

/**
 * Check if shape is a carcass panel
 */
export function isPanel(id: string): boolean {
  return id in PANEL_LABELS;
}

/**
 * Get panel info from shape ID
 */
export function getPanelInfo(id: string, shapes: Shape[]): PanelInfo | null {
  const labelInfo = PANEL_LABELS[id];
  if (!labelInfo) return null;

  const shape = shapes.find(s => s.id === id);
  if (!shape || shape.type !== "rect") return null;

  return {
    id,
    key: labelInfo.key,
    label: labelInfo.label,
    shape: shape as RectShape,
  };
}

// =============================================================================
// CENTER POST DETECTION
// =============================================================================

/**
 * Check if shape is a center post
 */
export function isCenterPost(id: string): boolean {
  return id.startsWith(POST_ID_PREFIX);
}

/**
 * Check if shape is a draggable center post
 */
export function isDraggableCenterPost(id: string): boolean {
  return isCenterPost(id);
}

/**
 * Get center post index from ID
 * Format: MOD-POST-{index}
 */
export function getPostIndex(id: string): number {
  const match = id.match(/MOD-POST-(\d+)/);
  return match ? parseInt(match[1], 10) + 1 : 1;
}

/**
 * Get all center posts sorted by X position
 */
export function getCenterPosts(shapes: Shape[]): RectShape[] {
  return shapes
    .filter(s => s.type === "rect" && isCenterPost(s.id))
    .map(s => s as RectShape)
    .sort((a, b) => a.x - b.x);
}

// =============================================================================
// SHELF DETECTION
// =============================================================================

/**
 * Check if shape is a shelf
 */
export function isShelf(id: string): boolean {
  return id.startsWith(SHELF_ID_PREFIX);
}

/**
 * Check if shape is a draggable shelf
 */
export function isDraggableShelf(id: string): boolean {
  return isShelf(id);
}

/**
 * Parse shelf ID to get section and shelf indices
 * Format: MOD-SHELF-{sectionIndex}-{shelfIndex}
 */
export function parseShelfId(id: string): ShelfIdInfo | null {
  const match = id.match(/MOD-SHELF-(\d+)-(\d+)/);
  if (!match) return null;

  return {
    sectionIndex: parseInt(match[1], 10) - 1, // 0-based
    shelfIndex: parseInt(match[2], 10),        // 1-based for display
  };
}

/**
 * Get all shelves
 */
export function getShelves(shapes: Shape[]): RectShape[] {
  return shapes
    .filter(s => s.type === "rect" && isShelf(s.id))
    .map(s => s as RectShape);
}
