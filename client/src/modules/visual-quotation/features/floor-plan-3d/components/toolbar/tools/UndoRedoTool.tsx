/**
 * UndoRedoTool - Undo/Redo floor plan actions
 *
 * Features:
 * - Undo last action (walls, floors, appliances, kitchen config)
 * - Redo undone action
 * - Visual indicator for available undo/redo
 * - Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y or Ctrl+Shift+Z (redo)
 */

import React, { useCallback, useEffect } from "react";
import { Undo2, Redo2 } from "lucide-react";
import ToolButton from "../ToolButton";
import { useDesignCanvasStore } from "../../../../../store/v2/useDesignCanvasStore";

interface UndoRedoToolProps {
  onUndo?: () => void;
  onRedo?: () => void;
}

export default function UndoRedoTool({
  onUndo,
  onRedo,
}: UndoRedoToolProps) {
  const {
    floorPlan,
    floorPlanUndo,
    floorPlanRedo,
  } = useDesignCanvasStore();

  const { history, historyIndex } = floorPlan;

  // Check if undo/redo are available
  const canUndo = history.length > 0 && historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  // Handle undo
  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    floorPlanUndo();
    onUndo?.();
  }, [canUndo, floorPlanUndo, onUndo]);

  // Handle redo
  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    floorPlanRedo();
    onRedo?.();
  }, [canRedo, floorPlanRedo, onRedo]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo]);

  return (
    <>
      <ToolButton
        onClick={handleUndo}
        title={canUndo ? `Undo (Ctrl+Z)` : "Nothing to undo"}
        disabled={!canUndo}
        variant="default"
      >
        <Undo2 className="w-4 h-4" />
      </ToolButton>

      <ToolButton
        onClick={handleRedo}
        title={canRedo ? `Redo (Ctrl+Y)` : "Nothing to redo"}
        disabled={!canRedo}
        variant="default"
      >
        <Redo2 className="w-4 h-4" />
      </ToolButton>
    </>
  );
}
