/**
 * Dimension Utilities
 *
 * Helper functions for dimension rendering.
 */

import { DIMENSION_COLOR, DIMENSION_FONT_FAMILY, MIN_FONT_SIZE, MAX_FONT_SIZE } from "./config";
import type { DimensionTextStyle } from "./types";

// =============================================================================
// TEXT STYLE HELPER
// =============================================================================

/**
 * Get unified text style for dimension rendering
 * Same style for ALL dimensions - no exceptions
 */
export function getTextStyle(fontSize: number): DimensionTextStyle {
  return {
    fontSize,
    fontWeight: "bold",
    fill: DIMENSION_COLOR,
    fontFamily: DIMENSION_FONT_FAMILY,
  };
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Clamp font size to valid range
 */
export function clampFontSize(size: number): number {
  return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, size));
}

/**
 * Check if font size is valid
 */
export function isValidFontSize(size: number): boolean {
  return size >= MIN_FONT_SIZE && size <= MAX_FONT_SIZE;
}

// =============================================================================
// LEGACY EXPORTS (for backwards compatibility)
// =============================================================================

/** @deprecated Use getTextStyle */
export const getDimensionTextStyle = getTextStyle;
