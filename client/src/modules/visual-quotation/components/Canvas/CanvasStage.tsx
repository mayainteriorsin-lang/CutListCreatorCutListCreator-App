import { Stage, Layer, Rect, Line, Image, Text, Transformer, Group } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import { useVisualQuotationStore, WardrobeBox, CanvasViewMode } from "../../store/visualQuotationStore";
import { calculatePricing } from "../../engine/pricingEngine";
import useImage from "use-image";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Konva from "konva";
import { Maximize2, Minimize2, Move, ChevronLeft, ChevronRight, Plus, Trash2, MousePointer, ImageOff, X, IndianRupee } from "lucide-react";
import ViewModeTabs from "./ViewModeTabs";

// Get transform properties for different view modes
// intensity is 0-100, where 100 is max effect
function getViewModeTransform(viewMode: CanvasViewMode, width: number, height: number, intensity: number = 50) {
  const factor = intensity / 100; // Convert to 0-1 range

  switch (viewMode) {
    case "isometric":
      // Isometric: rotate and skew to create 3D effect
      return {
        rotation: -15 * factor,
        scaleX: 1,
        scaleY: 1 - (0.15 * factor), // 0.85 at max
        skewX: 0.3 * factor,
        skewY: 0,
        offsetX: width * 0.1 * factor,
        offsetY: -height * 0.05 * factor,
      };
    case "top":
      // Top/bird's eye: compress vertically to simulate looking from above
      return {
        rotation: 0,
        scaleX: 1,
        scaleY: 1 - (0.5 * factor), // 0.5 at max
        skewX: 0,
        skewY: 0,
        offsetX: 0,
        offsetY: -height * 0.25 * factor,
      };
    case "perspective":
      // Perspective: slight rotation with depth effect
      return {
        rotation: -10 * factor,
        scaleX: 1,
        scaleY: 1 - (0.1 * factor), // 0.9 at max
        skewX: 0.15 * factor,
        skewY: 0,
        offsetX: width * 0.05 * factor,
        offsetY: 0,
      };
    case "front":
    default:
      // Front view: no transformation
      return {
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        skewX: 0,
        skewY: 0,
        offsetX: 0,
        offsetY: 0,
      };
  }
}

// Global stage ref for canvas capture
let globalStageRef: Konva.Stage | null = null;

/**
 * Capture the current canvas as a base64 PNG image
 */
export function captureCanvasImage(): string | null {
  if (!globalStageRef) return null;
  try {
    return globalStageRef.toDataURL({ pixelRatio: 2 });
  } catch {
    return null;
  }
}

/**
 * Capture a cropped region of the canvas as a base64 PNG image
 * @param bounds - The region to capture {x, y, width, height}
 * @param padding - Extra padding around the bounds (default 20px)
 */
export function captureCanvasRegion(
  bounds: { x: number; y: number; width: number; height: number },
  padding = 20
): string | null {
  if (!globalStageRef) return null;
  try {
    const x = Math.max(0, bounds.x - padding);
    const y = Math.max(0, bounds.y - padding);
    const width = bounds.width + padding * 2;
    const height = bounds.height + padding * 2;
    return globalStageRef.toDataURL({
      pixelRatio: 2,
      x,
      y,
      width,
      height,
    });
  } catch {
    return null;
  }
}
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// History state for undo/redo
interface HistoryState {
  wardrobeBox: WardrobeBox | undefined;
}

const MAX_HISTORY = 50;
const MIN_SIZE = 20;


// Unit type labels for display
const UNIT_TYPE_LABELS: Record<string, string> = {
  wardrobe: "Wardrobe",
  kitchen: "Kitchen",
  tv_unit: "TV Unit",
  dresser: "Dresser",
  other: "Other",
};

