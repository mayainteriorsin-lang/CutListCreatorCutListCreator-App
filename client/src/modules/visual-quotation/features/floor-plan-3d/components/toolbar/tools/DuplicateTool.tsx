/**
 * DuplicateTool - Duplicate/Copy selected floor/wall/unit
 *
 * Features:
 * - Duplicate floors with offset position
 * - Duplicate walls with offset position
 * - Duplicate units with offset position
 * - Keyboard shortcut: Ctrl+D (duplicate)
 */

import React, { useCallback, useEffect } from "react";
import { Copy } from "lucide-react";
import ToolButton from "../ToolButton";
import { useDesignCanvasStore } from "../../../../../store/v2/useDesignCanvasStore";
import type { DrawnUnit } from "../../../../../types";
import type { FloorPlanFloor, FloorPlanWall } from "../../../state/types";

interface DuplicateToolProps {
  selectedFloorId: string | null;
  selectedWallId: string | null;
  selectedUnitId: string | null;
  onDuplicate?: (newId: string) => void;
}

// Offset for duplicated items (in pixels)
const DUPLICATE_OFFSET = 50;

export default function DuplicateTool({
  selectedFloorId,
  selectedWallId,
  selectedUnitId,
  onDuplicate,
}: DuplicateToolProps) {
  const {
    floorPlan,
    drawnUnits,
    addFloorPlanFloor,
    addFloorPlanWall,
    addDrawnUnit,
  } = useDesignCanvasStore();

  const { floors, walls } = floorPlan;

  const hasSelection = selectedFloorId || selectedWallId || selectedUnitId;

  // Get description of what will be duplicated
  const getDuplicateLabel = useCallback(() => {
    if (selectedFloorId) return "Floor";
    if (selectedWallId) return "Wall";
    if (selectedUnitId) return "Unit";
    return "Item";
  }, [selectedFloorId, selectedWallId, selectedUnitId]);

  // Duplicate floor
  const duplicateFloor = useCallback((floorId: string) => {
    const floor = floors.find(f => f.id === floorId);
    if (!floor) return null;

    const newFloor: Omit<FloorPlanFloor, "id"> = {
      x: floor.x + DUPLICATE_OFFSET,
      y: floor.y + DUPLICATE_OFFSET,
      width: floor.width,
      height: floor.height,
      color: floor.color,
      shape: floor.shape,
    };

    addFloorPlanFloor(newFloor);
    // Return would need the ID from store, but we don't have it immediately
    return null;
  }, [floors, addFloorPlanFloor]);

  // Duplicate wall
  const duplicateWall = useCallback((wallId: string) => {
    const wall = walls.find(w => w.id === wallId);
    if (!wall || !wall.startPoint || !wall.endPoint) return null;

    const newWall: Omit<FloorPlanWall, "id"> = {
      startPoint: {
        x: wall.startPoint.x + DUPLICATE_OFFSET,
        y: wall.startPoint.y + DUPLICATE_OFFSET,
      },
      endPoint: {
        x: wall.endPoint.x + DUPLICATE_OFFSET,
        y: wall.endPoint.y + DUPLICATE_OFFSET,
      },
      thicknessMm: wall.thicknessMm,
      heightMm: wall.heightMm,
      lengthMm: wall.lengthMm,
      rotation: wall.rotation,
      isExterior: wall.isExterior,
      openings: [], // Don't duplicate openings for now
    };

    addFloorPlanWall(newWall);
    return null;
  }, [walls, addFloorPlanWall]);

  // Duplicate unit
  const duplicateUnit = useCallback((unitId: string) => {
    const unit = drawnUnits.find(u => u.id === unitId);
    if (!unit) return null;

    // Create a new unit with offset position
    const newUnit: Omit<DrawnUnit, "id"> = {
      ...unit,
      box: {
        ...unit.box,
        x: unit.box.x + DUPLICATE_OFFSET,
        y: unit.box.y + DUPLICATE_OFFSET,
      },
      drawnAddOns: unit.drawnAddOns.map(addOn => ({
        ...addOn,
        id: `${addOn.id}-copy-${Date.now()}`,
        box: {
          ...addOn.box,
          x: addOn.box.x + DUPLICATE_OFFSET,
          y: addOn.box.y + DUPLICATE_OFFSET,
        },
      })),
    };

    addDrawnUnit(newUnit);
    return null;
  }, [drawnUnits, addDrawnUnit]);

  // Main duplicate handler
  const handleDuplicate = useCallback(() => {
    let newId: string | null = null;

    if (selectedFloorId) {
      newId = duplicateFloor(selectedFloorId);
    } else if (selectedWallId) {
      newId = duplicateWall(selectedWallId);
    } else if (selectedUnitId) {
      newId = duplicateUnit(selectedUnitId);
    }

    if (newId) {
      onDuplicate?.(newId);
    }
  }, [selectedFloorId, selectedWallId, selectedUnitId, duplicateFloor, duplicateWall, duplicateUnit, onDuplicate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl+D or Cmd+D for duplicate
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && hasSelection) {
        e.preventDefault();
        handleDuplicate();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasSelection, handleDuplicate]);

  return (
    <ToolButton
      onClick={handleDuplicate}
      title={hasSelection ? `Duplicate ${getDuplicateLabel()} (Ctrl+D)` : "Select item to duplicate"}
      disabled={!hasSelection}
      variant="default"
    >
      <Copy className="w-4 h-4" />
    </ToolButton>
  );
}
