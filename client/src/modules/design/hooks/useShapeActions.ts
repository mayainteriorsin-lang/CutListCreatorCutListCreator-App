/**
 * useShapeActions Hook
 *
 * Centralized hook for shape manipulation actions (copy, move, edit, delete).
 * Used by PanelSelectionOverlay, CenterPostOverlay, and PropertiesPanel.
 */

import { useCallback } from "react";
import { useDesignStore } from "../store/designStore";
import type { RectShape } from "../types";
import type { ModuleConfig } from "../engine/shapeGenerator";

export interface ShapeActionsConfig {
  /** The selected shape ID */
  selectedId: string | null;
  /** Type of shape for specialized behavior */
  shapeType: "panel" | "centerPost" | "generic";
  /** Panel key for panel-specific delete (e.g., "left", "right") */
  panelKey?: string;
}

export interface ShapeActions {
  handleCopy: () => void;
  handleMove: () => void;
  handleEdit: () => void;
  handleDelete: () => void;
}

/**
 * Hook providing centralized shape manipulation actions
 */
export function useShapeActions(config: ShapeActionsConfig): ShapeActions {
  const {
    shapes,
    moduleConfig,
    actionMode,
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
    deleteSelectedShapes,
  } = useDesignStore();

  const { selectedId, shapeType, panelKey } = config;

  // Get the selected shape
  const selectedShape = selectedId ? shapes.find(s => s.id === selectedId) : null;

  /**
   * Copy the selected shape with 50mm offset
   */
  const handleCopy = useCallback(() => {
    if (!selectedShape || selectedShape.type !== "rect") return;

    setActionMode("copy");
    const rect = selectedShape as RectShape;
    const newId = `${selectedShape.id}-COPY-${Date.now()}`;
    const newShape: RectShape = {
      ...rect,
      id: newId,
      x: rect.x + 50, // Offset 50mm to the right
    };

    const newShapes = [...shapes, newShape];
    const description = shapeType === "centerPost"
      ? "Copy Center Post"
      : shapeType === "panel"
        ? `Copy ${panelKey || "Panel"}`
        : "Copy shape";

    pushHistory(newShapes, description);
    setShapes(newShapes);
    setSelectedId(newId);
    setSelectedIds(new Set([newId]));
    setTimeout(() => setActionMode(null), 500);
  }, [selectedShape, shapes, shapeType, panelKey, setActionMode, pushHistory, setShapes, setSelectedId, setSelectedIds]);

  /**
   * Enter move mode for the selected shape
   */
  const handleMove = useCallback(() => {
    setActionMode("move");
    setMode("move");
  }, [setActionMode, setMode]);

  /**
   * Open the module config panel for editing
   */
  const handleEdit = useCallback(() => {
    setActionMode(null);
    setShowModulePanel(true);
  }, [setActionMode, setShowModulePanel]);

  /**
   * Delete the selected shape (with type-specific behavior)
   */
  const handleDelete = useCallback(() => {
    setActionMode("delete");

    if (shapeType === "panel" && panelKey && moduleConfig) {
      // Panel delete: disable the panel in moduleConfig
      const currentPanels = moduleConfig.panelsEnabled ?? {
        top: true, bottom: true, left: true, right: true, back: true
      };
      const updatedPanels = { ...currentPanels, [panelKey]: false };
      const updatedConfig: ModuleConfig = { ...moduleConfig, panelsEnabled: updatedPanels };
      setModuleConfig(updatedConfig);
      regenerateModuleShapes(updatedConfig);
      setSelectedId(null);
      setSelectedIds(new Set());
    } else if (shapeType === "centerPost" && moduleConfig) {
      // Center post delete: reduce center post count
      const newCount = Math.max(0, (moduleConfig.centerPostCount ?? 0) - 1);
      const updatedConfig: ModuleConfig = { ...moduleConfig, centerPostCount: newCount };
      setModuleConfig(updatedConfig);
      regenerateModuleShapes(updatedConfig);
      setSelectedId(null);
      setSelectedIds(new Set());
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
