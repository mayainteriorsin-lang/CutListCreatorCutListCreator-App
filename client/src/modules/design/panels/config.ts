/**
 * Panels Configuration
 *
 * Constants for wardrobe panels, center posts, and shelves.
 * Single source of truth for IDs, labels, and settings.
 */

// =============================================================================
// PANEL IDS
// =============================================================================

/** Panel shape ID prefixes */
export const PANEL_IDS = {
  LEFT: "MOD-LEFT",
  RIGHT: "MOD-RIGHT",
  TOP: "MOD-TOP",
  BOTTOM: "MOD-BOTTOM",
  BACK: "MOD-BACK",
} as const;

/** Center post ID prefix */
export const POST_ID_PREFIX = "MOD-POST-";

/** Shelf ID prefix */
export const SHELF_ID_PREFIX = "MOD-SHELF-";

// =============================================================================
// PANEL LABELS
// =============================================================================

/** Human-readable panel labels */
export const PANEL_LABELS: Record<string, { key: string; label: string }> = {
  [PANEL_IDS.LEFT]: { key: "left", label: "Left Side" },
  [PANEL_IDS.RIGHT]: { key: "right", label: "Right Side" },
  [PANEL_IDS.TOP]: { key: "top", label: "Top Panel" },
  [PANEL_IDS.BOTTOM]: { key: "bottom", label: "Bottom Panel" },
  [PANEL_IDS.BACK]: { key: "back", label: "Back Panel" },
};

// =============================================================================
// NON-SELECTABLE SHAPES
// =============================================================================

/** Shapes that cannot be selected by clicking */
export const NON_SELECTABLE_IDS = new Set([PANEL_IDS.BACK]);

/** Shapes that are locked (no pointer events) */
export const LOCKED_SHAPE_IDS = new Set([PANEL_IDS.BACK]);

// =============================================================================
// DEFAULT PANEL STATE
// =============================================================================

/** Default enabled state for all panels */
export const DEFAULT_PANELS_ENABLED = {
  top: true,
  bottom: true,
  left: true,
  right: true,
  back: true,
} as const;

// =============================================================================
// CONSTRAINTS
// =============================================================================

/** Minimum gap from edges for center post movement */
export const MIN_EDGE_GAP = 100;

/** Default carcass thickness */
export const DEFAULT_CARCASS_THICKNESS = 18;

/** Copy offset when duplicating shapes */
export const COPY_OFFSET = 50;

// =============================================================================
// SECTION TYPES
// =============================================================================

/** Section type labels for context menu */
export const SECTION_TYPE_LABELS: Record<string, string> = {
  long_hang: "Long Hang",
  short_hang: "Short Hang",
  shelves: "Shelves",
  drawers: "Drawers",
  open: "Open",
};

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type PanelId = typeof PANEL_IDS[keyof typeof PANEL_IDS];
export type PanelKey = "left" | "right" | "top" | "bottom" | "back";
export type SectionType = keyof typeof SECTION_TYPE_LABELS;
