/**
 * Dimension Types
 *
 * TypeScript type definitions for the dimension system.
 */

// =============================================================================
// TEXT STYLE TYPES
// =============================================================================

/** Unified text style for all dimensions */
export interface DimensionTextStyle {
  fontSize: number;
  fontWeight: "bold";
  fill: string;
  fontFamily: string;
}

// =============================================================================
// RENDER OPTIONS TYPES
// =============================================================================

/** Options for rendering inner dimensions */
export interface InnerDimensionsOptions {
  shapes: import("../types").Shape[];
  fontSize: number;
}

/** Options for rendering dimension shapes */
export interface DimensionShapeOptions {
  dimension: import("../types").DimensionShape;
  fontSize: number;
}

// =============================================================================
// SECTION TYPES
// =============================================================================

/** Section boundary for wardrobe */
export interface SectionBoundary {
  start: number;
  end: number;
  width: number;
}
