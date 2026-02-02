/**
 * useCanvas Hook
 *
 * Canvas interaction logic extracted from DesignCenter.
 * Wraps the canvas slice from the design store.
 *
 * Provides:
 * - gridSize, gridVisible (grid settings)
 * - zoom, zoomIn, zoomOut, resetZoom
 * - canvasSize, setCanvasSize
 * - panPosition, setPanPosition
 * - getSvgPoint (convert mouse to SVG coords)
 * - snapToGrid (snap a point to grid)
 */

import { useCallback, RefObject } from "react";
import { useDesignStore } from "../store/designStore";

/**
 * Hook for canvas operations
 * @returns Canvas state and actions
 */
export function useCanvas() {
  // State
  const gridSize = useDesignStore((state) => state.gridSize);
  const gridVisible = useDesignStore((state) => state.gridVisible);
  const zoom = useDesignStore((state) => state.zoom);
  const canvasSize = useDesignStore((state) => state.canvasSize);
  const panPosition = useDesignStore((state) => state.panPosition);

  // Actions from store
  const setGridSize = useDesignStore((state) => state.setGridSize);
  const setGridVisible = useDesignStore((state) => state.setGridVisible);
  const toggleGrid = useDesignStore((state) => state.toggleGrid);
  const setZoom = useDesignStore((state) => state.setZoom);
  const zoomIn = useDesignStore((state) => state.zoomIn);
  const zoomOut = useDesignStore((state) => state.zoomOut);
  const resetZoom = useDesignStore((state) => state.resetZoom);
  const setCanvasSize = useDesignStore((state) => state.setCanvasSize);
  const setPanPosition = useDesignStore((state) => state.setPanPosition);

  /**
   * Convert mouse event coordinates to SVG coordinates
   * @param e - Mouse event
   * @param svgRef - Reference to SVG element
   * @returns Point in SVG coordinate space, or null if conversion fails
   */
  const getSvgPoint = useCallback(
    (
      e: MouseEvent | React.MouseEvent,
      svgRef: RefObject<SVGSVGElement>
    ): { x: number; y: number } | null => {
      const svg = svgRef.current;
      if (!svg) return null;

      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;

      const ctm = svg.getScreenCTM();
      if (!ctm) return null;

      const svgPoint = pt.matrixTransform(ctm.inverse());
      return { x: svgPoint.x, y: svgPoint.y };
    },
    []
  );

  /**
   * Snap a point to the grid
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Snapped point
   */
  const snapToGrid = useCallback(
    (x: number, y: number): { x: number; y: number } => {
      return {
        x: Math.round(x / gridSize) * gridSize,
        y: Math.round(y / gridSize) * gridSize,
      };
    },
    [gridSize]
  );

  /**
   * Snap a value to the grid
   * @param value - Value to snap
   * @returns Snapped value
   */
  const snapValue = useCallback(
    (value: number): number => {
      return Math.round(value / gridSize) * gridSize;
    },
    [gridSize]
  );

  /**
   * Check if a point is within the canvas bounds
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns True if point is within bounds
   */
  const isWithinBounds = useCallback(
    (x: number, y: number): boolean => {
      return x >= 0 && x <= canvasSize.w && y >= 0 && y <= canvasSize.h;
    },
    [canvasSize]
  );

  /**
   * Clamp a point to canvas bounds
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Clamped point
   */
  const clampToBounds = useCallback(
    (x: number, y: number): { x: number; y: number } => {
      return {
        x: Math.max(0, Math.min(canvasSize.w, x)),
        y: Math.max(0, Math.min(canvasSize.h, y)),
      };
    },
    [canvasSize]
  );

  /**
   * Convert canvas coordinates to screen coordinates
   * @param x - Canvas X coordinate
   * @param y - Canvas Y coordinate
   * @returns Screen coordinates
   */
  const canvasToScreen = useCallback(
    (x: number, y: number): { x: number; y: number } => {
      return {
        x: (x + panPosition.x) * zoom,
        y: (y + panPosition.y) * zoom,
      };
    },
    [zoom, panPosition]
  );

  /**
   * Convert screen coordinates to canvas coordinates
   * @param x - Screen X coordinate
   * @param y - Screen Y coordinate
   * @returns Canvas coordinates
   */
  const screenToCanvas = useCallback(
    (x: number, y: number): { x: number; y: number } => {
      return {
        x: x / zoom - panPosition.x,
        y: y / zoom - panPosition.y,
      };
    },
    [zoom, panPosition]
  );

  /**
   * Zoom to fit content in viewport
   * @param viewportWidth - Viewport width
   * @param viewportHeight - Viewport height
   * @param padding - Padding around content (default: 50)
   */
  const zoomToFit = useCallback(
    (viewportWidth: number, viewportHeight: number, padding: number = 50) => {
      const scaleX = (viewportWidth - padding * 2) / canvasSize.w;
      const scaleY = (viewportHeight - padding * 2) / canvasSize.h;
      const newZoom = Math.min(scaleX, scaleY, 1); // Don't zoom in past 100%

      setZoom(newZoom);
      setPanPosition({
        x: (viewportWidth / newZoom - canvasSize.w) / 2,
        y: (viewportHeight / newZoom - canvasSize.h) / 2,
      });
    },
    [canvasSize, setZoom, setPanPosition]
  );

  return {
    // State
    gridSize,
    gridVisible,
    zoom,
    canvasSize,
    panPosition,

    // Actions
    setGridSize,
    setGridVisible,
    toggleGrid,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    setCanvasSize,
    setPanPosition,

    // Utility functions
    getSvgPoint,
    snapToGrid,
    snapValue,
    isWithinBounds,
    clampToBounds,
    canvasToScreen,
    screenToCanvas,
    zoomToFit,
  };
}

export default useCanvas;
