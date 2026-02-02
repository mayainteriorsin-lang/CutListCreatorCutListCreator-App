/**
 * Hit Test Utilities
 *
 * Functions for detecting clicks on shapes.
 */

import { NON_SELECTABLE_IDS } from "../config";
import { pointToSegmentDistance } from "../../utils/geometry";
import type { Shape, RectShape, LineShape } from "../../types";

// =============================================================================
// EDGE DETECTION
// =============================================================================

export const EDGE_THRESHOLD = 8;

export type EdgeType = "left" | "right" | "top" | "bottom";

/**
 * Detect if mouse position is near an edge of a rectangle
 */
export function detectEdge(
  mouseX: number,
  mouseY: number,
  rect: RectShape,
  allowedEdges: EdgeType[] = ["left", "right", "top", "bottom"],
  threshold: number = EDGE_THRESHOLD
): EdgeType | null {
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
}

// =============================================================================
// SHAPE HIT TESTING
// =============================================================================

/**
 * Test if a point hits any shape (for selection)
 * Excludes non-selectable shapes (like back panel)
 */
export function hitTestShapes(
  x: number,
  y: number,
  shapes: Shape[],
  gridSize: number
): Shape | null {
  const tolerance = gridSize * 0.6;

  // Test from back to front (last shape is on top)
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i];
    if (!s) continue;

    // Skip non-selectable shapes
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
}

/**
 * Test if a point is inside a rectangle
 */
export function isPointInRect(
  x: number,
  y: number,
  rect: RectShape
): boolean {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}
