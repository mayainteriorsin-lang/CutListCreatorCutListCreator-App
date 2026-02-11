/**
 * useQuotation2DDrawing
 *
 * Hook for canvas drawing functionality: mouse handlers, keyboard shortcuts.
 */

import { useState, useCallback, useEffect } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import { useDesignCanvasStore } from "../../../store/v2/useDesignCanvasStore";
import { useQuotationMetaStore } from "../../../store/v2/useQuotationMetaStore";

type DrawModeType = "shutter" | "shutter_loft" | "loft_only" | "carcass" | "carcass_loft" | "iso_kitchen";

interface UseQuotation2DDrawingProps {
  canvasFocused: boolean;
}

interface UseQuotation2DDrawingReturn {
  drawStart: { x: number; y: number } | null;
  drawCurrent: { x: number; y: number } | null;
  drawModeType: DrawModeType;
  setDrawModeType: (type: DrawModeType) => void;
  handleMouseDown: (e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  handleMouseMove: (e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  handleMouseUp: () => void;
  handleTouchStart: (e: KonvaEventObject<TouchEvent>) => void;
  handleTouchMove: (e: KonvaEventObject<TouchEvent>) => void;
  handleTouchEnd: () => void;
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
    setLoftBox,
    setActiveEditPart,
    updateActiveDrawnUnit,
    saveCurrentUnitAndAddNew,
  } = useDesignCanvasStore();

  const { status } = useQuotationMetaStore();
  const locked = status === "APPROVED";

  // Drawing handlers - support both mouse and touch events
  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
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
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!drawMode || !drawStart || locked) return;
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!pos) return;
      setDrawCurrent(pos);
    },
    [drawMode, drawStart, locked]
  );

  // Touch event handlers (for mobile)
  const handleTouchStart = useCallback(
    (e: KonvaEventObject<TouchEvent>) => {
      if (!drawMode || locked) return;
      // Prevent scrolling while drawing
      e.evt.preventDefault();
      const stage = e.target.getStage();
      const pos = stage?.getPointerPosition();
      if (!pos) return;
      setDrawStart(pos);
      setDrawCurrent(pos);
    },
    [drawMode, locked]
  );

  const handleTouchMove = useCallback(
    (e: KonvaEventObject<TouchEvent>) => {
      if (!drawMode || !drawStart || locked) return;
      e.evt.preventDefault();
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
      // Determine unit type and loft settings based on drawModeType
      const isLoftOnlyMode = drawModeType === "loft_only";
      const hasLoft = drawModeType === "shutter_loft" || drawModeType === "carcass_loft" || isLoftOnlyMode;
      const isCarcassMode = drawModeType === "carcass" || drawModeType === "carcass_loft";
      const unitType = isCarcassMode ? "wardrobe_carcass" : "wardrobe";

      // Calculate loft box dimensions (loft is ~25% of total height, positioned above main box)
      const loftHeightRatio = 0.25;
      const loftHeight = height * loftHeightRatio;

      // Set loft enabled state
      setLoftEnabled(hasLoft);

      // IMPORTANT: Set loftBox in store state BEFORE saving the unit
      // This ensures saveCurrentUnitAndAddNew captures the loftBox
      if (isLoftOnlyMode) {
        // For loft-only, the loftBox IS the main box
        setLoftBox({
          x,
          y,
          width,
          height,
          rotation: 0,
          dragEdge: null,
          isDragging: false,
          locked: false,
        });
      } else if (hasLoft) {
        // Create loftBox positioned above the main shutter area
        setLoftBox({
          x,
          y, // Loft is at top (same y as drawn box top)
          width,
          height: loftHeight,
          rotation: 0,
          dragEdge: null,
          isDragging: false,
          locked: false,
        });
      } else {
        setLoftBox(null);
      }

      // setWardrobeBox now also computes areas
      setWardrobeBox({ x, y, width, height, rotation: 0, source: "manual" });

      setTimeout(() => {
        saveCurrentUnitAndAddNew();
        // After unit is created, set additional properties
        setTimeout(() => {
          const updates: Record<string, unknown> = { unitType };
          const defaultShutterCount = 3;

          if (isLoftOnlyMode) {
            updates.loftOnly = true;
            updates.loftEnabled = true;
            updates.loftShutterCount = defaultShutterCount;
            setActiveEditPart("loft");
          } else if (hasLoft) {
            updates.loftEnabled = true;
            updates.loftOnly = false;
            updates.shutterCount = defaultShutterCount;
            updates.loftShutterCount = defaultShutterCount;
            updates.loftHeightRatio = loftHeightRatio;
            updates.loftHeightMm = 400; // Default loft height
            setActiveEditPart("shutter");
          } else {
            updates.loftOnly = false;
            updates.loftEnabled = false;
            updates.shutterCount = defaultShutterCount;
            setActiveEditPart("shutter");
          }

          // For carcass mode, set default center posts and sections
          if (isCarcassMode) {
            updates.centerPostCount = 2; // 2 center posts = 3 sections
            updates.shutterCount = 3;
            if (hasLoft) {
              updates.loftShutterCount = 3; // Match loft to carcass sections
            }
          }

          updateActiveDrawnUnit(updates);

          // Clear loftBox from store state after unit is created
          setLoftBox(null);
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
    setLoftBox,
    setWardrobeBox,
    saveCurrentUnitAndAddNew,
    updateActiveDrawnUnit,
    setActiveEditPart,
    setDrawMode,
  ]);

  // Touch end handler (calls handleMouseUp logic)
  const handleTouchEnd = useCallback(() => {
    handleMouseUp();
  }, [handleMouseUp]);

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
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
