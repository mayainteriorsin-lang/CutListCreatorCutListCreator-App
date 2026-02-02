/**
 * Design Module - Geometry Utilities
 *
 * Pure functions for geometric calculations used in the design canvas.
 * Extracted from DesignCenter.tsx for better testability and reuse.
 */

import type {
  Shape,
  LineShape,
  RectShape,
  AlignmentGuide,
  MeasurementResult,
  Id,
} from "../types";
import { SNAP_THRESHOLD, ANGLE_SNAP_INCREMENT } from "./constants";

// =============================================================================
// ID GENERATION
// =============================================================================

/**
 * Generate a unique ID with optional prefix
 * @param prefix - Optional prefix (e.g., "line-", "rect-", "DIM-")
 * @returns Unique string ID
 */
export const uid = (prefix = ""): string => {
  return `${prefix}${Math.random().toString(36).slice(2, 9)}`;
};

// =============================================================================
// GRID SNAPPING
// =============================================================================

/**
 * Snap a value to the nearest grid point
 * @param value - The value to snap
 * @param gridSize - The grid size in mm
 * @returns Snapped value
 */
export const snapToGrid = (value: number, gridSize: number): number => {
  return Math.round(value / gridSize) * gridSize;
};

/**
 * Alias for snapToGrid - shorthand used in canvas components
 */
export const SNAP = snapToGrid;

/**
 * Snap a point to the grid
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param gridSize - The grid size in mm
 * @returns Snapped point
 */
export const snapPointToGrid = (
  x: number,
  y: number,
  gridSize: number
): { x: number; y: number } => {
  return {
    x: snapToGrid(x, gridSize),
    y: snapToGrid(y, gridSize),
  };
};

// =============================================================================
// ANGLE CALCULATIONS
// =============================================================================

/**
 * Calculate the angle between two points
 * @param x1 - Start X coordinate
 * @param y1 - Start Y coordinate
 * @param x2 - End X coordinate
 * @param y2 - End Y coordinate
 * @returns Angle in degrees (-180 to 180)
 */
export const getAngle = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number => {
  return Math.round((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI) % 360;
};

/**
 * Snap angle to nearest increment (typically 45 degrees)
 * @param angle - Angle in degrees
 * @param increment - Snap increment (default: 45)
 * @returns Snapped angle
 */
export const snapAngle = (
  angle: number,
  increment: number = ANGLE_SNAP_INCREMENT
): number => {
  return Math.round(angle / increment) * increment;
};

/**
 * Calculate distance between two points
 * @returns Distance in units
 */
export const getDistance = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number => {
  return Math.hypot(x2 - x1, y2 - y1);
};

// =============================================================================
// SHAPE BOUNDS
// =============================================================================

/**
 * Shape bounding box with center point
 */
export interface ShapeBounds {
  x1: number; // Left edge
  y1: number; // Top edge
  x2: number; // Right edge
  y2: number; // Bottom edge
  cx: number; // Center X
  cy: number; // Center Y
}

/**
 * Get the bounding box of a shape
 * @param shape - The shape to measure
 * @returns Bounding box with center point, or null for unsupported shapes
 */
export const getShapeBounds = (shape: Shape): ShapeBounds | null => {
  if (shape.type === "rect") {
    const r = shape as RectShape;
    return {
      x1: r.x,
      y1: r.y,
      x2: r.x + r.w,
      y2: r.y + r.h,
      cx: r.x + r.w / 2,
      cy: r.y + r.h / 2,
    };
  } else if (shape.type === "line") {
    const l = shape as LineShape;
    return {
      x1: Math.min(l.x1, l.x2),
      y1: Math.min(l.y1, l.y2),
      x2: Math.max(l.x1, l.x2),
      y2: Math.max(l.y1, l.y2),
      cx: (l.x1 + l.x2) / 2,
      cy: (l.y1 + l.y2) / 2,
    };
  }
  return null;
};

/**
 * Get combined bounding box for multiple shapes
 * @param shapes - Array of shapes
 * @returns Combined bounding box, or null if no valid shapes
 */
export const getCombinedBounds = (shapes: Shape[]): ShapeBounds | null => {
  const validBounds = shapes
    .map(getShapeBounds)
    .filter((b): b is ShapeBounds => b !== null);

  if (validBounds.length === 0) return null;

  return {
    x1: Math.min(...validBounds.map((b) => b.x1)),
    y1: Math.min(...validBounds.map((b) => b.y1)),
    x2: Math.max(...validBounds.map((b) => b.x2)),
    y2: Math.max(...validBounds.map((b) => b.y2)),
    cx:
      (Math.min(...validBounds.map((b) => b.x1)) +
        Math.max(...validBounds.map((b) => b.x2))) /
      2,
    cy:
      (Math.min(...validBounds.map((b) => b.y1)) +
        Math.max(...validBounds.map((b) => b.y2))) /
      2,
  };
};

// =============================================================================
// LINE INTERSECTION
// =============================================================================

/**
 * Find intersection point of two line segments
 * @returns Intersection point, or null if lines don't intersect
 */
export const getLineIntersection = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
  gridSize?: number
): { x: number; y: number } | null => {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  if (t < 0 || t > 1) return null;

  const x = x1 + t * (x2 - x1);
  const y = y1 + t * (y2 - y1);

  // Optionally snap to grid
  if (gridSize) {
    return {
      x: snapToGrid(x, gridSize),
      y: snapToGrid(y, gridSize),
    };
  }

  return { x, y };
};

