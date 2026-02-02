/**
 * MirrorFlipTool - Mirror/Flip selected items horizontally or vertically
 *
 * Features:
 * - Flip horizontally (mirror along Y axis)
 * - Flip vertically (mirror along X axis)
 * - Works with floors, walls, and units
 * - Keyboard shortcuts: H for horizontal, V for vertical
 */

import React, { useCallback, useEffect, useState } from "react";
import { FlipHorizontal2, FlipVertical2 } from "lucide-react";
import ToolButton from "../ToolButton";
import { useDesignCanvasStore } from "../../../../../store/v2/useDesignCanvasStore";

interface MirrorFlipToolProps {
  selectedFloorId: string | null;
  selectedWallId: string | null;
  selectedUnitId: string | null;
  onFlip?: (direction: "horizontal" | "vertical") => void;
}

export default function MirrorFlipTool({
  selectedFloorId,
  selectedWallId,
  selectedUnitId,
  onFlip,
}: MirrorFlipToolProps) {
  const {
    floorPlan,
    drawnUnits,
    updateFloorPlanFloor,
    updateFloorPlanWall,
    updateDrawnUnitById,
  } = useDesignCanvasStore();

  const { floors, walls } = floorPlan;

  const [showMenu, setShowMenu] = useState(false);

  const hasSelection = selectedFloorId || selectedWallId || selectedUnitId;

  // Flip floor horizontally
  const flipFloorHorizontal = useCallback((floorId: string) => {
    const floor = floors.find(f => f.id === floorId);
    if (!floor) return;

    // Flip by inverting the x position relative to center
    // For simplicity, we'll toggle a flipped state or swap dimensions
    updateFloorPlanFloor(floorId, {
      flippedH: !floor.flippedH,
    });
  }, [floors, updateFloorPlanFloor]);

  // Flip floor vertically
  const flipFloorVertical = useCallback((floorId: string) => {
    const floor = floors.find(f => f.id === floorId);
    if (!floor) return;

    updateFloorPlanFloor(floorId, {
      flippedV: !floor.flippedV,
    });
  }, [floors, updateFloorPlanFloor]);

  // Flip wall horizontally (swap start and end points X)
  const flipWallHorizontal = useCallback((wallId: string) => {
    const wall = walls.find(w => w.id === wallId);
    if (!wall || !wall.startPoint || !wall.endPoint) return;

    // Calculate center X
    const centerX = (wall.startPoint.x + wall.endPoint.x) / 2;

    // Mirror points around center
    updateFloorPlanWall(wallId, {
      startPoint: {
        x: 2 * centerX - wall.startPoint.x,
        y: wall.startPoint.y,
      },
      endPoint: {
        x: 2 * centerX - wall.endPoint.x,
        y: wall.endPoint.y,
      },
    });
  }, [walls, updateFloorPlanWall]);

  // Flip wall vertically (swap start and end points Y)
  const flipWallVertical = useCallback((wallId: string) => {
    const wall = walls.find(w => w.id === wallId);
    if (!wall || !wall.startPoint || !wall.endPoint) return;

    // Calculate center Y
    const centerY = (wall.startPoint.y + wall.endPoint.y) / 2;

    // Mirror points around center
    updateFloorPlanWall(wallId, {
      startPoint: {
        x: wall.startPoint.x,
        y: 2 * centerY - wall.startPoint.y,
      },
      endPoint: {
        x: wall.endPoint.x,
        y: 2 * centerY - wall.endPoint.y,
      },
    });
  }, [walls, updateFloorPlanWall]);

  // Flip unit (toggle flipped state)
  const flipUnitHorizontal = useCallback((unitId: string) => {
    const unit = drawnUnits.find(u => u.id === unitId);
    if (!unit) return;

    updateDrawnUnitById(unitId, {
      flippedH: !unit.flippedH,
    });
  }, [drawnUnits, updateDrawnUnitById]);

  const flipUnitVertical = useCallback((unitId: string) => {
    const unit = drawnUnits.find(u => u.id === unitId);
    if (!unit) return;

    updateDrawnUnitById(unitId, {
      flippedV: !unit.flippedV,
    });
  }, [drawnUnits, updateDrawnUnitById]);

  // Main flip handler
  const handleFlip = useCallback((direction: "horizontal" | "vertical") => {
    if (selectedFloorId) {
      if (direction === "horizontal") {
        flipFloorHorizontal(selectedFloorId);
      } else {
        flipFloorVertical(selectedFloorId);
      }
    } else if (selectedWallId) {
      if (direction === "horizontal") {
        flipWallHorizontal(selectedWallId);
      } else {
        flipWallVertical(selectedWallId);
      }
    } else if (selectedUnitId) {
      if (direction === "horizontal") {
        flipUnitHorizontal(selectedUnitId);
      } else {
        flipUnitVertical(selectedUnitId);
      }
    }

    onFlip?.(direction);
    setShowMenu(false);
  }, [
    selectedFloorId,
    selectedWallId,
    selectedUnitId,
    flipFloorHorizontal,
    flipFloorVertical,
    flipWallHorizontal,
    flipWallVertical,
    flipUnitHorizontal,
    flipUnitVertical,
    onFlip,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (!hasSelection) return;

      // H for horizontal flip
      if (e.key.toLowerCase() === "h" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleFlip("horizontal");
      }

      // V for vertical flip (but not Ctrl+V for paste)
      if (e.key.toLowerCase() === "v" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleFlip("vertical");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasSelection, handleFlip]);

  // Click outside to close menu
  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = () => setShowMenu(false);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [showMenu]);

  return (
    <div className="relative">
      <ToolButton
        onClick={() => hasSelection && setShowMenu(!showMenu)}
        title={hasSelection ? "Flip/Mirror (H/V)" : "Select item to flip"}
        disabled={!hasSelection}
        variant="default"
      >
        <FlipHorizontal2 className="w-4 h-4" />
      </ToolButton>

      {/* Flip direction menu */}
      {showMenu && (
        <div
          className="absolute right-full mr-1 top-0 bg-slate-800 rounded-lg shadow-lg border border-slate-600 py-1 min-w-[130px] z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleFlip("horizontal")}
            className="w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
          >
            <FlipHorizontal2 className="w-3 h-3" />
            Flip Horizontal (H)
          </button>
          <button
            onClick={() => handleFlip("vertical")}
            className="w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
          >
            <FlipVertical2 className="w-3 h-3" />
            Flip Vertical (V)
          </button>
        </div>
      )}
    </div>
  );
}
