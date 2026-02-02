/**
 * Dimension Configuration
 *
 * SINGLE SOURCE OF TRUTH for all dimension styling.
 * ONE color, ONE font, ONE size system.
 */

// =============================================================================
// UNIFIED STYLE CONSTANTS
// =============================================================================

/** THE dimension color - dark slate for all dimension text */
export const DIMENSION_COLOR = "#1e293b";

/** Font family for all dimensions */
export const DIMENSION_FONT_FAMILY = "Arial, sans-serif";

/** Default font size */
export const DEFAULT_FONT_SIZE = 58;

/** Minimum allowed font size */
export const MIN_FONT_SIZE = 24;

/** Maximum allowed font size */
export const MAX_FONT_SIZE = 80;

// =============================================================================
// DROPDOWN OPTIONS
// =============================================================================

/** Available font sizes for toolbar dropdown */
export const FONT_SIZE_OPTIONS = [
  { value: 24, label: "24px" },
  { value: 32, label: "32px" },
  { value: 40, label: "40px" },
  { value: 48, label: "48px" },
  { value: 58, label: "58px" },
  { value: 64, label: "64px" },
  { value: 72, label: "72px" },
  { value: 80, label: "80px" },
] as const;

// =============================================================================
// LEGACY EXPORTS (for backwards compatibility)
// =============================================================================

/** @deprecated Use DIMENSION_COLOR */
export const DIMENSION_COLORS = { line: DIMENSION_COLOR };

/** @deprecated Use FONT_SIZE_OPTIONS */
export const DIMENSION_FONT_SIZES = FONT_SIZE_OPTIONS;

/** @deprecated Use DEFAULT_FONT_SIZE */
export const DEFAULT_DIMENSION_FONT_SIZE = DEFAULT_FONT_SIZE;
