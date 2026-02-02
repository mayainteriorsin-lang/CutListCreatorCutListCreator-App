/**
 * useShapeActions Hook
 *
 * Unified hook for shape manipulation actions (copy, move, edit, delete).
 * Works with panels, center posts, and shelves.
 */

import { useCallback } from "react";
import { useDesignStore } from "../../store/designStore";
import { COPY_OFFSET, DEFAULT_PANELS_ENABLED } from "../config";
import type { ShapeActionsConfig, ShapeActions } from "../types";
import type { RectShape } from "../../types";
import type { ModuleConfig } from "../../engine/shapeGenerator";

/**
 * Hook providing unified shape manipulation actions
 */
export function useShapeActions(config: ShapeActionsConfig): ShapeActions {
  const {
    shapes,
    moduleConfig,
    setActionMode,
    setMode,
    setShowModulePanel,
    setModuleConfig,
    regenerateModuleShapes,
    pushHistory,
    setShapes,
    setSelectedId,
    setSelectedIds,
    deleteShape,
  } = useDesignStore();

  const { selectedId, shapeType, panelKey } = config;
  const selectedShape = selectedId ? shapes.find(s => s.id === selectedId) : null;

  /**
   * Copy the selected shape with offset
   */
  const handleCopy = useCallback(() => {
    if (!selectedShape || selectedShape.type !== "rect") return;

    setActionMode("copy");
    const rect = selectedShape as RectShape;
    const newId = `${selectedShape.id}-COPY-${Date.now()}`;
    const newShape: RectShape = {
      ...rect,
      id: newId,
      x: rect.x + COPY_OFFSET,
    };

    const newShapes = [...shapes, newShape];
    const description = shapeType === "centerPost"
      ? "Copy Center Post"
      : shapeType === "panel"
        ? `Copy ${panelKey || "Panel"}`
        : shapeType === "shelf"
          ? "Copy Shelf"
          : "Copy shape";

    pushHistory(newShapes, description);
    setShapes(newShapes);
    setSelectedId(newId);
    setSelectedIds(new Set([newId]));
    setTimeout(() => setActionMode(null), 500);
  }, [selectedShape, shapes, shapeType, panelKey, setActionMode, pushHistory, setShapes, setSelectedId, setSelectedIds]);

  /**
   * Enter move mode
   */
  const handleMove = useCallback(() => {
    setActionMode("move");
    setMode("move");
  }, [setActionMode, setMode]);

  /**
   * Open module config panel for editing
   */
  const handleEdit = useCallback(() => {
    setActionMode(null);
    setShowModulePanel(true);
  }, [setActionMode, setShowModulePanel]);

  /**
   * Delete the selected shape (type-specific behavior)
   */
  const handleDelete = useCallback(() => {
    setActionMode("delete");

    if (shapeType === "panel" && panelKey && moduleConfig) {
      // Panel delete: disable in moduleConfig
      const currentPanels = moduleConfig.panelsEnabled ?? DEFAULT_PANELS_ENABLED;
      const updatedPanels = { ...currentPanels, [panelKey]: false };
      const updatedConfig: ModuleConfig = { ...moduleConfig, panelsEnabled: updatedPanels };
      setModuleConfig(updatedConfig);
      regenerateModuleShapes(updatedConfig);
      setSelectedId(null);
      setSelectedIds(new Set());
    } else if (shapeType === "centerPost" && moduleConfig) {
      // Center post delete: reduce count
      const newCount = Math.max(0, (moduleConfig.centerPostCount ?? 0) - 1);
      const updatedConfig: ModuleConfig = { ...moduleConfig, centerPostCount: newCount };
      setModuleConfig(updatedConfig);
      regenerateModuleShapes(updatedConfig);
      setSelectedId(null);
      setSelectedIds(new Set());
    } else if (shapeType === "shelf" && moduleConfig) {
      // Shelf delete: handled by ShelfOverlay directly
      // This is a fallback
      if (selectedId) {
        deleteShape(selectedId);
      }
    } else if (selectedId) {
      // Generic delete
      deleteShape(selectedId);
    }

    setTimeout(() => setActionMode(null), 500);
  }, [
    shapeType, panelKey, moduleConfig, selectedId,
    setActionMode, setModuleConfig, regenerateModuleShapes,
    setSelectedId, setSelectedIds, deleteShape
  ]);

  return {
    handleCopy,
    handleMove,
    handleEdit,
    handleDelete,
  };
}

export default useShapeActions;
