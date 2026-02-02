/**
 * Canvas Helper Functions
 *
 * Pure utility functions for canvas operations extracted from DesignCanvas.
 * These functions handle hit testing, edge detection, bounds calculation, etc.
 */

import type { Shape, LineShape, RectShape, MeasurementResult } from "../types";
import type { ModuleConfig } from "../engine/shapeGenerator";
import { pointToSegmentDistance } from "./geometry";

// Edge detection threshold in pixels
export const EDGE_THRESHOLD = 8;

// =============================================================================
// CENTER POST HELPERS
// =============================================================================

/**
 * Check if a shape is a draggable center post
 * Center posts have IDs starting with "MOD-POST-"
 */
export const isDraggableCenterPost = (id: string): boolean => {
  return id.startsWith("MOD-POST-");
};

// =============================================================================
// SHELF HELPERS
// =============================================================================

/**
 * Check if a shape is a draggable shelf
 * Shelves have IDs starting with "MOD-SHELF-"
 */
export const isDraggableShelf = (id: string): boolean => {
  return id.startsWith("MOD-SHELF-");
};

/**
 * Parse shelf ID to get section and shelf indices
 * Format: MOD-SHELF-{sectionIndex}-{shelfIndex}
 * @returns Object with 0-based sectionIndex and 1-based shelfIndex, or null
 */
export const parseShelfId = (id: string): { sectionIndex: number; shelfIndex: number } | null => {
  const match = id.match(/MOD-SHELF-(\d+)-(\d+)/);
  if (!match) return null;
  return {
    sectionIndex: parseInt(match[1], 10) - 1, // Convert to 0-based
    shelfIndex: parseInt(match[2], 10),        // Keep 1-based for display
  };
};

export interface ShelfBounds {
  minY: number;
  maxY: number;
  sectionX: number;
  sectionWidth: number;
}

/**
 * Get bounds for shelf vertical movement within its section
 * Shelves are constrained to move only vertically within the carcass inner area
 * Uses ACTUAL center post positions from shapes (not theoretical calculations)
 * @param moduleConfig - Current module configuration
 * @param shapes - All shapes on canvas
 * @param shelfId - The shelf ID to get bounds for
 * @returns Bounds object or null if not applicable
 */
export const getShelfBounds = (
  moduleConfig: ModuleConfig | null,
  shapes: Shape[],
  shelfId: string
): ShelfBounds | null => {
  if (!moduleConfig || moduleConfig.unitType !== "wardrobe_carcass") return null;

  const shelfInfo = parseShelfId(shelfId);
  if (!shelfInfo) return null;

  const T = moduleConfig.carcassThicknessMm ?? 18;

  // Get panels - try to find them by ID
  const topPanel = shapes.find(s => s.id === "MOD-TOP") as RectShape | undefined;
  const bottomPanel = shapes.find(s => s.id === "MOD-BOTTOM") as RectShape | undefined;
  const leftPanel = shapes.find(s => s.id === "MOD-LEFT") as RectShape | undefined;
  const rightPanel = shapes.find(s => s.id === "MOD-RIGHT") as RectShape | undefined;

  // Fallback: find bounds from all rect shapes if specific panels not found
  let minY: number;
  let maxY: number;
  let leftEdge: number;
  let rightEdge: number;

  if (topPanel && bottomPanel && leftPanel && rightPanel) {
    // Use panel positions
    minY = topPanel.y + topPanel.h;
    maxY = bottomPanel.y;
    leftEdge = leftPanel.x + leftPanel.w;
    rightEdge = rightPanel.x;
  } else {
    // Fallback: calculate from all shapes
    const rectShapes = shapes.filter(s => s.type === "rect" && s.id.startsWith("MOD-")) as RectShape[];
    if (rectShapes.length === 0) return null;

    const allY = rectShapes.map(r => r.y);
    const allYEnd = rectShapes.map(r => r.y + r.h);
    const allX = rectShapes.map(r => r.x);
    const allXEnd = rectShapes.map(r => r.x + r.w);

    minY = Math.min(...allY) + T;
    maxY = Math.max(...allYEnd) - T;
    leftEdge = Math.min(...allX) + T;
    rightEdge = Math.max(...allXEnd) - T;
  }

  // Get ACTUAL center post positions from shapes (not theoretical)
  const centerPosts = shapes
    .filter(s => s.type === "rect" && s.id.startsWith("MOD-POST-"))
    .map(s => s as RectShape)
    .sort((a, b) => a.x - b.x); // Sort by X position

  const postCount = centerPosts.length;
  const sectionCount = postCount + 1;

  // Calculate section boundaries from actual post positions
  let sectionX: number;
  let sectionWidth: number;

  if (postCount === 0) {
    // No center posts: single section spans full width
    sectionX = leftEdge;
    sectionWidth = rightEdge - leftEdge;
  } else {
    // Build section boundaries from posts
    const sectionBounds: Array<{ start: number; end: number }> = [];

    // First section: from left edge to first post
    sectionBounds.push({
      start: leftEdge,
      end: centerPosts[0].x,
    });

    // Middle sections: between posts
    for (let i = 0; i < postCount - 1; i++) {
      sectionBounds.push({
        start: centerPosts[i].x + centerPosts[i].w,
        end: centerPosts[i + 1].x,
      });
    }

    // Last section: from last post to right edge
    sectionBounds.push({
      start: centerPosts[postCount - 1].x + centerPosts[postCount - 1].w,
      end: rightEdge,
    });

    // Get bounds for this shelf's section
    const idx = Math.min(shelfInfo.sectionIndex, sectionBounds.length - 1);
    const bounds = sectionBounds[idx];

    sectionX = bounds.start;
    sectionWidth = bounds.end - bounds.start;
  }

  // Add margin to keep shelf inside the section (not touching top/bottom panels)
  const margin = T; // One thickness margin from top and bottom

  return {
    minY: minY + margin,
    maxY: maxY - margin,
    sectionX,
    sectionWidth,
  };
};