// =============================================================================
// POINT-TO-SEGMENT DISTANCE
// =============================================================================

/**
 * Calculate the shortest distance from a point to a line segment
 * @param px - Point X
 * @param py - Point Y
 * @param x1 - Segment start X
 * @param y1 - Segment start Y
 * @param x2 - Segment end X
 * @param y2 - Segment end Y
 * @returns Distance from point to segment
 */
export const pointToSegmentDistance = (
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number => {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const wx = px - x1;
  const wy = py - y1;

  const c1 = vx * wx + vy * wy;
  if (c1 <= 0) return Math.hypot(px - x1, py - y1);

  const c2 = vx * vx + vy * vy;
  if (c2 <= c1) return Math.hypot(px - x2, py - y2);

  const b = c1 / c2;
  const bx = x1 + b * vx;
  const by = y1 + b * vy;

  return Math.hypot(px - bx, py - by);
};

// =============================================================================
// ALIGNMENT GUIDES
// =============================================================================

/**
 * Result from finding alignment guides
 */
export interface AlignmentResult {
  guides: AlignmentGuide[];
  snapX: number | null;
  snapY: number | null;
}

/**
 * Find alignment guides based on current position relative to other shapes
 * @param currentX - Current X position
 * @param currentY - Current Y position
 * @param shapes - All shapes to check against
 * @param excludeId - Shape ID to exclude (e.g., the shape being moved)
 * @param canvasWidth - Canvas width for guide extent
 * @param canvasHeight - Canvas height for guide extent
 * @param threshold - Snap threshold (default: SNAP_THRESHOLD)
 * @returns Alignment guides and snap positions
 */
export const findAlignmentGuides = (
  currentX: number,
  currentY: number,
  shapes: Shape[],
  excludeId: Id | undefined,
  canvasWidth: number,
  canvasHeight: number,
  threshold: number = SNAP_THRESHOLD
): AlignmentResult => {
  const guides: AlignmentGuide[] = [];
  let snapX: number | null = null;
  let snapY: number | null = null;

  for (const shape of shapes) {
    if (shape.id === excludeId || shape.type === "dimension") continue;

    const bounds = getShapeBounds(shape);
    if (!bounds) continue;

    // Check horizontal alignments (top, center, bottom of shape)
    const horizontalPositions = [bounds.y1, bounds.cy, bounds.y2];
    for (const pos of horizontalPositions) {
      if (Math.abs(currentY - pos) < threshold) {
        guides.push({
          type: "horizontal",
          position: pos,
          start: 0,
          end: canvasWidth,
        });
        if (snapY === null) snapY = pos;
      }
    }

    // Check vertical alignments (left, center, right of shape)
    const verticalPositions = [bounds.x1, bounds.cx, bounds.x2];
    for (const pos of verticalPositions) {
      if (Math.abs(currentX - pos) < threshold) {
        guides.push({
          type: "vertical",
          position: pos,
          start: 0,
          end: canvasHeight,
        });
        if (snapX === null) snapX = pos;
      }
    }
  }

  return { guides, snapX, snapY };
};

// =============================================================================
// MEASUREMENTS
// =============================================================================

/**
 * Calculate measurements for a set of shapes
 * @param shapes - Shapes to measure
 * @param selectedIds - Set of selected shape IDs
 * @param selectedId - Currently selected single shape ID
 * @returns Measurement results
 */
export const calculateMeasurements = (
  shapes: Shape[],
  selectedIds: Set<Id>,
  selectedId: Id | null
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
// HIT TESTING
// =============================================================================

/**
 * Test if a point hits any shape
 * @param x - X coordinate to test
 * @param y - Y coordinate to test
 * @param shapes - Shapes to test against
 * @param tolerance - Hit tolerance (typically gridSize * 0.6)
 * @returns The hit shape, or null if no hit
 */
export const hitTest = (
  x: number,
  y: number,
  shapes: Shape[],
  tolerance: number
): Shape | null => {
  // Test rectangles first (front to back)
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i];
    if (s.type === "rect") {
      const r = s as RectShape;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        return r;
      }
    }
  }

  // Then test lines
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i];
    if (s.type === "line") {
      const l = s as LineShape;
      const d = pointToSegmentDistance(x, y, l.x1, l.y1, l.x2, l.y2);
      if (d < tolerance) return l;
    }
  }

  return null;
};

