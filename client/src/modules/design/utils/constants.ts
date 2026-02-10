/**
 * Design Module - Constants
 *
 * Central location for all design module constants.
 * Extracted from DesignCenter.tsx and moduleShapeGenerator.ts
 */

import type { ComponentTemplate } from "../types";

// =============================================================================
// SNAP SETTINGS
// =============================================================================

/** Pixel threshold for snapping to other objects */
export const SNAP_THRESHOLD = 10;

/** Default grid snap size in mm */
export const DEFAULT_GRID_SIZE = 10;

/** Pixel threshold for edge detection (resize handles) */
export const EDGE_THRESHOLD = 8;

/** Angle snap increment in degrees (for 45-degree snapping) */
export const ANGLE_SNAP_INCREMENT = 45;

// =============================================================================
// CANVAS SETTINGS
// =============================================================================

/** Default canvas dimensions in mm (large to allow panning) */
export const DEFAULT_CANVAS_SIZE = { w: 100000, h: 100000 };

/** Default zoom level */
export const DEFAULT_ZOOM = 1;

/** Minimum zoom level */
export const MIN_ZOOM = 0.2;

/** Maximum zoom level */
export const MAX_ZOOM = 1.5;

/** Padding around module when auto-centering (mm) */
export const MODULE_PADDING = 150;

/** Canvas margin for auto-fit calculations (mm) */
export const CANVAS_MARGIN = 100;

// =============================================================================
// LINE DEFAULTS
// =============================================================================

/** Default line thickness in mm (matches 18mm ply) */
export const DEFAULT_LINE_THICKNESS = 18;

/** Default line color (black) */
export const DEFAULT_LINE_COLOR = "#000000";

/** Default line marker type */
export const DEFAULT_LINE_MARKER: "none" | "arrow" | "circle" = "none";

// =============================================================================
// MODULE DEFAULTS
// =============================================================================

/** Default module width for calculations */
export const DEFAULT_WIDTH_VALUE = 200;

/** Default width reduction (for inner dimension calculations) */
export const DEFAULT_WIDTH_REDUCTION = 36;

/** Default module depth in mm */
export const DEFAULT_DEPTH = 560;

/** Default carcass panel thickness in mm */
export const DEFAULT_CARCASS_THICKNESS = 18;

/** Default back panel thickness in mm */
export const DEFAULT_BACK_PANEL_THICKNESS = 8;

/** Default back panel deduction in mm */
export const DEFAULT_BACK_PANEL_DEDUCTION = 36;

/** Minimum gap between adjacent modules (mm) */
export const MIN_MODULE_GAP = 100;

// =============================================================================
// 3D PREVIEW DEFAULTS
// =============================================================================

/** Default 3D preview rotation angles */
export const DEFAULT_PREVIEW_ROTATION = { x: 30, y: -45 };

// =============================================================================
// KEYBOARD SHORTCUTS
// =============================================================================

/** Arrow key movement step (normal) */
export const ARROW_STEP_NORMAL = 1;

/** Arrow key movement step (with Shift) */
export const ARROW_STEP_SHIFT = 10;

// =============================================================================
// COLORS - AutoCAD/DXF Style
// NOTE: Dimension colors are now in ../dimensions/dimensionConfig.ts
// =============================================================================

/** Default entity color - cyan (AutoCAD layer 0) */
export const CYAN = "#00e5ff";

/** White entities for dark background */
export const WHITE = "#e0e0e0";

/** Canvas background color */
export const CANVAS_BACKGROUND = "#ffffff";

/** Grid fine pattern fill */
export const GRID_FINE_COLOR = "#999";

/** Grid medium pattern color */
export const GRID_MEDIUM_COLOR = "#777";

/** Ruler text color */
export const RULER_TEXT_COLOR = "#666";

/** Ruler line color */
export const RULER_LINE_COLOR = "#555";

/** Origin X-axis color (red) */
export const ORIGIN_X_COLOR = "#c00";

