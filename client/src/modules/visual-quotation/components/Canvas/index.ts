/**
 * Canvas Module Exports
 *
 * Re-exports the decomposed canvas components while maintaining
 * backwards compatibility with existing imports.
 */

// Main component (default export for backwards compatibility)
export { default } from "./CanvasStageRoot";
export { default as CanvasStage } from "./CanvasStageRoot";

// Sub-components
export { CanvasToolbar } from "./CanvasToolbar";
export { CanvasDrawingLayer } from "./CanvasDrawingLayer";

// Hooks
export { useCanvasInteractions } from "./hooks/useCanvasInteractions";

// Utilities
export {
  captureCanvasImage,
  captureCanvasRegion,
  setGlobalStageRef,
  setGridGroupRef,
  getViewModeTransform,
} from "./canvasUtils";