export default function CanvasStage() {
  const {
    wardrobeBox,
    loftBox,
    shutterDividerXs,
    loftDividerXs,
    roomPhoto,
    drawMode,
    edgeResizeOnly,
    locked,
    setWardrobeBox,
    setDrawMode,
    clearWardrobeBox,
    clearRoomPhoto,
    // Multi-unit state
    drawnUnits,
    activeUnitIndex,
    unitType,
    saveCurrentUnitAndAddNew,
    setActiveUnitIndex,
    deleteDrawnUnit,
    // Active edit part (for estimate display)
    activeEditPart,
    setActiveEditPart,
    // Multi-room quotation
    quotationRooms,
    activeRoomIndex,
    addQuotationRoom,
    setActiveRoomIndex,
    deleteQuotationRoom,
    // Pricing
    sqftRate,
    // Canvas view mode
    canvasViewMode,
    viewIntensity,
  } = useVisualQuotationStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [photoImage] = useImage(roomPhoto?.src || "");
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const [isSelected, setIsSelected] = useState(false); // Track if current unit is selected
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Use store's activeEditPart instead of local state for estimate sync
  const selectedPart = activeEditPart === "shutter" ? "wardrobe" : "loft";

  // Calculate grand total across all rooms for top-right badge
  const grandTotal = useMemo(() => {
    if (quotationRooms.length === 0) {
      // No rooms yet - calculate from current drawnUnits
      const validUnits = drawnUnits.filter(u => u.widthMm > 0 && u.heightMm > 0);
      const price = calculatePricing(validUnits, sqftRate);
      const gst = price.subtotal * 0.18;
      return Math.round(price.subtotal + gst);
    }

    let totalSubtotal = 0;
    quotationRooms.forEach((room, index) => {
      const roomUnits = index === activeRoomIndex ? drawnUnits : room.drawnUnits;
      const roomValidUnits = roomUnits.filter(u => u.widthMm > 0 && u.heightMm > 0);
      const roomPrice = calculatePricing(roomValidUnits, sqftRate);
      totalSubtotal += roomPrice.subtotal;
    });
    const totalGst = totalSubtotal * 0.18;
    return Math.round(totalSubtotal + totalGst);
  }, [quotationRooms, activeRoomIndex, drawnUnits, sqftRate]);

  // Refs for Transformer
  const wardrobeRefs = useRef<Map<string, Konva.Rect>>(new Map());
  const loftRefs = useRef<Map<string, Konva.Rect>>(new Map());
  const transformerRef = useRef<Konva.Transformer>(null);
  const stageRef = useRef<Konva.Stage>(null);

  // Set global stage ref for canvas capture
  useEffect(() => {
    globalStageRef = stageRef.current;
    return () => {
      globalStageRef = null;
    };
  }, []);

  // Attach transformer to selected shape
  useEffect(() => {
    if (!transformerRef.current) return;

    const activeUnit = drawnUnits[activeUnitIndex];
    if (!activeUnit || !isSelected || locked) {
      transformerRef.current.nodes([]);
      return;
    }

    let node: Konva.Rect | undefined;
    if (selectedPart === "wardrobe") {
      node = wardrobeRefs.current.get(activeUnit.id);
    } else if (selectedPart === "loft" && activeUnit.loftEnabled) {
      node = loftRefs.current.get(activeUnit.id);
    }

    if (node) {
      transformerRef.current.nodes([node]);
      transformerRef.current.getLayer()?.batchDraw();
    } else {
      transformerRef.current.nodes([]);
    }
  }, [activeUnitIndex, selectedPart, isSelected, drawnUnits, locked]);

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
  }, [wardrobeBox]);

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
  const nudgeUnit = useCallback((dx: number, dy: number) => {
    if (locked) return;

    const activeDrawnUnit = drawnUnits[activeUnitIndex];
    if (activeDrawnUnit) {
      // Nudge saved unit - update via store
      useVisualQuotationStore.setState((s) => {
        const units = [...s.drawnUnits];
        const unit = units[activeUnitIndex];
        if (unit) {
          units[activeUnitIndex] = {
            ...unit,
            box: {
              ...unit.box,
              x: unit.box.x + dx,
              y: unit.box.y + dy,
            },
          };
        }
        return { drawnUnits: units };
      });
    } else if (wardrobeBox) {
      // Nudge current wardrobe box
      setWardrobeBox({
        ...wardrobeBox,
        x: wardrobeBox.x + dx,
        y: wardrobeBox.y + dy,
      });
    }
  }, [locked, drawnUnits, activeUnitIndex, wardrobeBox, setWardrobeBox]);

  // Delete current selected part - loft only if loft selected, wardrobe unit if wardrobe selected
  const deleteCurrentUnit = useCallback(() => {
    if (locked) return;

    // Get current state directly from store to avoid stale closure issues
    const state = useVisualQuotationStore.getState();
    const currentUnits = state.drawnUnits;
    const currentIndex = state.activeUnitIndex;

    // Check if we have a valid unit selected
    if (currentUnits.length > 0 && currentIndex >= 0 && currentIndex < currentUnits.length) {
      const activeUnit = currentUnits[currentIndex];

      // If loft is selected and unit has loft, only remove the loft
      if (selectedPart === "loft" && activeUnit?.loftEnabled && activeUnit?.loftBox) {
        useVisualQuotationStore.setState((s) => {
          const units = [...s.drawnUnits];
          const unit = units[currentIndex];
          if (unit) {
            units[currentIndex] = {
              ...unit,
              loftEnabled: false,
              loftBox: undefined,
              loftDividerXs: [],
            };
          }
          return {
            drawnUnits: units,
            loftEnabled: false,
            loftBox: undefined,
            loftDividerXs: [],
          };
        });
        // Switch selection to wardrobe after deleting loft
        setActiveEditPart("shutter");
      } else {
        // Delete the entire wardrobe unit
        deleteDrawnUnit(currentIndex);
      }
    } else if (state.wardrobeBox) {
      // If loft is selected in current drawing, only remove loft
      if (selectedPart === "loft" && state.loftEnabled && state.loftBox) {
        useVisualQuotationStore.setState(() => ({
          loftEnabled: false,
          loftBox: undefined,
          loftDividerXs: [],
        }));
        setActiveEditPart("shutter");
      } else {
        clearWardrobeBox();
      }
    }
  }, [locked, selectedPart, deleteDrawnUnit, clearWardrobeBox]);

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const nudgeAmount = isShift ? 10 : 1;

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

      // Delete or Backspace - Delete unit (ignore key repeat to prevent deleting all)
      if (e.key === "Delete" || e.key === "Backspace") {
        if (e.repeat) return; // Prevent repeated deletion when key is held
        e.preventDefault();
        deleteCurrentUnit();
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
  }, [undo, redo, deleteCurrentUnit, nudgeUnit, drawMode, setDrawMode]);

  // Responsive canvas sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: Math.max(400, width), height: Math.max(300, height) });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Photo scaling
  let photoScale = 1;
  let photoOffsetX = 0;
  let photoOffsetY = 0;
  let renderWidth = 0;
  let renderHeight = 0;

  if (roomPhoto) {
    photoScale = Math.min(dimensions.width / roomPhoto.width, dimensions.height / roomPhoto.height);
    renderWidth = roomPhoto.width * photoScale;
    renderHeight = roomPhoto.height * photoScale;
    photoOffsetX = (dimensions.width - renderWidth) / 2;
    photoOffsetY = (dimensions.height - renderHeight) / 2;
  }

  // Mouse handlers for draw mode
  const handleMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (!drawMode || locked) return;
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;
    setDrawStart(pos);
    setDrawCurrent(pos);
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (!drawMode || !drawStart || locked) return;
    const stage = e.target.getStage();
    const pos = stage?.getPointerPosition();
    if (!pos) return;
    setDrawCurrent(pos);
  };

  const handleMouseUp = () => {
    if (!drawMode || !drawStart || !drawCurrent || locked) return;
    const x = Math.min(drawStart.x, drawCurrent.x);
    const y = Math.min(drawStart.y, drawCurrent.y);
    const width = Math.abs(drawCurrent.x - drawStart.x);
    const height = Math.abs(drawCurrent.y - drawStart.y);

    if (width > 20 && height > 20) {
      // Set the wardrobe box first
      setWardrobeBox({ x, y, width, height, rotation: 0, source: "manual" });
      // Auto-save immediately after drawing
      // Use setTimeout to ensure state is updated before saving
      setTimeout(() => {
        saveCurrentUnitAndAddNew();
        setIsSelected(true);
        setActiveEditPart("shutter");
      }, 0);
    }
    setDrawStart(null);
    setDrawCurrent(null);
    setDrawMode(false);
  };

  // Add another unit - enters draw mode for new unit
  const handleAddAnother = useCallback(() => {
    if (locked) return;
    // Enter draw mode for new unit
    setDrawMode(true);
    setIsSelected(false);
    setActiveEditPart("shutter");
  }, [locked, setDrawMode]);

  return (
    <div className={cn(
      "flex-1 min-h-0 flex flex-col rounded-xl overflow-hidden border border-slate-700/60 bg-gradient-to-b from-slate-800 to-slate-800/95 shadow-2xl shadow-black/20",
      isFullscreen && "fixed inset-0 z-50 rounded-none border-0"
    )}>
      {/* Merged Cinema Toolbar - Enhanced with better visual hierarchy */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-1.5 border-b border-slate-700/60 bg-slate-800/98 backdrop-blur-sm">
        {/* Left: Room tabs + View Mode */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {/* Room Tabs */}
          {quotationRooms.map((room, index) => (
            <div
              key={room.id}
              className={cn(
                "group flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium cursor-pointer transition-all duration-200",
                index === activeRoomIndex
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                  : "bg-slate-700/60 text-slate-300 hover:bg-slate-600 hover:text-white"
              )}
              onClick={() => setActiveRoomIndex(index)}
            >
              <span>{room.name}</span>
              {quotationRooms.length > 1 && (
                <button
                  className="ml-0.5 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-500/20 hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteQuotationRoom(index);
                  }}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          ))}
          {quotationRooms.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all duration-200 rounded-md"
              onClick={() => addQuotationRoom("wardrobe")}
              title="Add new room"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
          {/* Separator */}
          {quotationRooms.length > 0 && <div className="w-px h-5 bg-slate-600/50 mx-1.5" />}
          {/* View Mode Tabs */}
          <ViewModeTabs />
        </div>

        {/* Center: Unit Navigation - Enhanced */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-700/40 rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-slate-600 rounded-md transition-all duration-200 disabled:opacity-30"
              disabled={drawnUnits.length === 0 || activeUnitIndex === 0}
              onClick={() => setActiveUnitIndex(activeUnitIndex - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <div className="flex items-center gap-1 px-2 py-0.5 text-[11px] min-w-[70px] justify-center">
              <span className="font-semibold text-white">
                Unit {drawnUnits.length === 0 ? 1 : activeUnitIndex + 1}
              </span>
              <span className="text-slate-500 font-medium">
                / {Math.max(1, drawnUnits.length + (wardrobeBox && drawnUnits.length === activeUnitIndex ? 1 : 0))}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-slate-600 rounded-md transition-all duration-200 disabled:opacity-30"
              disabled={drawnUnits.length === 0 || activeUnitIndex >= drawnUnits.length - 1}
              onClick={() => setActiveUnitIndex(activeUnitIndex + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="w-px h-5 bg-slate-600/50 mx-0.5" />

          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all duration-200 font-medium rounded-md"
            disabled={locked || drawMode}
            onClick={handleAddAnother}
          >
            <Plus className="h-3 w-3 mr-0.5" />
            Add Unit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all duration-200 rounded-md"
            disabled={locked || (!wardrobeBox && !drawnUnits[activeUnitIndex])}
            onClick={() => {
              deleteCurrentUnit();
              setIsSelected(false);
            }}
            title="Delete unit"
          >
            <Trash2 className="h-3 w-3" />
          </Button>

          {/* Status badges - Enhanced */}
          {drawMode && (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-600 text-white rounded-md shadow-md shadow-blue-500/30 animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
              Drawing
            </span>
          )}
          {isSelected && !drawMode && (
            <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-600 text-white rounded-md shadow-md shadow-emerald-500/30 flex items-center gap-1">
              <MousePointer className="h-3 w-3" />
              Selected
            </span>
          )}
        </div>

        {/* Right: Total + Fullscreen - Enhanced */}
        <div className="flex items-center gap-2">
          {/* Grand Total Badge - Enhanced */}
          {grandTotal > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-[11px] font-bold shadow-md shadow-emerald-500/25">
              <IndianRupee className="h-3.5 w-3.5" />
              {grandTotal.toLocaleString("en-IN")}
            </div>
          )}
          <div className="w-px h-5 bg-slate-600/50" />
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 w-7 p-0 rounded-md transition-all duration-200",
              isFullscreen
                ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                : "text-slate-400 hover:text-white hover:bg-slate-700"
            )}
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Unit Tabs Bar - Enhanced with better styling */}
      {(drawnUnits.length > 0 || wardrobeBox) && (
        <div className="flex-shrink-0 px-3 py-1.5 border-b border-slate-700/40 bg-slate-800/30 flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[9px] text-slate-500 uppercase font-semibold tracking-wide mr-1">Units:</span>
          {drawnUnits.map((unit, index) => (
            <button
              key={unit.id}
              onClick={() => setActiveUnitIndex(index)}
              className={cn(
                "px-2 py-0.5 text-[10px] font-medium rounded-md transition-all duration-200",
                index === activeUnitIndex
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
                  : "bg-slate-700/50 text-slate-400 hover:bg-slate-600 hover:text-white"
              )}
            >
              {UNIT_TYPE_LABELS[unit.unitType] || unit.unitType}
            </button>
          ))}
          {wardrobeBox && drawnUnits.length === activeUnitIndex && (
            <button className="px-2 py-0.5 text-[10px] font-medium bg-blue-600 text-white rounded-md shadow-md shadow-blue-500/25">
              {UNIT_TYPE_LABELS[unitType] || unitType}
              <span className="ml-0.5 text-blue-300">*</span>
            </button>
          )}
        </div>
      )}

      {/* Canvas Container */}
      <div
        ref={containerRef}
        className={cn(
          "flex-1 min-h-0 relative overflow-hidden",
          drawMode ? "cursor-crosshair" : "cursor-default"
        )}
      >
        {/* 2D Konva Canvas */}
        <Stage
          ref={stageRef}
          width={dimensions.width}
          height={dimensions.height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <Layer>
            {/* Background - click to deselect (outside transform group) */}
            <Rect
              x={0}
              y={0}
              width={dimensions.width}
              height={dimensions.height}
              fill="#f8fafc"
              onClick={() => {
                setIsSelected(false);
                setActiveEditPart("shutter");
              }}
            />

            {/* Transformed content group - applies view mode transformation */}
            {(() => {
              const transform = getViewModeTransform(canvasViewMode, dimensions.width, dimensions.height, viewIntensity);
              return (
                <Group
                  x={dimensions.width / 2}
                  y={dimensions.height / 2}
                  offsetX={dimensions.width / 2 - transform.offsetX}
                  offsetY={dimensions.height / 2 - transform.offsetY}
                  rotation={transform.rotation}
                  scaleX={transform.scaleX}
                  scaleY={transform.scaleY}
                  skewX={transform.skewX}
                  skewY={transform.skewY}
                >

            {/* Grid pattern when no photo */}
            {!roomPhoto && (
              <>
                {Array.from({ length: Math.ceil(dimensions.width / 60) }).map((_, i) => (
                  <Line
                    key={`v-${i}`}
                    points={[i * 60, 0, i * 60, dimensions.height]}
                    stroke="#e2e8f0"
                    strokeWidth={1}
                  />
                ))}
                {Array.from({ length: Math.ceil(dimensions.height / 60) }).map((_, i) => (
                  <Line
                    key={`h-${i}`}
                    points={[0, i * 60, dimensions.width, i * 60]}
                    stroke="#e2e8f0"
                    strokeWidth={1}
                  />
                ))}
              </>
            )}

            {/* Room Photo */}
            {roomPhoto && photoImage && (
              <Image
                image={photoImage}
                x={photoOffsetX}
                y={photoOffsetY}
                width={renderWidth}
                height={renderHeight}
              />
            )}

            {/* Draw Preview Rectangle */}
            {drawMode && drawStart && drawCurrent && (
              <Rect
                x={Math.min(drawStart.x, drawCurrent.x)}
                y={Math.min(drawStart.y, drawCurrent.y)}
                width={Math.abs(drawCurrent.x - drawStart.x)}
                height={Math.abs(drawCurrent.y - drawStart.y)}
                stroke="#3b82f6"
                strokeWidth={2}
                dash={[6, 4]}
                fill="rgba(59, 130, 246, 0.1)"
              />
            )}

            {/* Previously saved units - same interactive rendering for all view modes */}
            {drawnUnits.map((unit, index) => {
              const isActive = index === activeUnitIndex;

              // Full interactive rendering with drag/resize - works in all view modes
              return (
                <React.Fragment key={unit.id}>
                  {/* Selection is handled by Transformer */}
                  {/* Wardrobe with realistic shutter panels - grid layout */}
                  {(() => {
                    const box = unit.box;
                    const GAP = 3; // gap between shutters
                    const FRAME = 4; // outer frame thickness

                    // Calculate vertical (column) boundaries from shutterDividerXs
                    const verticalDividers = [...unit.shutterDividerXs].sort((a, b) => a - b);
                    const columnEdges = [box.x, ...verticalDividers, box.x + box.width];

                    // Calculate horizontal (row) boundaries from horizontalDividerYs
                    const horizontalDividers = unit.horizontalDividerYs ? [...unit.horizontalDividerYs].sort((a, b) => a - b) : [];
                    const rowEdges = [box.y, ...horizontalDividers, box.y + box.height];

                    return (
                      <>
                        {/* Outer frame/carcass - transformable */}
                        <Rect
                          ref={(node) => {
                            if (node) wardrobeRefs.current.set(unit.id, node);
                          }}
                          x={box.x}
                          y={box.y}
                          width={box.width}
                          height={box.height}
                          stroke="#4b5563"
                          strokeWidth={2}
                          fill="#d1d5db"
                          opacity={isActive ? 1 : 0.7}
                          draggable={isActive && !locked}
                          onClick={() => {
                            setActiveUnitIndex(index);
                            setIsSelected(true);
                            setActiveEditPart("shutter");
                          }}
                          onDragEnd={(e) => {
                            const node = e.target;
                            useVisualQuotationStore.setState((s) => {
                              const units = [...s.drawnUnits];
                              const u = units[index];
                              if (!u) return s;
                              const newX = node.x();
                              const newY = node.y();
                              // Recalculate vertical dividers for new position
                              const count = u.shutterCount;
                              const newDividers = count > 1
                                ? Array.from({ length: count - 1 }, (_, i) => newX + (u.box.width / count) * (i + 1))
                                : [];
                              // Recalculate horizontal dividers for new position
                              const rowCount = u.sectionCount || 1;
                              const newHDividers = rowCount > 1
                                ? Array.from({ length: rowCount - 1 }, (_, i) => newY + (u.box.height / rowCount) * (i + 1))
                                : [];
                              units[index] = { ...u, box: { ...u.box, x: newX, y: newY }, shutterDividerXs: newDividers, horizontalDividerYs: newHDividers };
                              return { drawnUnits: units };
                            });
                          }}
                          onTransformEnd={(e) => {
                            const node = e.target;
                            const scaleX = node.scaleX();
                            const scaleY = node.scaleY();
                            // Reset scale and apply to width/height
                            node.scaleX(1);
                            node.scaleY(1);
                            const newX = node.x();
                            const newY = node.y();
                            const newWidth = Math.max(MIN_SIZE, node.width() * scaleX);
                            const newHeight = Math.max(MIN_SIZE, node.height() * scaleY);
                            useVisualQuotationStore.setState((s) => {
                              const units = [...s.drawnUnits];
                              const u = units[index];
                              if (!u) return s;
                              // Recalculate vertical dividers for new size
                              const count = u.shutterCount;
                              const newDividers = count > 1
                                ? Array.from({ length: count - 1 }, (_, i) => newX + (newWidth / count) * (i + 1))
                                : [];
                              // Recalculate horizontal dividers for new size
                              const rowCount = u.sectionCount || 1;
                              const newHDividers = rowCount > 1
                                ? Array.from({ length: rowCount - 1 }, (_, i) => newY + (newHeight / rowCount) * (i + 1))
                                : [];
                              units[index] = { ...u, box: { ...u.box, x: newX, y: newY, width: newWidth, height: newHeight }, shutterDividerXs: newDividers, horizontalDividerYs: newHDividers };
                              return { drawnUnits: units };
                            });
                          }}
                        />
                        {/* Individual shutter panels - grid of columns x rows */}
                        {rowEdges.slice(0, -1).map((topEdge, rowIdx) => {
                          const bottomEdge = rowEdges[rowIdx + 1]!;
                          const isFirstRow = rowIdx === 0;
                          const isLastRow = rowIdx === rowEdges.length - 2;

                          return columnEdges.slice(0, -1).map((leftEdge, colIdx) => {
                            const rightEdge = columnEdges[colIdx + 1]!;
                            const isFirstCol = colIdx === 0;
                            const isLastCol = colIdx === columnEdges.length - 2;

                            // Calculate shutter position with gaps and frame
                            const shutterX = leftEdge + GAP / 2 + (isFirstCol ? FRAME : 0);
                            const shutterW = rightEdge - leftEdge - GAP - (isFirstCol ? FRAME : 0) - (isLastCol ? FRAME : 0);
                            const shutterY = topEdge + GAP / 2 + (isFirstRow ? FRAME : 0);
                            const shutterH = bottomEdge - topEdge - GAP - (isFirstRow ? FRAME : 0) - (isLastRow ? FRAME : 0);

                            // Handle position - alternate based on column for door swing look
                            const handleX = colIdx % 2 === 0 ? shutterX + shutterW - 12 : shutterX + 12;
                            const handleY = shutterY + shutterH / 2;

                            return (
                              <React.Fragment key={`shutter-${unit.id}-${rowIdx}-${colIdx}`}>
                                {/* Shutter panel */}
                                <Rect
                                  x={shutterX}
                                  y={shutterY}
                                  width={Math.max(10, shutterW)}
                                  height={Math.max(10, shutterH)}
                                  fill="#e5e7eb"
                                  stroke="#9ca3af"
                                  strokeWidth={1}
                                  cornerRadius={2}
                                  listening={false}
                                />
                                {/* Handle */}
                                <Line
                                  points={[handleX, handleY - 15, handleX, handleY + 15]}
                                  stroke="#6b7280"
                                  strokeWidth={3}
                                  lineCap="round"
                                  listening={false}
                                />
                              </React.Fragment>
                            );
                          });
                        })}
                      </>
                    );
                  })()}
                  {/* Resize is now handled via Transformer */}
                  {/* Invisible draggable divider zones for adjusting shutter widths */}
                  {isActive && !locked && unit.shutterDividerXs.map((xPos, divIdx) => {
                    const clampedX = Math.max(unit.box.x + 5, Math.min(xPos, unit.box.x + unit.box.width - 5));
                    return (
                      <Rect
                        key={`unit-${unit.id}-div-${divIdx}`}
                        x={clampedX - 10}
                        y={unit.box.y}
                        width={20}
                        height={unit.box.height}
                        fill="transparent"
                        draggable
                        dragBoundFunc={(pos) => ({ x: pos.x, y: unit.box.y })}
                        onDragEnd={(e) => {
                          const pos = e.target.getStage()?.getPointerPosition();
                          if (!pos) return;
                          const newX = Math.max(unit.box.x + 20, Math.min(pos.x, unit.box.x + unit.box.width - 20));
                          useVisualQuotationStore.setState((s) => {
                            const units = [...s.drawnUnits];
                            const targetUnit = units[index];
                            if (targetUnit) {
                              const newDividers = [...targetUnit.shutterDividerXs];
                              newDividers[divIdx] = newX;
                              units[index] = { ...targetUnit, shutterDividerXs: newDividers };
                            }
                            return { drawnUnits: units };
                          });
                          e.target.position({ x: clampedX - 10, y: unit.box.y });
                        }}
                      />
                    );
                  })}
                  {/* Invisible draggable zones for horizontal dividers */}
                  {isActive && !locked && unit.horizontalDividerYs && unit.horizontalDividerYs.map((yPos, hDivIdx) => {
                    const clampedY = Math.max(unit.box.y + 5, Math.min(yPos, unit.box.y + unit.box.height - 5));
                    return (
                      <Rect
                        key={`unit-${unit.id}-hdiv-zone-${hDivIdx}`}
                        x={unit.box.x}
                        y={clampedY - 10}
                        width={unit.box.width}
                        height={20}
                        fill="transparent"
                        draggable
                        dragBoundFunc={(pos) => ({ x: unit.box.x, y: pos.y })}
                        onDragEnd={(e) => {
                          const pos = e.target.getStage()?.getPointerPosition();
                          if (!pos) return;
                          const newY = Math.max(unit.box.y + 20, Math.min(pos.y, unit.box.y + unit.box.height - 20));
                          useVisualQuotationStore.setState((s) => {
                            const units = [...s.drawnUnits];
                            const targetUnit = units[index];
                            if (targetUnit && targetUnit.horizontalDividerYs) {
                              const newDividers = [...targetUnit.horizontalDividerYs];
                              newDividers[hDivIdx] = newY;
                              units[index] = { ...targetUnit, horizontalDividerYs: newDividers };
                            }
                            return { drawnUnits: units };
                          });
                          e.target.position({ x: unit.box.x, y: clampedY - 10 });
                        }}
                      />
                    );
                  })}
                  {/* LOFT BOX with realistic shutter panels */}
                  {unit.loftEnabled && unit.loftBox && (() => {
                    const loftBox = unit.loftBox;
                    const GAP = 2;
                    const FRAME = 3;

                    // Calculate loft shutter boundaries from dividers
                    const loftDividers = [...unit.loftDividerXs].sort((a, b) => a - b);
                    const loftShutterEdges = [loftBox.x, ...loftDividers, loftBox.x + loftBox.width];

                    return (
                      <>
                        {/* Loft outer frame - transformable */}
                        <Rect
                          ref={(node) => {
                            if (node) loftRefs.current.set(unit.id, node);
                          }}
                          x={loftBox.x}
                          y={loftBox.y}
                          width={loftBox.width}
                          height={loftBox.height}
                          stroke="#6b7280"
                          strokeWidth={2}
                          fill="#9ca3af"
                          opacity={isActive ? 1 : 0.7}
                          draggable={isActive && !locked}
                          onClick={() => {
                            setActiveUnitIndex(index);
                            setIsSelected(true);
                            setActiveEditPart("loft");
                          }}
                          onTap={() => {
                            setActiveUnitIndex(index);
                            setIsSelected(true);
                            setActiveEditPart("loft");
                          }}
                          onDragEnd={(e) => {
                            const node = e.target;
                            useVisualQuotationStore.setState((s) => {
                              const units = [...s.drawnUnits];
                              const u = units[index];
                              if (!u?.loftBox) return s;
                              const newX = node.x();
                              const newY = node.y();
                              // Recalculate dividers for new position
                              const count = u.loftShutterCount || 3;
                              const newDividers = count > 1
                                ? Array.from({ length: count - 1 }, (_, i) => newX + (u.loftBox!.width / count) * (i + 1))
                                : [];
                              units[index] = { ...u, loftBox: { ...u.loftBox, x: newX, y: newY }, loftDividerXs: newDividers };
                              return { drawnUnits: units };
                            });
                          }}
                          onTransformEnd={(e) => {
                            const node = e.target;
                            const scaleX = node.scaleX();
                            const scaleY = node.scaleY();
                            // Reset scale and apply to width/height
                            node.scaleX(1);
                            node.scaleY(1);
                            const newX = node.x();
                            const newY = node.y();
                            const newWidth = Math.max(MIN_SIZE, node.width() * scaleX);
                            const newHeight = Math.max(MIN_SIZE, node.height() * scaleY);
                            useVisualQuotationStore.setState((s) => {
                              const units = [...s.drawnUnits];
                              const u = units[index];
                              if (!u?.loftBox) return s;
                              // Recalculate dividers for new size
                              const count = u.loftShutterCount || 3;
                              const newDividers = count > 1
                                ? Array.from({ length: count - 1 }, (_, i) => newX + (newWidth / count) * (i + 1))
                                : [];
                              units[index] = { ...u, loftBox: { ...u.loftBox, x: newX, y: newY, width: newWidth, height: newHeight }, loftDividerXs: newDividers };
                              return { drawnUnits: units };
                            });
                          }}
                        />
                        {/* Loft shutter panels */}
                        {loftShutterEdges.slice(0, -1).map((leftEdge, idx) => {
                          const rightEdge = loftShutterEdges[idx + 1]!;
                          const shutterX = leftEdge + GAP / 2 + (idx === 0 ? FRAME : 0);
                          const shutterW = rightEdge - leftEdge - GAP - (idx === 0 ? FRAME : 0) - (idx === loftShutterEdges.length - 2 ? FRAME : 0);
                          const shutterY = loftBox.y + FRAME;
                          const shutterH = loftBox.height - FRAME * 2;
                          // Small knob handle for loft
                          const handleX = shutterX + shutterW / 2;
                          const handleY = shutterY + shutterH - 10;

                          return (
                            <React.Fragment key={`loft-shutter-${unit.id}-${idx}`}>
                              <Rect
                                x={shutterX}
                                y={shutterY}
                                width={Math.max(8, shutterW)}
                                height={shutterH}
                                fill="#d1d5db"
                                stroke="#9ca3af"
                                strokeWidth={1}
                                cornerRadius={1}
                                listening={false}
                              />
                              {/* Small knob handle */}
                              <Line
                                points={[handleX - 8, handleY, handleX + 8, handleY]}
                                stroke="#6b7280"
                                strokeWidth={2}
                                lineCap="round"
                                listening={false}
                              />
                            </React.Fragment>
                          );
                        })}
                        {/* Loft resize is now handled via Transformer */}
                      </>
                    );
                  })()}
                  {/* Unit label - positioned at top of frame */}
                  <Text
                    x={unit.box.x + 8}
                    y={unit.box.y + unit.box.height - 16}
                    text={`${UNIT_TYPE_LABELS[unit.unitType] || unit.unitType} ${index + 1}`}
                    fontSize={11}
                    fill="#374151"
                    fontStyle="bold"
                  />
                </React.Fragment>
              );
            })}

            {/* Current Wardrobe Box (active/being drawn) - only show when NOT viewing a saved unit */}
            {wardrobeBox && activeUnitIndex >= drawnUnits.length && (
              <>
                {/* Selection glow effect - gray */}
                <Rect
                  x={wardrobeBox.x - 3}
                  y={wardrobeBox.y - 3}
                  width={wardrobeBox.width + 6}
                  height={wardrobeBox.height + 6}
                  stroke="rgba(100, 100, 100, 0.4)"
                  strokeWidth={6}
                  fill="transparent"
                />
                {/* Main box */}
                <Rect
                  x={wardrobeBox.x}
                  y={wardrobeBox.y}
                  width={wardrobeBox.width}
                  height={wardrobeBox.height}
                  stroke="#1f2937"
                  strokeWidth={2}
                  fill="rgba(100, 100, 100, 0.05)"
                  draggable={!locked}
                  onClick={() => setIsSelected(true)}
                  onDragMove={(e) => {
                    const pos = e.target.position();
                    useVisualQuotationStore.setState((s) => {
                      if (!s.wardrobeBox) return s;
                      // Calculate how much the box moved
                      const deltaX = pos.x - s.wardrobeBox.x;
                      // Move dividers with the box
                      const newDividers = s.shutterDividerXs.map((x) => x + deltaX);
                      return {
                        wardrobeBox: { ...s.wardrobeBox, x: pos.x, y: pos.y },
                        shutterDividerXs: newDividers,
                      };
                    });
                  }}
                />


                {/* Resize handles removed - drawing mode only for initial box creation */}

                {/* Shutter Dividers - freely draggable horizontally */}
                {shutterDividerXs.map((xPos, idx) => {
                  // Clamp divider X position to stay within the box
                  const clampedX = Math.max(wardrobeBox.x + 5, Math.min(xPos, wardrobeBox.x + wardrobeBox.width - 5));
                  return (
                    <Line
                      key={idx}
                      points={[clampedX, wardrobeBox.y + 2, clampedX, wardrobeBox.y + wardrobeBox.height - 2]}
                      stroke="#ef4444"
                      strokeWidth={3}
                      draggable={!locked}
                      hitStrokeWidth={15}
                      onDragMove={(e) => {
                        if (locked) return;
                        const stage = e.target.getStage();
                        const pos = stage?.getPointerPosition();
                        if (!pos) return;
                        // Clamp to stay within box bounds
                        const newX = Math.max(wardrobeBox.x + 5, Math.min(pos.x, wardrobeBox.x + wardrobeBox.width - 5));
                        // Reset Y position to keep line vertical
                        e.target.y(0);
                        useVisualQuotationStore.setState((s) => {
                          const newArr = [...s.shutterDividerXs];
                          newArr[idx] = newX;
                          return { shutterDividerXs: newArr };
                        });
                      }}
                      onDragEnd={(e) => {
                        // Reset position after drag
                        e.target.position({ x: 0, y: 0 });
                      }}
                    />
                  );
                })}

                {/* Label */}
                <Text
                  x={wardrobeBox.x + 8}
                  y={wardrobeBox.y + 8}
                  text="Wardrobe"
                  fontSize={11}
                  fontStyle="600"
                  fill="#1f2937"
                />
              </>
            )}

            {/* Loft Box - same black/gray color as wardrobe - only show when NOT viewing a saved unit */}
            {loftBox && activeUnitIndex >= drawnUnits.length && (
              <>
                <Rect
                  x={loftBox.x}
                  y={loftBox.y}
                  width={loftBox.width}
                  height={loftBox.height}
                  stroke="#1f2937"
                  strokeWidth={2}
                  fill="rgba(100, 100, 100, 0.05)"
                  draggable={!locked}
                  onDragMove={(e) => {
                    const pos = e.target.position();
                    useVisualQuotationStore.setState((s) => {
                      if (!s.loftBox) return s;
                      // Calculate how much the box moved
                      const deltaX = pos.x - s.loftBox.x;
                      // Move loft dividers with the box
                      const newDividers = s.loftDividerXs.map((x) => x + deltaX);
                      return {
                        loftBox: { ...s.loftBox, x: pos.x, y: pos.y },
                        loftDividerXs: newDividers,
                      };
                    });
                  }}
                />

                {/* Loft resize handles removed - use saved units with Transformer */}

                {/* Loft Dividers - same red as shutter dividers */}
                {loftDividerXs.map((xPos, idx) => {
                  const clampedX = Math.max(loftBox.x + 5, Math.min(xPos, loftBox.x + loftBox.width - 5));
                  return (
                    <Line
                      key={`loft-div-${idx}`}
                      points={[clampedX, loftBox.y + 2, clampedX, loftBox.y + loftBox.height - 2]}
                      stroke="#ef4444"
                      strokeWidth={3}
                      draggable
                      onDragMove={(e) => {
                        const stage = e.target.getStage();
                        const pos = stage?.getPointerPosition();
                        if (!pos) return;
                        const newX = Math.max(loftBox.x + 5, Math.min(pos.x, loftBox.x + loftBox.width - 5));
                        useVisualQuotationStore.setState((s) => {
                          const newArr = [...s.loftDividerXs];
                          newArr[idx] = newX;
                          return { loftDividerXs: newArr };
                        });
                      }}
                    />
                  );
                })}

                {/* Label */}
                <Text
                  x={loftBox.x + 8}
                  y={loftBox.y + 8}
                  text="Loft"
                  fontSize={11}
                  fontStyle="600"
                  fill="#1f2937"
                />
              </>
            )}
                </Group>
              );
            })()}
            {/* End of transformed content group */}

            {/* Transformer for resize handles - outside transform group for proper interaction */}
            <Transformer
              ref={transformerRef}
              rotateEnabled={false}
              enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right", "top-center", "bottom-center"]}
              boundBoxFunc={(oldBox, newBox) => {
                // Limit minimum size
                if (newBox.width < MIN_SIZE || newBox.height < MIN_SIZE) {
                  return oldBox;
                }
                return newBox;
              }}
              anchorSize={10}
              anchorCornerRadius={2}
              borderStroke="#6b7280"
              anchorStroke="#6b7280"
              anchorFill="#ffffff"
            />
          </Layer>
        </Stage>

        {/* Drawing mode overlay */}
        {drawMode && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-full shadow-lg flex items-center gap-2">
            <Move className="h-4 w-4" />
            Draw Unit {drawnUnits.length + 1} - Click and drag to draw
          </div>
        )}
      </div>

      {/* Status bar - Minimal */}
      <div className="flex-shrink-0 px-2 py-0.5 border-t border-slate-700 bg-slate-800/80 flex items-center justify-between text-[9px] text-slate-500">
        <div className="flex items-center gap-2">
          <span>
            {roomPhoto ? `${roomPhoto.width}x${roomPhoto.height}` : "No image"}
          </span>
          {roomPhoto && !locked && (
            <Button
              variant="ghost"
              size="sm"
              className="h-4 text-[8px] px-1 text-red-400 hover:text-red-300 hover:bg-slate-700"
              onClick={() => {
                if (window.confirm("Remove the uploaded image? This will also clear all drawn units.")) {
                  clearRoomPhoto();
                  setIsSelected(false);
                }
              }}
            >
              <ImageOff className="h-2.5 w-2.5" />
            </Button>
          )}
        </div>
        <span className="text-slate-600">
          {dimensions.width}x{dimensions.height}
        </span>
      </div>
    </div>
  );
}