/** Origin Y-axis color (green) */
export const ORIGIN_Y_COLOR = "#0c0";

// =============================================================================
// LINE WEIGHT PRESETS (AutoCAD Convention)
// =============================================================================

/** Carcass outer walls - thick white lines */
export const CARCASS_STYLE = { color: "#e0e0e0", thickness: 3 };

/** Internal partitions - medium gray lines */
export const PARTITION_STYLE = { color: "#b0b0b0", thickness: 2 };

/** Fittings (shelves, rods) - thin gray lines */
export const FITTING_STYLE = { color: "#808080", thickness: 1 };

/** Handle accents - cyan lines */
export const HANDLE_STYLE = { color: "#00e5ff", thickness: 2.5 };

/** Hatch/detail lines - very thin dark gray */
export const HATCH_STYLE = { color: "#555", thickness: 0.5 };

// =============================================================================
// SELECTION COLORS
// =============================================================================

/** Selection highlight color */
export const SELECTION_COLOR = "#2196f3";

/** Hover highlight color */
export const HOVER_COLOR = "#64b5f6";

/** Alignment guide color */
export const GUIDE_COLOR = "#ff4081";

// =============================================================================
// COMPONENT LIBRARY
// =============================================================================

/**
 * Pre-built component templates for drag-and-drop placement
 * Each template defines shapes that form a furniture component
 */
export const COMPONENT_LIBRARY: ComponentTemplate[] = [
  {
    id: "shelf",
    name: "Shelf",
    icon: "shelf-icon",
    category: "cabinet",
    width: 400,
    height: 18,
    shapes: [{ type: "rect", x: 0, y: 0, w: 400, h: 18 }]
  },
  {
    id: "drawer-box",
    name: "Drawer Box",
    icon: "drawer-icon",
    category: "cabinet",
    width: 450,
    height: 150,
    shapes: [
      { type: "rect", x: 0, y: 0, w: 450, h: 150 },
      { type: "line", x1: 10, y1: 10, x2: 440, y2: 10 },
      { type: "line", x1: 10, y1: 140, x2: 440, y2: 140 }
    ]
  },
  {
    id: "door-panel",
    name: "Door Panel",
    icon: "door-icon",
    category: "cabinet",
    width: 400,
    height: 700,
    shapes: [
      { type: "rect", x: 0, y: 0, w: 400, h: 700 },
      { type: "rect", x: 20, y: 20, w: 360, h: 660 }
    ]
  },
  {
    id: "hinge",
    name: "Hinge",
    icon: "hinge-icon",
    category: "hardware",
    width: 35,
    height: 48,
    shapes: [
      { type: "rect", x: 0, y: 0, w: 35, h: 48 },
      { type: "line", x1: 17, y1: 0, x2: 17, y2: 48 }
    ]
  },
  {
    id: "handle-bar",
    name: "Handle Bar",
    icon: "handle-icon",
    category: "hardware",
    width: 160,
    height: 12,
    shapes: [
      { type: "rect", x: 0, y: 0, w: 160, h: 12 },
      { type: "line", x1: 20, y1: 6, x2: 140, y2: 6 }
    ]
  },
  {
    id: "knob",
    name: "Knob",
    icon: "knob-icon",
    category: "hardware",
    width: 32,
    height: 32,
    shapes: [{ type: "rect", x: 0, y: 0, w: 32, h: 32 }]
  },
  {
    id: "rail-slide",
    name: "Drawer Slide",
    icon: "slide-icon",
    category: "accessory",
    width: 450,
    height: 45,
    shapes: [
      { type: "rect", x: 0, y: 0, w: 450, h: 45 },
      { type: "line", x1: 0, y1: 22, x2: 450, y2: 22 }
    ]
  },
  {
    id: "corner-bracket",
    name: "Corner Bracket",
    icon: "bracket-icon",
    category: "accessory",
    width: 50,
    height: 50,
    shapes: [
      { type: "line", x1: 0, y1: 0, x2: 50, y2: 0 },
      { type: "line", x1: 0, y1: 0, x2: 0, y2: 50 },
      { type: "line", x1: 0, y1: 50, x2: 50, y2: 0 }
    ]
  }
];

