/**
 * Bounds Utilities
 *
 * Functions to calculate bounds for panel/post/shelf movement.
 */

import { PANEL_IDS, MIN_EDGE_GAP, DEFAULT_CARCASS_THICKNESS } from "../config";
import { parseShelfId, getCenterPosts } from "./detection";
import type { ShelfBounds, CarcassBounds, CarcassPanels, SectionBoundary } from "../types";
import type { Shape, RectShape } from "../../types";
import type { ModuleConfig } from "../../engine/shapeGenerator";

// =============================================================================
// CARCASS PANELS
// =============================================================================

/**
 * Get all four carcass panels from shapes
 */
export function getCarcassPanels(shapes: Shape[]): CarcassPanels {
  return {
    top: shapes.find(s => s.id === PANEL_IDS.TOP) as RectShape | undefined,
    bottom: shapes.find(s => s.id === PANEL_IDS.BOTTOM) as RectShape | undefined,
    left: shapes.find(s => s.id === PANEL_IDS.LEFT) as RectShape | undefined,
    right: shapes.find(s => s.id === PANEL_IDS.RIGHT) as RectShape | undefined,
  };
}

// =============================================================================
// SECTION BOUNDARIES
// =============================================================================

/**
 * Build section boundaries from center posts
 */
export function buildSectionBoundaries(
  leftEdge: number,
  rightEdge: number,
  centerPosts: RectShape[]
): SectionBoundary[] {
  if (centerPosts.length === 0) {
    return [{ start: leftEdge, end: rightEdge, width: rightEdge - leftEdge }];
  }

  const sections: SectionBoundary[] = [];

  // First section
  sections.push({
    start: leftEdge,
    end: centerPosts[0].x,
    width: centerPosts[0].x - leftEdge,
  });

  // Middle sections
  for (let i = 0; i < centerPosts.length - 1; i++) {
    const start = centerPosts[i].x + centerPosts[i].w;
    const end = centerPosts[i + 1].x;
    sections.push({ start, end, width: end - start });
  }

  // Last section
  const lastPost = centerPosts[centerPosts.length - 1];
  sections.push({
    start: lastPost.x + lastPost.w,
    end: rightEdge,
    width: rightEdge - (lastPost.x + lastPost.w),
  });

  return sections;
}

// =============================================================================
// SHELF BOUNDS
// =============================================================================

/**
 * Get bounds for shelf vertical movement within its section
 */
export function getShelfBounds(
  moduleConfig: ModuleConfig | null,
  shapes: Shape[],
  shelfId: string
): ShelfBounds | null {
  if (!moduleConfig || moduleConfig.unitType !== "wardrobe_carcass") return null;

  const shelfInfo = parseShelfId(shelfId);
  if (!shelfInfo) return null;

  const T = moduleConfig.carcassThicknessMm ?? DEFAULT_CARCASS_THICKNESS;
  const panels = getCarcassPanels(shapes);

  let minY: number;
  let maxY: number;
  let leftEdge: number;
  let rightEdge: number;

  if (panels.top && panels.bottom && panels.left && panels.right) {
    minY = panels.top.y + panels.top.h;
    maxY = panels.bottom.y;
    leftEdge = panels.left.x + panels.left.w;
    rightEdge = panels.right.x;
  } else {
    // Fallback: calculate from all shapes
    const rectShapes = shapes.filter(
      s => s.type === "rect" && s.id.startsWith("MOD-")
    ) as RectShape[];

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

  const centerPosts = getCenterPosts(shapes);
  const sections = buildSectionBoundaries(leftEdge, rightEdge, centerPosts);

  // Get bounds for this shelf's section
  const idx = Math.min(shelfInfo.sectionIndex, sections.length - 1);
  const section = sections[idx];

  // Add margin
  const margin = T;

  return {
    minY: minY + margin,
    maxY: maxY - margin,
    sectionX: section.start,
    sectionWidth: section.width,
  };
}

// =============================================================================
// CARCASS BOUNDS
// =============================================================================

/**
 * Get carcass bounds for constraining center post movement
 */
export function getCarcassBounds(
  moduleConfig: ModuleConfig | null,
  shapes: Shape[]
): CarcassBounds | null {
  if (!moduleConfig || moduleConfig.unitType !== "wardrobe_carcass") return null;

  const panelsEnabled = moduleConfig.panelsEnabled ?? {
    top: true, bottom: true, left: true, right: true, back: true,
  };

  const leftPanel = shapes.find(
    s => s.id === PANEL_IDS.LEFT || s.id === "MOD-LEFT-DISABLED"
  ) as RectShape | undefined;

  const rightPanel = shapes.find(
    s => s.id === PANEL_IDS.RIGHT || s.id === "MOD-RIGHT-DISABLED"
  ) as RectShape | undefined;

  if (!leftPanel || !rightPanel) return null;

  const leftEdge = panelsEnabled.left ? leftPanel.x + leftPanel.w : leftPanel.x;
  const rightEdge = panelsEnabled.right ? rightPanel.x : rightPanel.x + rightPanel.w;

  return {
    minX: leftEdge + MIN_EDGE_GAP,
    maxX: rightEdge - MIN_EDGE_GAP,
    leftEdge,
    rightEdge,
  };
}
