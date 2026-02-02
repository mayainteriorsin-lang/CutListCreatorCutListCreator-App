/**
 * Toolbar3D - Main floating toolbar for 3D Floor Plan view
 *
 * Combines all tools into a vertical toolbar:
 * - View tools: Zoom to Fit, Reset Camera
 * - Mode tools: Select, Move, Pan
 * - Edit tools: Rotate, Delete, Duplicate, Mirror/Flip
 * - Snap tools: Grid Snap, Object Snap
 * - Utility tools: Measure, Lock, Group
 * - History tools: Undo, Redo
 * - Display tools: Show Dimensions
 */

import React from "react";
import {
  Maximize2,
  RotateCcw,
  MousePointer2,
  Move,
  Hand,
  Calculator,
} from "lucide-react";
import ToolButton from "./ToolButton";
import RotateTool from "./tools/RotateTool";
import DeleteTool from "./tools/DeleteTool";
import DuplicateTool from "./tools/DuplicateTool";
import UndoRedoTool from "./tools/UndoRedoTool";
import MeasureTool from "./tools/MeasureTool";
import SnapGridTool from "./tools/SnapGridTool";
import SnapObjectsTool from "./tools/SnapObjectsTool";
import LockTool from "./tools/LockTool";
import MirrorFlipTool from "./tools/MirrorFlipTool";
import { useDesignCanvasStore } from "../../../../store/v2/useDesignCanvasStore";
import type { FloorPlanDrawMode } from "../state/types";

interface Toolbar3DProps {
  // View controls
  onZoomToFit: () => void;
  onResetCamera: () => void;

  // Selection state
  selectedFloorId: string | null;
  selectedWallId: string | null;
  selectedUnitId: string | null;

  // Selection handlers
  onClearSelection: () => void;

  // Dimensions toggle
  showDimensions: boolean;
  onToggleDimensions: () => void;
}

export default function Toolbar3D({
  onZoomToFit,
  onResetCamera,
  selectedFloorId,
  selectedWallId,
  selectedUnitId,
  onClearSelection,
  showDimensions,
  onToggleDimensions,
}: Toolbar3DProps) {
  const { floorPlan, setFloorPlanDrawMode } = useDesignCanvasStore();
  const { drawMode } = floorPlan;

  const toggleMode = (mode: FloorPlanDrawMode) => {
    setFloorPlanDrawMode(drawMode === mode ? "none" : mode);
  };

  return (
    <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 bg-slate-800/90 p-1 rounded-lg shadow-lg backdrop-blur-sm">
      {/* View Tools */}
      <ToolButton
        onClick={onZoomToFit}
        title="Zoom to Fit"
      >
        <Maximize2 className="w-4 h-4" />
      </ToolButton>

      {/* Divider */}
      <div className="h-px bg-slate-600 my-0.5" />

      {/* Mode Tools */}
      <ToolButton
        onClick={() => toggleMode("select")}
        title={drawMode === "select" ? "Exit Select Mode" : "Select (Click items)"}
        isActive={drawMode === "select"}
      >
        <MousePointer2 className="w-4 h-4" />
      </ToolButton>

      <ToolButton
        onClick={() => toggleMode("move")}
        title={drawMode === "move" ? "Exit Move Mode" : "Move (Drag items)"}
        isActive={drawMode === "move"}
        variant="success"
      >
        <Move className="w-4 h-4" />
      </ToolButton>

      <ToolButton
        onClick={() => toggleMode("pan")}
        title={drawMode === "pan" ? "Exit Pan Mode" : "Pan/Rotate View"}
        isActive={drawMode === "pan"}
      >
        <Hand className="w-4 h-4" />
      </ToolButton>

      {/* Divider */}
      <div className="h-px bg-slate-600 my-0.5" />

      {/* Edit Tools */}
      <RotateTool
        selectedFloorId={selectedFloorId}
        selectedWallId={selectedWallId}
        selectedUnitId={selectedUnitId}
        onRotate={onClearSelection}
      />

      <DeleteTool
        selectedFloorId={selectedFloorId}
        selectedWallId={selectedWallId}
        selectedUnitId={selectedUnitId}
        onDelete={onClearSelection}
      />

      <DuplicateTool
        selectedFloorId={selectedFloorId}
        selectedWallId={selectedWallId}
        selectedUnitId={selectedUnitId}
      />

      <MirrorFlipTool
        selectedFloorId={selectedFloorId}
        selectedWallId={selectedWallId}
        selectedUnitId={selectedUnitId}
      />

      {/* Divider */}
      <div className="h-px bg-slate-600 my-0.5" />

      {/* Snap Tools */}
      <SnapGridTool />
      <SnapObjectsTool />

      {/* Divider */}
      <div className="h-px bg-slate-600 my-0.5" />

      {/* Utility Tools */}
      <MeasureTool />

      <LockTool
        selectedFloorId={selectedFloorId}
        selectedWallId={selectedWallId}
        selectedUnitId={selectedUnitId}
      />

      {/* Divider */}
      <div className="h-px bg-slate-600 my-0.5" />

      {/* History Tools */}
      <UndoRedoTool />

      {/* Divider */}
      <div className="h-px bg-slate-600 my-0.5" />

      {/* Display Tools */}
      <ToolButton
        onClick={onToggleDimensions}
        title={showDimensions ? "Hide Dimensions" : "Show Dimensions"}
        isActive={showDimensions}
      >
        <Calculator className="w-4 h-4" />
      </ToolButton>

      <ToolButton
        onClick={onResetCamera}
        title="Reset Camera"
      >
        <RotateCcw className="w-4 h-4" />
      </ToolButton>
    </div>
  );
}
