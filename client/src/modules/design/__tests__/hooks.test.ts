/**
 * Custom Hooks Tests
 *
 * Layer: UNIT (Hooks)
 * Scope: useShapes, useHistory, useCanvas utility functions
 * Priority: HIGH - Core functionality for canvas interactions
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useShapes } from "../hooks/useShapes";
import { useHistory } from "../hooks/useHistory";
import { useCanvas } from "../hooks/useCanvas";
import { useDesignStore } from "../store/designStore";

// =============================================================================
// TEST SETUP
// =============================================================================

const resetStore = () => useDesignStore.getState().resetStore();
const getStore = () => useDesignStore.getState();

// =============================================================================
// useShapes TESTS
// =============================================================================

describe("useShapes", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("hitTest", () => {
    it("returns null when no shapes exist", () => {
      const { result } = renderHook(() => useShapes());
      expect(result.current.hitTest(100, 100)).toBeNull();
    });

    it("finds rect shape at point", () => {
      getStore().setShapes([
        { id: "r1", type: "rect", x: 50, y: 50, w: 100, h: 100 },
      ]);
      const { result } = renderHook(() => useShapes());
      const hit = result.current.hitTest(75, 75);
      expect(hit).not.toBeNull();
      expect(hit?.id).toBe("r1");
    });

    it("returns null when clicking outside rect", () => {
      getStore().setShapes([
        { id: "r1", type: "rect", x: 50, y: 50, w: 100, h: 100 },
      ]);
      const { result } = renderHook(() => useShapes());
      expect(result.current.hitTest(200, 200)).toBeNull();
    });

    it("finds line shape near point", () => {
      getStore().setShapes([
        { id: "l1", type: "line", x1: 0, y1: 0, x2: 100, y2: 100 },
      ]);
      const { result } = renderHook(() => useShapes());
      const hit = result.current.hitTest(50, 52, 5);
      expect(hit).not.toBeNull();
      expect(hit?.id).toBe("l1");
    });

    it("returns topmost shape when overlapping", () => {
      getStore().setShapes([
        { id: "r1", type: "rect", x: 0, y: 0, w: 100, h: 100 },
        { id: "r2", type: "rect", x: 50, y: 50, w: 100, h: 100 },
      ]);
      const { result } = renderHook(() => useShapes());
      const hit = result.current.hitTest(75, 75);
      expect(hit?.id).toBe("r2"); // r2 is on top (added last)
    });

    it("finds dimension shape in bounding box", () => {
      getStore().setShapes([
        { id: "d1", type: "dimension", x1: 0, y1: 0, x2: 100, y2: 0, label: "100", dimType: "horizontal" },
      ]);
      const { result } = renderHook(() => useShapes());
      const hit = result.current.hitTest(50, 2, 5);
      expect(hit).not.toBeNull();
      expect(hit?.id).toBe("d1");
    });

    it("respects tolerance parameter", () => {
      getStore().setShapes([
        { id: "r1", type: "rect", x: 50, y: 50, w: 100, h: 100 },
      ]);
      const { result } = renderHook(() => useShapes());
      // Point just outside rect but within tolerance
      expect(result.current.hitTest(48, 75, 5)).not.toBeNull();
      // Point outside tolerance
      expect(result.current.hitTest(40, 75, 5)).toBeNull();
    });

    it("handles zero-length line (point)", () => {
      getStore().setShapes([
        { id: "l1", type: "line", x1: 50, y1: 50, x2: 50, y2: 50 },
      ]);
      const { result } = renderHook(() => useShapes());
      expect(result.current.hitTest(52, 50, 5)).not.toBeNull();
      expect(result.current.hitTest(60, 50, 5)).toBeNull();
    });
  });

  describe("getShapeById", () => {
    it("returns null for null id", () => {
      const { result } = renderHook(() => useShapes());
      expect(result.current.getShapeById(null)).toBeNull();
    });

    it("returns null for non-existent id", () => {
      getStore().setShapes([
        { id: "r1", type: "rect", x: 0, y: 0, w: 100, h: 100 },
      ]);
      const { result } = renderHook(() => useShapes());
      expect(result.current.getShapeById("nonexistent")).toBeNull();
    });

    it("returns shape for valid id", () => {
      getStore().setShapes([
        { id: "r1", type: "rect", x: 0, y: 0, w: 100, h: 100 },
      ]);
      const { result } = renderHook(() => useShapes());
      const shape = result.current.getShapeById("r1");
      expect(shape).not.toBeNull();
      expect(shape?.id).toBe("r1");
    });
  });

  describe("getSelectedShapes", () => {
    it("returns empty array when nothing selected", () => {
      getStore().setShapes([
        { id: "r1", type: "rect", x: 0, y: 0, w: 100, h: 100 },
      ]);
      const { result } = renderHook(() => useShapes());
      expect(result.current.getSelectedShapes()).toHaveLength(0);
    });

    it("returns shape when selectedId is set", () => {
      getStore().setShapes([
        { id: "r1", type: "rect", x: 0, y: 0, w: 100, h: 100 },
      ]);
      getStore().setSelectedId("r1");
      const { result } = renderHook(() => useShapes());
      const selected = result.current.getSelectedShapes();
      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe("r1");
    });

    it("returns shapes when selectedIds is set", () => {
      getStore().setShapes([
        { id: "r1", type: "rect", x: 0, y: 0, w: 100, h: 100 },
        { id: "r2", type: "rect", x: 50, y: 50, w: 100, h: 100 },
      ]);
      getStore().setSelectedIds(new Set(["r1", "r2"]));
      const { result } = renderHook(() => useShapes());
      expect(result.current.getSelectedShapes()).toHaveLength(2);
    });

    it("combines selectedId and selectedIds", () => {
      getStore().setShapes([
        { id: "r1", type: "rect", x: 0, y: 0, w: 100, h: 100 },
        { id: "r2", type: "rect", x: 50, y: 50, w: 100, h: 100 },
      ]);
      getStore().setSelectedId("r1");
      getStore().setSelectedIds(new Set(["r2"]));
      const { result } = renderHook(() => useShapes());
      expect(result.current.getSelectedShapes()).toHaveLength(2);
    });
  });

  describe("isSelected", () => {
    it("returns false when not selected", () => {
      const { result } = renderHook(() => useShapes());
      expect(result.current.isSelected("r1")).toBe(false);
    });

    it("returns true when selectedId matches", () => {
      getStore().setSelectedId("r1");
      const { result } = renderHook(() => useShapes());
      expect(result.current.isSelected("r1")).toBe(true);
    });

    it("returns true when in selectedIds", () => {
      getStore().setSelectedIds(new Set(["r1"]));
      const { result } = renderHook(() => useShapes());
      expect(result.current.isSelected("r1")).toBe(true);
    });
  });

  describe("hasSelection", () => {
    it("returns false when nothing selected", () => {
      const { result } = renderHook(() => useShapes());
      expect(result.current.hasSelection()).toBe(false);
    });

    it("returns true when selectedId is set", () => {
      getStore().setSelectedId("r1");
      const { result } = renderHook(() => useShapes());
      expect(result.current.hasSelection()).toBe(true);
    });

    it("returns true when selectedIds has items", () => {
      getStore().setSelectedIds(new Set(["r1"]));
      const { result } = renderHook(() => useShapes());
      expect(result.current.hasSelection()).toBe(true);
    });
  });
});

// =============================================================================
// useHistory TESTS
// =============================================================================

describe("useHistory", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("canUndo", () => {
    it("returns false when history is empty", () => {
      const { result } = renderHook(() => useHistory());
      expect(result.current.canUndo()).toBe(false);
    });

    it("returns false at start of history", () => {
      getStore().pushHistory([], "Initial");
      const { result } = renderHook(() => useHistory());
      expect(result.current.canUndo()).toBe(false);
    });

    it("returns true when can undo", () => {
      getStore().pushHistory([], "Step 1");
      getStore().pushHistory([{ id: "r1", type: "rect", x: 0, y: 0, w: 100, h: 100 }], "Step 2");
      const { result } = renderHook(() => useHistory());
      expect(result.current.canUndo()).toBe(true);
    });
  });

  describe("canRedo", () => {
    it("returns false when at end of history", () => {
      getStore().pushHistory([], "Step 1");
      const { result } = renderHook(() => useHistory());
      expect(result.current.canRedo()).toBe(false);
    });

    it("returns true after undo", () => {
      getStore().pushHistory([], "Step 1");
      getStore().pushHistory([{ id: "r1", type: "rect", x: 0, y: 0, w: 100, h: 100 }], "Step 2");
      getStore().undo();
      const { result } = renderHook(() => useHistory());
      expect(result.current.canRedo()).toBe(true);
    });
  });

  describe("hasClipboard", () => {
    it("returns false when clipboard is null", () => {
      const { result } = renderHook(() => useHistory());
      expect(result.current.hasClipboard()).toBe(false);
    });

    it("returns false when clipboard is empty", () => {
      getStore().setClipboard([]);
      const { result } = renderHook(() => useHistory());
      expect(result.current.hasClipboard()).toBe(false);
    });

    it("returns true when clipboard has content", () => {
      getStore().setClipboard([{ id: "r1", type: "rect", x: 0, y: 0, w: 100, h: 100 }]);
      const { result } = renderHook(() => useHistory());
      expect(result.current.hasClipboard()).toBe(true);
    });
  });

  describe("currentDescription", () => {
    it("returns null when history is empty", () => {
      const { result } = renderHook(() => useHistory());
      expect(result.current.currentDescription()).toBeNull();
    });

    it("returns description at current index", () => {
      getStore().pushHistory([], "First Step");
      const { result } = renderHook(() => useHistory());
      expect(result.current.currentDescription()).toBe("First Step");
    });

    it("updates after undo", () => {
      getStore().pushHistory([], "Step 1");
      getStore().pushHistory([{ id: "r1", type: "rect", x: 0, y: 0, w: 100, h: 100 }], "Step 2");
      getStore().undo();
      const { result } = renderHook(() => useHistory());
      expect(result.current.currentDescription()).toBe("Step 1");
    });
  });

  describe("saveToHistory", () => {
    it("pushes current shapes to history", () => {
      getStore().setShapes([{ id: "r1", type: "rect", x: 0, y: 0, w: 100, h: 100 }]);
      const { result } = renderHook(() => useHistory());

      act(() => {
        result.current.saveToHistory("Added rectangle");
      });

      expect(result.current.historyLength).toBe(1);
      expect(result.current.currentDescription()).toBe("Added rectangle");
    });
  });

  describe("historyLength", () => {
    it("returns 0 initially", () => {
      const { result } = renderHook(() => useHistory());
      expect(result.current.historyLength).toBe(0);
    });

    it("increments when pushing history", () => {
      getStore().pushHistory([], "Step 1");
      getStore().pushHistory([], "Step 2");
      const { result } = renderHook(() => useHistory());
      expect(result.current.historyLength).toBe(2);
    });
  });

  describe("cut", () => {
    it("copies to clipboard", () => {
      getStore().setShapes([{ id: "r1", type: "rect", x: 0, y: 0, w: 100, h: 100 }]);
      getStore().setSelectedId("r1");
      const { result } = renderHook(() => useHistory());

      act(() => {
        result.current.cut();
      });

      expect(result.current.hasClipboard()).toBe(true);
    });
  });
});

// =============================================================================
// useCanvas TESTS
// =============================================================================

describe("useCanvas", () => {
  beforeEach(() => {
    resetStore();
  });

  describe("snapToGrid", () => {
    it("snaps point to grid", () => {
      getStore().setGridSize(10);
      const { result } = renderHook(() => useCanvas());
      const snapped = result.current.snapToGrid(23, 47);
      expect(snapped.x).toBe(20);
      expect(snapped.y).toBe(50);
    });

    it("handles negative coordinates", () => {
      getStore().setGridSize(10);
      const { result } = renderHook(() => useCanvas());
      const snapped = result.current.snapToGrid(-23, -47);
      expect(snapped.x).toBe(-20);
      expect(snapped.y).toBe(-50);
    });

    it("handles exact grid points", () => {
      getStore().setGridSize(10);
      const { result } = renderHook(() => useCanvas());
      const snapped = result.current.snapToGrid(50, 100);
      expect(snapped.x).toBe(50);
      expect(snapped.y).toBe(100);
    });

    it("respects grid size changes", () => {
      getStore().setGridSize(25);
      const { result } = renderHook(() => useCanvas());
      const snapped = result.current.snapToGrid(30, 60);
      expect(snapped.x).toBe(25);
      expect(snapped.y).toBe(50);
    });
  });

  describe("snapValue", () => {
    it("snaps single value to grid", () => {
      getStore().setGridSize(10);
      const { result } = renderHook(() => useCanvas());
      expect(result.current.snapValue(23)).toBe(20);
      expect(result.current.snapValue(27)).toBe(30);
    });
  });

  describe("isWithinBounds", () => {
    it("returns true for point inside canvas", () => {
      getStore().setCanvasSize({ w: 1000, h: 800 });
      const { result } = renderHook(() => useCanvas());
      expect(result.current.isWithinBounds(500, 400)).toBe(true);
    });

    it("returns true for point on edge", () => {
      getStore().setCanvasSize({ w: 1000, h: 800 });
      const { result } = renderHook(() => useCanvas());
      expect(result.current.isWithinBounds(0, 0)).toBe(true);
      expect(result.current.isWithinBounds(1000, 800)).toBe(true);
    });

    it("returns false for point outside canvas", () => {
      getStore().setCanvasSize({ w: 1000, h: 800 });
      const { result } = renderHook(() => useCanvas());
      expect(result.current.isWithinBounds(-10, 400)).toBe(false);
      expect(result.current.isWithinBounds(500, 900)).toBe(false);
    });
  });

  describe("clampToBounds", () => {
    it("returns same point if within bounds", () => {
      getStore().setCanvasSize({ w: 1000, h: 800 });
      const { result } = renderHook(() => useCanvas());
      const clamped = result.current.clampToBounds(500, 400);
      expect(clamped.x).toBe(500);
      expect(clamped.y).toBe(400);
    });

    it("clamps negative values to 0", () => {
      getStore().setCanvasSize({ w: 1000, h: 800 });
      const { result } = renderHook(() => useCanvas());
      const clamped = result.current.clampToBounds(-100, -50);
      expect(clamped.x).toBe(0);
      expect(clamped.y).toBe(0);
    });

    it("clamps values exceeding canvas size", () => {
      getStore().setCanvasSize({ w: 1000, h: 800 });
      const { result } = renderHook(() => useCanvas());
      const clamped = result.current.clampToBounds(1500, 1000);
      expect(clamped.x).toBe(1000);
      expect(clamped.y).toBe(800);
    });
  });

  describe("canvasToScreen", () => {
    it("converts canvas to screen coordinates at zoom 1", () => {
      getStore().setZoom(1);
      getStore().setPanPosition({ x: 0, y: 0 });
      const { result } = renderHook(() => useCanvas());
      const screen = result.current.canvasToScreen(100, 200);
      expect(screen.x).toBe(100);
      expect(screen.y).toBe(200);
    });

    it("scales coordinates by zoom factor", () => {
      getStore().setZoom(2);
      getStore().setPanPosition({ x: 0, y: 0 });
      const { result } = renderHook(() => useCanvas());
      const screen = result.current.canvasToScreen(100, 200);
      expect(screen.x).toBe(200);
      expect(screen.y).toBe(400);
    });

    it("includes pan offset", () => {
      getStore().setZoom(1);
      getStore().setPanPosition({ x: 50, y: 100 });
      const { result } = renderHook(() => useCanvas());
      const screen = result.current.canvasToScreen(100, 200);
      expect(screen.x).toBe(150);
      expect(screen.y).toBe(300);
    });
  });

  describe("screenToCanvas", () => {
    it("converts screen to canvas coordinates at zoom 1", () => {
      getStore().setZoom(1);
      getStore().setPanPosition({ x: 0, y: 0 });
      const { result } = renderHook(() => useCanvas());
      const canvas = result.current.screenToCanvas(100, 200);
      expect(canvas.x).toBe(100);
      expect(canvas.y).toBe(200);
    });

    it("divides coordinates by zoom factor", () => {
      getStore().setZoom(2);
      getStore().setPanPosition({ x: 0, y: 0 });
      const { result } = renderHook(() => useCanvas());
      const canvas = result.current.screenToCanvas(200, 400);
      expect(canvas.x).toBe(100);
      expect(canvas.y).toBe(200);
    });

    it("subtracts pan offset", () => {
      getStore().setZoom(1);
      getStore().setPanPosition({ x: 50, y: 100 });
      const { result } = renderHook(() => useCanvas());
      const canvas = result.current.screenToCanvas(150, 300);
      expect(canvas.x).toBe(100);
      expect(canvas.y).toBe(200);
    });

    it("is inverse of canvasToScreen", () => {
      getStore().setZoom(1.5);
      getStore().setPanPosition({ x: 30, y: 60 });
      const { result } = renderHook(() => useCanvas());

      const original = { x: 100, y: 200 };
      const screen = result.current.canvasToScreen(original.x, original.y);
      const backToCanvas = result.current.screenToCanvas(screen.x, screen.y);

      expect(backToCanvas.x).toBeCloseTo(original.x, 5);
      expect(backToCanvas.y).toBeCloseTo(original.y, 5);
    });
  });

  describe("zoomToFit", () => {
    it("sets zoom and pan to fit content", () => {
      getStore().setCanvasSize({ w: 1000, h: 800 });
      const { result } = renderHook(() => useCanvas());

      act(() => {
        result.current.zoomToFit(500, 400, 50);
      });

      // Check zoom was updated
      expect(getStore().zoom).toBeLessThanOrEqual(1);
      expect(getStore().zoom).toBeGreaterThan(0);
    });

    it("does not zoom in past 100%", () => {
      getStore().setCanvasSize({ w: 100, h: 100 });
      const { result } = renderHook(() => useCanvas());

      act(() => {
        result.current.zoomToFit(2000, 2000, 50);
      });

      expect(getStore().zoom).toBeLessThanOrEqual(1);
    });
  });

  describe("state access", () => {
    it("exposes gridSize", () => {
      getStore().setGridSize(25);
      const { result } = renderHook(() => useCanvas());
      expect(result.current.gridSize).toBe(25);
    });

    it("exposes gridVisible", () => {
      getStore().setGridVisible(false);
      const { result } = renderHook(() => useCanvas());
      expect(result.current.gridVisible).toBe(false);
    });

    it("exposes zoom", () => {
      getStore().setZoom(1.5);
      const { result } = renderHook(() => useCanvas());
      expect(result.current.zoom).toBe(1.5);
    });

    it("exposes canvasSize", () => {
      getStore().setCanvasSize({ w: 500, h: 600 });
      const { result } = renderHook(() => useCanvas());
      expect(result.current.canvasSize).toEqual({ w: 500, h: 600 });
    });

    it("exposes panPosition", () => {
      getStore().setPanPosition({ x: 100, y: 200 });
      const { result } = renderHook(() => useCanvas());
      expect(result.current.panPosition).toEqual({ x: 100, y: 200 });
    });
  });
});
