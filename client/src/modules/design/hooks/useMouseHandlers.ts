/**
 * useMouseHandlers Hook
 *
 * Handles all mouse interactions for the design canvas including:
 * - Shape drawing (line, rect)
 * - Shape selection and multi-select
 * - Shape movement and dragging
 * - Center post resize/move
 * - Dimension creation
 * - Component placement
 * - Smart snapping
 */

import { useCallback, useRef } from "react";
import { useDesignStore } from "../store/designStore";
import type {
  Shape,
  LineShape,
  RectShape,
  DimensionShape,
  TempShape,
  ComponentRectDef,
  ComponentLineDef,
} from "../types";
import {
  snapToGrid,
  getAngle,
  snapAngle,
  findAlignmentGuides,
  uid,
} from "../utils/geometry";
import {
  isDraggableCenterPost,
  isDraggableShelf,
  parseShelfId,
  getCarcassBounds,
  getShelfBounds,
  detectEdge,
  hitTestShapes,
  calculateShapeMeasurements,
  clientToSvgCoords,
} from "../utils/canvasHelpers";

// =============================================================================
// TYPES
// =============================================================================

interface DragRef {
  panelId: string;
  offsetX: number;
  offsetY: number;
  shapeW: number;
  shapeH: number;
  dragType: "horizontal" | "vertical" | "both";
}

interface ResizeRef {
  panelId: string;
  edge: "left" | "right" | "top" | "bottom";
  startX: number;
  startY: number;
  originalX: number;
  originalY: number;
  originalW: number;
  originalH: number;
}

interface UseMouseHandlersOptions {
  svgRef: React.RefObject<SVGSVGElement>;
  panRef: React.RefObject<{ x: number; y: number }>;
}

interface UseMouseHandlersReturn {
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  dragRef: React.RefObject<DragRef | null>;
  resizeRef: React.RefObject<ResizeRef | null>;
}

// =============================================================================
// HOOK
// =============================================================================

