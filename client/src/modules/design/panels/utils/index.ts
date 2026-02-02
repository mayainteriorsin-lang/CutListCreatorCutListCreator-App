/**
 * Panel Utils - Barrel Export
 */

// Detection
export {
  isPanel,
  getPanelInfo,
  isCenterPost,
  isDraggableCenterPost,
  getPostIndex,
  getCenterPosts,
  isShelf,
  isDraggableShelf,
  parseShelfId,
  getShelves,
} from "./detection";

// Bounds
export {
  getCarcassPanels,
  buildSectionBoundaries,
  getShelfBounds,
  getCarcassBounds,
} from "./bounds";

// Hit Test
export {
  EDGE_THRESHOLD,
  detectEdge,
  hitTestShapes,
  isPointInRect,
} from "./hitTest";

export type { EdgeType } from "./hitTest";
