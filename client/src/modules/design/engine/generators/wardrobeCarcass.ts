/**
 * Wardrobe Carcass Shape Generator
 *
 * Generates SVG shapes for wardrobe carcass with:
 * - Real panel thickness (18mm or 25mm)
 * - Optional panel enable/disable (panelsEnabled)
 * - Center posts with equal or custom positions
 * - Shelves with equal or custom positions
 * - Optional skirting
 */

import type { Shape } from "../../types";
import type { ModuleConfig, WardrobeSection } from "../shapeGenerator";
import { calculateSectionWidths } from "../../utils/constants";
import { makeRect, makeDim, makeDimensions } from "./helpers";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const PANEL_STYLE = { fill: "#d4d4d4", stroke: "#333", strokeWidth: 1 };
const DISABLED_STYLE = { fill: "none", stroke: "#ccc", strokeWidth: 0.5 };
const POST_STYLE = { fill: "#c0c0c0", stroke: "#333", strokeWidth: 1 };
const PARTIAL_POST_STYLE = { fill: "#a8d4a8", stroke: "#4a8f4a", strokeWidth: 1 }; // Light green for partial posts
const BACK_STYLE = { fill: "#f0f0f0", stroke: "#999", strokeWidth: 0.5 };
const SKIRTING_STYLE = { fill: "#b8b8b8", stroke: "#333", strokeWidth: 1 };
const BACK_INSET = 5;

// Default dimension limits
const MIN_WIDTH = 300;
const MAX_WIDTH = 6000;
const MIN_HEIGHT = 300;
const MAX_HEIGHT = 3000;
const MIN_THICKNESS = 8;
const MAX_THICKNESS = 50;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/** Ensure number is valid, return default if not */
function safe(value: number | undefined, defaultVal: number): number {
  if (value === undefined || value === null || isNaN(value) || value <= 0) {
    return defaultVal;
  }
  return value;
}

/** Clamp value to range */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Get panel enabled states with defaults (all enabled if not specified) */
function getPanelStates(config: ModuleConfig) {
  const raw = config.panelsEnabled ?? {};
  return {
    top: raw.top !== false,
    bottom: raw.bottom !== false,
    left: raw.left !== false,
    right: raw.right !== false,
    back: raw.back !== false,
  };
}

/** Draw a panel (enabled or disabled state) */
function drawPanel(
  shapes: Shape[],
  x: number, y: number, w: number, h: number,
  id: string,
  enabled: boolean
): void {
  const style = enabled ? PANEL_STYLE : DISABLED_STYLE;
  const panelId = enabled ? id : `${id}-DISABLED`;
  shapes.push(makeRect(x, y, w, h, { ...style, id: panelId }));
}

/**
 * Calculate shelf Y position (custom or evenly spaced)
 * Returns safe Y position within section bounds
 */
