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
import { toast } from "@/hooks/use-toast";
import { SHEET_WIDTH } from "../engine/panelGenerator";
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
  // Track if we've shown the 1200mm warning during current drag
  const sheetWarningShownRef = useRef<boolean>(false);

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
            // Use larger hit area for thin center posts (extend 40px on each side horizontally and vertically)
            const hitPadding = 80;
            const inHitArea = p.x >= r.x - hitPadding && p.x <= r.x + r.w + hitPadding &&
                             p.y >= r.y - hitPadding && p.y <= r.y + r.h + hitPadding;
            if (inHitArea) {
              if (actionMode === "resize") {
                // Determine edge based on which half of the post was clicked
                const midY = r.y + r.h / 2;
                const edge = p.y < midY ? "top" : "bottom";
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
        const isCenterPostSelected = selectedId?.startsWith("MOD-POST-");

        if (hit) {
          // If a center post is selected, only allow selecting other center posts
          if (isCenterPostSelected) {
            const isHitCenterPost = hit.id.startsWith("MOD-POST-");
            if (isHitCenterPost) {
              setSelectedId(hit.id);
              const tempWithOrigin: TempShape = { ...hit, __dragOrigin: snapped };
              setTemp(tempWithOrigin);
              setIsDragging(true);
            }
            // Ignore clicks on shelves/panels when center post is selected
          } else {
            setSelectedId(hit.id);
            const tempWithOrigin: TempShape = { ...hit, __dragOrigin: snapped };
            setTemp(tempWithOrigin);
            setIsDragging(true);
          }
        } else {
          // Don't deselect center posts when clicking elsewhere - only Escape key deselects them
          if (!isCenterPostSelected) {
            setSelectedId(null);
          }
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
        const isCenterPostSelected = selectedId?.startsWith("MOD-POST-");

        if (hit) {
          // If a center post is selected, only allow selecting other center posts
          if (isCenterPostSelected) {
            const isHitCenterPost = hit.id.startsWith("MOD-POST-");
            if (isHitCenterPost) {
              // Allow selecting another center post
              if (e.ctrlKey || e.metaKey) addToSelection(hit.id);
              else {
                setSelectedId(hit.id);
                setSelectedIds(new Set([hit.id]));
              }
            }
            // Ignore clicks on shelves/panels when center post is selected
          } else {
            // Normal selection behavior
            if (e.ctrlKey || e.metaKey) addToSelection(hit.id);
            else {
              setSelectedId(hit.id);
              setSelectedIds(new Set([hit.id]));
            }
          }
        } else {
          // Don't deselect center posts when clicking elsewhere - only Escape key deselects them
          if (!isCenterPostSelected) {
            setSelectedId(null);
            setSelectedIds(new Set());
          }
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

      // Always update cursor position for resize handle detection
      setCursorPos(snapped);

      // Component preview
      if (mode === "component" && selectedComponent) {
        return;
      }

      // Handle resize with bounds constraint for center posts
      if (resizeRef.current) {
        const { panelId, edge, startY, originalY, originalH } = resizeRef.current;
        const deltaY = p.y - startY;

        // Get wardrobe bounds for center post constraint
        const topPanel = shapes.find(s => s.id === "MOD-TOP") as RectShape | undefined;
        const bottomPanel = shapes.find(s => s.id === "MOD-BOTTOM") as RectShape | undefined;
        const isCenterPost = panelId.startsWith("MOD-POST-");

        const minY = topPanel ? topPanel.y + topPanel.h : -Infinity;  // Below top panel
        const maxY = bottomPanel ? bottomPanel.y : Infinity;          // Above bottom panel

        // Collect all shelf bottom Y positions for snapping (center posts only)
        const shelfBottomYs: number[] = [];
        if (isCenterPost && smartSnapEnabled) {
          const SNAP_THRESHOLD = 15;
          shapes.forEach(s => {
            if (s.type === "rect" && s.id.startsWith("MOD-SHELF-")) {
              const shelf = s as RectShape;
              shelfBottomYs.push(shelf.y + shelf.h); // Bottom of shelf
            }
          });
        }

        setShapes(
          shapes.map((s) => {
            if (s.id === panelId && s.type === "rect") {
              const rect = s as RectShape;
              let newY = originalY;
              let newH = originalH;

              if (edge === "top") {
                newY = originalY + deltaY;
                newH = originalH - deltaY;

                // Snap to shelf bottoms (center posts only, when smart snap enabled)
                if (isCenterPost && smartSnapEnabled && shelfBottomYs.length > 0) {
                  const SNAP_THRESHOLD = 15;
                  for (const shelfY of shelfBottomYs) {
                    if (Math.abs(newY - shelfY) <= SNAP_THRESHOLD) {
                      newH = originalY + originalH - shelfY;
                      newY = shelfY;
                      break;
                    }
                  }
                }

                // Constrain top edge for center posts - cannot go above top panel
                if (isCenterPost && newY < minY) {
                  newY = minY;
                  newH = originalY + originalH - minY;
                }
                if (newH < 10) {
                  newH = 10;
                  newY = originalY + originalH - 10;
                }
              } else if (edge === "bottom") {
                newH = originalH + deltaY;
                const bottomEdge = originalY + newH;

                // Snap to shelf bottoms (center posts only, when smart snap enabled)
                if (isCenterPost && smartSnapEnabled && shelfBottomYs.length > 0) {
                  const SNAP_THRESHOLD = 15;
                  for (const shelfY of shelfBottomYs) {
                    if (Math.abs(bottomEdge - shelfY) <= SNAP_THRESHOLD) {
                      newH = shelfY - originalY;
                      break;
                    }
                  }
                }

                // Constrain bottom edge for center posts - cannot go below bottom panel
                if (isCenterPost) {
                  const newBottomEdge = newY + newH;
                  if (newBottomEdge > maxY) {
                    newH = maxY - newY;
                  }
                }
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
          // Center post: horizontal movement with 1200mm section constraint
          const bounds = getCarcassBounds(moduleConfig, shapes);
          let newX = SNAP(snapped.x - offsetX);

          if (bounds && moduleConfig) {
            // Apply basic bounds constraint first
            newX = Math.max(bounds.minX, Math.min(bounds.maxX - shapeW, newX));

            // Calculate what section widths would be at this position
            const T = moduleConfig.carcassThicknessMm ?? 18;
            const postCount = moduleConfig.centerPostCount ?? 0;
            const innerW = bounds.maxX - bounds.minX + T; // Inner width of carcass

            // Collect all post positions (including the one being dragged)
            const allPostPositions: number[] = [];
            for (let i = 1; i <= postCount; i++) {
              const postShape = shapes.find(s => s.id === `MOD-POST-${i}`) as RectShape | undefined;
              if (postShape) {
                if (postShape.id === panelId) {
                  // Use the new position for the dragged post
                  allPostPositions.push(newX - bounds.minX + T);
                } else {
                  allPostPositions.push(postShape.x - bounds.minX + T);
                }
              }
            }
            allPostPositions.sort((a, b) => a - b);

            // Calculate section widths from these positions
            const sectionWidths: number[] = [];
            let prevX = 0;
            for (const pos of allPostPositions) {
              sectionWidths.push(pos - prevX);
              prevX = pos;
            }
            sectionWidths.push(innerW - prevX); // Last section

            // Check if any section exceeds SHEET_WIDTH (1200mm)
            const maxSectionWidth = Math.max(...sectionWidths);
            if (maxSectionWidth > SHEET_WIDTH) {
              // Show warning once per drag
              if (!sheetWarningShownRef.current) {
                sheetWarningShownRef.current = true;
                toast({
                  title: "⚠️ Sheet Size Exceeded",
                  description: `Back panel section would be ${Math.round(maxSectionWidth)}mm. Max allowed: ${SHEET_WIDTH}mm`,
                  variant: "destructive",
                });
              }

              // Find the constrained position
              // Calculate what X position would keep all sections ≤ 1200mm
              const draggedPostIndex = allPostPositions.findIndex(
                pos => Math.abs(pos - (newX - bounds.minX + T)) < 5
              );

              if (draggedPostIndex >= 0) {
                // Get left and right boundaries for this post
                const leftBoundary = draggedPostIndex > 0 ? allPostPositions[draggedPostIndex - 1] : 0;
                const rightBoundary = draggedPostIndex < allPostPositions.length - 1
                  ? allPostPositions[draggedPostIndex + 1]
                  : innerW;

                // Clamp position to keep sections ≤ 1200mm
                const minAllowedPos = leftBoundary + T; // Minimum to not overlap with left post
                const maxFromLeft = leftBoundary + SHEET_WIDTH; // Max to keep left section ≤ 1200
                const minFromRight = rightBoundary - SHEET_WIDTH; // Min to keep right section ≤ 1200
                const maxAllowedPos = rightBoundary - T; // Maximum to not overlap with right post

                const constrainedPos = Math.max(
                  Math.max(minAllowedPos, minFromRight),
                  Math.min(Math.min(maxAllowedPos, maxFromLeft), newX - bounds.minX + T)
                );

                newX = bounds.minX - T + constrainedPos;
              }
            }

            setShapes(
              shapes.map((s) => (s.id === panelId && s.type === "rect" ? { ...s, x: newX } : s))
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
      const { panelId } = resizeRef.current;

      // Auto-extend shelves when center post is shortened
      if (panelId.startsWith("MOD-POST-") && moduleConfig) {
        const resizedPost = shapes.find(s => s.id === panelId) as RectShape | undefined;
        const topPanel = shapes.find(s => s.id === "MOD-TOP") as RectShape | undefined;
        const bottomPanel = shapes.find(s => s.id === "MOD-BOTTOM") as RectShape | undefined;
        const leftPanel = shapes.find(s => s.id === "MOD-LEFT") as RectShape | undefined;
        const rightPanel = shapes.find(s => s.id === "MOD-RIGHT") as RectShape | undefined;

        if (resizedPost && topPanel && bottomPanel && leftPanel && rightPanel) {
          const T = moduleConfig.carcassThicknessMm ?? 18;
          const innerTop = topPanel.y + topPanel.h;
          const innerBottom = bottomPanel.y;
          const postTop = resizedPost.y;
          const postBottom = resizedPost.y + resizedPost.h;

          // Extract post number (1-indexed)
          const postMatch = panelId.match(/MOD-POST-(\d+)/);
          if (postMatch && postMatch[1]) {
            const postNum = parseInt(postMatch[1], 10);

            // Get all center posts sorted by X position
            const allPosts = shapes
              .filter(s => s.type === "rect" && s.id.startsWith("MOD-POST-"))
              .map(s => s as RectShape)
              .sort((a, b) => a.x - b.x);

            // Find current post's index in sorted array
            const postIndex = allPosts.findIndex(p => p.id === panelId);
            if (postIndex < 0) {
              pushHistory(shapes, "Resize Panel");
              resizeRef.current = null;
              return;
            }

            // Calculate left section bounds (section to the left of this post)
            const prevPost = postIndex > 0 ? allPosts[postIndex - 1] : null;
            const nextPost = postIndex < allPosts.length - 1 ? allPosts[postIndex + 1] : null;

            const leftSectionStart = prevPost
              ? prevPost.x + prevPost.w
              : leftPanel.x + leftPanel.w;
            const leftSectionEnd = resizedPost.x;

            // Calculate right section bounds (section to the right of this post)
            const rightSectionStart = resizedPost.x + resizedPost.w;
            const rightSectionEnd = nextPost
              ? nextPost.x
              : rightPanel.x;

            // Determine gaps (areas where post no longer exists)
            const hasTopGap = postTop > innerTop + T;
            const hasBottomGap = postBottom < innerBottom - T;

            if (hasTopGap || hasBottomGap) {
              let updatedShapes = [...shapes];
              const shelvesToRemove: string[] = [];
              const shelvesToAdd: RectShape[] = [];

              // Find shelves in left section (section index = postNum)
              const leftShelves = shapes
                .filter(s => s.type === "rect" && s.id.startsWith(`MOD-SHELF-${postNum}-`))
                .map(s => s as RectShape);

              // Find shelves in right section (section index = postNum + 1)
              const rightShelves = shapes
                .filter(s => s.type === "rect" && s.id.startsWith(`MOD-SHELF-${postNum + 1}-`))
                .map(s => s as RectShape);

              // Check each left shelf - extend if it's in a gap area
              for (const leftShelf of leftShelves) {
                const shelfCenterY = leftShelf.y + leftShelf.h / 2;
                const inTopGap = hasTopGap && shelfCenterY >= innerTop && shelfCenterY < postTop;
                const inBottomGap = hasBottomGap && shelfCenterY > postBottom && shelfCenterY <= innerBottom;

                if (inTopGap || inBottomGap) {
                  // Find matching right shelf at similar Y position (within tolerance)
                  const MERGE_TOLERANCE = T * 2;
                  const matchingRightShelf = rightShelves.find(rs => {
                    const rsCenterY = rs.y + rs.h / 2;
                    return Math.abs(shelfCenterY - rsCenterY) <= MERGE_TOLERANCE;
                  });

                  if (matchingRightShelf) {
                    // Merge: create one continuous shelf spanning both sections
                    const mergedShelf: RectShape = {
                      ...leftShelf,
                      id: leftShelf.id, // Keep left shelf's ID
                      x: leftSectionStart,
                      w: rightSectionEnd - leftSectionStart,
                      y: Math.min(leftShelf.y, matchingRightShelf.y),
                      h: Math.max(leftShelf.h, matchingRightShelf.h),
                    };
                    shelvesToRemove.push(leftShelf.id, matchingRightShelf.id);
                    shelvesToAdd.push(mergedShelf);
                  } else {
                    // No matching right shelf - just extend left shelf to cover both sections
                    const extendedShelf: RectShape = {
                      ...leftShelf,
                      x: leftSectionStart,
                      w: rightSectionEnd - leftSectionStart,
                    };
                    shelvesToRemove.push(leftShelf.id);
                    shelvesToAdd.push(extendedShelf);
                  }
                }
              }

              // Check right shelves that weren't already merged
              for (const rightShelf of rightShelves) {
                if (shelvesToRemove.includes(rightShelf.id)) continue;

                const shelfCenterY = rightShelf.y + rightShelf.h / 2;
                const inTopGap = hasTopGap && shelfCenterY >= innerTop && shelfCenterY < postTop;
                const inBottomGap = hasBottomGap && shelfCenterY > postBottom && shelfCenterY <= innerBottom;

                if (inTopGap || inBottomGap) {
                  // Extend right shelf to cover both sections
                  const extendedShelf: RectShape = {
                    ...rightShelf,
                    x: leftSectionStart,
                    w: rightSectionEnd - leftSectionStart,
                  };
                  shelvesToRemove.push(rightShelf.id);
                  shelvesToAdd.push(extendedShelf);
                }
              }

              // Apply changes
              if (shelvesToRemove.length > 0 || shelvesToAdd.length > 0) {
                updatedShapes = updatedShapes.filter(s => !shelvesToRemove.includes(s.id));
                updatedShapes = [...updatedShapes, ...shelvesToAdd];
                setShapes(updatedShapes);
                pushHistory(updatedShapes, "Resize Panel + Extend Shelves");
                resizeRef.current = null;
                return;
              }
            }
          }
        }
      }

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
      } else if (dragType === "horizontal" && isDraggableCenterPost(panelId)) {
        // Save center post positions to moduleConfig
        if (moduleConfig && moduleConfig.unitType === "wardrobe_carcass") {
          const postCount = moduleConfig.centerPostCount ?? 0;
          const T = moduleConfig.carcassThicknessMm ?? 18;
          const leftPanelX = shapes.find(s => s.id === "MOD-LEFT") as RectShape | undefined;

          if (postCount > 0 && leftPanelX) {
            // Calculate inner left edge (after left panel)
            const innerLeftX = leftPanelX.x + T;

            // Collect all post positions
            const postPositions: number[] = [];
            for (let i = 1; i <= postCount; i++) {
              const postShape = shapes.find(s => s.id === `MOD-POST-${i}`) as RectShape | undefined;
              if (postShape) {
                // Position relative to inner left edge
                const relativeX = postShape.x - innerLeftX;
                postPositions.push(Math.round(relativeX));
              }
            }

            // Sort positions (in case posts were reordered by dragging)
            postPositions.sort((a, b) => a - b);

            // Update moduleConfig with new positions and regenerate
            const { regenerateModuleShapes } = useDesignStore.getState();
            regenerateModuleShapes({
              ...moduleConfig,
              centerPostPositions: postPositions,
            });
          }
        }
        pushHistory(shapes, "Move Center Post");
      } else {
        pushHistory(shapes, "Move Center Post");
      }

      dragRef.current = null;
      sheetWarningShownRef.current = false; // Reset warning flag for next drag
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