// =============================================================================
// EDGE DETECTION (for resize)
// =============================================================================

/**
 * Edge types for resize detection
 */
export type EdgeType = "left" | "right" | "top" | "bottom";

/**
 * Detect if a point is near an edge of a rectangle
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param rect - Rectangle to check
 * @param allowedEdges - Which edges to check (default: all)
 * @param threshold - Edge detection threshold in pixels
 * @returns Detected edge, or null if not near an edge
 */
export const detectEdge = (
  x: number,
  y: number,
  rect: RectShape,
  allowedEdges: EdgeType[] = ["left", "right", "top", "bottom"],
  threshold: number = 8
): EdgeType | null => {
  const { x: rx, y: ry, w, h } = rect;

  // Check if point is within rectangle bounds (with threshold expansion)
  if (
    x < rx - threshold ||
    x > rx + w + threshold ||
    y < ry - threshold ||
    y > ry + h + threshold
  ) {
    return null;
  }

  // Check each allowed edge
  if (allowedEdges.includes("left") && Math.abs(x - rx) < threshold) {
    return "left";
  }
  if (allowedEdges.includes("right") && Math.abs(x - (rx + w)) < threshold) {
    return "right";
  }
  if (allowedEdges.includes("top") && Math.abs(y - ry) < threshold) {
    return "top";
  }
  if (allowedEdges.includes("bottom") && Math.abs(y - (ry + h)) < threshold) {
    return "bottom";
  }

  return null;
};

// =============================================================================
// COORDINATE TRANSFORMS
// =============================================================================

/**
 * Convert mouse event to SVG coordinates
 * @param evt - Mouse event
 * @param svg - SVG element reference
 * @param panOffset - Current pan offset
 * @returns Point in SVG coordinates
 */
export const getSvgPoint = (
  evt: { clientX: number; clientY: number },
  svg: SVGSVGElement,
  panOffset: { x: number; y: number }
): { x: number; y: number } => {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX;
  pt.y = evt.clientY;
  const cursor = pt.matrixTransform(svg.getScreenCTM()?.inverse());
  return {
    x: cursor.x - panOffset.x,
    y: cursor.y - panOffset.y,
  };
};

// =============================================================================
// ANGLE HELPERS
// =============================================================================

/**
 * Apply angle snapping to a line endpoint
 * @param startX - Line start X
 * @param startY - Line start Y
 * @param endX - Line end X (raw)
 * @param endY - Line end Y (raw)
 * @param shouldSnap - Whether to apply angle snapping
 * @returns Adjusted endpoint
 */
export const applyAngleSnap = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  shouldSnap: boolean
): { x: number; y: number } => {
  if (!shouldSnap) {
    return { x: endX, y: endY };
  }

  const angle = getAngle(startX, startY, endX, endY);
  const snappedAngle = snapAngle(angle);
  const dist = getDistance(startX, startY, endX, endY);

  return {
    x: startX + dist * Math.cos((snappedAngle * Math.PI) / 180),
    y: startY + dist * Math.sin((snappedAngle * Math.PI) / 180),
  };
};

/**
 * Check if an angle is approximately horizontal
 */
export const isHorizontal = (angle: number, tolerance: number = 15): boolean => {
  const normalized = ((angle % 360) + 360) % 360;
  return (
    normalized < tolerance ||
    normalized > 360 - tolerance ||
    Math.abs(normalized - 180) < tolerance
  );
};

/**
 * Check if an angle is approximately vertical
 */
export const isVertical = (angle: number, tolerance: number = 15): boolean => {
  const normalized = ((angle % 360) + 360) % 360;
  return (
    Math.abs(normalized - 90) < tolerance ||
    Math.abs(normalized - 270) < tolerance
  );
};
