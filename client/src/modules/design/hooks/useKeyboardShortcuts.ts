/**
 * useKeyboardShortcuts Hook
 *
 * Handles all keyboard shortcuts for the design canvas.
 * Extracted from DesignCanvas.tsx for better organization.
 *
 * Shortcuts:
 * - Ctrl+Z: Undo
 * - Ctrl+Shift+Z / Ctrl+Y: Redo
 * - Ctrl+C: Copy
 * - Ctrl+V: Paste
 * - Ctrl+A: Select all
 * - Ctrl+S: Save as JSON
 * - Ctrl+D: Duplicate selected
 * - +/=: Zoom in
 * - -/_: Zoom out
 * - 0: Reset zoom
 * - V: Select mode
 * - R: Rect mode
 * - L: Line mode
 * - M: Move mode
 * - T: Trim mode
 * - D: Quick dimension mode
 * - H: Horizontal dimension mode
 * - J: Vertical dimension mode
 * - G: Toggle grid
 * - Escape: Cancel / reset
 * - Delete/Backspace: Delete selected
 * - Arrow keys: Nudge selected (Shift for 10x)
 */

import { useEffect, useCallback } from "react";
import { useDesignStore } from "../store/designStore";
import type { Shape, LineShape, RectShape, DimensionShape } from "../types";
import { saveAsJSON } from "../utils/fileIO";

interface KeyboardShortcutsOptions {
  enabled?: boolean;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
  const { enabled = true } = options;

  const {
    // State
    shapes,
    selectedId,
    selectedIds,
    gridSize,
    lineThickness,
    zoom,
    gridVisible,
    // Actions
    undo,
    redo,
    copyToClipboard,
    pasteFromClipboard,
    selectAll,
    setMode,
    setZoom,
    setGridVisible,
    setDimensionStart,
    setSelectedComponent,
    setActionMode,
    deleteSelectedShapes,
    pushHistory,
    setShapes,
    setSelectedId,
    setSelectedIds,
    setTemp,
  } = useDesignStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Ctrl/Cmd shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          undo();
        }
        if ((e.key === "z" && e.shiftKey) || e.key === "y") {
          e.preventDefault();
          redo();
        }
        if (e.key === "c") {
          e.preventDefault();
          copyToClipboard();
        }
        if (e.key === "v") {
          e.preventDefault();
          pasteFromClipboard();
        }
        if (e.key === "a") {
          e.preventDefault();
          selectAll();
        }
        if (e.key === "s") {
          e.preventDefault();
          saveAsJSON(shapes, gridSize, lineThickness, "design-drawing.json");
        }
        if (e.key === "d") {
          // Duplicate selected shape
          e.preventDefault();
          if (selectedId) {
            const sel = shapes.find((s) => s.id === selectedId);
            if (sel) {
              const newId = `${sel.type === "line" ? "L" : "R"}-${Math.random().toString(36).slice(2, 9)}`;
              const dup = { ...sel, id: newId } as Shape;
              if (dup.type === "rect") {
                (dup as RectShape).x += 20;
                (dup as RectShape).y += 20;
              } else if (dup.type === "line") {
                (dup as LineShape).x1 += 20;
                (dup as LineShape).y1 += 20;
                (dup as LineShape).x2 += 20;
                (dup as LineShape).y2 += 20;
              }
              const ns = [...shapes, dup];
              pushHistory(ns, "Duplicate");
              setShapes(ns);
              setSelectedId(newId);
            }
          }
        }
        return;
      }

      // Zoom shortcuts: +/= zoom in, -/_ zoom out, 0 reset
      if (e.key === "=" || e.key === "+") {
        e.preventDefault();
        setZoom(Math.min(5, zoom + 0.1));
      }
      if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom(Math.max(0.1, zoom - 0.1));
      }
      if (e.key === "0") {
        e.preventDefault();
        setZoom(1);
      }

      // Mode shortcuts
      switch (e.key.toLowerCase()) {
        case "v":
          e.preventDefault();
          setMode("select");
          break;
        case "r":
          e.preventDefault();
          setMode("rect");
          break;
        case "l":
          e.preventDefault();
          setMode("line");
          break;
        case "m":
          e.preventDefault();
          setMode("move");
          break;
        case "t":
          e.preventDefault();
          setMode("trim");
          break;
        case "d":
          e.preventDefault();
          setMode("quickDim");
          break;
        case "h":
          e.preventDefault();
          setMode("dimHoriz");
          setDimensionStart(null);
          break;
        case "j":
          e.preventDefault();
          setMode("dimVert");
          setDimensionStart(null);
          break;
        case "g":
          e.preventDefault();
          setGridVisible(!gridVisible);
          break;
        case "escape":
          e.preventDefault();
          setMode("select");
          setSelectedId(null);
          setSelectedIds(new Set());
          setTemp(null);
          setDimensionStart(null);
          setSelectedComponent(null);
          setActionMode(null);
          break;
      }

      // Delete
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelectedShapes();
      }

      // Arrow keys nudge
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0;
        const dy = e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0;
        if (dx === 0 && dy === 0) return;

        const idsToMove =
          selectedIds.size > 0 ? selectedIds : selectedId ? new Set([selectedId]) : new Set<string>();
        if (idsToMove.size === 0) return;
        e.preventDefault();

        const newShapes = shapes.map((s) => {
          if (!idsToMove.has(s.id)) return s;
          if (s.type === "rect") {
            return { ...s, x: (s as RectShape).x + dx, y: (s as RectShape).y + dy };
          }
          if (s.type === "line") {
            const l = s as LineShape;
            return { ...l, x1: l.x1 + dx, y1: l.y1 + dy, x2: l.x2 + dx, y2: l.y2 + dy };
          }
          if (s.type === "dimension") {
            const d = s as DimensionShape;
            return { ...d, x1: d.x1 + dx, y1: d.y1 + dy, x2: d.x2 + dx, y2: d.y2 + dy };
          }
          return s;
        });
        pushHistory(newShapes, "Nudge");
        setShapes(newShapes);
      }
    },
    [
      enabled,
      shapes,
      selectedId,
      selectedIds,
      gridSize,
      lineThickness,
      zoom,
      gridVisible,
      undo,
      redo,
      copyToClipboard,
      pasteFromClipboard,
      selectAll,
      setMode,
      setZoom,
      setGridVisible,
      setDimensionStart,
      setSelectedComponent,
      setActionMode,
      deleteSelectedShapes,
      pushHistory,
      setShapes,
      setSelectedId,
      setSelectedIds,
      setTemp,
    ]
  );

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);
}

export default useKeyboardShortcuts;
