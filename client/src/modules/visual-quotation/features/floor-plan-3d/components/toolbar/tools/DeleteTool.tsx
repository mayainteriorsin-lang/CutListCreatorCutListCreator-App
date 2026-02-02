/**
 * DeleteTool - Delete selected floor/wall/unit
 *
 * Features:
 * - Delete floors, walls, and drawn units
 * - Confirmation for important items (optional)
 * - Keyboard shortcut: Delete or Backspace
 */

import React, { useCallback, useEffect } from "react";
import { Trash2 } from "lucide-react";
import ToolButton from "../ToolButton";
import { useDesignCanvasStore } from "../../../../../store/v2/useDesignCanvasStore";

interface DeleteToolProps {
  selectedFloorId: string | null;
  selectedWallId: string | null;
  selectedUnitId: string | null;
  onDelete?: () => void;
}

export default function DeleteTool({
  selectedFloorId,
  selectedWallId,
  selectedUnitId,
  onDelete,
}: DeleteToolProps) {
  const {
    deleteFloorPlanFloor,
    deleteFloorPlanWall,
    removeDrawnUnit,
  } = useDesignCanvasStore();

  const hasSelection = selectedFloorId || selectedWallId || selectedUnitId;

  // Get description of what will be deleted
  const getDeleteLabel = useCallback(() => {
    if (selectedFloorId) return "Floor";
    if (selectedWallId) return "Wall";
    if (selectedUnitId) return "Unit";
    return "Item";
  }, [selectedFloorId, selectedWallId, selectedUnitId]);

  // Main delete handler
  const handleDelete = useCallback(() => {
    if (selectedWallId) {
      deleteFloorPlanWall(selectedWallId);
      onDelete?.();
    } else if (selectedFloorId) {
      deleteFloorPlanFloor(selectedFloorId);
      onDelete?.();
    } else if (selectedUnitId) {
      removeDrawnUnit(selectedUnitId);
      onDelete?.();
    }
  }, [selectedFloorId, selectedWallId, selectedUnitId, deleteFloorPlanFloor, deleteFloorPlanWall, removeDrawnUnit, onDelete]);

  // Keyboard shortcuts - handled here as well as in parent for redundancy
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && hasSelection) {
        e.preventDefault();
        handleDelete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasSelection, handleDelete]);

  return (
    <ToolButton
      onClick={handleDelete}
      title={hasSelection ? `Delete ${getDeleteLabel()} (Del)` : "Select item to delete"}
      disabled={!hasSelection}
      variant="danger"
    >
      <Trash2 className="w-4 h-4" />
    </ToolButton>
  );
}
