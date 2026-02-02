/**
 * useQuotation2DDrawing
 *
 * Hook for canvas drawing functionality: mouse handlers, keyboard shortcuts.
 */

import { useState, useCallback, useEffect } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { useDesignCanvasStore } from "../../../store/v2/useDesignCanvasStore";
import { useQuotationMetaStore } from "../../../store/v2/useQuotationMetaStore";

type DrawModeType = "shutter" | "shutter_loft" | "loft_only" | "iso_kitchen";

interface UseQuotation2DDrawingProps {
  canvasFocused: boolean;
}

interface UseQuotation2DDrawingReturn {
  drawStart: { x: number; y: number } | null;
  drawCurrent: { x: number; y: number } | null;
  drawModeType: DrawModeType;
  setDrawModeType: (type: DrawModeType) => void;
  handleMouseDown: (e: KonvaEventObject<MouseEvent>) => void;
  handleMouseMove: (e: KonvaEventObject<MouseEvent>) => void;
  handleMouseUp: () => void;
}

export function useQuotation2DDrawing({
  canvasFocused,
}: UseQuotation2DDrawingProps): UseQuotation2DDrawingReturn {
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [drawModeType, setDrawModeType] = useState<DrawModeType>("shutter");

  const {
    drawMode,
    setDrawMode,
    setWardrobeBox,
    wardrobeBox,
    drawnUnits,
    activeUnitIndex,
    selectedUnitIndices,
    selectAllUnits,
    clearUnitSelection,
    deleteDrawnUnit,
    deleteSelectedUnits,
    clearWardrobeBox,
    setLoftEnabled,
    setActiveEditPart,
    updateActiveDrawnUnit,
    saveCurrentUnitAndAddNew,
  } = useDesignCanvasStore();

  const { status } = useQuotationMetaStore();
  const locked = status === "APPROVED";

  // Drawing handlers
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
      // Set loftEnabled based on drawModeType before creating unit
      const isLoftOnlyMode = drawModeType === "loft_only";
      const hasLoft = drawModeType === "shutter_loft" || isLoftOnlyMode;

      setLoftEnabled(hasLoft);

      // setWardrobeBox now also computes areas
      setWardrobeBox({ x, y, width, height, rotation: 0, source: "manual" });

      setTimeout(() => {
        saveCurrentUnitAndAddNew();
        // After unit is created, set loftOnly flag and activeEditPart
        setTimeout(() => {
          if (isLoftOnlyMode) {
            updateActiveDrawnUnit({ loftOnly: true, loftEnabled: true });
            setActiveEditPart("loft");
          } else if (hasLoft) {
            updateActiveDrawnUnit({ loftEnabled: true, loftOnly: false });
            setActiveEditPart("shutter");
          } else {
            updateActiveDrawnUnit({ loftOnly: false, loftEnabled: false });
            setActiveEditPart("shutter");
          }
        }, 10);
      }, 0);
    }
    setDrawStart(null);
    setDrawCurrent(null);
    setDrawMode(false);
  }, [
    drawMode,
    drawStart,
    drawCurrent,
    locked,
    drawModeType,
    setLoftEnabled,
    setWardrobeBox,
    saveCurrentUnitAndAddNew,
    updateActiveDrawnUnit,
    setActiveEditPart,
    setDrawMode,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (!canvasFocused) return;

      const isCtrl = e.ctrlKey || e.metaKey;

      if (isCtrl && e.key === "a") {
        e.preventDefault();
        selectAllUnits();
        return;
      }

      if (isCtrl && e.key === "d") {
        e.preventDefault();
        clearUnitSelection();
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (e.repeat) return;
        e.preventDefault();
        if (selectedUnitIndices.length > 1) {
          deleteSelectedUnits();
        } else if (activeUnitIndex >= 0 && activeUnitIndex < drawnUnits.length) {
          deleteDrawnUnit(activeUnitIndex);
        } else if (wardrobeBox) {
          // clearWardrobeBox now has logic
          clearWardrobeBox();
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        if (drawMode) {
          setDrawMode(false);
          setDrawStart(null);
          setDrawCurrent(null);
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canvasFocused,
    drawnUnits,
    activeUnitIndex,
    selectedUnitIndices,
    wardrobeBox,
    drawMode,
    selectAllUnits,
    clearUnitSelection,
    deleteDrawnUnit,
    deleteSelectedUnits,
    clearWardrobeBox,
    setDrawMode,
  ]);

  return {
    drawStart,
    drawCurrent,
    drawModeType,
    setDrawModeType,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
