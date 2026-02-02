/**
 * Tests for useMouseHandlers Hook
 *
 * Tests the mouse handling hook for the design canvas.
 * Since this hook has complex interactions with refs and SVG coordinates,
 * we test what we can reasonably test.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMouseHandlers } from "../hooks/useMouseHandlers";
import { useDesignStore } from "../store/designStore";
import type { RectShape, LineShape, Shape } from "../types";

// =============================================================================
// SETUP
// =============================================================================

// Mock SVG element with required methods
const createMockSvgElement = () => {
  const mockSvgPoint = {
    x: 0,
    y: 0,
    matrixTransform: vi.fn().mockReturnThis(),
  };

  const mockMatrix = {
    inverse: vi.fn().mockReturnValue({}),
  };

  return {
    createSVGPoint: vi.fn().mockReturnValue(mockSvgPoint),
    getScreenCTM: vi.fn().mockReturnValue(mockMatrix),
    getBoundingClientRect: vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
    }),
  } as unknown as SVGSVGElement;
};

// Create mock mouse event
const createMouseEvent = (
  clientX: number,
  clientY: number,
  options: Partial<React.MouseEvent> = {}
): React.MouseEvent => {
  return {
    clientX,
    clientY,
    ctrlKey: false,
    metaKey: false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...options,
  } as unknown as React.MouseEvent;
};

describe("useMouseHandlers", () => {
  let svgRef: React.RefObject<SVGSVGElement>;
  let panRef: React.RefObject<{ x: number; y: number }>;

  beforeEach(() => {
    // Reset store
    const store = useDesignStore.getState();
    store.setShapes([]);
    store.setSelectedId(null);
    store.setSelectedIds(new Set());
    store.setTemp(null);
    store.setMode("select");
    store.setActionMode(null);
    store.setDimensionStart(null);
    store.setIsDragging(false);
    store.clearHistory();

    // Setup refs
    svgRef = { current: createMockSvgElement() };
    panRef = { current: { x: 0, y: 0 } };
  });

  // ===========================================================================
  // HOOK INITIALIZATION
  // ===========================================================================
  describe("initialization", () => {
    it("returns all required handlers and refs", () => {
      const { result } = renderHook(() => useMouseHandlers({ svgRef, panRef }));

      expect(result.current.onMouseDown).toBeInstanceOf(Function);
      expect(result.current.onMouseMove).toBeInstanceOf(Function);
      expect(result.current.onMouseUp).toBeInstanceOf(Function);
      expect(result.current.onMouseLeave).toBeInstanceOf(Function);
      expect(result.current.dragRef).toHaveProperty("current");
      expect(result.current.resizeRef).toHaveProperty("current");
    });

    it("initializes dragRef and resizeRef as null", () => {
      const { result } = renderHook(() => useMouseHandlers({ svgRef, panRef }));

      expect(result.current.dragRef.current).toBeNull();
      expect(result.current.resizeRef.current).toBeNull();
    });
  });

  // ===========================================================================
  // MOUSE LEAVE
  // ===========================================================================
  describe("onMouseLeave", () => {
    it("clears dragRef and resizeRef", () => {
      const { result } = renderHook(() => useMouseHandlers({ svgRef, panRef }));

      // Simulate having active drag/resize
      (result.current.dragRef as any).current = { panelId: "test" };
      (result.current.resizeRef as any).current = { panelId: "test" };

      act(() => {
        result.current.onMouseLeave();
      });

      expect(result.current.dragRef.current).toBeNull();
      expect(result.current.resizeRef.current).toBeNull();
    });
  });

  // ===========================================================================
  // SELECT MODE
  // ===========================================================================
  describe("select mode", () => {
    it("sets selectedId when clicking on a shape", () => {
      const rect: RectShape = { id: "rect-1", type: "rect", x: 100, y: 100, w: 200, h: 150 };
      const store = useDesignStore.getState();
      store.setShapes([rect]);
      store.setMode("select");

      // Create mock that returns coordinates inside the rect
      const mockSvg = createMockSvgElement();
      const mockPoint = {
        x: 150,
        y: 150,
        matrixTransform: vi.fn().mockReturnValue({ x: 150, y: 150 }),
      };
      (mockSvg.createSVGPoint as any).mockReturnValue(mockPoint);
      svgRef = { current: mockSvg };

      const { result } = renderHook(() => useMouseHandlers({ svgRef, panRef }));

      act(() => {
        result.current.onMouseDown(createMouseEvent(150, 150));
      });

      expect(useDesignStore.getState().selectedId).toBe("rect-1");
    });

    it("clears selection when clicking on empty area", () => {
      const rect: RectShape = { id: "rect-1", type: "rect", x: 100, y: 100, w: 50, h: 50 };
      const store = useDesignStore.getState();
      store.setShapes([rect]);
      store.setSelectedId("rect-1");
      store.setMode("select");

      // Create mock that returns coordinates outside the rect
      const mockSvg = createMockSvgElement();
      const mockPoint = {
        x: 500,
        y: 500,
        matrixTransform: vi.fn().mockReturnValue({ x: 500, y: 500 }),
      };
      (mockSvg.createSVGPoint as any).mockReturnValue(mockPoint);
      svgRef = { current: mockSvg };

      const { result } = renderHook(() => useMouseHandlers({ svgRef, panRef }));

      act(() => {
        result.current.onMouseDown(createMouseEvent(500, 500));
      });

      expect(useDesignStore.getState().selectedId).toBeNull();
    });
  });

  // ===========================================================================
  // LINE MODE
  // ===========================================================================
  describe("line mode", () => {
    it("creates temp line on mouse down", () => {
      const store = useDesignStore.getState();
      store.setMode("line");

      const mockSvg = createMockSvgElement();
      const mockPoint = {
        x: 100,
        y: 100,
        matrixTransform: vi.fn().mockReturnValue({ x: 100, y: 100 }),
      };
      (mockSvg.createSVGPoint as any).mockReturnValue(mockPoint);
      svgRef = { current: mockSvg };

      const { result } = renderHook(() => useMouseHandlers({ svgRef, panRef }));

      act(() => {
        result.current.onMouseDown(createMouseEvent(100, 100));
      });

      const temp = useDesignStore.getState().temp;
      expect(temp).not.toBeNull();
      expect(temp?.type).toBe("line");
      expect((temp as LineShape).x1).toBeDefined();
      expect((temp as LineShape).y1).toBeDefined();
    });
  });

  // ===========================================================================
  // RECT MODE
  // ===========================================================================
  describe("rect mode", () => {
    it("creates temp rect on mouse down", () => {
      const store = useDesignStore.getState();
      store.setMode("rect");

      const mockSvg = createMockSvgElement();
      const mockPoint = {
        x: 100,
        y: 100,
        matrixTransform: vi.fn().mockReturnValue({ x: 100, y: 100 }),
      };
      (mockSvg.createSVGPoint as any).mockReturnValue(mockPoint);
      svgRef = { current: mockSvg };

      const { result } = renderHook(() => useMouseHandlers({ svgRef, panRef }));

      act(() => {
        result.current.onMouseDown(createMouseEvent(100, 100));
      });

      const temp = useDesignStore.getState().temp;
      expect(temp).not.toBeNull();
      expect(temp?.type).toBe("rect");
      expect((temp as RectShape).x).toBeDefined();
      expect((temp as RectShape).y).toBeDefined();
    });
  });

  // ===========================================================================
  // TRIM MODE
  // ===========================================================================
  describe("trim mode", () => {
    it("removes shape when clicked", () => {
      const rect: RectShape = { id: "rect-1", type: "rect", x: 100, y: 100, w: 200, h: 150 };
      const store = useDesignStore.getState();
      store.setShapes([rect]);
      store.setMode("trim");
      store.pushHistory([rect], "Initial");

      const mockSvg = createMockSvgElement();
      const mockPoint = {
        x: 150,
        y: 150,
        matrixTransform: vi.fn().mockReturnValue({ x: 150, y: 150 }),
      };
      (mockSvg.createSVGPoint as any).mockReturnValue(mockPoint);
      svgRef = { current: mockSvg };

      const { result } = renderHook(() => useMouseHandlers({ svgRef, panRef }));

      act(() => {
        result.current.onMouseDown(createMouseEvent(150, 150));
      });

      expect(useDesignStore.getState().shapes.length).toBe(0);
    });
  });

  // ===========================================================================
  // MOVE MODE
  // ===========================================================================
  describe("move mode", () => {
    it("sets temp and isDragging when clicking on shape", () => {
      const rect: RectShape = { id: "rect-1", type: "rect", x: 100, y: 100, w: 200, h: 150 };
      const store = useDesignStore.getState();
      store.setShapes([rect]);
      store.setMode("move");

      const mockSvg = createMockSvgElement();
      const mockPoint = {
        x: 150,
        y: 150,
        matrixTransform: vi.fn().mockReturnValue({ x: 150, y: 150 }),
      };
      (mockSvg.createSVGPoint as any).mockReturnValue(mockPoint);
      svgRef = { current: mockSvg };

      const { result } = renderHook(() => useMouseHandlers({ svgRef, panRef }));

      act(() => {
        result.current.onMouseDown(createMouseEvent(150, 150));
      });

      expect(useDesignStore.getState().selectedId).toBe("rect-1");
      expect(useDesignStore.getState().isDragging).toBe(true);
      expect(useDesignStore.getState().temp).not.toBeNull();
    });

    it("clears selection when clicking empty area in move mode", () => {
      const rect: RectShape = { id: "rect-1", type: "rect", x: 100, y: 100, w: 50, h: 50 };
      const store = useDesignStore.getState();
      store.setShapes([rect]);
      store.setSelectedId("rect-1");
      store.setMode("move");

      const mockSvg = createMockSvgElement();
      const mockPoint = {
        x: 500,
        y: 500,
        matrixTransform: vi.fn().mockReturnValue({ x: 500, y: 500 }),
      };
      (mockSvg.createSVGPoint as any).mockReturnValue(mockPoint);
      svgRef = { current: mockSvg };

      const { result } = renderHook(() => useMouseHandlers({ svgRef, panRef }));

      act(() => {
        result.current.onMouseDown(createMouseEvent(500, 500));
      });

      expect(useDesignStore.getState().selectedId).toBeNull();
    });
  });

  // ===========================================================================
  // DIMENSION MODES
  // ===========================================================================
  describe("dimension modes", () => {
    it("sets dimension start point on first click (dimHoriz)", () => {
      const store = useDesignStore.getState();
      store.setMode("dimHoriz");
      store.setDimensionStart(null);

      const mockSvg = createMockSvgElement();
      const mockPoint = {
        x: 100,
        y: 100,
        matrixTransform: vi.fn().mockReturnValue({ x: 100, y: 100 }),
      };
      (mockSvg.createSVGPoint as any).mockReturnValue(mockPoint);
      svgRef = { current: mockSvg };

      const { result } = renderHook(() => useMouseHandlers({ svgRef, panRef }));

      act(() => {
        result.current.onMouseDown(createMouseEvent(100, 100));
      });

      expect(useDesignStore.getState().dimensionStart).not.toBeNull();
    });

    it("creates dimension on second click (dimHoriz)", () => {
      const store = useDesignStore.getState();
      store.setMode("dimHoriz");
      store.setDimensionStart({ x: 100, y: 100 });
      store.setShapes([]);
      store.pushHistory([], "Initial");

      const mockSvg = createMockSvgElement();
      const mockPoint = {
        x: 200,
        y: 100,
        matrixTransform: vi.fn().mockReturnValue({ x: 200, y: 100 }),
      };
      (mockSvg.createSVGPoint as any).mockReturnValue(mockPoint);
      svgRef = { current: mockSvg };

      const { result } = renderHook(() => useMouseHandlers({ svgRef, panRef }));

      act(() => {
        result.current.onMouseDown(createMouseEvent(200, 100));
      });

      const shapes = useDesignStore.getState().shapes;
      expect(shapes.length).toBe(1);
      expect(shapes[0].type).toBe("dimension");
      expect(useDesignStore.getState().dimensionStart).toBeNull();
    });
  });

  // ===========================================================================
  // MOUSE UP
  // ===========================================================================
  describe("onMouseUp", () => {
    it("completes line drawing when line is long enough", () => {
      const store = useDesignStore.getState();
      store.setMode("line");
      store.setTemp({
        id: "L-temp",
        type: "line",
        x1: 100,
        y1: 100,
        x2: 200, // 100px horizontal line
        y2: 100,
        thickness: 2,
        color: "#000",
        marker: "none",
      });
      store.setShapes([]);
      store.pushHistory([], "Initial");

      const { result } = renderHook(() => useMouseHandlers({ svgRef, panRef }));

      act(() => {
        result.current.onMouseUp();
      });

      const shapes = useDesignStore.getState().shapes;
      expect(shapes.length).toBe(1);
      expect(shapes[0].type).toBe("line");
      expect(useDesignStore.getState().temp).toBeNull();
    });

    it("does not add line when too short", () => {
      const store = useDesignStore.getState();
      store.setMode("line");
      store.setTemp({
        id: "L-temp",
        type: "line",
        x1: 100,
        y1: 100,
        x2: 102, // Only 2px - too short
        y2: 100,
        thickness: 2,
        color: "#000",
        marker: "none",
      });
      store.setShapes([]);

      const { result } = renderHook(() => useMouseHandlers({ svgRef, panRef }));

      act(() => {
        result.current.onMouseUp();
      });

      expect(useDesignStore.getState().shapes.length).toBe(0);
      expect(useDesignStore.getState().temp).toBeNull();
    });

    it("completes rect drawing when rect has size", () => {
      const store = useDesignStore.getState();
      store.setMode("rect");
      store.setTemp({
        id: "R-temp",
        type: "rect",
        x: 100,
        y: 100,
        w: 200,
        h: 150,
        strokeWidth: 1,
      });
      store.setShapes([]);
      store.pushHistory([], "Initial");

      const { result } = renderHook(() => useMouseHandlers({ svgRef, panRef }));

      act(() => {
        result.current.onMouseUp();
      });

      const shapes = useDesignStore.getState().shapes;
      expect(shapes.length).toBe(1);
      expect(shapes[0].type).toBe("rect");
      expect(useDesignStore.getState().temp).toBeNull();
    });

    it("clears isDragging in move mode", () => {
      const store = useDesignStore.getState();
      store.setMode("move");
      store.setIsDragging(true);
      store.setTemp({ id: "test", type: "rect", x: 0, y: 0, w: 10, h: 10 });

      const { result } = renderHook(() => useMouseHandlers({ svgRef, panRef }));

      act(() => {
        result.current.onMouseUp();
      });

      expect(useDesignStore.getState().isDragging).toBe(false);
      expect(useDesignStore.getState().temp).toBeNull();
    });
  });

  // ===========================================================================
  // MULTI-SELECT WITH CTRL/CMD
  // ===========================================================================
  describe("multi-select with Ctrl/Cmd", () => {
    it("adds to selection when Ctrl-clicking", () => {
      const rect1: RectShape = { id: "rect-1", type: "rect", x: 100, y: 100, w: 50, h: 50 };
      const rect2: RectShape = { id: "rect-2", type: "rect", x: 200, y: 200, w: 50, h: 50 };
      const store = useDesignStore.getState();
      store.setShapes([rect1, rect2]);
      store.setSelectedId("rect-1");
      store.setSelectedIds(new Set(["rect-1"]));
      store.setMode("select");

      const mockSvg = createMockSvgElement();
      const mockPoint = {
        x: 225,
        y: 225,
        matrixTransform: vi.fn().mockReturnValue({ x: 225, y: 225 }),
      };
      (mockSvg.createSVGPoint as any).mockReturnValue(mockPoint);
      svgRef = { current: mockSvg };

      const { result } = renderHook(() => useMouseHandlers({ svgRef, panRef }));

      act(() => {
        result.current.onMouseDown(createMouseEvent(225, 225, { ctrlKey: true }));
      });

      const selectedIds = useDesignStore.getState().selectedIds;
      expect(selectedIds.has("rect-1")).toBe(true);
      expect(selectedIds.has("rect-2")).toBe(true);
    });
  });

  // ===========================================================================
  // SVG REF HANDLING
  // ===========================================================================
  describe("SVG ref handling", () => {
    it("handles null SVG ref gracefully", () => {
      const nullSvgRef = { current: null };

      const { result } = renderHook(() =>
        useMouseHandlers({ svgRef: nullSvgRef as any, panRef })
      );

      // Should not throw
      expect(() => {
        act(() => {
          result.current.onMouseDown(createMouseEvent(100, 100));
        });
      }).not.toThrow();
    });
  });
});