export function useMouseHandlers({
  svgRef,
  panRef,
}: UseMouseHandlersOptions): UseMouseHandlersReturn {
  // Refs for drag/resize state
  const dragRef = useRef<DragRef | null>(null);
  const resizeRef = useRef<ResizeRef | null>(null);

  // Get store state and actions
  const {
    // Canvas
    gridSize,
    canvasSize,
    // Tools
    mode,
    setMode,
    actionMode,
    lineThickness,
    lineColor,
    lineMarker,
    angleSnap,
    orthoMode,
    smartSnapEnabled,
    // Shapes
    shapes,
    setShapes,
    selectedId,
    setSelectedId,
    selectedIds,
    setSelectedIds,
    addToSelection,
    temp,
    setTemp,
    isDragging,
    setIsDragging,
    setAlignmentGuides,
    setCursorPos,
    // History
    pushHistory,
    // Module
    moduleConfig,
    // UI
    selectedComponent,
    setSelectedComponent,
    dimensionStart,
    setDimensionStart,
    setShowMeasurementPanel,
    setMeasurementResult,
  } = useDesignStore();

  // ==========================================================================
  // HELPER FUNCTIONS
  // ==========================================================================

  const SNAP = useCallback((v: number) => snapToGrid(v, gridSize), [gridSize]);

  const getSvgPoint = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!svgRef.current) return { x: 0, y: 0 };
      return clientToSvgCoords(
        e.clientX,
        e.clientY,
        svgRef.current,
        panRef.current ?? { x: 0, y: 0 }
      );
    },
    [svgRef, panRef]
  );

  const hitTest = useCallback(
    (x: number, y: number): Shape | null => {
      return hitTestShapes(x, y, shapes, gridSize);
    },
    [shapes, gridSize]
  );

  const calculateMeasurements = useCallback(() => {
    return calculateShapeMeasurements(shapes, selectedIds, selectedId);
  }, [shapes, selectedId, selectedIds]);

  const placeComponent = useCallback(
    (x: number, y: number) => {
      if (!selectedComponent) return;

      const newShapes: Shape[] = selectedComponent.shapes.map((shapeDef) => {
        const id = uid(shapeDef.type === "line" ? "L-" : "R-");
        if (shapeDef.type === "rect") {
          const r = shapeDef as ComponentRectDef;
          return {
            id,
            type: "rect" as const,
            x: x + (r.x || 0),
            y: y + (r.y || 0),
            w: r.w,
            h: r.h,
          };
        } else {
          const l = shapeDef as ComponentLineDef;
          return {
            id,
            type: "line" as const,
            x1: x + (l.x1 || 0),
            y1: y + (l.y1 || 0),
            x2: x + (l.x2 || 0),
            y2: y + (l.y2 || 0),
            thickness: lineThickness,
            color: lineColor,
            marker: "none" as const,
          };
        }
      });

      const updatedShapes = [...shapes, ...newShapes];
      pushHistory(updatedShapes, `Place ${selectedComponent.name}`);
      setShapes(updatedShapes);
      setSelectedComponent(null);
      setMode("select");
    },
    [
      selectedComponent,
      shapes,
      lineThickness,
      lineColor,
      pushHistory,
      setShapes,
      setSelectedComponent,
      setMode,
    ]
  );

  // ==========================================================================
  // MOUSE DOWN HANDLER
  // ==========================================================================

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const p = getSvgPoint(e);
      const snapped = { x: SNAP(p.x), y: SNAP(p.y) };

      // Handle center post resize/move when actionMode is set
      if (
        (actionMode === "resize" || actionMode === "move") &&
        moduleConfig?.unitType === "wardrobe_carcass"
      ) {
        for (const s of shapes) {
          // Handle center post drag/resize (horizontal)
          if (s.type === "rect" && isDraggableCenterPost(s.id)) {
            const r = s as RectShape;
            if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
              if (actionMode === "resize") {
                const edge = detectEdge(p.x, p.y, r, ["top", "bottom"]) || "bottom";
                resizeRef.current = {
                  panelId: r.id,
                  edge,
                  startX: p.x,
                  startY: p.y,
                  originalX: r.x,
                  originalY: r.y,
                  originalW: r.w,
                  originalH: r.h,
                };
              } else {
                dragRef.current = {
                  panelId: r.id,
                  offsetX: p.x - r.x,
                  offsetY: p.y - r.y,
                  shapeW: r.w,
                  shapeH: r.h,
                  dragType: "horizontal",
                };
              }
              setSelectedId(r.id);
              setSelectedIds(new Set([r.id]));
              return;
            }
          }
          // Handle shelf drag (vertical only)
          if (s.type === "rect" && isDraggableShelf(s.id)) {
            const r = s as RectShape;
            if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) {
              if (actionMode === "move") {
                dragRef.current = {
                  panelId: r.id,
                  offsetX: p.x - r.x,
                  offsetY: p.y - r.y,
                  shapeW: r.w,
                  shapeH: r.h,
                  dragType: "vertical",
                };
                setSelectedId(r.id);
                setSelectedIds(new Set([r.id]));
                return;
              }
            }
          }
        }
      }

      // Mode-specific handling
      if (mode === "line") {
        const id = uid("L-");
        setTemp({
          id,
          type: "line",
          x1: snapped.x,
          y1: snapped.y,
          x2: snapped.x,
          y2: snapped.y,
          thickness: lineThickness,
          color: lineColor,
          marker: lineMarker,
        });
        setSelectedId(id);
      } else if (mode === "rect") {
        const id = uid("R-");
        setTemp({
          id,
          type: "rect",
          x: snapped.x,
          y: snapped.y,
          w: 0,
          h: 0,
          strokeWidth: Math.max(1, lineThickness / 8),
        });
        setSelectedId(id);
      } else if (mode === "move") {
        const hit = hitTest(snapped.x, snapped.y);
        if (hit) {
          setSelectedId(hit.id);
          const tempWithOrigin: TempShape = { ...hit, __dragOrigin: snapped };
          setTemp(tempWithOrigin);
          setIsDragging(true);
        } else {
          setSelectedId(null);
        }
      } else if (mode === "trim") {
        const hit = hitTest(snapped.x, snapped.y);
        if (hit) {
          const newShapes = shapes.filter((s) => s.id !== hit.id);
          pushHistory(newShapes, "Trim/Delete");
          setShapes(newShapes);
          setSelectedId(null);
        }
      } else if (mode === "quickDim") {
        const hit = hitTest(snapped.x, snapped.y);
        if (hit && hit.type === "line") {
          const line = hit as LineShape;
          const len = Math.round(Math.hypot(line.x2 - line.x1, line.y2 - line.y1));
          const angle = getAngle(line.x1, line.y1, line.x2, line.y2);
          const dimType =
            Math.abs(angle - 90) < 15 || Math.abs(angle - 270) < 15
              ? "vertical"
              : "horizontal";
          const dim: DimensionShape = {
            id: uid("DIM-"),
            type: "dimension",
            x1: line.x1,
            y1: line.y1,
            x2: line.x2,
            y2: line.y2,
            label: `${len}`,
            dimType,
            offset: 30,
          };
          const newShapes = [...shapes, dim];
          pushHistory(newShapes, "Auto Dimension");
          setShapes(newShapes);
        }
      } else if (mode === "dimHoriz" || mode === "dimVert" || mode === "dimRadius") {
        if (!dimensionStart) {
          setDimensionStart(snapped);
        } else {
          const len = Math.round(
            Math.hypot(snapped.x - dimensionStart.x, snapped.y - dimensionStart.y)
          );
          const dim: DimensionShape = {
            id: uid("DIM-"),
            type: "dimension",
            x1: dimensionStart.x,
            y1: dimensionStart.y,
            x2: snapped.x,
            y2: snapped.y,
            label: `${len}`,
            dimType:
              mode === "dimHoriz"
                ? "horizontal"
                : mode === "dimVert"
                  ? "vertical"
                  : "radius",
            offset: 30,
          };
          const newShapes = [...shapes, dim];
          pushHistory(newShapes, "Add Dimension");
          setShapes(newShapes);
          setDimensionStart(null);
        }
      } else if (mode === "component" && selectedComponent) {
        placeComponent(snapped.x, snapped.y);
      } else if (mode === "measure") {
        const hit = hitTest(snapped.x, snapped.y);
        if (hit) {
          if (e.ctrlKey || e.metaKey) addToSelection(hit.id);
          else setSelectedIds(new Set([hit.id]));
          setSelectedId(hit.id);
          setMeasurementResult(calculateMeasurements());
          setShowMeasurementPanel(true);
        }
      } else {
        // Select mode
        const hit = hitTest(snapped.x, snapped.y);
        if (hit) {
          if (e.ctrlKey || e.metaKey) addToSelection(hit.id);
          else {
            setSelectedId(hit.id);
            setSelectedIds(new Set([hit.id]));
          }
        } else {
          setSelectedId(null);
          setSelectedIds(new Set());
        }
      }
    },
    [
      mode,
      getSvgPoint,
      SNAP,
      hitTest,
      shapes,
      actionMode,
      moduleConfig,
      lineThickness,
      lineColor,
      lineMarker,
      dimensionStart,
      selectedComponent,
      setTemp,
      setSelectedId,
      setSelectedIds,
      setIsDragging,
      pushHistory,
      setShapes,
      setDimensionStart,
      placeComponent,
      addToSelection,
      calculateMeasurements,
      setMeasurementResult,
      setShowMeasurementPanel,
    ]
  );

  // ==========================================================================
  // MOUSE MOVE HANDLER
  // ==========================================================================

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const p = getSvgPoint(e);
      const snapped = { x: SNAP(p.x), y: SNAP(p.y) };

      // Smart snap
      if (
        smartSnapEnabled &&
        (mode === "line" || mode === "rect" || mode === "move" || mode === "component")
      ) {
        const { guides, snapX, snapY } = findAlignmentGuides(
          snapped.x,
          snapped.y,
          shapes,
          temp?.id,
          canvasSize.w,
          canvasSize.h
        );
        setAlignmentGuides(guides);
        if (snapX !== null) snapped.x = snapX;
        if (snapY !== null) snapped.y = snapY;
      } else {
        setAlignmentGuides([]);
      }

      // Component preview
      if (mode === "component" && selectedComponent) {
        setCursorPos(snapped);
        return;
      }

      // Handle resize
      if (resizeRef.current) {
        const { panelId, edge, startY, originalY, originalH } = resizeRef.current;
        const deltaY = p.y - startY;
        setShapes(
          shapes.map((s) => {
            if (s.id === panelId && s.type === "rect") {
              const rect = s as RectShape;
              let newY = originalY;
              let newH = originalH;
              if (edge === "top") {
                newY = originalY + deltaY;
                newH = originalH - deltaY;
                if (newH < 10) {
                  newH = 10;
                  newY = originalY + originalH - 10;
                }
              } else if (edge === "bottom") {
                newH = originalH + deltaY;
                if (newH < 10) newH = 10;
              }
              return { ...rect, y: newY, h: newH };
            }
            return s;
          })
        );
        return;
      }

      // Handle center post / shelf drag with bounds constraint
      if (dragRef.current) {
        const { panelId, offsetX, offsetY, shapeW, shapeH, dragType } = dragRef.current;

        if (dragType === "horizontal") {
          // Center post: horizontal movement
          const bounds = getCarcassBounds(moduleConfig, shapes);
          const newX = SNAP(snapped.x - offsetX);

          if (bounds) {
            const finalX = Math.max(bounds.minX, Math.min(bounds.maxX - shapeW, newX));
            setShapes(
              shapes.map((s) => (s.id === panelId && s.type === "rect" ? { ...s, x: finalX } : s))
            );
          } else {
            setShapes(
              shapes.map((s) => (s.id === panelId && s.type === "rect" ? { ...s, x: newX } : s))
            );
          }
        } else if (dragType === "vertical") {
          // Shelf: vertical movement only - ALWAYS constrained within carcass
          // Also constrain X and width to stay within section
          const shelfBounds = getShelfBounds(moduleConfig, shapes, panelId);
          const newY = SNAP(snapped.y - offsetY);

          if (shelfBounds) {
            // Constrain Y to bounds
            const finalY = Math.max(shelfBounds.minY, Math.min(shelfBounds.maxY - shapeH, newY));
            // Also fix X position and width to match section (prevents shelf from going outside)
            setShapes(
              shapes.map((s) => {
                if (s.id === panelId && s.type === "rect") {
                  return {
                    ...s,
                    y: finalY,
                    x: shelfBounds.sectionX,        // Force shelf to section X
                    w: shelfBounds.sectionWidth,    // Force shelf to section width
                  };
                }
                return s;
              })
            );
          } else {
            // Fallback: use carcass bounds if shelf bounds not available
            const topPanel = shapes.find(s => s.id === "MOD-TOP") as RectShape | undefined;
            const bottomPanel = shapes.find(s => s.id === "MOD-BOTTOM") as RectShape | undefined;

            if (topPanel && bottomPanel) {
              const T = moduleConfig?.carcassThicknessMm ?? 18;
              const minY = topPanel.y + topPanel.h + T;
              const maxY = bottomPanel.y - T;
              const finalY = Math.max(minY, Math.min(maxY - shapeH, newY));
              setShapes(
                shapes.map((s) => (s.id === panelId && s.type === "rect" ? { ...s, y: finalY } : s))
              );
            }
            // If no bounds available, don't move at all (keep current position)
          }
        }
        return;
      }

      if (!temp) return;

      // Drawing mode updates
      if (mode === "line" && temp.type === "line") {
        let x2 = snapped.x;
        let y2 = snapped.y;
        const t = temp as LineShape;

        if (orthoMode) {
          const dx = Math.abs(p.x - t.x1);
          const dy = Math.abs(p.y - t.y1);
          if (dx >= dy) {
            x2 = snapped.x;
            y2 = t.y1;
          } else {
            x2 = t.x1;
            y2 = snapped.y;
          }
        } else if (angleSnap) {
          const angle = getAngle(t.x1, t.y1, p.x, p.y);
          const sa = snapAngle(angle);
          const dist = Math.hypot(p.x - t.x1, p.y - t.y1);
          x2 = SNAP(t.x1 + dist * Math.cos((sa * Math.PI) / 180));
          y2 = SNAP(t.y1 + dist * Math.sin((sa * Math.PI) / 180));
        }
        setTemp({ ...temp, x2, y2 });
      } else if (mode === "rect" && temp.type === "rect") {
        const t = temp as Partial<RectShape>;
        const dx = snapped.x - (t.x ?? 0);
        const dy = snapped.y - (t.y ?? 0);
        setTemp({
          ...temp,
          w: Math.abs(dx),
          h: Math.abs(dy),
          x: dx < 0 ? snapped.x : t.x,
          y: dy < 0 ? snapped.y : t.y,
        });
      } else if (mode === "move" && isDragging && temp) {
        const tempWithDrag = temp as TempShape;
        const origin = tempWithDrag.__dragOrigin;
        if (!origin) return;

        const dx = snapped.x - origin.x;
        const dy = snapped.y - origin.y;
        const dragged = shapes.find((s) => s.id === temp.id);
        if (!dragged) return;

        if (dragged.type === "rect") {
          const r = dragged as RectShape;
          const updatedTemp: TempShape = { ...temp, __dragOrigin: snapped };
          setTemp(updatedTemp);
          setShapes(
            shapes.map((s) =>
              s.id === r.id ? { ...r, x: SNAP(r.x + dx), y: SNAP(r.y + dy) } : s
            )
          );
        } else if (dragged.type === "line") {
          const l = dragged as LineShape;
          const updatedTemp: TempShape = { ...temp, __dragOrigin: snapped };
          setTemp(updatedTemp);
          setShapes(
            shapes.map((s) =>
              s.id === l.id
                ? {
                    ...l,
                    x1: SNAP(l.x1 + dx),
                    y1: SNAP(l.y1 + dy),
                    x2: SNAP(l.x2 + dx),
                    y2: SNAP(l.y2 + dy),
                  }
                : s
            )
          );
        }
      }
    },
    [
      mode,
      getSvgPoint,
      SNAP,
      smartSnapEnabled,
      shapes,
      temp,
      canvasSize,
      selectedComponent,
      isDragging,
      angleSnap,
      orthoMode,
      moduleConfig,
      setAlignmentGuides,
      setCursorPos,
      setShapes,
      setTemp,
    ]
  );

  // ==========================================================================
  // MOUSE UP HANDLER
  // ==========================================================================

  const onMouseUp = useCallback(() => {
    // Handle resize completion
    if (resizeRef.current) {
      pushHistory(shapes, "Resize Panel");
      resizeRef.current = null;
      return;
    }

    // Handle drag completion
    if (dragRef.current) {
      const { panelId, dragType } = dragRef.current;

      if (dragType === "vertical" && isDraggableShelf(panelId)) {
        // Save shelf position to moduleConfig
        const shelfInfo = parseShelfId(panelId);
        const shape = shapes.find(s => s.id === panelId) as RectShape | undefined;

        if (shelfInfo && shape && moduleConfig) {
          const shelfBounds = getShelfBounds(moduleConfig, shapes, panelId);
          if (shelfBounds) {
            // Calculate position as percentage of section height
            const sectionHeight = shelfBounds.maxY - shelfBounds.minY;
            const relativeY = shape.y - shelfBounds.minY;
            const pct = (relativeY / sectionHeight) * 100;

            // Update moduleConfig with the new shelf position
            const { sections } = moduleConfig;
            if (sections && sections.length > shelfInfo.sectionIndex) {
              const section = sections[shelfInfo.sectionIndex];
              const shelfCount = section.shelfCount ?? 0;

              // Initialize positions array if needed
              const positions = section.shelfPositions
                ? [...section.shelfPositions]
                : Array(shelfCount).fill(undefined).map((_, i) => {
                    // Calculate default position for each shelf
                    const totalShelfThickness = shelfCount * (moduleConfig.carcassThicknessMm ?? 18);
                    const availableHeight = sectionHeight - totalShelfThickness;
                    const spacing = availableHeight / (shelfCount + 1);
                    return ((spacing * (i + 1) + (moduleConfig.carcassThicknessMm ?? 18) * i) / sectionHeight) * 100;
                  });

              // Update the specific shelf position
              positions[shelfInfo.shelfIndex - 1] = pct;

              const updatedSections = sections.map((sec, idx) =>
                idx === shelfInfo.sectionIndex
                  ? { ...sec, shelfPositions: positions }
                  : sec
              );

              // Use store's regenerateModuleShapes to update
              const { regenerateModuleShapes } = useDesignStore.getState();
              regenerateModuleShapes({ ...moduleConfig, sections: updatedSections });
            }
          }
        }
        pushHistory(shapes, "Move Shelf");
      } else {
        pushHistory(shapes, "Move Center Post");
      }

      dragRef.current = null;
      return;
    }

    // Complete line drawing
    if (mode === "line" && temp?.type === "line") {
      const l = temp as LineShape;
      if (Math.hypot((l.x2 ?? 0) - l.x1, (l.y2 ?? 0) - l.y1) > 5) {
        const newShapes = [...shapes.filter((s) => s.id !== l.id), l as Shape];
        pushHistory(newShapes, "Draw Line");
        setShapes(newShapes);
      }
      setTemp(null);
    }
    // Complete rect drawing
    else if (mode === "rect" && temp?.type === "rect") {
      const r = temp as RectShape;
      if ((r.w ?? 0) > 0 && (r.h ?? 0) > 0) {
        const newShapes = [...shapes.filter((s) => s.id !== r.id), r as Shape];
        pushHistory(newShapes, "Draw Rect");
        setShapes(newShapes);
      }
      setTemp(null);
    }
    // Complete move
    else if (mode === "move") {
      setIsDragging(false);
      setTemp(null);
    }
  }, [mode, temp, shapes, pushHistory, setShapes, setTemp, setIsDragging]);

  // ==========================================================================
  // MOUSE LEAVE HANDLER
  // ==========================================================================

  const onMouseLeave = useCallback(() => {
    dragRef.current = null;
    resizeRef.current = null;
  }, []);

  return {
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
    dragRef,
    resizeRef,
  };
}

export default useMouseHandlers;
