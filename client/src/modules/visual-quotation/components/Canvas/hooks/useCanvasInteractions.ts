/**
 * useCanvasInteractions Hook
 *
 * Handles all mouse and keyboard interactions for the canvas.
 * No JSX - pure logic extraction from CanvasStage.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { useDesignCanvasStore } from "../../../store/v2/useDesignCanvasStore";
import type { WardrobeBox } from "../../../types";

// History state for undo/redo
interface HistoryState {
  wardrobeBox: WardrobeBox | undefined;
}

const MAX_HISTORY = 50;

interface UseCanvasInteractionsProps {
  locked: boolean;
  canvasFocused: boolean;
  isSelected: boolean;
  setIsSelected: (value: boolean) => void;
}

interface UseCanvasInteractionsReturn {
  // Draw state
  drawStart: { x: number; y: number } | null;
  drawCurrent: { x: number; y: number } | null;
  setDrawStart: (pos: { x: number; y: number } | null) => void;
  setDrawCurrent: (pos: { x: number; y: number } | null) => void;

  // Mouse handlers
  handleMouseDown: (e: KonvaEventObject<MouseEvent>) => void;
  handleMouseMove: (e: KonvaEventObject<MouseEvent>) => void;
  handleMouseUp: () => void;

  // Unit operations
  deleteCurrentUnit: () => void;
  nudgeUnit: (dx: number, dy: number) => void;

  // History
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useCanvasInteractions({
  locked,
  canvasFocused,
  isSelected,
  setIsSelected,
}: UseCanvasInteractionsProps): UseCanvasInteractionsReturn {
  const {
    wardrobeBox,
    drawMode,
    setWardrobeBox,
    setDrawMode,
    clearWardrobeBox,
    setLoftEnabled,
    drawnUnits,
    activeUnitIndex,
    selectedUnitIndices,
    saveCurrentUnitAndAddNew,
    deleteDrawnUnit,
    deleteSelectedUnits,
    nudgeDrawnUnit,
    removeLoftFromUnit,
    activeEditPart,
    setActiveEditPart,
    addOnDrawMode,
    addDrawnAddOn,
  } = useDesignCanvasStore();

  const selectedPart = activeEditPart === "shutter" ? "wardrobe" : "loft";

  // Draw state
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);

  // Undo/Redo history
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);

  // Save state to history when wardrobeBox changes (but not during undo/redo)
  useEffect(() => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }

    const currentState: HistoryState = { wardrobeBox };

    setHistory((prev) => {
      // Remove any redo states
      const newHistory = prev.slice(0, historyIndex + 1);
      // Add current state
      newHistory.push(currentState);
      // Limit history size
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [wardrobeBox, historyIndex]);

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex <= 0 || locked) return;

    isUndoRedoAction.current = true;
    const prevState = history[historyIndex - 1];
    if (prevState) {
      if (prevState.wardrobeBox) {
        setWardrobeBox(prevState.wardrobeBox);
      } else {
        clearWardrobeBox();
      }
    }
    setHistoryIndex((prev) => prev - 1);
  }, [history, historyIndex, locked, setWardrobeBox, clearWardrobeBox]);

  // Redo function
  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1 || locked) return;

    isUndoRedoAction.current = true;
    const nextState = history[historyIndex + 1];
    if (nextState) {
      if (nextState.wardrobeBox) {
        setWardrobeBox(nextState.wardrobeBox);
      } else {
        clearWardrobeBox();
      }
    }
    setHistoryIndex((prev) => prev + 1);
  }, [history, historyIndex, locked, setWardrobeBox, clearWardrobeBox]);

  // Nudge unit with arrow keys
  const nudgeUnit = useCallback(
    (dx: number, dy: number) => {
      if (locked) return;

      const activeDrawnUnit = drawnUnits[activeUnitIndex];
      if (activeDrawnUnit) {
        // Nudge saved unit - update via slice action
        nudgeDrawnUnit(activeUnitIndex, dx, dy);
      } else if (wardrobeBox) {
        // Nudge current wardrobe box
        setWardrobeBox({
          ...wardrobeBox,
          x: wardrobeBox.x + dx,
          y: wardrobeBox.y + dy,
        });
      }
    },
    [locked, drawnUnits, activeUnitIndex, wardrobeBox, setWardrobeBox, nudgeDrawnUnit]
  );

  // Delete current selected part - loft only if loft selected, wardrobe unit if wardrobe selected
  const deleteCurrentUnit = useCallback(() => {
    if (locked) return;

    // Get current state directly from store to avoid stale closure issues
    const state = useDesignCanvasStore.getState();
    const currentUnits = state.drawnUnits;
    const currentIndex = state.activeUnitIndex;

    // Check if we have a valid unit selected
    if (currentUnits.length > 0 && currentIndex >= 0 && currentIndex < currentUnits.length) {
      const activeUnit = currentUnits[currentIndex];

      // If loft is selected and unit has loft, only remove the loft
      if (selectedPart === "loft" && activeUnit?.loftEnabled && activeUnit?.loftBox) {
        // Use slice action to remove loft from saved unit
        removeLoftFromUnit(currentIndex);
        setLoftEnabled(false);
        // Switch selection to wardrobe after deleting loft
        setActiveEditPart("shutter");
      } else {
        // Delete the entire wardrobe unit
        deleteDrawnUnit(currentIndex);
      }
    } else if (state.wardrobeBox) {
      // If loft is selected in current drawing, only remove loft
      if (selectedPart === "loft" && state.loftEnabled && state.loftBox) {
        // Use slice action to clear current drawing loft
        setLoftEnabled(false);
        setActiveEditPart("shutter");
      } else {
        clearWardrobeBox();
      }
    }
  }, [locked, selectedPart, deleteDrawnUnit, clearWardrobeBox, removeLoftFromUnit, setLoftEnabled, setActiveEditPart]);

  // Mouse handlers for draw mode
  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!drawMode || locked) return;
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!pos) return;
      setDrawStart(pos);
      setDrawCurrent(pos);
    },
    [drawMode, locked]
  );

  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!drawMode || !drawStart || locked) return;
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!pos) return;
      setDrawCurrent(pos);
    },
    [drawMode, drawStart, locked]
  );

  const handleMouseUp = useCallback(() => {
    if (!drawMode || !drawStart || !drawCurrent || locked) return;
    const x = Math.min(drawStart.x, drawCurrent.x);
    const y = Math.min(drawStart.y, drawCurrent.y);
    const width = Math.abs(drawCurrent.x - drawStart.x);
    const height = Math.abs(drawCurrent.y - drawStart.y);

    if (width > 20 && height > 20) {
      // Check if we're in add-on draw mode
      if (addOnDrawMode) {
        // Calculate area in sqft (using pixels as proxy - user can adjust in estimate)
        // Assuming roughly 1 pixel = 1mm for estimation, then convert to sqft
        const areaSqft = (width * height) / (304.8 * 304.8); // 304.8mm per foot
        const lengthRft = Math.max(width, height) / 304.8;

        addDrawnAddOn({
          addOnType: addOnDrawMode,
          box: { x, y, width, height, rotation: 0, source: "manual" },
          areaSqft: Math.round(areaSqft * 100) / 100,
          lengthRft: Math.round(lengthRft * 100) / 100,
          unitCount: 1,
        });
        // addDrawnAddOn already exits draw mode
      } else {
        // Normal wardrobe drawing
        setWardrobeBox({ x, y, width, height, rotation: 0, source: "manual" });
        // Auto-save immediately after drawing
        // Use setTimeout to ensure state is updated before saving
        setTimeout(() => {
          saveCurrentUnitAndAddNew();
          setIsSelected(true);
          setActiveEditPart("shutter");
        }, 0);
      }
    }
    setDrawStart(null);
    setDrawCurrent(null);
    if (!addOnDrawMode) {
      setDrawMode(false);
    }
  }, [
    drawMode,
    drawStart,
    drawCurrent,
    locked,
    addOnDrawMode,
    addDrawnAddOn,
    setWardrobeBox,
    saveCurrentUnitAndAddNew,
    setIsSelected,
    setActiveEditPart,
    setDrawMode,
  ]);

  // Keyboard event handler - only works when canvas is focused
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Only handle shortcuts when canvas is focused
      if (!canvasFocused) return;

      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const nudgeAmount = isShift ? 10 : 1;

      // Ctrl+A - Select all units
      if (isCtrl && e.key === "a") {
        e.preventDefault();
        useDesignCanvasStore.getState().selectAllUnits();
        return;
      }

      // Ctrl+D - Deselect all
      if (isCtrl && e.key === "d") {
        e.preventDefault();
        useDesignCanvasStore.getState().clearUnitSelection();
        return;
      }

      // Ctrl+Z - Undo
      if (isCtrl && e.key === "z" && !isShift) {
        e.preventDefault();
        undo();
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z - Redo
      if ((isCtrl && e.key === "y") || (isCtrl && e.key === "z" && isShift)) {
        e.preventDefault();
        redo();
        return;
      }

      // Delete or Backspace - Delete selected units
      if (e.key === "Delete" || e.key === "Backspace") {
        if (e.repeat) return; // Prevent repeated deletion when key is held
        e.preventDefault();
        // If multiple units selected, delete all selected
        if (selectedUnitIndices.length > 1) {
          deleteSelectedUnits();
        } else {
          deleteCurrentUnit();
        }
        return;
      }

      // Escape - Cancel draw mode
      if (e.key === "Escape") {
        e.preventDefault();
        if (drawMode) {
          setDrawMode(false);
          setDrawStart(null);
          setDrawCurrent(null);
        }
        return;
      }

      // Arrow keys - Nudge unit
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        nudgeUnit(-nudgeAmount, 0);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nudgeUnit(nudgeAmount, 0);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        nudgeUnit(0, -nudgeAmount);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        nudgeUnit(0, nudgeAmount);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canvasFocused,
    undo,
    redo,
    deleteCurrentUnit,
    deleteSelectedUnits,
    selectedUnitIndices,
    nudgeUnit,
    drawMode,
    setDrawMode,
  ]);

  return {
    drawStart,
    drawCurrent,
    setDrawStart,
    setDrawCurrent,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    deleteCurrentUnit,
    nudgeUnit,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };
}
