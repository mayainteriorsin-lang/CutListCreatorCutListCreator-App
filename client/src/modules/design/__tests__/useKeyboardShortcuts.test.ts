/**
 * Tests for useKeyboardShortcuts hook
 *
 * Tests keyboard shortcuts for the design canvas including:
 * - Ctrl+Z/Y undo/redo
 * - Ctrl+C/V copy/paste
 * - Mode shortcuts (V, R, L, M, T, D, H, J)
 * - Zoom shortcuts (+, -, 0)
 * - Arrow key nudging
 * - Delete/Escape handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDesignStore } from "../store/designStore";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";

// Reset store before each test
const resetStore = () => {
  const store = useDesignStore.getState();
  store.setShapes([]);
  store.setSelectedId(null);
  store.setSelectedIds(new Set());
  store.setMode("select");
  store.setZoom(1);
  store.setGridVisible(true);
  store.clearHistory();
};

// Simulate keyboard event
const fireKeyDown = (
  key: string,
  options: {
    ctrlKey?: boolean;
    metaKey?: boolean;
    shiftKey?: boolean;
    preventDefault?: () => void;
  } = {}
) => {
  const event = new KeyboardEvent("keydown", {
    key,
    ctrlKey: options.ctrlKey ?? false,
    metaKey: options.metaKey ?? false,
    shiftKey: options.shiftKey ?? false,
    bubbles: true,
  });

  // Mock preventDefault
  if (options.preventDefault) {
    Object.defineProperty(event, "preventDefault", {
      value: options.preventDefault,
    });
  } else {
    Object.defineProperty(event, "preventDefault", {
      value: vi.fn(),
    });
  }

  window.dispatchEvent(event);
  return event;
};

describe("useKeyboardShortcuts", () => {
  beforeEach(() => {
    resetStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // BASIC FUNCTIONALITY
  // =========================================================================
  describe("basic functionality", () => {
    it("registers and unregisters event listener", () => {
      const addSpy = vi.spyOn(window, "addEventListener");
      const removeSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = renderHook(() => useKeyboardShortcuts({ enabled: true }));

      expect(addSpy).toHaveBeenCalledWith("keydown", expect.any(Function));

      unmount();

      expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it("does not register listener when disabled", () => {
      const addSpy = vi.spyOn(window, "addEventListener");

      renderHook(() => useKeyboardShortcuts({ enabled: false }));

      // Should not add keydown listener
      const keydownCalls = addSpy.mock.calls.filter(
        (call) => call[0] === "keydown"
      );
      expect(keydownCalls.length).toBe(0);

      addSpy.mockRestore();
    });
  });

  // =========================================================================
  // MODE SHORTCUTS
  // =========================================================================
  describe("mode shortcuts", () => {
    beforeEach(() => {
      renderHook(() => useKeyboardShortcuts({ enabled: true }));
    });

    it("V key sets select mode", () => {
      useDesignStore.getState().setMode("line");

      act(() => {
        fireKeyDown("v");
      });

      expect(useDesignStore.getState().mode).toBe("select");
    });

    it("R key sets rect mode", () => {
      act(() => {
        fireKeyDown("r");
      });

      expect(useDesignStore.getState().mode).toBe("rect");
    });

    it("L key sets line mode", () => {
      act(() => {
        fireKeyDown("l");
      });

      expect(useDesignStore.getState().mode).toBe("line");
    });

    it("M key sets move mode", () => {
      act(() => {
        fireKeyDown("m");
      });

      expect(useDesignStore.getState().mode).toBe("move");
    });

    it("T key sets trim mode", () => {
      act(() => {
        fireKeyDown("t");
      });

      expect(useDesignStore.getState().mode).toBe("trim");
    });

    it("D key sets quickDim mode", () => {
      act(() => {
        fireKeyDown("d");
      });

      expect(useDesignStore.getState().mode).toBe("quickDim");
    });

    it("H key sets dimHoriz mode", () => {
      act(() => {
        fireKeyDown("h");
      });

      expect(useDesignStore.getState().mode).toBe("dimHoriz");
    });

    it("J key sets dimVert mode", () => {
      act(() => {
        fireKeyDown("j");
      });

      expect(useDesignStore.getState().mode).toBe("dimVert");
    });
  });

  // =========================================================================
  // ZOOM SHORTCUTS
  // =========================================================================
  describe("zoom shortcuts", () => {
    beforeEach(() => {
      renderHook(() => useKeyboardShortcuts({ enabled: true }));
    });

    it("= key zooms in", () => {
      useDesignStore.getState().setZoom(1);

      act(() => {
        fireKeyDown("=");
      });

      expect(useDesignStore.getState().zoom).toBeCloseTo(1.1, 1);
    });

    it("+ key zooms in", () => {
      useDesignStore.getState().setZoom(1);

      act(() => {
        fireKeyDown("+");
      });

      expect(useDesignStore.getState().zoom).toBeCloseTo(1.1, 1);
    });

    it("- key zooms out", () => {
      useDesignStore.getState().setZoom(1);

      act(() => {
        fireKeyDown("-");
      });

      expect(useDesignStore.getState().zoom).toBeCloseTo(0.9, 1);
    });

    it("0 key resets zoom to 1", () => {
      useDesignStore.getState().setZoom(2);

      act(() => {
        fireKeyDown("0");
      });

      expect(useDesignStore.getState().zoom).toBe(1);
    });

    it("zoom has maximum limit of 5", () => {
      useDesignStore.getState().setZoom(4.95);

      act(() => {
        fireKeyDown("=");
      });

      expect(useDesignStore.getState().zoom).toBeLessThanOrEqual(5);
    });

    it("zoom has minimum limit of 0.1", () => {
      useDesignStore.getState().setZoom(0.15);

      act(() => {
        fireKeyDown("-");
      });

      expect(useDesignStore.getState().zoom).toBeGreaterThanOrEqual(0.1);
    });
  });

  // =========================================================================
  // GRID TOGGLE
  // =========================================================================
  describe("grid toggle", () => {
    beforeEach(() => {
      renderHook(() => useKeyboardShortcuts({ enabled: true }));
    });

    it("G key toggles grid visibility", () => {
      useDesignStore.getState().setGridVisible(true);

      act(() => {
        fireKeyDown("g");
      });

      expect(useDesignStore.getState().gridVisible).toBe(false);

      act(() => {
        fireKeyDown("g");
      });

      expect(useDesignStore.getState().gridVisible).toBe(true);
    });
  });

  // =========================================================================
  // ESCAPE KEY
  // =========================================================================
  describe("escape key", () => {
    beforeEach(() => {
      renderHook(() => useKeyboardShortcuts({ enabled: true }));
    });

    it("Escape resets mode to select", () => {
      useDesignStore.getState().setMode("line");

      act(() => {
        fireKeyDown("Escape");
      });

      expect(useDesignStore.getState().mode).toBe("select");
    });

    it("Escape clears selection", () => {
      useDesignStore.getState().setSelectedId("shape-1");
      useDesignStore.getState().setSelectedIds(new Set(["shape-1", "shape-2"]));

      act(() => {
        fireKeyDown("Escape");
      });

      expect(useDesignStore.getState().selectedId).toBeNull();
      expect(useDesignStore.getState().selectedIds.size).toBe(0);
    });

    it("Escape clears action mode", () => {
      useDesignStore.getState().setActionMode("move");

      act(() => {
        fireKeyDown("Escape");
      });

      expect(useDesignStore.getState().actionMode).toBeNull();
    });
  });

  // =========================================================================
  // ARROW KEY NUDGING
  // =========================================================================
  describe("arrow key nudging", () => {
    beforeEach(() => {
      const store = useDesignStore.getState();
      store.setShapes([
        { id: "rect-1", type: "rect", x: 100, y: 100, w: 50, h: 50 },
      ]);
      store.setSelectedId("rect-1");
      store.pushHistory(store.shapes, "Initial");

      renderHook(() => useKeyboardShortcuts({ enabled: true }));
    });

    it("ArrowRight moves shape right by 1", () => {
      act(() => {
        fireKeyDown("ArrowRight");
      });

      const shape = useDesignStore.getState().shapes[0];
      expect((shape as any).x).toBe(101);
    });

    it("ArrowLeft moves shape left by 1", () => {
      act(() => {
        fireKeyDown("ArrowLeft");
      });

      const shape = useDesignStore.getState().shapes[0];
      expect((shape as any).x).toBe(99);
    });

    it("ArrowDown moves shape down by 1", () => {
      act(() => {
        fireKeyDown("ArrowDown");
      });

      const shape = useDesignStore.getState().shapes[0];
      expect((shape as any).y).toBe(101);
    });

    it("ArrowUp moves shape up by 1", () => {
      act(() => {
        fireKeyDown("ArrowUp");
      });

      const shape = useDesignStore.getState().shapes[0];
      expect((shape as any).y).toBe(99);
    });

    it("Shift+Arrow moves shape by 10", () => {
      act(() => {
        fireKeyDown("ArrowRight", { shiftKey: true });
      });

      const shape = useDesignStore.getState().shapes[0];
      expect((shape as any).x).toBe(110);
    });

    it("does nothing when no shape is selected", () => {
      // Reset selection before this specific test
      const store = useDesignStore.getState();
      store.setShapes([
        { id: "rect-fresh", type: "rect", x: 100, y: 100, w: 50, h: 50 },
      ]);
      store.setSelectedId(null);
      store.setSelectedIds(new Set());

      // Re-render hook to pick up new state
      const { rerender } = renderHook(() => useKeyboardShortcuts({ enabled: true }));
      rerender();

      act(() => {
        fireKeyDown("ArrowRight");
      });

      const shape = useDesignStore.getState().shapes[0];
      expect((shape as any).x).toBe(100); // Should not have moved
    });
  });

  // =========================================================================
  // DELETE KEY
  // =========================================================================
  describe("delete key", () => {
    beforeEach(() => {
      const store = useDesignStore.getState();
      store.setShapes([
        { id: "rect-1", type: "rect", x: 100, y: 100, w: 50, h: 50 },
        { id: "rect-2", type: "rect", x: 200, y: 200, w: 50, h: 50 },
      ]);
      store.pushHistory(store.shapes, "Initial");

      renderHook(() => useKeyboardShortcuts({ enabled: true }));
    });

    it("Delete key removes selected shape", () => {
      useDesignStore.getState().setSelectedId("rect-1");

      act(() => {
        fireKeyDown("Delete");
      });

      const shapes = useDesignStore.getState().shapes;
      expect(shapes.length).toBe(1);
      expect(shapes[0].id).toBe("rect-2");
    });

    it("Backspace key removes selected shape", () => {
      useDesignStore.getState().setSelectedId("rect-1");

      act(() => {
        fireKeyDown("Backspace");
      });

      const shapes = useDesignStore.getState().shapes;
      expect(shapes.length).toBe(1);
    });

    it("Delete removes multiple selected shapes", () => {
      useDesignStore.getState().setSelectedIds(new Set(["rect-1", "rect-2"]));

      act(() => {
        fireKeyDown("Delete");
      });

      const shapes = useDesignStore.getState().shapes;
      expect(shapes.length).toBe(0);
    });
  });

  // =========================================================================
  // CTRL SHORTCUTS
  // =========================================================================
  describe("ctrl shortcuts", () => {
    beforeEach(() => {
      const store = useDesignStore.getState();
      store.setShapes([
        { id: "rect-1", type: "rect", x: 100, y: 100, w: 50, h: 50 },
      ]);
      store.pushHistory(store.shapes, "Initial");

      renderHook(() => useKeyboardShortcuts({ enabled: true }));
    });

    it("Ctrl+A selects all shapes", () => {
      act(() => {
        fireKeyDown("a", { ctrlKey: true });
      });

      const selectedIds = useDesignStore.getState().selectedIds;
      expect(selectedIds.has("rect-1")).toBe(true);
    });

    it("Ctrl+C copies selected shape to clipboard", () => {
      useDesignStore.getState().setSelectedId("rect-1");

      act(() => {
        fireKeyDown("c", { ctrlKey: true });
      });

      const clipboard = useDesignStore.getState().clipboard;
      expect(clipboard).not.toBeNull();
      expect(clipboard?.length).toBe(1);
    });

    it("Ctrl+V pastes from clipboard", () => {
      useDesignStore.getState().setSelectedId("rect-1");

      act(() => {
        fireKeyDown("c", { ctrlKey: true });
      });

      act(() => {
        fireKeyDown("v", { ctrlKey: true });
      });

      const shapes = useDesignStore.getState().shapes;
      expect(shapes.length).toBe(2);
    });

    it("Ctrl+D duplicates selected shape", () => {
      // Setup fresh state for this test
      const store = useDesignStore.getState();
      store.setShapes([
        { id: "rect-dup", type: "rect", x: 100, y: 100, w: 50, h: 50 },
      ]);
      store.setSelectedId("rect-dup");
      store.pushHistory(store.shapes, "Initial");

      // Re-render hook to pick up new state
      const { rerender } = renderHook(() => useKeyboardShortcuts({ enabled: true }));
      rerender();

      act(() => {
        fireKeyDown("d", { ctrlKey: true });
      });

      const shapes = useDesignStore.getState().shapes;
      expect(shapes.length).toBe(2);

      // Duplicated shape should be offset
      const newShape = shapes.find((s) => s.id !== "rect-dup");
      expect(newShape).toBeTruthy();
      expect((newShape as any).x).toBe(120); // 100 + 20
      expect((newShape as any).y).toBe(120); // 100 + 20
    });

    it("Ctrl+Z triggers undo", () => {
      // Setup: start with 1 rect, push history, then add another
      const store = useDesignStore.getState();
      store.clearHistory();
      store.setShapes([
        { id: "rect-1", type: "rect", x: 100, y: 100, w: 50, h: 50 },
      ]);
      store.pushHistory(store.shapes, "Initial state");

      // Now add a second rect and push that to history
      store.setShapes([
        { id: "rect-1", type: "rect", x: 100, y: 100, w: 50, h: 50 },
        { id: "rect-2", type: "rect", x: 200, y: 200, w: 50, h: 50 },
      ]);
      store.pushHistory(store.shapes, "Add rect-2");

      // Verify we have 2 shapes before undo
      expect(useDesignStore.getState().shapes.length).toBe(2);

      act(() => {
        fireKeyDown("z", { ctrlKey: true });
      });

      const shapes = useDesignStore.getState().shapes;
      expect(shapes.length).toBe(1);
    });

    it("Ctrl+Y triggers redo", () => {
      // Make a change
      useDesignStore.getState().setShapes([
        { id: "rect-1", type: "rect", x: 100, y: 100, w: 50, h: 50 },
        { id: "rect-2", type: "rect", x: 200, y: 200, w: 50, h: 50 },
      ]);
      useDesignStore.getState().pushHistory(useDesignStore.getState().shapes, "Add rect");

      // Undo
      act(() => {
        fireKeyDown("z", { ctrlKey: true });
      });

      // Redo
      act(() => {
        fireKeyDown("y", { ctrlKey: true });
      });

      const shapes = useDesignStore.getState().shapes;
      expect(shapes.length).toBe(2);
    });

    it("Ctrl+Shift+Z triggers redo", () => {
      // Make a change
      useDesignStore.getState().setShapes([
        { id: "rect-1", type: "rect", x: 100, y: 100, w: 50, h: 50 },
        { id: "rect-2", type: "rect", x: 200, y: 200, w: 50, h: 50 },
      ]);
      useDesignStore.getState().pushHistory(useDesignStore.getState().shapes, "Add rect");

      // Undo
      act(() => {
        fireKeyDown("z", { ctrlKey: true });
      });

      // Redo with Ctrl+Shift+Z
      act(() => {
        fireKeyDown("z", { ctrlKey: true, shiftKey: true });
      });

      const shapes = useDesignStore.getState().shapes;
      expect(shapes.length).toBe(2);
    });
  });

  // =========================================================================
  // INPUT FIELD HANDLING
  // =========================================================================
  describe("input field handling", () => {
    it("ignores shortcuts when typing in input", () => {
      renderHook(() => useKeyboardShortcuts({ enabled: true }));

      // Create an input element and focus it
      const input = document.createElement("input");
      document.body.appendChild(input);

      const event = new KeyboardEvent("keydown", {
        key: "r",
        bubbles: true,
      });

      Object.defineProperty(event, "target", { value: input });

      // Mode should not change
      const modeBefore = useDesignStore.getState().mode;

      act(() => {
        window.dispatchEvent(event);
      });

      expect(useDesignStore.getState().mode).toBe(modeBefore);

      document.body.removeChild(input);
    });
  });
});
