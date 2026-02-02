/**
 * LockTool - Lock/unlock selected items to prevent accidental changes
 *
 * Features:
 * - Lock floors, walls, and units
 * - Locked items cannot be moved, rotated, or deleted
 * - Visual indicator for locked items
 * - Keyboard shortcut: L to toggle lock on selected item
 */

import React, { useCallback, useEffect } from "react";
import { Lock, Unlock } from "lucide-react";
import ToolButton from "../ToolButton";
import { useDesignCanvasStore } from "../../../../../store/v2/useDesignCanvasStore";

interface LockToolProps {
  selectedFloorId: string | null;
  selectedWallId: string | null;
  selectedUnitId: string | null;
  onLockChange?: (locked: boolean) => void;
}

export default function LockTool({
  selectedFloorId,
  selectedWallId,
  selectedUnitId,
  onLockChange,
}: LockToolProps) {
  const {
    floorPlan,
    drawnUnits,
    updateFloorPlanFloor,
    updateFloorPlanWall,
    updateDrawnUnitById,
  } = useDesignCanvasStore();

  const { floors, walls } = floorPlan;

  const hasSelection = selectedFloorId || selectedWallId || selectedUnitId;

  // Check if selected item is locked
  const isLocked = useCallback(() => {
    if (selectedFloorId) {
      const floor = floors.find(f => f.id === selectedFloorId);
      return floor?.locked ?? false;
    }
    if (selectedWallId) {
      const wall = walls.find(w => w.id === selectedWallId);
      return wall?.locked ?? false;
    }
    if (selectedUnitId) {
      const unit = drawnUnits.find(u => u.id === selectedUnitId);
      return unit?.locked ?? false;
    }
    return false;
  }, [selectedFloorId, selectedWallId, selectedUnitId, floors, walls, drawnUnits]);

  const locked = isLocked();

  // Toggle lock on selected item
  const toggleLock = useCallback(() => {
    const newLocked = !locked;

    if (selectedFloorId) {
      updateFloorPlanFloor(selectedFloorId, { locked: newLocked });
    } else if (selectedWallId) {
      updateFloorPlanWall(selectedWallId, { locked: newLocked });
    } else if (selectedUnitId) {
      updateDrawnUnitById(selectedUnitId, { locked: newLocked });
    }

    onLockChange?.(newLocked);
  }, [
    locked,
    selectedFloorId,
    selectedWallId,
    selectedUnitId,
    updateFloorPlanFloor,
    updateFloorPlanWall,
    updateDrawnUnitById,
    onLockChange,
  ]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key.toLowerCase() === "l" && !e.ctrlKey && !e.metaKey && hasSelection) {
        e.preventDefault();
        toggleLock();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasSelection, toggleLock]);

  // Get label for current selection
  const getLabel = () => {
    if (selectedFloorId) return "Floor";
    if (selectedWallId) return "Wall";
    if (selectedUnitId) return "Unit";
    return "Item";
  };

  return (
    <ToolButton
      onClick={toggleLock}
      title={
        !hasSelection
          ? "Select item to lock"
          : locked
            ? `Unlock ${getLabel()} (L)`
            : `Lock ${getLabel()} (L)`
      }
      disabled={!hasSelection}
      isActive={locked}
      variant={locked ? "warning" : "default"}
    >
      {locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
    </ToolButton>
  );
}
