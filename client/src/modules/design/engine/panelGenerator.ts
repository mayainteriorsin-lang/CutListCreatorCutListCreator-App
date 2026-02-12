/**
 * Panel Generator Engine
 *
 * Converts ModuleConfig into production cutlist panels.
 * Each panel has dimensions, quantity, type, and material info.
 */

import type { ModuleConfig } from "./shapeGenerator";
import { calculateSectionWidths } from "../utils/constants";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/** Standard plywood sheet dimensions (mm) */
export const SHEET_WIDTH = 1200;
export const SHEET_HEIGHT = 2400;

/** Default thickness values (mm) */
const DEFAULT_CARCASS_THICKNESS = 18;
const DEFAULT_BACK_THICKNESS = 10;
const DEFAULT_EDGE_DEDUCTION = 20;
const DEFAULT_SHELF_BACK = 20;
const DEFAULT_SHELF_FRONT = 10;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ModuleCutlistPanel {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  thicknessMm: number;
  qty: number;
  panelType: "carcass" | "shelf" | "partition" | "drawer_front" | "drawer_side" |
             "drawer_bottom" | "back" | "shutter" | "loft_shutter";
  material: string;
  grainDirection: boolean;
  /** Gaddi enabled for optimizer */
  gaddi: boolean;
}

export interface CuttingListItem {
  id: string;
  name: string;
  qty: number;
  width: number;
  height: number;
  thickness: number;
  material: string;
  fits: boolean;
  /** Gaddi enabled for optimizer */
  gaddi: boolean;
}

