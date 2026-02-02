/**
 * Dimensions Module - Main Export
 *
 * UNIFIED dimension system for the design module.
 * ONE color, ONE font, ONE size - controlled by dropdown.
 *
 * Architecture:
 * ├── config.ts      - Constants (color, font, sizes)
 * ├── types.ts       - TypeScript types
 * ├── utils.ts       - Helper functions
 * ├── renderers/     - React components
 * │   ├── InnerDimensions.tsx
 * │   └── DimensionShape.tsx
 * └── index.ts       - This file (barrel export)
 */

// =============================================================================
// CONFIG
// =============================================================================

export {
  // Primary exports
  DIMENSION_COLOR,
  DIMENSION_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  FONT_SIZE_OPTIONS,
  // Legacy exports (backwards compatibility)
  DIMENSION_COLORS,
  DIMENSION_FONT_SIZES,
  DEFAULT_DIMENSION_FONT_SIZE,
} from "./config";

// =============================================================================
// TYPES
// =============================================================================

export type {
  DimensionTextStyle,
  InnerDimensionsOptions,
  DimensionShapeOptions,
  SectionBoundary,
} from "./types";

// =============================================================================
// UTILS
// =============================================================================

export {
  getTextStyle,
  clampFontSize,
  isValidFontSize,
  // Legacy export
  getDimensionTextStyle,
} from "./utils";

// =============================================================================
// RENDERERS
// =============================================================================

export {
  InnerDimensions,
  renderInnerDimensions,
  DimensionShapeRenderer,
  renderDimension,
} from "./renderers";
