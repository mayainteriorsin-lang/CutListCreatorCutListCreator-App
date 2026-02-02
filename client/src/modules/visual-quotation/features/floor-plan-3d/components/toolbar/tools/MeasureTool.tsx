/**
 * MeasureTool - Measure distance between two points in 3D space
 *
 * Features:
 * - Click two points to measure distance
 * - Shows distance in mm, cm, m, and feet
 * - Visual line between measurement points
 * - Keyboard shortcut: M to toggle measure mode
 */

import React, { useCallback, useEffect, useState } from "react";
import { Ruler } from "lucide-react";
import ToolButton from "../ToolButton";
import { useDesignCanvasStore } from "../../../../../store/v2/useDesignCanvasStore";

interface MeasureToolProps {
  onMeasureStart?: () => void;
  onMeasureEnd?: (distanceMm: number) => void;
}

export interface MeasurePoint {
  x: number; // in pixels
  y: number; // in pixels
}

export interface MeasureState {
  isActive: boolean;
  startPoint: MeasurePoint | null;
  endPoint: MeasurePoint | null;
  distanceMm: number | null;
}

export default function MeasureTool({
  onMeasureStart,
  onMeasureEnd,
}: MeasureToolProps) {
  const { floorPlan, setFloorPlanDrawMode } = useDesignCanvasStore();
  const { drawMode, scaleMmPerPx } = floorPlan;

  const [measureState, setMeasureState] = useState<MeasureState>({
    isActive: false,
    startPoint: null,
    endPoint: null,
    distanceMm: null,
  });

  const isMeasureMode = drawMode === "none" && measureState.isActive;

  // Toggle measure mode
  const toggleMeasureMode = useCallback(() => {
    if (measureState.isActive) {
      // Exit measure mode
      setMeasureState({
        isActive: false,
        startPoint: null,
        endPoint: null,
        distanceMm: null,
      });
    } else {
      // Enter measure mode
      setFloorPlanDrawMode("none");
      setMeasureState({
        isActive: true,
        startPoint: null,
        endPoint: null,
        distanceMm: null,
      });
      onMeasureStart?.();
    }
  }, [measureState.isActive, setFloorPlanDrawMode, onMeasureStart]);

  // Handle point click (called from parent component)
  const handlePointClick = useCallback((x: number, y: number) => {
    if (!measureState.isActive) return;

    if (!measureState.startPoint) {
      // Set start point
      setMeasureState(prev => ({
        ...prev,
        startPoint: { x, y },
        endPoint: null,
        distanceMm: null,
      }));
    } else if (!measureState.endPoint) {
      // Set end point and calculate distance
      const dx = x - measureState.startPoint.x;
      const dy = y - measureState.startPoint.y;
      const distancePx = Math.sqrt(dx * dx + dy * dy);
      const distanceMm = distancePx * scaleMmPerPx;

      setMeasureState(prev => ({
        ...prev,
        endPoint: { x, y },
        distanceMm,
      }));

      onMeasureEnd?.(distanceMm);
    } else {
      // Start new measurement
      setMeasureState(prev => ({
        ...prev,
        startPoint: { x, y },
        endPoint: null,
        distanceMm: null,
      }));
    }
  }, [measureState.isActive, measureState.startPoint, measureState.endPoint, scaleMmPerPx, onMeasureEnd]);

  // Clear measurement
  const clearMeasurement = useCallback(() => {
    setMeasureState(prev => ({
      ...prev,
      startPoint: null,
      endPoint: null,
      distanceMm: null,
    }));
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        toggleMeasureMode();
      }

      // Escape to clear or exit
      if (e.key === "Escape" && measureState.isActive) {
        e.preventDefault();
        if (measureState.startPoint) {
          clearMeasurement();
        } else {
          toggleMeasureMode();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleMeasureMode, measureState.isActive, measureState.startPoint, clearMeasurement]);

  // Format distance for display
  const formatDistance = (mm: number) => {
    const cm = mm / 10;
    const m = mm / 1000;
    const ft = mm / 304.8;
    const inches = (mm / 25.4) % 12;
    const ftWhole = Math.floor(ft);

    return {
      mm: mm.toFixed(0),
      cm: cm.toFixed(1),
      m: m.toFixed(2),
      ft: `${ftWhole}' ${inches.toFixed(1)}"`,
    };
  };

  return (
    <div className="relative">
      <ToolButton
        onClick={toggleMeasureMode}
        title={measureState.isActive ? "Exit Measure Mode (M)" : "Measure Distance (M)"}
        isActive={measureState.isActive}
        variant="default"
      >
        <Ruler className="w-4 h-4" />
      </ToolButton>

      {/* Measurement result popup */}
      {measureState.isActive && measureState.distanceMm !== null && (
        <div className="absolute right-full mr-2 top-0 bg-slate-800 rounded-lg shadow-lg border border-slate-600 p-2 min-w-[140px] z-50">
          <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Distance</div>
          {(() => {
            const formatted = formatDistance(measureState.distanceMm);
            return (
              <div className="space-y-0.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">mm:</span>
                  <span className="text-white font-medium">{formatted.mm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">cm:</span>
                  <span className="text-white font-medium">{formatted.cm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">m:</span>
                  <span className="text-green-400 font-medium">{formatted.m}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ft:</span>
                  <span className="text-amber-400 font-medium">{formatted.ft}</span>
                </div>
              </div>
            );
          })()}
          <button
            onClick={clearMeasurement}
            className="mt-2 w-full text-[10px] text-slate-400 hover:text-white py-1 border-t border-slate-600"
          >
            Click to measure again
          </button>
        </div>
      )}

      {/* Instructions when measuring */}
      {measureState.isActive && !measureState.distanceMm && (
        <div className="absolute right-full mr-2 top-0 bg-slate-800 rounded-lg shadow-lg border border-slate-600 p-2 min-w-[120px] z-50">
          <div className="text-[10px] text-slate-300">
            {!measureState.startPoint
              ? "Click first point"
              : "Click second point"}
          </div>
        </div>
      )}
    </div>
  );
}

// Export measure state for use in 3D scene
export { MeasureTool };