// =============================================================================
// CARCASS BOUNDS
// =============================================================================

export interface CarcassBounds {
  minX: number;
  maxX: number;
  leftEdge: number;
  rightEdge: number;
}

/**
 * Get carcass bounds for constraining center post movement
 * @param moduleConfig - Current module configuration
 * @param shapes - All shapes on canvas
 * @returns Bounds object or null if not applicable
 */
export const getCarcassBounds = (
  moduleConfig: ModuleConfig | null,
  shapes: Shape[]
): CarcassBounds | null => {
  if (!moduleConfig || moduleConfig.unitType !== "wardrobe_carcass") return null;

  const panelsEnabled = moduleConfig.panelsEnabled ?? {
    top: true,
    bottom: true,
    left: true,
    right: true,
    back: true,
  };

  // Find left and right panels to get actual bounds from shapes
  const leftPanel = shapes.find(
    (s) => s.id === "MOD-LEFT" || s.id === "MOD-LEFT-DISABLED"
  ) as RectShape | undefined;
  const rightPanel = shapes.find(
    (s) => s.id === "MOD-RIGHT" || s.id === "MOD-RIGHT-DISABLED"
  ) as RectShape | undefined;

  if (!leftPanel || !rightPanel) return null;

  // Get actual bounds from shape positions
  const leftEdge = panelsEnabled.left ? leftPanel.x + leftPanel.w : leftPanel.x;
  const rightEdge = panelsEnabled.right ? rightPanel.x : rightPanel.x + rightPanel.w;

  // Minimum gap from edges (100mm clearance)
  const minGap = 100;

  return {
    minX: leftEdge + minGap,
    maxX: rightEdge - minGap,
    leftEdge,
    rightEdge,
  };
};

// =============================================================================
// EDGE DETECTION
// =============================================================================

export type EdgeType = "left" | "right" | "top" | "bottom";

/**
 * Detect if mouse position is near an edge of a rectangle
 * @param mouseX - Mouse X coordinate
 * @param mouseY - Mouse Y coordinate
 * @param rect - Rectangle to check
 * @param allowedEdges - Which edges to check (default: all)
 * @param threshold - Detection threshold in pixels (default: EDGE_THRESHOLD)
 * @returns Detected edge or null
 */
