/**
 * SnapObjectsTool - Toggle snap to object edges/corners
 *
 * Features:
 * - Snap to edges of walls, floors, and units
 * - Snap to corners/endpoints
 * - Snap to center points
 * - Keyboard shortcut: O to toggle
 */

import React, { useCallback, useEffect, useState } from "react";
import { Magnet } from "lucide-react";
import ToolButton from "../ToolButton";
import { useDesignCanvasStore } from "../../../../../store/v2/useDesignCanvasStore";

interface SnapObjectsToolProps {
  onSnapChange?: (settings: SnapObjectsSettings) => void;
}

export interface SnapObjectsSettings {
  enabled: boolean;
  snapToEdges: boolean;
  snapToCorners: boolean;
  snapToCenter: boolean;
  snapDistance: number; // in pixels
}

const DEFAULT_SETTINGS: SnapObjectsSettings = {
  enabled: true,
  snapToEdges: true,
  snapToCorners: true,
  snapToCenter: false,
  snapDistance: 10,
};

export default function SnapObjectsTool({
  onSnapChange,
}: SnapObjectsToolProps) {
  const { floorPlan, setSnapToObjects } = useDesignCanvasStore();
  const settings: SnapObjectsSettings = floorPlan.snapToObjects ?? DEFAULT_SETTINGS;

  const [showMenu, setShowMenu] = useState(false);

  // Toggle main snap
  const toggleSnap = useCallback(() => {
    const newSettings = { ...settings, enabled: !settings.enabled };
    setSnapToObjects(newSettings);
    onSnapChange?.(newSettings);
  }, [settings, setSnapToObjects, onSnapChange]);

  // Toggle specific option
  const toggleOption = useCallback((option: keyof Pick<SnapObjectsSettings, 'snapToEdges' | 'snapToCorners' | 'snapToCenter'>) => {
    const newSettings = { ...settings, [option]: !settings[option] };
    setSnapToObjects(newSettings);
    onSnapChange?.(newSettings);
  }, [settings, setSnapToObjects, onSnapChange]);

  // Change snap distance
  const changeSnapDistance = useCallback((distance: number) => {
    const newSettings = { ...settings, snapDistance: distance };
    setSnapToObjects(newSettings);
    onSnapChange?.(newSettings);
  }, [settings, setSnapToObjects, onSnapChange]);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key.toLowerCase() === "o" && !e.ctrlKey && !e.metaKey) {
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
        title={settings.enabled ? "Snap to Objects: ON (O)" : "Snap to Objects: OFF (O)"}
        isActive={settings.enabled}
        variant="default"
      >
        <Magnet className="w-4 h-4" />
      </ToolButton>

      {/* Settings menu */}
      {showMenu && (
        <div
          className="absolute right-full mr-1 top-0 bg-slate-800 rounded-lg shadow-lg border border-slate-600 py-1 min-w-[130px] z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={toggleSnap}
            className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between ${settings.enabled ? "text-green-400" : "text-slate-400"
              } hover:bg-slate-700`}
          >
            <span>Object Snap</span>
            <span className="text-[10px]">{settings.enabled ? "ON" : "OFF"}</span>
          </button>

          <div className="h-px bg-slate-600 my-1" />

          <div className="px-2 py-1 text-[10px] text-slate-500 uppercase">Options</div>

          <button
            onClick={() => toggleOption("snapToEdges")}
            className={`w-full px-3 py-1.5 text-left text-xs hover:bg-slate-700 flex items-center gap-2 ${settings.snapToEdges ? "text-blue-400" : "text-slate-400"
              }`}
          >
            <span className={`w-3 h-3 rounded border ${settings.snapToEdges ? "bg-blue-500 border-blue-500" : "border-slate-500"}`} />
            Edges
          </button>

          <button
            onClick={() => toggleOption("snapToCorners")}
            className={`w-full px-3 py-1.5 text-left text-xs hover:bg-slate-700 flex items-center gap-2 ${settings.snapToCorners ? "text-blue-400" : "text-slate-400"
              }`}
          >
            <span className={`w-3 h-3 rounded border ${settings.snapToCorners ? "bg-blue-500 border-blue-500" : "border-slate-500"}`} />
            Corners
          </button>

          <button
            onClick={() => toggleOption("snapToCenter")}
            className={`w-full px-3 py-1.5 text-left text-xs hover:bg-slate-700 flex items-center gap-2 ${settings.snapToCenter ? "text-blue-400" : "text-slate-400"
              }`}
          >
            <span className={`w-3 h-3 rounded border ${settings.snapToCenter ? "bg-blue-500 border-blue-500" : "border-slate-500"}`} />
            Centers
          </button>

          <div className="h-px bg-slate-600 my-1" />

          <div className="px-2 py-1 text-[10px] text-slate-500 uppercase">Snap Distance</div>

          {[5, 10, 15, 20].map((dist) => (
            <button
              key={dist}
              onClick={() => changeSnapDistance(dist)}
              className={`w-full px-3 py-1.5 text-left text-xs hover:bg-slate-700 ${settings.snapDistance === dist ? "text-blue-400" : "text-slate-300"
                }`}
            >
              {dist}px
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
