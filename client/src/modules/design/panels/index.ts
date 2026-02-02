/**
 * Panels Module - Main Export
 *
 * UNIFIED panel system for the design module.
 * Handles wardrobe panels, center posts, and shelves.
 *
 * Architecture:
 * ├── config.ts      - Constants (IDs, labels, constraints)
 * ├── types.ts       - TypeScript types
 * ├── utils/         - Helper functions
 * │   ├── detection.ts   - Shape type detection
 * │   ├── bounds.ts      - Bounds calculation
 * │   ├── hitTest.ts     - Hit testing
 * │   └── index.ts       - Barrel export
 * ├── hooks/         - React hooks
 * │   ├── useShapeActions.ts
 * │   └── index.ts
 * ├── components/    - React components
 * │   ├── PanelOverlay.tsx
 * │   ├── CenterPostOverlay.tsx
 * │   ├── ShelfOverlay.tsx
 * │   ├── ShelfContextMenu.tsx
 * │   └── index.ts
 * └── index.ts       - This file (barrel export)
 */

// =============================================================================
// CONFIG
// =============================================================================

export {
  // Panel IDs
  PANEL_IDS,
  POST_ID_PREFIX,
  SHELF_ID_PREFIX,
  // Labels
  PANEL_LABELS,
  SECTION_TYPE_LABELS,
  // Constraints
  NON_SELECTABLE_IDS,
  LOCKED_SHAPE_IDS,
  DEFAULT_PANELS_ENABLED,
  MIN_EDGE_GAP,
  DEFAULT_CARCASS_THICKNESS,
  COPY_OFFSET,
} from "./config";

export type { PanelId, PanelKey, SectionType } from "./config";

// =============================================================================
// TYPES
// =============================================================================

export type {
  PanelInfo,
  PanelsEnabled,
  PostInfo,
  ShelfIdInfo,
  ShelfInfo,
  ShelfBounds,
  CarcassBounds,
  CarcassPanels,
  SectionBoundary,
  ShapeType,
  ActionMode,
  ShapeActionsConfig,
  ShapeActions,
} from "./types";

// =============================================================================
// UTILS
// =============================================================================

export {
  // Detection
  isCenterPost,
  isShelf,
  isPanel,
  getPostIndex,
  parseShelfId,
  getPanelInfo,
  isDraggableCenterPost,
  isDraggableShelf,
  getCenterPosts,
  getShelves,
  // Bounds
  getShelfBounds,
  getCarcassBounds,
  getCarcassPanels,
  buildSectionBoundaries,
  // Hit testing
  hitTestShapes,
  isPointInRect,
  detectEdge,
  EDGE_THRESHOLD,
} from "./utils";

export type { EdgeType } from "./utils";

// =============================================================================
// HOOKS
// =============================================================================

export { useShapeActions } from "./hooks";

// =============================================================================
// COMPONENTS
// =============================================================================

export {
  PanelOverlay,
  CenterPostOverlay,
  ShelfOverlay,
  ShelfContextMenu,
} from "./components";

export type { ShelfContextMenuProps } from "./components";
