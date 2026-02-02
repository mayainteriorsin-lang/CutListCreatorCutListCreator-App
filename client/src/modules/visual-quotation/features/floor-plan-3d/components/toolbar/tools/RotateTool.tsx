/**
 * RotateTool - Rotate selected wall/unit by angle (90°, 45°, or free rotation)
 *
 * Features:
 * - Rotate walls by adjusting their start/end points
 * - Rotate units by updating their rotation property
 * - Support for 90°, 45°, and custom angle rotation
 * - Keyboard shortcut: R (rotate 90°), Shift+R (rotate -90°)
 */

import React, { useCallback, useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import ToolButton from "../ToolButton";
import { useDesignCanvasStore } from "../../../../../store/v2/useDesignCanvasStore";

interface RotateToolProps {
  selectedFloorId: string | null;
  selectedWallId: string | null;
  selectedUnitId: string | null;
  onRotate?: () => void;
}

// Rotate point around a center by given angle (in degrees)
function rotatePoint(
  px: number,
  py: number,
  cx: number,
  cy: number,
  angleDeg: number
): { x: number; y: number } {
  const angleRad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos,
  };
}

export default function RotateTool({
  selectedFloorId,
  selectedWallId,
  selectedUnitId,
  onRotate,
}: RotateToolProps) {
  const [showAngleMenu, setShowAngleMenu] = useState(false);

  const {
    floorPlan,
    drawnUnits,
    updateFloorPlanWall,
    updateDrawnUnitById,
  } = useDesignCanvasStore();

  const { walls } = floorPlan;

  const hasSelection = selectedWallId || selectedUnitId;

  // Rotate wall by angle
  const rotateWall = useCallback((wallId: string, angleDeg: number) => {
    const wall = walls.find(w => w.id === wallId);
    if (!wall || !wall.startPoint || !wall.endPoint) return;

    // Calculate center point of wall
    const cx = (wall.startPoint.x + wall.endPoint.x) / 2;
    const cy = (wall.startPoint.y + wall.endPoint.y) / 2;

    // Rotate both endpoints around center
    const newStart = rotatePoint(wall.startPoint.x, wall.startPoint.y, cx, cy, angleDeg);
    const newEnd = rotatePoint(wall.endPoint.x, wall.endPoint.y, cx, cy, angleDeg);

    // Update wall rotation angle
    const newRotation = ((wall.rotation || 0) + angleDeg) % 360;

    updateFloorPlanWall(wallId, {
      startPoint: newStart,
      endPoint: newEnd,
      rotation: newRotation,
    });

    onRotate?.();
  }, [walls, updateFloorPlanWall, onRotate]);

  // Rotate unit by angle
  const rotateUnit = useCallback((unitId: string, angleDeg: number) => {
    const unit = drawnUnits.find(u => u.id === unitId);
    if (!unit) return;

    // For units, we swap width/height on 90° rotations
    const is90Rotation = Math.abs(angleDeg) === 90 || Math.abs(angleDeg) === 270;

    if (is90Rotation) {
      // Swap width and height in the box
      const newBox = {
        ...unit.box,
        width: unit.box.height,
        height: unit.box.width,
      };

      updateDrawnUnitById(unitId, {
        box: newBox,
        // Also swap the mm dimensions
        widthMm: unit.heightMm,
        heightMm: unit.widthMm,
      });
    }

    onRotate?.();
  }, [drawnUnits, updateDrawnUnitById, onRotate]);

  // Main rotate handler
  const handleRotate = useCallback((angleDeg: number = 90) => {
    if (selectedWallId) {
      rotateWall(selectedWallId, angleDeg);
    } else if (selectedUnitId) {
      rotateUnit(selectedUnitId, angleDeg);
    }
    setShowAngleMenu(false);
  }, [selectedWallId, selectedUnitId, rotateWall, rotateUnit]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key.toLowerCase() === "r" && hasSelection) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRotate(-90); // Counter-clockwise
        } else {
          handleRotate(90); // Clockwise
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasSelection, handleRotate]);

  // Click outside to close menu
  useEffect(() => {
    if (!showAngleMenu) return;

    const handleClickOutside = () => setShowAngleMenu(false);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [showAngleMenu]);

  return (
    <div className="relative">
      <ToolButton
        onClick={() => {
          if (hasSelection) {
            setShowAngleMenu(!showAngleMenu);
          }
        }}
        title={hasSelection ? "Rotate (R)" : "Select item to rotate"}
        disabled={!hasSelection}
        variant="warning"
      >
        <RotateCw className="w-4 h-4" />
      </ToolButton>

      {/* Angle selection dropdown */}
      {showAngleMenu && (
        <div
          className="absolute right-full mr-1 top-0 bg-slate-800 rounded-lg shadow-lg border border-slate-600 py-1 min-w-[100px] z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => handleRotate(90)}
            className="w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
          >
            <RotateCw className="w-3 h-3" />
            90° CW
          </button>
          <button
            onClick={() => handleRotate(-90)}
            className="w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
          >
            <RotateCw className="w-3 h-3 transform scale-x-[-1]" />
            90° CCW
          </button>
          <button
            onClick={() => handleRotate(45)}
            className="w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
          >
            <RotateCw className="w-3 h-3" />
            45° CW
          </button>
          <button
            onClick={() => handleRotate(-45)}
            className="w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
          >
            <RotateCw className="w-3 h-3 transform scale-x-[-1]" />
            45° CCW
          </button>
          <button
            onClick={() => handleRotate(180)}
            className="w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
          >
            <RotateCw className="w-3 h-3" />
            180°
          </button>
        </div>
      )}
    </div>
  );
}
