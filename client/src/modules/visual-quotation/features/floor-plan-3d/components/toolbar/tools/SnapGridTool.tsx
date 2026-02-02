/**
 * SnapGridTool - Toggle grid snapping on/off
 *
 * Features:
 * - Toggle snap to grid when drawing/moving items
 * - Configurable grid size (100mm, 50mm, 25mm, 10mm)
 * - Visual feedback when snapping is active
 * - Keyboard shortcut: G to toggle
 */

import React, { useCallback, useEffect, useState } from "react";
import { Grid3X3 } from "lucide-react";
import ToolButton from "../ToolButton";
import { useDesignCanvasStore } from "../../../../../store/v2/useDesignCanvasStore";

interface SnapGridToolProps {
  onSnapChange?: (enabled: boolean, gridSize: number) => void;
}

export type GridSize = 10 | 25 | 50 | 100 | 200;

const GRID_OPTIONS: { size: GridSize; label: string }[] = [
  { size: 10, label: "10mm" },
  { size: 25, label: "25mm" },
  { size: 50, label: "50mm" },
  { size: 100, label: "100mm" },
  { size: 200, label: "200mm" },
];

export default function SnapGridTool({
  onSnapChange,
}: SnapGridToolProps) {
  const { floorPlan, setSnapToGrid } = useDesignCanvasStore();
  const snapEnabled = floorPlan.snapToGrid ?? true;
  const gridSize = floorPlan.gridSizeMm ?? 100;

  const [showMenu, setShowMenu] = useState(false);

  // Toggle snap
  const toggleSnap = useCallback(() => {
    const newEnabled = !snapEnabled;
    setSnapToGrid(newEnabled, gridSize);
    onSnapChange?.(newEnabled, gridSize);
  }, [snapEnabled, gridSize, setSnapToGrid, onSnapChange]);

  // Change grid size
  const changeGridSize = useCallback((newSize: GridSize) => {
    setSnapToGrid(snapEnabled, newSize);
    onSnapChange?.(snapEnabled, newSize);
    setShowMenu(false);
  }, [snapEnabled, setSnapToGrid, onSnapChange]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key.toLowerCase() === "g" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        toggleSnap();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSnap]);

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
        onClick={() => setShowMenu(!showMenu)}
        title={snapEnabled ? `Snap to Grid: ON (${gridSize}mm) - Press G` : "Snap to Grid: OFF - Press G"}
        isActive={snapEnabled}
        variant="default"
      >
        <Grid3X3 className="w-4 h-4" />
      </ToolButton>

      {/* Grid size menu */}
      {showMenu && (
        <div
          className="absolute right-full mr-1 top-0 bg-slate-800 rounded-lg shadow-lg border border-slate-600 py-1 min-w-[100px] z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={toggleSnap}
            className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between ${snapEnabled ? "text-green-400" : "text-slate-400"
              } hover:bg-slate-700`}
          >
            <span>Snap</span>
            <span className="text-[10px]">{snapEnabled ? "ON" : "OFF"}</span>
          </button>

          <div className="h-px bg-slate-600 my-1" />

          <div className="px-2 py-1 text-[10px] text-slate-500 uppercase">Grid Size</div>

          {GRID_OPTIONS.map((option) => (
            <button
              key={option.size}
              onClick={() => changeGridSize(option.size)}
              className={`w-full px-3 py-1.5 text-left text-xs hover:bg-slate-700 flex items-center justify-between ${gridSize === option.size ? "text-blue-400" : "text-slate-300"
                }`}
            >
              <span>{option.label}</span>
              {gridSize === option.size && <span className="text-[10px]">*</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