// =============================================================================
// COMPONENT CATEGORIES
// =============================================================================

/** Available component filter categories */
export const COMPONENT_CATEGORIES = ["all", "cabinet", "hardware", "accessory"] as const;

export type ComponentCategory = typeof COMPONENT_CATEGORIES[number];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Generate unique ID with optional prefix
 * @param prefix - Optional prefix for the ID (e.g., "line", "rect")
 * @returns Unique string ID
 */
export const uid = (prefix = ""): string =>
  `${prefix}${Math.random().toString(36).slice(2, 9)}`;

/**
 * Snap value to grid
 * @param value - Value to snap
 * @param gridSize - Grid size (defaults to DEFAULT_GRID_SIZE)
 * @returns Snapped value
 */
export const snapToGrid = (value: number, gridSize = DEFAULT_GRID_SIZE): number =>
  Math.round(value / gridSize) * gridSize;

/**
 * Snap angle to nearest increment
 * @param angle - Angle in degrees
 * @param increment - Snap increment (defaults to ANGLE_SNAP_INCREMENT)
 * @returns Snapped angle
 */
export const snapAngle = (angle: number, increment = ANGLE_SNAP_INCREMENT): number =>
  Math.round(angle / increment) * increment;

/**
 * Calculate angle between two points
 * @returns Angle in degrees (0-360)
 */
export const getAngle = (x1: number, y1: number, x2: number, y2: number): number =>
  Math.round(Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI) % 360;

// =============================================================================
// WARDROBE SECTION DEFAULTS
// =============================================================================

/** Wardrobe section type options */
export const WARDROBE_SECTION_TYPES = [
  "long_hang",   // Full-height hanging rod
  "short_hang",  // Short hanging rod with shelves below
  "shelves",     // Horizontal shelves
  "drawers",     // Stacked drawers with handles
  "open"         // Empty open section
] as const;

export type WardrobeSectionType = typeof WARDROBE_SECTION_TYPES[number];

/** Default wardrobe section configuration */
export interface WardrobeSection {
  type: WardrobeSectionType;
  widthMm: number;        // 0 = auto-calculated (equal split)
  shelfCount?: number;    // For "shelves" and "short_hang"
  drawerCount?: number;   // For "drawers"
  rodHeightPct?: number;  // For "short_hang" - % of section height for rod area
  postsBelow?: number;    // Number of partial posts below a specific shelf
}

/** Default wardrobe sections layout */
export const DEFAULT_WARDROBE_SECTIONS: WardrobeSection[] = [
  { type: "long_hang", widthMm: 0 },
  { type: "shelves", widthMm: 0, shelfCount: 4 },
  { type: "drawers", widthMm: 0, drawerCount: 3 },
  { type: "shelves", widthMm: 0, shelfCount: 3 },
  { type: "short_hang", widthMm: 0, rodHeightPct: 60, shelfCount: 2 }
];

// =============================================================================
// HISTORY SETTINGS
// =============================================================================

/** Maximum number of undo/redo history entries */
export const MAX_HISTORY_SIZE = 50;

/** Initial history index (before any actions) */
export const INITIAL_HISTORY_INDEX = -1;

// =============================================================================
// DXF IMPORT SETTINGS
// =============================================================================

/** Padding around imported DXF content (mm) */
export const DXF_IMPORT_PADDING = 1000;

/** Default DXF line color when not specified */
export const DXF_DEFAULT_COLOR = "#000000";

// =============================================================================
// EXPORT SETTINGS
// =============================================================================

/** PNG export background color */
export const EXPORT_BACKGROUND = "#ffffff";

/** SVG export MIME type */
export const SVG_MIME_TYPE = "image/svg+xml;charset=utf-8";

/** PNG export MIME type */
export const PNG_MIME_TYPE = "image/png";