export const detectEdge = (
  mouseX: number,
  mouseY: number,
  rect: RectShape,
  allowedEdges: EdgeType[] = ["left", "right", "top", "bottom"],
  threshold: number = EDGE_THRESHOLD
): EdgeType | null => {
  const { x, y, w, h } = rect;
  const inXRange = mouseX >= x - threshold && mouseX <= x + w + threshold;
  const inYRange = mouseY >= y - threshold && mouseY <= y + h + threshold;
  if (!inXRange || !inYRange) return null;

  const nearLeft = Math.abs(mouseX - x) <= threshold && mouseY >= y && mouseY <= y + h;
  const nearRight = Math.abs(mouseX - (x + w)) <= threshold && mouseY >= y && mouseY <= y + h;
  const nearTop = Math.abs(mouseY - y) <= threshold && mouseX >= x && mouseX <= x + w;
  const nearBottom = Math.abs(mouseY - (y + h)) <= threshold && mouseX >= x && mouseX <= x + w;

  if (nearLeft && allowedEdges.includes("left")) return "left";
  if (nearRight && allowedEdges.includes("right")) return "right";
  if (nearTop && allowedEdges.includes("top")) return "top";
  if (nearBottom && allowedEdges.includes("bottom")) return "bottom";
  return null;
};

// =============================================================================
// HIT TESTING
// =============================================================================

/**
 * Shape IDs that should not be selectable via normal click
 * - MOD-BACK: Covers entire wardrobe interior, blocks selection of shelves/sections
 */
const NON_SELECTABLE_IDS = new Set(["MOD-BACK"]);

/**
 * Test if a point hits any shape (for selection)
 * Tests shapes from front to back (last drawn = front)
 * Excludes certain shapes (like back panel) to prevent accidental selection
 * @param x - X coordinate to test
 * @param y - Y coordinate to test
 * @param shapes - All shapes to test against
 * @param gridSize - Grid size for line tolerance calculation
 * @returns Hit shape or null
 */
export const hitTestShapes = (
  x: number,
  y: number,
  shapes: Shape[],
  gridSize: number
): Shape | null => {
  const tolerance = gridSize * 0.6;

  // Test from back to front (last shape is on top)
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i];
    if (!s) continue;

    // Skip non-selectable shapes (e.g., back panel)
    if (NON_SELECTABLE_IDS.has(s.id)) continue;

    if (s.type === "rect") {
      const r = s as RectShape;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        return r;
      }
    } else if (s.type === "line") {
      const l = s as LineShape;
      const d = pointToSegmentDistance(x, y, l.x1, l.y1, l.x2, l.y2);
      if (d < tolerance) {
        return l;
      }
    }
  }

  return null;
};

// =============================================================================
// MEASUREMENTS
// =============================================================================

/**
 * Calculate measurements for selected shapes
 * @param shapes - All shapes
 * @param selectedIds - Set of selected shape IDs
 * @param selectedId - Single selected shape ID (for backwards compatibility)
 * @returns Measurement results
 */
export const calculateShapeMeasurements = (
  shapes: Shape[],
  selectedIds: Set<string>,
  selectedId: string | null
): MeasurementResult => {
  const selected = shapes.filter(
    (s) => selectedIds.has(s.id) || s.id === selectedId
  );

  let totalLength = 0;
  let area = 0;
  let perimeter = 0;

  for (const shape of selected) {
    if (shape.type === "line") {
      const l = shape as LineShape;
      totalLength += Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
    } else if (shape.type === "rect") {
      const r = shape as RectShape;
      area += r.w * r.h;
      perimeter += 2 * (r.w + r.h);
    }
  }

  return {
    totalLength: Math.round(totalLength),
    area: Math.round(area),
    perimeter: Math.round(perimeter),
    selectedCount: selected.length,
  };
};

// =============================================================================
// SVG COORDINATE HELPERS
// =============================================================================

/**
 * Convert mouse event to SVG coordinates
 * @param clientX - Mouse client X
 * @param clientY - Mouse client Y
 * @param svg - SVG element reference
 * @param panOffset - Current pan offset
 * @returns Point in SVG coordinates
 */
