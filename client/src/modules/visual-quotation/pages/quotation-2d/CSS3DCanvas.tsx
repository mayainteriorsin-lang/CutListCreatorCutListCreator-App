/**
 * CSS3DCanvas Component
 * ---------------------
 * Pure CSS 3D Transforms isometric room view.
 * Div-based walls and floor with CSS perspective.
 * Lightweight alternative to canvas-based rendering.
 *
 * Optimized for large screens with bigger room and detailed wardrobe.
 * Now supports drawing Kitchen Base units directly on the floor.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { DrawnUnit } from "../../types";
import { Maximize2, RotateCcw, Plus, Minus, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import styles from "./CSS3DCanvas.module.css";

// Kitchen Base unit type for 3D drawing
interface KitchenModule {
  id: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
}

interface CSS3DCanvasProps {
  drawnUnits: DrawnUnit[];
  activeUnitIndex: number;
  setActiveUnitIndex: (index: number) => void;
  onDeleteUnit?: (index: number) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  dimensions: { width: number; height: number };
  unitType: string;
}

/**
 * CSS 3D Kitchen Base Component
 * Renders a 3D kitchen cabinet using CSS transforms
 */
const CSS3DKitchenBase: React.FC<{
  module: KitchenModule;
  isSelected?: boolean;
  onClick?: () => void;
}> = ({ module, isSelected, onClick }) => {
  const width = module.width * 50;
  const depth = module.depth * 50;
  const height = module.height * 35;

  return (
    <div
      className={cn(
        styles.kitchenBase,
        isSelected && "ring-4 ring-orange-400 ring-offset-2"
      )}
      style={{
        width: `${width}px`,
        height: `${depth}px`,
        left: `${module.x * 50 + 50}px`,
        top: `${module.y * 50 + 50}px`,
      }}
      onClick={onClick}
    >
      {/* Base (floor) */}
      <div
        className={cn(
          styles.floor,
          isSelected
            ? "bg-orange-200 border-orange-500"
            : "bg-slate-200 border-slate-400"
        )}
      />

      {/* Front face */}
      <div
        className={cn(
          styles.kitchenFront,
          "border-2",
          isSelected
            ? "bg-gradient-to-b from-orange-100 to-orange-200 border-orange-500"
            : "bg-gradient-to-b from-slate-100 to-slate-200 border-slate-500"
        )}
        style={{
          width: `${width}px`,
          height: `${height}px`,
        }}
      >
        {/* Counter top */}
        <div
          className={cn(
            "absolute left-0 right-0 top-0 h-3 border-b-2",
            isSelected
              ? "bg-orange-400 border-orange-600"
              : "bg-slate-500 border-slate-600"
          )}
        />
        {/* Cabinet doors */}
        <div className="absolute left-2 right-2 top-5 bottom-2 grid grid-cols-2 gap-1">
          <div className={cn(
            "border-2 rounded relative",
            isSelected
              ? "bg-orange-50 border-orange-400"
              : "bg-white border-slate-400"
          )}>
            <div className={cn(
              "absolute w-1.5 h-6 right-2 top-1/2 -translate-y-1/2 rounded",
              isSelected ? "bg-orange-500" : "bg-slate-500"
            )} />
          </div>
          <div className={cn(
            "border-2 rounded relative",
            isSelected
              ? "bg-orange-50 border-orange-400"
              : "bg-white border-slate-400"
          )}>
            <div className={cn(
              "absolute w-1.5 h-6 left-2 top-1/2 -translate-y-1/2 rounded",
              isSelected ? "bg-orange-500" : "bg-slate-500"
            )} />
          </div>
        </div>
      </div>

      {/* Side face */}
      <div
        className={cn(
          styles.kitchenSide,
          "border-2",
          isSelected
            ? "bg-gradient-to-b from-orange-200 to-orange-300 border-orange-500"
            : "bg-gradient-to-b from-slate-200 to-slate-300 border-slate-500"
        )}
        style={{
          width: `${depth}px`,
          height: `${height}px`,
        }}
      >
        {/* Counter top side */}
        <div
          className={cn(
            "absolute left-0 right-0 top-0 h-3 border-b-2",
            isSelected
              ? "bg-orange-400 border-orange-600"
              : "bg-slate-500 border-slate-600"
          )}
        />
      </div>

      {/* Top face (counter) */}
      <div
        className={cn(
          "absolute inset-0 border-2",
          isSelected
            ? "bg-gradient-to-br from-orange-300 to-orange-400 border-orange-600"
            : "bg-gradient-to-br from-slate-400 to-slate-500 border-slate-600"
        )}
        style={{
          transform: `translateZ(${height}px)`,
        }}
      />

      {/* Label */}
      <div
        className={styles.kitchenLabel}
        style={{
          transform: `translateX(-50%) translateZ(${height + 20}px)`,
        }}
      >
        <span className={cn(
          "px-2 py-1 rounded text-xs font-bold shadow",
          isSelected
            ? "bg-orange-500 text-white"
            : "bg-slate-600 text-white"
        )}>
          Kitchen Base
        </span>
      </div>
    </div>
  );
};

