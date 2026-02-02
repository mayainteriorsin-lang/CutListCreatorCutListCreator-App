/**
 * useShapes Hook
 *
 * Shape operations extracted from DesignCenter.
 * Wraps the shapes slice from the design store.
 *
 * Provides:
 * - shapes (array of all shapes)
 * - selectedId / selectedIds (selection state)
 * - addShape
 * - updateShape
 * - deleteShape
 * - deleteSelectedShapes
 * - setSelectedId / setSelectedIds
 * - addToSelection / removeFromSelection
 * - clearSelection / selectAll
 * - hitTest (find shape at point)
 */

import { useCallback } from "react";
import { useDesignStore } from "../store/designStore";
import type { Shape, Id } from "../types";

/**
 * Hook for shape operations
 * @returns Shape state and actions
 */
export function useShapes() {
  // State
  const shapes = useDesignStore((state) => state.shapes);
  const selectedId = useDesignStore((state) => state.selectedId);
  const selectedIds = useDesignStore((state) => state.selectedIds);
  const temp = useDesignStore((state) => state.temp);
  const isDragging = useDesignStore((state) => state.isDragging);
  const hoveredPanelId = useDesignStore((state) => state.hoveredPanelId);
  const hoveredEdge = useDesignStore((state) => state.hoveredEdge);

  // Actions from store
  const setShapes = useDesignStore((state) => state.setShapes);
  const addShape = useDesignStore((state) => state.addShape);
  const updateShape = useDesignStore((state) => state.updateShape);
  const deleteShape = useDesignStore((state) => state.deleteShape);
  const deleteSelectedShapes = useDesignStore((state) => state.deleteSelectedShapes);
  const setSelectedId = useDesignStore((state) => state.setSelectedId);
  const setSelectedIds = useDesignStore((state) => state.setSelectedIds);
  const addToSelection = useDesignStore((state) => state.addToSelection);
  const removeFromSelection = useDesignStore((state) => state.removeFromSelection);
  const clearSelection = useDesignStore((state) => state.clearSelection);
  const selectAll = useDesignStore((state) => state.selectAll);
  const setTemp = useDesignStore((state) => state.setTemp);
  const setIsDragging = useDesignStore((state) => state.setIsDragging);
  const setHoveredPanelId = useDesignStore((state) => state.setHoveredPanelId);
  const setHoveredEdge = useDesignStore((state) => state.setHoveredEdge);
  const clearAll = useDesignStore((state) => state.clearAll);

  /**
   * Hit test - find shape at given point
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param tolerance - Hit tolerance in pixels (default: 5)
   * @returns The shape at the point, or null
   */
  const hitTest = useCallback(
    (x: number, y: number, tolerance: number = 5): Shape | null => {
      // Test in reverse order (top shapes first)
      for (let i = shapes.length - 1; i >= 0; i--) {
        const shape = shapes[i];

        if (shape.type === "rect") {
          const r = shape;
          if (x >= r.x - tolerance && x <= r.x + r.w + tolerance &&
              y >= r.y - tolerance && y <= r.y + r.h + tolerance) {
            return shape;
          }
        } else if (shape.type === "line") {
          const l = shape;
          // Point-to-line distance check
          const dx = l.x2 - l.x1;
          const dy = l.y2 - l.y1;
          const length = Math.sqrt(dx * dx + dy * dy);

          if (length === 0) {
            // Line is a point
            const dist = Math.sqrt((x - l.x1) ** 2 + (y - l.y1) ** 2);
            if (dist <= tolerance) return shape;
          } else {
            // Parametric distance along line
            const t = Math.max(0, Math.min(1,
              ((x - l.x1) * dx + (y - l.y1) * dy) / (length * length)
            ));
            const projX = l.x1 + t * dx;
            const projY = l.y1 + t * dy;
            const dist = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);
            if (dist <= tolerance) return shape;
          }
        } else if (shape.type === "dimension") {
          const d = shape;
          // Simple bounding box for dimensions
          const minX = Math.min(d.x1, d.x2) - tolerance;
          const maxX = Math.max(d.x1, d.x2) + tolerance;
          const minY = Math.min(d.y1, d.y2) - tolerance;
          const maxY = Math.max(d.y1, d.y2) + tolerance;
          if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
            return shape;
          }
        }
      }
      return null;
    },
    [shapes]
  );

  /**
   * Get shape by ID
   * @param id - Shape ID
   * @returns The shape or null
   */
  const getShapeById = useCallback(
    (id: Id | null): Shape | null => {
      if (!id) return null;
      return shapes.find((s) => s.id === id) ?? null;
    },
    [shapes]
  );

  /**
   * Get all selected shapes
   * @returns Array of selected shapes
   */
  const getSelectedShapes = useCallback((): Shape[] => {
    const ids = new Set(selectedIds);
    if (selectedId) ids.add(selectedId);
    return shapes.filter((s) => ids.has(s.id));
  }, [shapes, selectedId, selectedIds]);

  /**
   * Check if a shape is selected
   * @param id - Shape ID
   * @returns True if selected
   */
  const isSelected = useCallback(
    (id: Id): boolean => {
      return selectedId === id || selectedIds.has(id);
    },
    [selectedId, selectedIds]
  );

  /**
   * Check if any shapes are selected
   * @returns True if any shapes are selected
   */
  const hasSelection = useCallback((): boolean => {
    return selectedId !== null || selectedIds.size > 0;
  }, [selectedId, selectedIds]);

  return {
    // State
    shapes,
    selectedId,
    selectedIds,
    temp,
    isDragging,
    hoveredPanelId,
    hoveredEdge,

    // Actions
    setShapes,
    addShape,
    updateShape,
    deleteShape,
    deleteSelectedShapes,
    setSelectedId,
    setSelectedIds,
    addToSelection,
    removeFromSelection,
    clearSelection,
    selectAll,
    setTemp,
    setIsDragging,
    setHoveredPanelId,
    setHoveredEdge,
    clearAll,

    // Utility functions
    hitTest,
    getShapeById,
    getSelectedShapes,
    isSelected,
    hasSelection,
  };
}

export default useShapes;