function getShelfY(
  section: WardrobeSection,
  shelfIndex: number,
  sectionY: number,
  sectionH: number,
  thickness: number
): number {
  const shelfCount = Math.max(1, section.shelfCount ?? 1);
  const safeIndex = clamp(shelfIndex, 1, shelfCount);
  const positions = section.shelfPositions || [];

  // Custom position (percentage of section height)
  if (positions.length > 0 && positions[safeIndex - 1] !== undefined) {
    const pct = clamp(positions[safeIndex - 1], 5, 95); // Keep within 5-95%
    return sectionY + (pct / 100) * sectionH;
  }

  // Even spacing
  const totalShelfThickness = shelfCount * thickness;
  const availableHeight = Math.max(thickness * 2, sectionH - totalShelfThickness);
  const spacing = availableHeight / (shelfCount + 1);
  return sectionY + spacing * safeIndex + thickness * (safeIndex - 1);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate wardrobe carcass shapes
 *
 * User-friendly features:
 * - Handles missing or invalid dimensions gracefully
 * - Returns empty array for completely invalid config
 * - All values clamped to safe ranges
 * - Works even with minimal config
 *
 * @param config - Module configuration
 * @param ox - Origin X position (defaults to 0)
 * @param oy - Origin Y position (defaults to 0)
 * @returns Array of shapes for SVG rendering
 */
export function generateWardrobeCarcassShapes(
  config: ModuleConfig,
  ox: number = 0,
  oy: number = 0
): Shape[] {
  // Guard: return empty if no config
  if (!config) {
    return [];
  }

  const shapes: Shape[] = [];

  // Safe extraction with defaults and clamping
  const W = clamp(safe(config.widthMm, 1200), MIN_WIDTH, MAX_WIDTH);
  const H = clamp(safe(config.heightMm, 2400), MIN_HEIGHT, MAX_HEIGHT);
  const T = clamp(safe(config.carcassThicknessMm, 18), MIN_THICKNESS, MAX_THICKNESS);
  const postCount = clamp(safe(config.centerPostCount, 0), 0, 10);
  const skirtingH = config.skirtingEnabled ? clamp(safe(config.skirtingHeightMm, 115), 50, 300) : 0;
  const panels = getPanelStates(config);

  // ─────────────────────────────────────────────────────────────────────────
  // 1. CARCASS PANELS (Left, Right, Top, Bottom)
  // ─────────────────────────────────────────────────────────────────────────

  drawPanel(shapes, ox, oy, T, H, "MOD-LEFT", panels.left);
  drawPanel(shapes, ox + W - T, oy, T, H, "MOD-RIGHT", panels.right);
  drawPanel(shapes, ox + T, oy, W - T * 2, T, "MOD-TOP", panels.top);

  const bottomY = oy + H - T - skirtingH;
  drawPanel(shapes, ox + T, bottomY, W - T * 2, T, "MOD-BOTTOM", panels.bottom);

  // ─────────────────────────────────────────────────────────────────────────
  // 2. SKIRTING (optional)
  // ─────────────────────────────────────────────────────────────────────────

  if (config.skirtingEnabled) {
    shapes.push(makeRect(ox, oy + H - skirtingH, W, skirtingH, { ...SKIRTING_STYLE, id: "MOD-SKIRTING" }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. BACK PANEL (shown as inset rectangle)
  // ─────────────────────────────────────────────────────────────────────────

  if (panels.back) {
    const backH = H - T * 2 - skirtingH;
    shapes.push(makeRect(
      ox + T + BACK_INSET,
      oy + T + BACK_INSET,
      W - T * 2 - BACK_INSET * 2,
      backH - BACK_INSET * 2,
      { ...BACK_STYLE, id: "MOD-BACK" }
    ));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. CENTER POSTS (with equal or custom positions)
  // ─────────────────────────────────────────────────────────────────────────

  const { sectionWidths, postPositions } = calculateSectionWidths({
    widthMm: W,
    carcassThicknessMm: T,
    centerPostCount: postCount,
    customPostPositions: config.centerPostPositions,
  });

  const postH = H - T * 2 - skirtingH;

  for (let i = 0; i < postCount; i++) {
    const postX = ox + T + postPositions[i];
    shapes.push(makeRect(postX, oy + T, T, postH, { ...POST_STYLE, id: `MOD-POST-${i + 1}` }));
  }

  // Note: Section width dimensions are rendered by InnerDimensions component
  // (see DesignCanvas.tsx → renderInnerDimensions)

  // ─────────────────────────────────────────────────────────────────────────
  // 5. SHELVES (in each section)
  // ─────────────────────────────────────────────────────────────────────────

  // Track lowest shelf Y per section for partial posts
  const lowestShelfYPerSection: Map<number, number> = new Map();

  if (config.sections && config.sections.length > 0) {
    const sectionCount = postCount + 1;
    const sectionH = H - T * 2 - skirtingH;
    const sectionY = oy + T;
    let currentX = ox + T;

    for (let i = 0; i < config.sections.length && i < sectionCount; i++) {
      const section = config.sections[i];
      const secW = section.widthMm > 0 ? section.widthMm : sectionWidths[i];
      const shelfCount = section.shelfCount ?? 0;

      let lowestShelfY = sectionY; // Default to top if no shelves

      for (let j = 1; j <= shelfCount; j++) {
        const shelfY = getShelfY(section, j, sectionY, sectionH, T);
        shapes.push(makeRect(currentX, shelfY, secW, T, { ...PANEL_STYLE, id: `MOD-SHELF-${i + 1}-${j}` }));

        // Track lowest shelf (highest Y value)
        if (shelfY > lowestShelfY) {
          lowestShelfY = shelfY;
        }
      }

      // Store lowest shelf Y for this section (bottom of shelf = shelfY + T)
      if (shelfCount > 0) {
        lowestShelfYPerSection.set(i, lowestShelfY + T);
      }

      currentX += secW + T;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5b. PARTIAL POSTS (from lowest shelf down to bottom, or full height if no shelves)
  // ─────────────────────────────────────────────────────────────────────────

  if (config.sections && config.sections.length > 0) {
    const sectionCount = postCount + 1;
    const sectionTopY = oy + T; // Top of section (below top panel)
    let currentX = ox + T;

    for (let i = 0; i < config.sections.length && i < sectionCount; i++) {
      const section = config.sections[i];
      const secW = section.widthMm > 0 ? section.widthMm : sectionWidths[i];
      const partialPostCount = section.postsBelow ?? 0;

      if (partialPostCount > 0) {
        // Start from lowest shelf if exists, otherwise from top of section
        const startY = lowestShelfYPerSection.has(i)
          ? lowestShelfYPerSection.get(i)!
          : sectionTopY;
        const partialPostH = bottomY - startY;

        if (partialPostH > T) { // Only draw if there's meaningful height
          // Calculate X positions for partial posts (evenly distributed)
          const innerSectionW = secW;
          const totalPartialPostWidth = partialPostCount * T;
          const spacing = (innerSectionW - totalPartialPostWidth) / (partialPostCount + 1);

          for (let p = 0; p < partialPostCount; p++) {
            const partialPostX = currentX + spacing * (p + 1) + T * p;
            shapes.push(makeRect(
              partialPostX,
              startY,
              T,
              partialPostH,
              { ...PARTIAL_POST_STYLE, id: `MOD-PARTIAL-POST-${i + 1}-${p + 1}` }
            ));
          }
        }
      }

      currentX += secW + T;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. DIMENSIONS (overall width/height only, no thickness)
  // ─────────────────────────────────────────────────────────────────────────

  shapes.push(...makeDimensions(ox, oy, W, H));

  return shapes;
}