/**
 * CSS 3D Room Component - Large Screen Optimized
 * Uses pure CSS transforms for isometric projection
 */
const CSS3DRoom: React.FC<{
  activeUnit: DrawnUnit | null;
  isUnitSelected?: boolean;
  onUnitClick?: () => void;
  kitchenModules?: KitchenModule[];
  selectedModuleIds?: Set<string>;
  onModuleClick?: (id: string) => void;
  onFloorClick?: (x: number, y: number) => void;
  drawModeEnabled?: boolean;
  zoomScale?: number;
  panOffset?: { x: number; y: number };
}> = ({ activeUnit, isUnitSelected, onUnitClick, kitchenModules = [], selectedModuleIds = new Set(), onModuleClick, onFloorClick, drawModeEnabled, zoomScale = 1, panOffset = { x: 0, y: 0 } }) => {
  // Calculate wardrobe dimensions based on unit
  const shutterCount = activeUnit?.shutterCount || 3;
  const hasLoft = activeUnit?.loftEnabled;

  const handleFloorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawModeEnabled || !onFloorClick) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / 50);
    const y = Math.floor((e.clientY - rect.top) / 50);

    // Keep within floor bounds
    if (x >= 0 && x < 12 && y >= 0 && y < 9) {
      onFloorClick(x, y);
    }
  };

  return (
    <div
      className="relative w-full h-full flex items-center justify-center transition-all duration-300"
      style={{ perspective: "1800px" }}
    >
      {/* Room Container - Rotated for isometric view */}
      <div
        className={cn(
          styles.roomContainer,
          "relative"
        )}
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomScale}) rotateX(60deg) rotateZ(-45deg)`,
        }}
      >
        {/* Floor (clickable for placing modules) */}
        <div
          className={cn(
            styles.floor,
            "bg-gradient-to-br from-slate-100 to-slate-200 border-2",
            drawModeEnabled ? "border-orange-400 cursor-crosshair" : "border-slate-300"
          )}
          style={{
            boxShadow: drawModeEnabled
              ? "inset 0 0 100px rgba(251, 146, 60, 0.2)"
              : "inset 0 0 60px rgba(0,0,0,0.05)",
          }}
          onClick={handleFloorClick}
        >
          {/* Floor grid pattern */}
          <div className={styles.floorGrid} />

          {/* Kitchen Modules */}
          {kitchenModules.map((module) => (
            <CSS3DKitchenBase
              key={module.id}
              module={module}
              isSelected={selectedModuleIds.has(module.id)}
              onClick={() => onModuleClick?.(module.id)}
            />
          ))}

          {/* Draw mode indicator */}
          {drawModeEnabled && (
            <div
              className="absolute bg-orange-500 text-white px-3 py-2 rounded-lg shadow-lg font-medium text-sm"
              style={{
                left: "50%",
                top: "10px",
                transform: "translateX(-50%) translateZ(20px)",
              }}
            >
              Click floor to place Kitchen
            </div>
          )}
        </div>

        {/* Back Wall */}
        <div className={cn(styles.wallBack, "bg-gradient-to-b from-white to-slate-100 border-2 border-slate-300")} />

        {/* Side Wall */}
        <div className={cn(styles.wallSide, "bg-gradient-to-b from-slate-50 to-slate-150 border-2 border-slate-300")} />

        {/* WARDROBE UNIT */}
        {activeUnit && !activeUnit.loftOnly && (
          <div
            className={cn(
              styles.wardrobeBase,
              "absolute cursor-pointer transition-all hover:brightness-110",
              isUnitSelected && "ring-4 ring-blue-400 ring-offset-2 ring-offset-slate-800"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onUnitClick?.();
            }}
            title="Click to select wardrobe"
          >
            {/* Wardrobe shadow on floor */}
            <div className={cn(styles.wardrobeShadow, "absolute bg-slate-400/20 blur-sm")} />

            {/* Wardrobe base (floor) */}
            <div className={cn(styles.wardrobeFloor, "bg-gradient-to-br from-slate-200 to-slate-300 border-2 border-slate-400")} />

            {/* Wardrobe front face - Main shutter area */}
            <div
              className={cn(styles.wardrobeFront, "bg-gradient-to-b from-slate-100 to-slate-200 border-2 border-slate-500")}
              style={{
                height: hasLoft ? "280px" : "250px",
              }}
            >
              {/* Main shutter section */}
              <div
                className="absolute left-2 right-2 top-2 grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${shutterCount}, 1fr)`,
                  height: hasLoft ? "200px" : "240px",
                }}
              >
                {Array.from({ length: shutterCount }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-gradient-to-b from-slate-50 to-slate-100 border-2 border-slate-400 rounded relative overflow-hidden"
                  >
                    {/* Shutter panel detail */}
                    <div className="absolute inset-3 border border-slate-300 rounded-sm" />

                    {/* Handle */}
                    <div
                      className="absolute bg-gradient-to-b from-slate-400 to-slate-600 rounded shadow"
                      style={{
                        width: "6px",
                        height: "30px",
                        right: "10px",
                        top: "45%",
                        transform: "translateY(-50%)",
                      }}
                    />

                    {/* Shutter number label */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[8px] font-bold text-slate-400">
                      {i + 1}
                    </div>
                  </div>
                ))}
              </div>

              {/* Loft section (if enabled) */}
              {hasLoft && (
                <div
                  className="absolute left-2 right-2 bg-gradient-to-b from-amber-100 to-amber-200 border-2 border-amber-500 rounded"
                  style={{
                    height: "60px",
                    top: "210px",
                  }}
                >
                  {/* Loft panels */}
                  <div className="absolute inset-2 grid grid-cols-2 gap-1">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="bg-amber-50 border border-amber-400 rounded-sm flex items-center justify-center">
                        <span className="text-[7px] font-bold text-amber-600">LOFT</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom plinth */}
              <div className="absolute left-0 right-0 bottom-0 h-3 bg-slate-300 border-t-2 border-slate-400" />
            </div>

            {/* Wardrobe side face */}
            <div
              className={cn(styles.wardrobeSide, "bg-gradient-to-b from-slate-200 to-slate-300 border-2 border-slate-500")}
              style={{
                height: hasLoft ? "280px" : "250px",
              }}
            >
              {/* Side panel detail */}
              <div className="absolute inset-4 border border-slate-400/50 rounded" />
            </div>

            {/* Wardrobe top */}
            <div
              className={cn(styles.wardrobeTop, "bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-slate-500")}
              style={{
                transform: `translateZ(${hasLoft ? 280 : 250}px)`,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Main CSS 3D Canvas Component
 */
export const CSS3DCanvas: React.FC<CSS3DCanvasProps> = ({
  drawnUnits,
  activeUnitIndex,
  setActiveUnitIndex,
  onDeleteUnit,
  onUndo,
  onRedo,
  dimensions,
  unitType,
}) => {
  const validUnits = drawnUnits.filter((u) => u.widthMm > 0 || u.heightMm > 0 || u.loftOnly);
  const activeUnit = drawnUnits[activeUnitIndex] || null;
  const containerRef = useRef<HTMLDivElement>(null);

  // Kitchen Base module state
  const [kitchenModules, setKitchenModules] = useState<KitchenModule[]>([]);
  const [selectedModuleIds, setSelectedModuleIds] = useState<Set<string>>(new Set());
  const [drawModeEnabled, setDrawModeEnabled] = useState(false);

  // Zoom state for fit-to-screen
  const [zoomScale, setZoomScale] = useState(1);
  const [isFitToScreen, setIsFitToScreen] = useState(false);

  // Pan/drag state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dragModeEnabled, setDragModeEnabled] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);

  // Handle floor click to place Kitchen Base
  const handleFloorClick = (gridX: number, gridY: number) => {
    const newModule: KitchenModule = {
      id: `kitchen-${Date.now()}`,
      x: gridX,
      y: gridY,
      width: 3,  // Default 3 units wide
      depth: 2,  // Default 2 units deep
      height: 3, // Default 3 units tall (counter height)
    };
    setKitchenModules((prev) => [...prev, newModule]);
    setSelectedModuleIds(new Set([newModule.id]));
  };

  // Handle module click to select (toggle)
  const handleModuleClick = (id: string) => {
    setSelectedModuleIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Select all modules
  const handleSelectAll = () => {
    setSelectedModuleIds(new Set(kitchenModules.map((m) => m.id)));
  };

  // Deselect all modules
  const handleDeselectAll = () => {
    setSelectedModuleIds(new Set());
  };

  // Delete selected modules
  const handleDeleteSelected = () => {
    if (selectedModuleIds.size > 0) {
      setKitchenModules((prev) => prev.filter((m) => !selectedModuleIds.has(m.id)));
      setSelectedModuleIds(new Set());
    }
  };

  // Delete all modules
  const handleDeleteAll = useCallback(() => {
    setKitchenModules([]);
    setSelectedModuleIds(new Set());
  }, []);

  // Fit to screen - calculate scale based on container size
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Room base size (after rotation, it appears larger due to perspective)
    const roomWidth = 700;
    const roomHeight = 550;

    // Calculate scale to fit (with some padding)
    const padding = 100;
    const scaleX = (containerWidth - padding) / (roomWidth * 1.2);
    const scaleY = (containerHeight - padding) / (roomHeight * 1.2);
    const newScale = Math.min(scaleX, scaleY, 1.8); // Max 1.8x zoom

    setZoomScale(newScale);
    setIsFitToScreen(true);
  }, []);

  // Reset zoom to normal (also resets pan)
  const handleResetZoom = useCallback(() => {
    setZoomScale(1);
    setIsFitToScreen(false);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Zoom in (increase scale)
  const handleZoomIn = useCallback(() => {
    setZoomScale((prev) => Math.min(prev + 0.2, 2.5)); // Max 2.5x
    setIsFitToScreen(false);
  }, []);

  // Zoom out (decrease scale)
  const handleZoomOut = useCallback(() => {
    setZoomScale((prev) => Math.max(prev - 0.2, 0.4)); // Min 0.4x
    setIsFitToScreen(false);
  }, []);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        // Scroll up = zoom in
        setZoomScale((prev) => Math.min(prev + 0.1, 2.5));
      } else {
        // Scroll down = zoom out
        setZoomScale((prev) => Math.max(prev - 0.1, 0.4));
      }
      setIsFitToScreen(false);
    }
  }, []);

  // Pan/drag handlers - works with drag mode, space key, or middle mouse button
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Pan if: drag mode enabled, space key pressed, middle mouse, or right click
    if (dragModeEnabled || spacePressed || e.button === 1 || e.button === 2) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  }, [dragModeEnabled, spacePressed, panOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    e.preventDefault();
    setPanOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    });
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Prevent context menu on right click (used for panning)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Reset pan position
  const handleResetPan = useCallback(() => {
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Keyboard handler for the container
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Space key = Enable pan mode temporarily
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      setSpacePressed(true);
      return;
    }
    // Ctrl+A or Cmd+A = Select All modules
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
      e.preventDefault();
      e.stopPropagation();
      if (kitchenModules.length > 0) {
        setSelectedModuleIds(new Set(kitchenModules.map((m) => m.id)));
      }
      return;
    }
    // Ctrl+Z = Undo
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      onUndo?.();
      return;
    }
    // Ctrl+Y or Ctrl+Shift+Z = Redo
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
      e.preventDefault();
      e.stopPropagation();
      onRedo?.();
      return;
    }
    // Ctrl+F or Cmd+F = Fit to screen
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
      e.preventDefault();
      e.stopPropagation();
      handleFitToScreen();
      return;
    }
    // Ctrl+R or Cmd+R = Reset zoom
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r") {
      e.preventDefault();
      e.stopPropagation();
      handleResetZoom();
      return;
    }
    // + or = key = Zoom in
    if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      handleZoomIn();
      return;
    }
    // - key = Zoom out
    if (e.key === "-" || e.key === "_") {
      e.preventDefault();
      handleZoomOut();
      return;
    }
    // Delete or Backspace = Delete selected
    if (e.key === "Delete" || e.key === "Backspace") {
      // Delete kitchen modules if any selected
      if (selectedModuleIds.size > 0) {
        e.preventDefault();
        setKitchenModules((prev) => prev.filter((m) => !selectedModuleIds.has(m.id)));
        setSelectedModuleIds(new Set());
        return;
      }
      // Delete active wardrobe unit if selected
      if (activeUnitIndex >= 0 && onDeleteUnit) {
        e.preventDefault();
        onDeleteUnit(activeUnitIndex);
        return;
      }
    }
    // Escape = Deselect all
    if (e.key === "Escape") {
      setSelectedModuleIds(new Set());
      setDrawModeEnabled(false);
      // Also deselect wardrobe unit
      if (activeUnitIndex >= 0) {
        setActiveUnitIndex(-1);
      }
    }
  };

  // Key up handler for space release
  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === " " || e.code === "Space") {
      setSpacePressed(false);
      setIsPanning(false);
    }
  }, []);

  // Auto-focus container on mount
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      className={cn(
        "flex-1 min-w-0 min-h-0 relative bg-slate-800 flex outline-none",
        (dragModeEnabled || spacePressed) && "cursor-grab",
        isPanning && "cursor-grabbing"
      )}>
      {/* Main 3D View Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-visible">
        {/* Small floating controls for 3D specific actions */}
        <div className={styles.floatingControls}>
          {/* Drag/Pan Mode Button */}
          <Button
            size="sm"
            variant={dragModeEnabled ? "default" : "ghost"}
            onClick={() => {
              setDragModeEnabled(!dragModeEnabled);
              if (!dragModeEnabled) {
                setDrawModeEnabled(false); // Disable draw mode when enabling drag
              }
            }}
            className={cn(
              "h-6 w-6 p-0",
              dragModeEnabled
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "text-slate-300 hover:text-white hover:bg-slate-700"
            )}
            title="Drag to pan (Space key)"
          >
            <Move className="w-3.5 h-3.5" />
          </Button>

          {/* Zoom Out Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleZoomOut}
            disabled={zoomScale <= 0.4}
            className="h-6 w-6 p-0 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40"
            title="Zoom Out (-)"
          >
            <Minus className="w-3.5 h-3.5" />
          </Button>

          {/* Zoom Level Display */}
          <div className="px-1.5 py-0.5 text-[10px] font-medium text-slate-300 min-w-[40px] text-center">
            {Math.round(zoomScale * 100)}%
          </div>

          {/* Zoom In Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleZoomIn}
            disabled={zoomScale >= 2.5}
            className="h-6 w-6 p-0 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40"
            title="Zoom In (+)"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>

          {/* Fit to Screen Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleFitToScreen}
            className={cn(
              "h-6 w-6 p-0",
              isFitToScreen
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "text-slate-300 hover:text-white hover:bg-slate-700"
            )}
            title="Fit to Screen (Ctrl+F)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </Button>

          {/* Reset Zoom Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetZoom}
            disabled={zoomScale === 1 && panOffset.x === 0 && panOffset.y === 0}
            className="h-6 w-6 p-0 text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-40"
            title="Reset (Ctrl+R)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* CSS 3D Room */}
        <CSS3DRoom
          activeUnit={activeUnit}
          isUnitSelected={activeUnitIndex >= 0 && activeUnit !== null}
          onUnitClick={() => {
            // Click on wardrobe: ensure it's selected
            // Find the index of the activeUnit in drawnUnits
            const unitIndex = drawnUnits.findIndex((u) => u.id === activeUnit?.id);
            if (unitIndex >= 0) {
              setActiveUnitIndex(unitIndex);
            } else if (drawnUnits.length > 0) {
              setActiveUnitIndex(0);
            }
          }}
          kitchenModules={kitchenModules}
          selectedModuleIds={selectedModuleIds}
          onModuleClick={handleModuleClick}
          onFloorClick={handleFloorClick}
          drawModeEnabled={drawModeEnabled}
          zoomScale={zoomScale}
          panOffset={panOffset}
        />

      </div>
    </div>
  );
};

export default CSS3DCanvas;
