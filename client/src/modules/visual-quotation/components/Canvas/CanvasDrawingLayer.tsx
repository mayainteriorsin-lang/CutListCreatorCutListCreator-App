/**
 * CanvasDrawingLayer
 *
 * Handles rendering of the Konva stage with units, grid, and draw preview.
 * Contains the Stage, Layer, and all drawable elements.
 * Supports right-click context menu for unit configuration.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Line, Group, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import Konva from "konva";
import { Pencil } from "lucide-react";
import { useDesignCanvasStore } from "../../store/v2/useDesignCanvasStore";
import { useQuotationMetaStore } from "../../store/v2/useQuotationMetaStore";
import { setGlobalStageRef, setGridGroupRef } from "./canvasUtils";
import { UnitContextMenu } from "./UnitContextMenu";

interface CanvasDrawingLayerProps {
  dimensions: { width: number; height: number };
  drawStart: { x: number; y: number } | null;
  drawCurrent: { x: number; y: number } | null;
  editMode: "shutter" | "carcass";
  onMouseDown: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseMove: (e: KonvaEventObject<MouseEvent>) => void;
  onMouseUp: () => void;
  setIsSelected: (value: boolean) => void;
}

export function CanvasDrawingLayer({
  dimensions,
  drawStart,
  drawCurrent,
  editMode,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  setIsSelected,
}: CanvasDrawingLayerProps) {
  const { status } = useQuotationMetaStore();

  const {
    drawnUnits,
    setActiveUnitIndex,
    setActiveEditPart,
    roomPhoto,
    updateUnit,
    deleteDrawnUnit,
  } = useDesignCanvasStore();

  const setUnitShelfCount = useCallback((index: number, count: number) => {
    updateUnit(index, { shelfCount: count });
  }, [updateUnit]);

  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    position: { x: number; y: number };
    unitIndex: number;
  } | null>(null);

  // Close context menu handler
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Handle right-click on unit
  const handleUnitContextMenu = useCallback(
    (e: KonvaEventObject<PointerEvent>, index: number) => {
      e.evt.preventDefault();
      e.evt.stopPropagation();

      // Get container position for correct menu placement
      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const menuX = e.evt.clientX;
      const menuY = e.evt.clientY;

      // Ensure menu doesn't go off screen
      const adjustedX = Math.min(menuX, window.innerWidth - 200);
      const adjustedY = Math.min(menuY, window.innerHeight - 300);

      setContextMenu({
        visible: true,
        position: { x: adjustedX, y: adjustedY },
        unitIndex: index,
      });

      // Also select the unit
      setActiveUnitIndex(index);
      setIsSelected(true);
    },
    [setActiveUnitIndex, setIsSelected]
  );

  // Handle shelf count change
  const handleShelfCountChange = useCallback(
    (count: number) => {
      if (contextMenu) {
        setUnitShelfCount(contextMenu.unitIndex, count);
      }
    },
    [contextMenu, setUnitShelfCount]
  );

  // Handle delete unit
  const handleDeleteUnit = useCallback(() => {
    if (contextMenu) {
      deleteDrawnUnit(contextMenu.unitIndex);
      closeContextMenu();
    }
  }, [contextMenu, deleteDrawnUnit, closeContextMenu]);

  // Set global stage ref for canvas capture
  useEffect(() => {
    setGlobalStageRef(stageRef.current);
    return () => {
      setGlobalStageRef(null);
    };
  }, []);

  // Calculate canvas dimensions for drawing mode
  const canvasWidth = dimensions.width / 2;
  const canvasHeight = dimensions.height - 228;

  // Preview colors based on edit mode
  const previewColors: Record<string, { stroke: string; fill: string }> = {
    carcass: { stroke: "#64748b", fill: "rgba(100, 116, 139, 0.15)" },
    shutter: { stroke: "#3b82f6", fill: "rgba(59, 130, 246, 0.15)" },
  };
  const colors = previewColors[editMode] || previewColors.shutter;

  return (
    <div className="flex-1 min-h-0 flex">
      {/* LEFT PANEL - Drawing Canvas + Photo */}
      <div className="w-1/2 border-r border-slate-700/60 flex flex-col">
        {/* Drawing Canvas */}
        <div ref={containerRef} className="flex-1 min-h-0 bg-slate-50 cursor-crosshair relative">
          <div className="absolute top-0 left-0 right-0 px-3 py-1.5 border-b border-slate-300 bg-slate-100/90 backdrop-blur-sm z-10">
            <span className="text-[10px] text-slate-600 uppercase font-semibold tracking-wide flex items-center gap-1.5">
              <Pencil className="h-3 w-3" />
              {editMode === "shutter" ? "Shutter Drawing" : "Carcass Drawing"}
              <span className="text-slate-400 ml-2">Click and drag to draw</span>
            </span>
          </div>
          <Stage
            ref={stageRef}
            width={canvasWidth}
            height={canvasHeight}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            style={{ marginTop: 28 }}
          >
            <Layer>
              {/* Background */}
              <Rect
                x={0}
                y={0}
                width={canvasWidth}
                height={canvasHeight}
                fill="#f8fafc"
                onClick={() => {
                  setIsSelected(false);
                  setActiveEditPart("shutter");
                }}
              />
              {/* Grid pattern */}
              <Group ref={(ref) => setGridGroupRef(ref)}>
                {Array.from({ length: Math.ceil(canvasWidth / 60) }).map((_, i) => (
                  <Line
                    key={`v-${i}`}
                    points={[i * 60, 0, i * 60, canvasHeight]}
                    stroke="#e2e8f0"
                    strokeWidth={1}
                  />
                ))}
                {Array.from({ length: Math.ceil(canvasHeight / 60) }).map((_, i) => (
                  <Line
                    key={`h-${i}`}
                    points={[0, i * 60, canvasWidth, i * 60]}
                    stroke="#e2e8f0"
                    strokeWidth={1}
                  />
                ))}
              </Group>
              {/* Draw Preview */}
              {drawStart && drawCurrent && (
                <Rect
                  x={Math.min(drawStart.x, drawCurrent.x)}
                  y={Math.min(drawStart.y, drawCurrent.y)}
                  width={Math.abs(drawCurrent.x - drawStart.x)}
                  height={Math.abs(drawCurrent.y - drawStart.y)}
                  stroke={colors.stroke}
                  strokeWidth={2}
                  fill={colors.fill}
                  dash={[6, 3]}
                />
              )}
              {/* Existing drawn units with shelves */}
              {drawnUnits.map((unit, index) => {
                const shelfCount = unit.shelfCount || 0;
                const boxX = unit.box.x;
                const boxY = unit.box.y;
                const boxW = unit.box.width;
                const boxH = unit.box.height;

                // Calculate shelf Y positions (evenly spaced)
                const shelfYs: number[] = [];
                if (shelfCount > 0) {
                  const spacing = boxH / (shelfCount + 1);
                  for (let i = 1; i <= shelfCount; i++) {
                    shelfYs.push(boxY + spacing * i);
                  }
                }

                return (
                  <Group key={unit.id || index}>
                    {/* Unit rectangle */}
                    <Rect
                      x={boxX}
                      y={boxY}
                      width={boxW}
                      height={boxH}
                      stroke={editMode === "carcass" ? "#64748b" : "#3b82f6"}
                      strokeWidth={2}
                      fill={editMode === "carcass" ? "rgba(100, 116, 139, 0.1)" : "rgba(59, 130, 246, 0.1)"}
                      onClick={() => {
                        setActiveUnitIndex(index);
                        setIsSelected(true);
                      }}
                      onContextMenu={(e) => handleUnitContextMenu(e, index)}
                    />
                    {/* Shelf lines */}
                    {shelfYs.map((y, shelfIdx) => (
                      <Line
                        key={`shelf-${index}-${shelfIdx}`}
                        points={[boxX + 4, y, boxX + boxW - 4, y]}
                        stroke="#94a3b8"
                        strokeWidth={1.5}
                        dash={[4, 2]}
                      />
                    ))}
                    {/* Shelf count badge */}
                    {shelfCount > 0 && (
                      <>
                        <Rect
                          x={boxX + boxW - 22}
                          y={boxY + 4}
                          width={18}
                          height={14}
                          fill="#3b82f6"
                          cornerRadius={3}
                        />
                        <Text
                          x={boxX + boxW - 22}
                          y={boxY + 5}
                          width={18}
                          height={14}
                          text={String(shelfCount)}
                          fontSize={10}
                          fill="#ffffff"
                          align="center"
                        />
                      </>
                    )}
                  </Group>
                );
              })}
            </Layer>
          </Stage>
        </div>

        {/* Photo Reference (bottom) */}
        <div className="h-[200px] flex-shrink-0 border-t border-slate-700/40 bg-slate-900/50">
          <div className="h-full p-2 flex items-center justify-center">
            {roomPhoto ? (
              <img
                src={roomPhoto.src}
                alt="Room reference"
                className="max-h-full max-w-full object-contain rounded"
              />
            ) : (
              <span className="text-slate-500 text-sm">No photo uploaded</span>
            )}
          </div>
        </div>
      </div>

      {/* Context Menu (rendered outside Stage for proper DOM placement) */}
      {contextMenu?.visible && contextMenu.unitIndex >= 0 && (
        <UnitContextMenu
          position={contextMenu.position}
          shelfCount={drawnUnits[contextMenu.unitIndex]?.shelfCount || 0}
          locked={status === "APPROVED"}
          onShelfCountChange={handleShelfCountChange}
          onDelete={handleDeleteUnit}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}