export interface BackPanelLayout {
  postPositions: number[];
  panelWidths: number[];
  panelFits: boolean[];
  backH: number;
  backW: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/** Generate deterministic panel ID based on name */
const panelId = (name: string, index = 0) => `PNL-${name.replace(/\s+/g, '-').toUpperCase()}-${index}`;

/**
 * Ensure number is valid and positive
 * Returns default if value is undefined, NaN, or negative
 */
function safe(value: number | undefined, defaultVal: number): number {
  if (value === undefined || value === null || isNaN(value) || value < 0) {
    return defaultVal;
  }
  return value;
}

/**
 * Ensure number is within valid range
 * Clamps value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Check if panel fits in standard plywood sheet
 * Checks both orientations (landscape and portrait)
 *
 * @param w - Panel width in mm (auto-corrected if invalid)
 * @param h - Panel height in mm (auto-corrected if invalid)
 * @returns true if panel fits in standard 1200×2400mm sheet
 */
export function fitsInSheet(w: number, h: number): boolean {
  const safeW = safe(w, 0);
  const safeH = safe(h, 0);
  return (safeW <= SHEET_WIDTH && safeH <= SHEET_HEIGHT) ||
         (safeW <= SHEET_HEIGHT && safeH <= SHEET_WIDTH);
}

/**
 * Create a panel object with validation
 * - Ensures positive dimensions (minimum 10mm)
 * - Ensures positive quantity (minimum 1)
 * - Ensures valid thickness
 * - Sets gaddi based on panel type (false for back panels)
 * - Uses deterministic ID based on panel name for consistent gaddi tracking
 */
function makePanel(
  name: string,
  width: number,
  height: number,
  thickness: number,
  qty: number,
  panelType: ModuleCutlistPanel["panelType"],
  material: string,
  index = 0
): ModuleCutlistPanel {
  // Back panels have gaddi OFF by default, others ON
  const defaultGaddi = panelType !== "back";

  return {
    id: panelId(name, index),
    name: name || "Panel",
    widthMm: Math.round(clamp(safe(width, 100), 10, 6000)),
    heightMm: Math.round(clamp(safe(height, 100), 10, 6000)),
    thicknessMm: clamp(safe(thickness, DEFAULT_CARCASS_THICKNESS), 3, 50),
    qty: Math.max(1, Math.round(safe(qty, 1))),
    panelType,
    material: material || "plywood",
    grainDirection: true,
    gaddi: defaultGaddi,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// UI CUTTING LIST
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate simplified cutting list for UI display
 * Includes sheet fit check for each panel
 *
 * @param config - Module configuration
 * @param gaddiOverrides - Optional per-panel gaddi overrides (keyed by panel id)
 * @returns Array of cutting list items with dimensions and fit status
 */
export function generateCuttingList(
  config: ModuleConfig,
  gaddiOverrides?: Record<string, boolean>
): CuttingListItem[] {
  return generateModuleCutlistPanels(config).map(p => ({
    id: p.id,
    name: p.name,
    qty: p.qty,
    width: p.widthMm,
    height: p.heightMm,
    thickness: p.thicknessMm,
    material: p.material,
    fits: fitsInSheet(p.widthMm, p.heightMm),
    gaddi: gaddiOverrides?.[p.id] ?? p.gaddi,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// BACK PANEL LAYOUT CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════

/** Get edge deductions based on enabled panels */
function getEdgeDeductions(
  panelsEnabled: { top: boolean; bottom: boolean; left: boolean; right: boolean; back: boolean },
  deduction: number
) {
  return {
    left: panelsEnabled.left ? deduction : 0,
    right: panelsEnabled.right ? deduction : 0,
    top: panelsEnabled.top ? deduction : 0,
    bottom: panelsEnabled.bottom ? deduction : 0,
  };
}

/**
 * Calculate back panel layout for wardrobe carcass
 * Computes post positions and individual panel widths based on
 * enabled panels and edge deductions
 *
 * @param widthMm - Total wardrobe width
 * @param heightMm - Total wardrobe height
 * @param _carcassT - Reserved for future use
 * @param postCount - Number of center posts
 * @param edgeDeduction - Deduction from enabled edges (mm)
 * @param panelsEnabled - Which panels are enabled
 * @param customPostPositions - Custom post X positions
 * @returns Layout with post positions, panel widths, and fit status
 */
export function calculateBackPanelLayout(
  widthMm: number,
  heightMm: number,
  _carcassT: number, // Reserved for future use
  postCount: number,
  edgeDeduction: number,
  panelsEnabled?: { top: boolean; bottom: boolean; left: boolean; right: boolean; back: boolean },
  customPostPositions?: number[]
): BackPanelLayout {
  const panels = panelsEnabled ?? { top: true, bottom: true, left: true, right: true, back: true };
  const deduct = getEdgeDeductions(panels, edgeDeduction);

  const backW = widthMm - deduct.left - deduct.right;
  const backH = heightMm - deduct.top - deduct.bottom;

  // No posts = single panel
  if (postCount === 0) {
    return {
      postPositions: [],
      panelWidths: [backW],
      panelFits: [fitsInSheet(backW, backH)],
      backH,
      backW,
    };
  }

  const postPositions: number[] = [];
  const panelWidths: number[] = [];
  const panelFits: boolean[] = [];

  // Custom positions or equal division
  if (customPostPositions?.length === postCount) {
    const sorted = [...customPostPositions].sort((a, b) => a - b);
    postPositions.push(...sorted);

    let prevX = 0;
    for (const pos of sorted) {
      const w = pos - prevX;
      panelWidths.push(Math.round(w));
      panelFits.push(fitsInSheet(w, backH));
      prevX = pos;
    }
    const lastW = backW - prevX;
    panelWidths.push(Math.round(lastW));
    panelFits.push(fitsInSheet(lastW, backH));
  } else {
    // Equal division
    const sectionCount = postCount + 1;
    const sectionW = Math.round(backW / sectionCount);

    for (let i = 1; i <= postCount; i++) {
      postPositions.push(Math.round((backW * i) / sectionCount));
    }
    for (let i = 0; i < sectionCount; i++) {
      panelWidths.push(sectionW);
      panelFits.push(fitsInSheet(sectionW, backH));
    }
  }

  return { postPositions, panelWidths, panelFits, backH, backW };
}

// ═══════════════════════════════════════════════════════════════════════════
// WARDROBE CARCASS PANEL GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate cutlist panels for wardrobe carcass
 *
 * User-friendly features:
 * - All dimensions validated and clamped to safe ranges
 * - Missing config values use sensible defaults
 * - Invalid post counts are corrected
 * - Empty material names get default "plywood"
 *
 * Panel formulas:
 * - Left/Right: D × H (full depth, full height)
 * - Top/Bottom: (W - 2T) × D (between sides)
 * - Back: Based on enabled panels and edge deductions
 * - Center Posts: D × (H - 2T) (between top & bottom)
 * - Shelves: Section width × (D - back - front deduction)
 */
function generateWardrobeCarcassPanels(config: ModuleConfig): ModuleCutlistPanel[] {
  const panels: ModuleCutlistPanel[] = [];

  // Safe extraction with defaults and validation
  const T = clamp(safe(config.carcassThicknessMm, DEFAULT_CARCASS_THICKNESS), 8, 50);
  const BT = clamp(safe(config.backPanelThicknessMm, DEFAULT_BACK_THICKNESS), 3, 25);
  const W = clamp(safe(config.widthMm, 1200), 300, 6000);
  const H = clamp(safe(config.heightMm, 2400), 300, 3000);
  const D = clamp(safe(config.depthMm, 560), 200, 900);
  const material = config.carcassMaterial || "plywood";
  const postCount = clamp(safe(config.centerPostCount, 0), 0, 10);
  const enabled = config.panelsEnabled ?? { top: true, bottom: true, left: true, right: true, back: true };

  // ─────────────────────────────────────────────────────────────────────────
  // 1. CARCASS PANELS (Left, Right, Top, Bottom)
  // ─────────────────────────────────────────────────────────────────────────

  if (enabled.left) {
    panels.push(makePanel("Left Side", D, H, T, 1, "carcass", material));
  }
  if (enabled.right) {
    panels.push(makePanel("Right Side", D, H, T, 1, "carcass", material));
  }
  if (enabled.top) {
    panels.push(makePanel("Top", W - T * 2, D, T, 1, "carcass", material));
  }
  if (enabled.bottom) {
    panels.push(makePanel("Bottom", W - T * 2, D, T, 1, "carcass", material));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. BACK PANELS
  // ─────────────────────────────────────────────────────────────────────────

  if (enabled.back) {
    const edgeDed = config.backPanelDeduction ?? DEFAULT_EDGE_DEDUCTION;
    const layout = calculateBackPanelLayout(W, H, T, postCount, edgeDed, enabled, config.centerPostPositions);
    const { panelWidths, backH } = layout;
    const backMaterial = `${material} ${BT}mm`;

    if (postCount === 0) {
      // Single back panel
      panels.push(makePanel("Back Panel", panelWidths[0], backH, BT, 1, "back", backMaterial));
    } else {
      // Multiple back panels - group by width if same
      const uniqueWidths = [...new Set(panelWidths)];
      if (uniqueWidths.length === 1) {
        panels.push(makePanel("Back Panel", uniqueWidths[0], backH, BT, postCount + 1, "back", backMaterial));
      } else {
        panelWidths.forEach((w, i) => {
          panels.push(makePanel(`Back Panel ${i + 1}`, w, backH, BT, 1, "back", backMaterial));
        });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. CENTER POSTS
  // ─────────────────────────────────────────────────────────────────────────

  if (postCount > 0) {
    panels.push(makePanel("Center Post", D, H - T * 2, T, postCount, "partition", material));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. SHELVES
  // ─────────────────────────────────────────────────────────────────────────

  if (config.sections?.length) {
    const shelfBack = config.shelfBackDeduction ?? DEFAULT_SHELF_BACK;
    const shelfFront = config.shelfFrontDeduction ?? DEFAULT_SHELF_FRONT;
    const shelfDepth = D - shelfBack - shelfFront;
    const sectionCount = postCount + 1;

    const { sectionWidths } = calculateSectionWidths({
      widthMm: W,
      carcassThicknessMm: T,
      centerPostCount: postCount,
      customPostPositions: config.centerPostPositions,
    });

    // Group shelves by width
    const shelfGroups = new Map<number, number>();
    for (let i = 0; i < config.sections.length && i < sectionCount; i++) {
      const section = config.sections[i];
      const count = section.shelfCount ?? 0;
      if (count > 0) {
        const w = Math.round(section.widthMm > 0 ? section.widthMm : sectionWidths[i]);
        shelfGroups.set(w, (shelfGroups.get(w) ?? 0) + count);
      }
    }

    // Add shelf panels
    if (shelfGroups.size === 1) {
      const [w, qty] = [...shelfGroups.entries()][0];
      panels.push(makePanel("Shelf", w, shelfDepth, T, qty, "shelf", material));
    } else {
      let idx = 1;
      shelfGroups.forEach((qty, w) => {
        panels.push(makePanel(`Shelf ${idx++}`, w, shelfDepth, T, qty, "shelf", material));
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. SKIRTING
  // ─────────────────────────────────────────────────────────────────────────

  if (config.skirtingEnabled) {
    const skirtH = config.skirtingHeightMm ?? 115;
    panels.push(makePanel("Skirting", W, skirtH, T, 1, "carcass", material));
  }

  return panels;
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERIC MODULE PANEL GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

/** Generate panels for section-specific components */
function generateSectionPanels(
  panels: ModuleCutlistPanel[],
  config: ModuleConfig,
  sectionW: number,
  sectionH: number,
  shelfDepth: number,
  label: string,
  section: NonNullable<ModuleConfig["sections"]>[0]
): void {
  const T = config.carcassThicknessMm ?? DEFAULT_CARCASS_THICKNESS;
  const BT = config.backPanelThicknessMm ?? DEFAULT_BACK_THICKNESS;
  const D = config.depthMm;
  const material = config.carcassMaterial;

  switch (section.type) {
    case "shelves":
    case "open": {
      const count = section.shelfCount ?? 4;
      if (count > 0) {
        panels.push(makePanel(`${label} Shelf`, sectionW - T, shelfDepth, T, count, "shelf", material));
      }
      break;
    }
    case "short_hang": {
      const count = section.shelfCount ?? 2;
      if (count > 0) {
        panels.push(makePanel(`${label} Shelf`, sectionW - T, shelfDepth, T, count, "shelf", material));
      }
      break;
    }
    case "drawers": {
      const count = section.drawerCount ?? 3;
      const drawerH = Math.round(sectionH / count);
      panels.push(makePanel(`${label} Drawer Front`, sectionW - 6, drawerH - 6, T, count, "drawer_front", config.shutterMaterial));
      panels.push(makePanel(`${label} Drawer Side`, D - T - 50, drawerH - 40, T, count * 2, "drawer_side", material));
      panels.push(makePanel(`${label} Drawer Bottom`, sectionW - 20, D - T - 50, BT, count, "drawer_bottom", material));
      break;
    }
    case "long_hang":
      // Rod only - no panels
      break;
  }
}

/**
 * Generate cutlist panels for any module type
 * Main entry point for panel generation
 *
 * User-friendly features:
 * - Handles missing or invalid config gracefully
 * - Returns empty array for completely invalid input
 * - All dimensions validated and clamped
 * - Works even with minimal config (just unitType)
 *
 * @param config - Module configuration with dimensions, materials, sections
 * @returns Array of panels for production cutlist (empty if config invalid)
 */
export function generateModuleCutlistPanels(config: ModuleConfig): ModuleCutlistPanel[] {
  // Guard: return empty array if no config
  if (!config) {
    return [];
  }

  // Wardrobe carcass has specialized generator
  if (config.unitType === "wardrobe_carcass") {
    return generateWardrobeCarcassPanels(config);
  }

  const panels: ModuleCutlistPanel[] = [];

  // Safe extraction with defaults
  const T = clamp(safe(config.carcassThicknessMm, DEFAULT_CARCASS_THICKNESS), 8, 50);
  const BT = clamp(safe(config.backPanelThicknessMm, DEFAULT_BACK_THICKNESS), 3, 25);
  const W = clamp(safe(config.widthMm, 1200), 300, 6000);
  const H = clamp(safe(config.heightMm, 2400), 300, 3000);
  const D = clamp(safe(config.depthMm, 560), 200, 900);
  const material = config.carcassMaterial || "plywood";

  // ─────────────────────────────────────────────────────────────────────────
  // 1. CARCASS PANELS
  // ─────────────────────────────────────────────────────────────────────────

  panels.push(makePanel("Top", W, D - T, T, 1, "carcass", material));
  panels.push(makePanel("Bottom", W, D - T, T, 1, "carcass", material));
  panels.push(makePanel("Left Side", D - T, H, T, 1, "carcass", material));
  panels.push(makePanel("Right Side", D - T, H, T, 1, "carcass", material));
  panels.push(makePanel("Back Panel", W, H, BT, 1, "back", material));

  // ─────────────────────────────────────────────────────────────────────────
  // 2. LOFT (optional)
  // ─────────────────────────────────────────────────────────────────────────

  const shelfBack = config.shelfBackDeduction ?? DEFAULT_SHELF_BACK;
  const shelfFront = config.shelfFrontDeduction ?? DEFAULT_SHELF_FRONT;
  const shelfDepth = D - shelfBack - shelfFront;

  if (config.loftEnabled && config.loftHeightMm > 0) {
    panels.push(makePanel("Loft Shelf", W - T * 2, shelfDepth, T, 1, "shelf", material));
    const loftDoors = Math.min(config.shutterCount || 3, 4);
    const loftW = Math.round((W - T * 2) / Math.max(1, loftDoors));
    panels.push(makePanel("Loft Shutter", loftW, config.loftHeightMm - T, T, loftDoors, "loft_shutter", config.shutterMaterial));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. PARTITIONS & SECTIONS
  // ─────────────────────────────────────────────────────────────────────────

  const sections = config.sections || [];
  const mainH = config.loftEnabled ? H - config.loftHeightMm : H;
  const innerW = W - T * 2;
  const sectionW = sections.length > 0 ? innerW / sections.length : innerW;
  const sectionH = mainH - T * 2;

  // Vertical partitions
  const partitionCount = Math.max(0, sections.length - 1);
  if (partitionCount > 0) {
    panels.push(makePanel("Partition", D - T, sectionH, T, partitionCount, "partition", material));
  }

  // Section panels
  sections.forEach((section, idx) => {
    const secW = section.widthMm > 0 ? section.widthMm : sectionW;
    generateSectionPanels(panels, config, secW, sectionH, shelfDepth, `S${idx + 1}`, section);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. SHUTTERS
  // ─────────────────────────────────────────────────────────────────────────

  // For wardrobe_carcass, shutters are only included when shutterEnabled is ON
  // For other types, use shutterCount > 0
  const shouldIncludeShutters = config.unitType === "wardrobe_carcass"
    ? config.shutterEnabled && config.shutterCount > 0
    : config.shutterCount > 0;

  if (shouldIncludeShutters) {
    // Shutter dimensions: Full wardrobe width / count
    // Height: Full height minus skirting (if enabled)
    const shutterW = Math.round(W / config.shutterCount);
    const skirtingDeduct = config.skirtingEnabled ? (config.skirtingHeightMm ?? 115) : 0;
    const shutterH = mainH - skirtingDeduct;
    panels.push(makePanel("Shutter", shutterW, shutterH, T, config.shutterCount, "shutter", config.shutterMaterial));
  }

  return panels;
}