export const clientToSvgCoords = (
  clientX: number,
  clientY: number,
  svg: SVGSVGElement,
  panOffset: { x: number; y: number }
): { x: number; y: number } => {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const cursor = pt.matrixTransform(svg.getScreenCTM()?.inverse());
  return {
    x: cursor.x - panOffset.x,
    y: cursor.y - panOffset.y,
  };
};

// =============================================================================
// CURSOR HELPERS
// =============================================================================

export type ActionMode = "move" | "resize" | "copy" | "delete" | null;

/**
 * Determine cursor style based on current state
 */
export const getCursorStyle = (
  isResizing: boolean,
  isDragging: boolean,
  actionMode: ActionMode
): string => {
  if (isResizing) return "ns-resize";
  if (isDragging) return "move";
  if (actionMode === "move") return "move";
  if (actionMode === "resize") return "ns-resize";
  if (actionMode === "copy") return "copy";
  if (actionMode === "delete") return "not-allowed";
  return "default";
};

// =============================================================================
// VIEWBOX CALCULATION
// =============================================================================

export interface ViewBoxOptions {
  shapes: Shape[];
  canvasSize: { w: number; h: number };
  zoom: number;
  dimFontSize?: number;
  padding?: number;
}

export interface ViewBoxResult {
  viewBox: string;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } | null;
}

/**
 * Calculate SVG viewBox to auto-fit content centered and maximized
 * Includes rect, line, and dimension shapes in bounds calculation
 */
export const calculateViewBox = ({
  shapes,
  canvasSize,
  zoom,
  dimFontSize = 28,
  padding = 80,
}: ViewBoxOptions): ViewBoxResult => {
  if (shapes.length === 0) {
    const fallbackSize = Math.max(canvasSize.w, canvasSize.h) / zoom;
    return {
      viewBox: `0 0 ${fallbackSize} ${fallbackSize}`,
      bounds: null,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const shape of shapes) {
    if (shape.type === "rect") {
      const r = shape as RectShape;
      minX = Math.min(minX, r.x);
      minY = Math.min(minY, r.y);
      maxX = Math.max(maxX, r.x + r.w);
      maxY = Math.max(maxY, r.y + r.h);
    } else if (shape.type === "line") {
      const l = shape as LineShape;
      minX = Math.min(minX, l.x1, l.x2);
      minY = Math.min(minY, l.y1, l.y2);
      maxX = Math.max(maxX, l.x1, l.x2);
      maxY = Math.max(maxY, l.y1, l.y2);
    } else if (shape.type === "dimension") {
      // Include dimension shapes in bounds calculation
      const d = shape as { x1: number; y1: number; x2: number; y2: number; dimType?: string; offset?: number; label?: string };
      const scale = dimFontSize / 28;
      const defaultOffset = 50 * scale;
      const offset = d.offset || defaultOffset;
      const textBoxHeight = dimFontSize * 1.3;

      if (d.dimType === "horizontal") {
        minX = Math.min(minX, d.x1, d.x2);
        maxX = Math.max(maxX, d.x1, d.x2);
        minY = Math.min(minY, d.y1, d.y2);
        maxY = Math.max(maxY, d.y1 + offset + textBoxHeight + 20 * scale);
      } else if (d.dimType === "vertical") {
        minY = Math.min(minY, d.y1, d.y2);
        maxY = Math.max(maxY, d.y1, d.y2);
        minX = Math.min(minX, d.x1, d.x2);
        const textWidth = ((d.label?.length || 4) * (dimFontSize * 0.65)) + 30 * scale;
        maxX = Math.max(maxX, d.x1 + offset + textWidth);
      }
    }
  }

  if (minX === Infinity) {
    const fallbackSize = Math.max(canvasSize.w, canvasSize.h) / zoom;
    return {
      viewBox: `0 0 ${fallbackSize} ${fallbackSize}`,
      bounds: null,
    };
  }

  const contentW = maxX - minX;
  const contentH = maxY - minY;
  const size = Math.max(contentW, contentH) + padding * 2;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const viewX = centerX - size / 2;
  const viewY = centerY - size / 2;

  return {
    viewBox: `${viewX} ${viewY} ${size} ${size}`,
    bounds: { minX, minY, maxX, maxY },
  };
};