// =============================================================================
// SECTION WIDTH CALCULATION (shared by shapeGenerator & panelGenerator)
// =============================================================================

/** Configuration for section width calculation */
export interface SectionWidthConfig {
  /** Total wardrobe width in mm */
  widthMm: number;
  /** Carcass panel thickness in mm (typically 18 or 25) */
  carcassThicknessMm: number;
  /** Number of center posts (0 = no posts, single section) */
  centerPostCount: number;
  /** Optional custom post X positions (relative to inner left edge) */
  customPostPositions?: number[];
}

/** Result of section width calculation */
export interface SectionWidthResult {
  /** Inner width (total width minus left and right panels) */
  innerWidth: number;
  /** Width of each section between posts */
  sectionWidths: number[];
  /** X position of each post (relative to inner left edge) */
  postPositions: number[];
}

/** Ensure number is valid and within range */
function safeNumber(value: number | undefined, defaultVal: number, min = 0, max = 10000): number {
  if (value === undefined || value === null || isNaN(value)) return defaultVal;
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate section widths for wardrobe carcass
 *
 * User-friendly features:
 * - Auto-corrects invalid inputs (negative, NaN, undefined)
 * - Limits post count to reasonable maximum (10)
 * - Ensures minimum section width (50mm)
 * - Filters invalid custom positions automatically
 *
 * @param config - Width, thickness, post count, and optional custom positions
 * @returns Inner width, section widths array, and post positions array
 *
 * @example
 * // Equal 3 sections (2 posts)
 * calculateSectionWidths({ widthMm: 2400, carcassThicknessMm: 18, centerPostCount: 2 })
 *
 * @example
 * // Custom positions (unequal sections)
 * calculateSectionWidths({ widthMm: 2400, carcassThicknessMm: 18, centerPostCount: 1, customPostPositions: [800] })
 */
export function calculateSectionWidths(config: SectionWidthConfig): SectionWidthResult {
  // Safe defaults for all inputs
  const width = safeNumber(config.widthMm, 1200, 200, 6000);
  const thickness = safeNumber(config.carcassThicknessMm, 18, 8, 50);
  const postCount = safeNumber(config.centerPostCount, 0, 0, 10);

  // Calculate inner width (between left and right panels)
  const innerWidth = Math.max(100, width - thickness * 2);
  const sectionCount = postCount + 1;

  // No posts = single full-width section
  if (postCount === 0) {
    return {
      innerWidth,
      sectionWidths: [innerWidth],
      postPositions: [],
    };
  }

  const postPositions: number[] = [];
  const sectionWidths: number[] = [];

  // Custom positions: validate and use provided X coordinates
  const customPositions = config.customPostPositions;
  if (customPositions?.length === postCount) {
    // Filter valid positions (within inner width, positive)
    const validPositions = customPositions
      .filter(p => typeof p === "number" && !isNaN(p) && p > 0 && p < innerWidth)
      .sort((a, b) => a - b);

    // Use custom if all valid, otherwise fall through to equal division
    if (validPositions.length === postCount) {
      postPositions.push(...validPositions);

      let previousX = 0;
      for (const position of validPositions) {
        sectionWidths.push(Math.max(50, position - previousX)); // Min 50mm section
        previousX = position;
      }
      sectionWidths.push(Math.max(50, innerWidth - previousX));

      return { innerWidth, sectionWidths, postPositions };
    }
  }

  // Equal division: evenly space posts and sections
  const totalPostThickness = postCount * thickness;
  const availableWidth = innerWidth - totalPostThickness;
  const equalSectionWidth = Math.max(50, availableWidth / sectionCount);

  for (let i = 1; i <= postCount; i++) {
    const position = equalSectionWidth * i + thickness * (i - 1);
    postPositions.push(Math.round(position));
  }

  for (let i = 0; i < sectionCount; i++) {
    sectionWidths.push(Math.round(equalSectionWidth));
  }

  return { innerWidth, sectionWidths, postPositions };
}
