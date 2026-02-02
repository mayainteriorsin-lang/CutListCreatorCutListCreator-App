/**
 * Tests for canvasHelpers.ts
 *
 * Tests pure utility functions for canvas operations.
 */

import { describe, it, expect } from "vitest";
import {
  EDGE_THRESHOLD,
  isDraggableCenterPost,
  getCarcassBounds,
  detectEdge,
  hitTestShapes,
  calculateShapeMeasurements,
  getCursorStyle,
  calculateViewBox,
  type EdgeType,
  type ActionMode,
} from "../utils/canvasHelpers";
import type { RectShape, LineShape, Shape } from "../types";
import type { ModuleConfig } from "../engine/shapeGenerator";

// =============================================================================
// EDGE THRESHOLD CONSTANT
// =============================================================================
describe("EDGE_THRESHOLD", () => {
  it("should be 8 pixels", () => {
    expect(EDGE_THRESHOLD).toBe(8);
  });
});

// =============================================================================
// isDraggableCenterPost
// =============================================================================
describe("isDraggableCenterPost", () => {
  it('returns true for IDs starting with "MOD-POST-"', () => {
    expect(isDraggableCenterPost("MOD-POST-1")).toBe(true);
    expect(isDraggableCenterPost("MOD-POST-abc")).toBe(true);
    expect(isDraggableCenterPost("MOD-POST-")).toBe(true);
  });

  it("returns false for other IDs", () => {
    expect(isDraggableCenterPost("MOD-LEFT")).toBe(false);
    expect(isDraggableCenterPost("MOD-RIGHT")).toBe(false);
    expect(isDraggableCenterPost("MOD-TOP")).toBe(false);
    expect(isDraggableCenterPost("POST-1")).toBe(false);
    expect(isDraggableCenterPost("")).toBe(false);
    expect(isDraggableCenterPost("R-123")).toBe(false);
  });
});

// =============================================================================
// getCarcassBounds
// =============================================================================
describe("getCarcassBounds", () => {
  const leftPanel: RectShape = {
    id: "MOD-LEFT",
    type: "rect",
    x: 100,
    y: 50,
    w: 18,
    h: 500,
  };

  const rightPanel: RectShape = {
    id: "MOD-RIGHT",
    type: "rect",
    x: 600,
    y: 50,
    w: 18,
    h: 500,
  };

  const shapes: Shape[] = [leftPanel, rightPanel];

  it("returns null when moduleConfig is null", () => {
    expect(getCarcassBounds(null, shapes)).toBeNull();
  });

  it("returns null when unitType is not wardrobe_carcass", () => {
    const config: ModuleConfig = {
      unitType: "drawer_unit",
      width: 600,
      height: 500,
      depth: 500,
    };
    expect(getCarcassBounds(config, shapes)).toBeNull();
  });

  it("returns null when left panel is missing", () => {
    const config: ModuleConfig = {
      unitType: "wardrobe_carcass",
      width: 600,
      height: 500,
      depth: 500,
    };
    expect(getCarcassBounds(config, [rightPanel])).toBeNull();
  });

  it("returns null when right panel is missing", () => {
    const config: ModuleConfig = {
      unitType: "wardrobe_carcass",
      width: 600,
      height: 500,
      depth: 500,
    };
    expect(getCarcassBounds(config, [leftPanel])).toBeNull();
  });

  it("calculates bounds with all panels enabled (default)", () => {
    const config: ModuleConfig = {
      unitType: "wardrobe_carcass",
      width: 600,
      height: 500,
      depth: 500,
    };
    const bounds = getCarcassBounds(config, shapes);
    expect(bounds).not.toBeNull();
    // Left edge = leftPanel.x + leftPanel.w = 100 + 18 = 118
    expect(bounds!.leftEdge).toBe(118);
    // Right edge = rightPanel.x = 600
    expect(bounds!.rightEdge).toBe(600);
    // minX = leftEdge + 100 = 218
    expect(bounds!.minX).toBe(218);
    // maxX = rightEdge - 100 = 500
    expect(bounds!.maxX).toBe(500);
  });

  it("calculates bounds with left panel disabled", () => {
    const config: ModuleConfig = {
      unitType: "wardrobe_carcass",
      width: 600,
      height: 500,
      depth: 500,
      panelsEnabled: {
        top: true,
        bottom: true,
        left: false,
        right: true,
        back: true,
      },
    };
    const bounds = getCarcassBounds(config, shapes);
    expect(bounds).not.toBeNull();
    // Left edge = leftPanel.x = 100 (not + w because disabled)
    expect(bounds!.leftEdge).toBe(100);
    expect(bounds!.minX).toBe(200);
  });

  it("calculates bounds with right panel disabled", () => {
    const config: ModuleConfig = {
      unitType: "wardrobe_carcass",
      width: 600,
      height: 500,
      depth: 500,
      panelsEnabled: {
        top: true,
        bottom: true,
        left: true,
        right: false,
        back: true,
      },
    };
    const bounds = getCarcassBounds(config, shapes);
    expect(bounds).not.toBeNull();
    // Right edge = rightPanel.x + rightPanel.w = 600 + 18 = 618
    expect(bounds!.rightEdge).toBe(618);
    expect(bounds!.maxX).toBe(518);
  });

  it("finds disabled panel variants", () => {
    const disabledLeftPanel: RectShape = {
      id: "MOD-LEFT-DISABLED",
      type: "rect",
      x: 100,
      y: 50,
      w: 18,
      h: 500,
    };
    const disabledRightPanel: RectShape = {
      id: "MOD-RIGHT-DISABLED",
      type: "rect",
      x: 600,
      y: 50,
      w: 18,
      h: 500,
    };
    const config: ModuleConfig = {
      unitType: "wardrobe_carcass",
      width: 600,
      height: 500,
      depth: 500,
    };
    const bounds = getCarcassBounds(config, [disabledLeftPanel, disabledRightPanel]);
    expect(bounds).not.toBeNull();
  });
});

// =============================================================================
// detectEdge
// =============================================================================
describe("detectEdge", () => {
  const rect: RectShape = {
    id: "test-rect",
    type: "rect",
    x: 100,
    y: 100,
    w: 200,
    h: 150,
  };

  it("returns null when mouse is far from rectangle", () => {
    expect(detectEdge(0, 0, rect)).toBeNull();
    expect(detectEdge(500, 500, rect)).toBeNull();
  });

  it("detects left edge", () => {
    expect(detectEdge(100, 150, rect)).toBe("left");
    expect(detectEdge(102, 175, rect)).toBe("left"); // Within threshold
  });

  it("detects right edge", () => {
    expect(detectEdge(300, 150, rect)).toBe("right");
    expect(detectEdge(298, 200, rect)).toBe("right"); // Within threshold
  });

  it("detects top edge", () => {
    expect(detectEdge(200, 100, rect)).toBe("top");
    expect(detectEdge(150, 102, rect)).toBe("top"); // Within threshold
  });

  it("detects bottom edge", () => {
    expect(detectEdge(200, 250, rect)).toBe("bottom");
    expect(detectEdge(250, 248, rect)).toBe("bottom"); // Within threshold
  });

  it("returns null for center of rectangle", () => {
    expect(detectEdge(200, 175, rect)).toBeNull();
  });

  it("respects allowedEdges parameter", () => {
    // Only allow top and bottom
    const allowedEdges: EdgeType[] = ["top", "bottom"];
    expect(detectEdge(100, 150, rect, allowedEdges)).toBeNull(); // Left edge ignored
    expect(detectEdge(300, 150, rect, allowedEdges)).toBeNull(); // Right edge ignored
    expect(detectEdge(200, 100, rect, allowedEdges)).toBe("top");
    expect(detectEdge(200, 250, rect, allowedEdges)).toBe("bottom");
  });

  it("respects custom threshold", () => {
    // With small threshold, edge not detected
    expect(detectEdge(95, 150, rect, ["left"], 2)).toBeNull();
    // With large threshold, edge detected
    expect(detectEdge(95, 150, rect, ["left"], 10)).toBe("left");
  });

  it("prioritizes edges in order: left, right, top, bottom", () => {
    // Corner case - near both left and top
    const cornerResult = detectEdge(100, 100, rect);
    expect(cornerResult).toBe("left"); // Left is checked first
  });
});

// =============================================================================
// hitTestShapes
// =============================================================================
describe("hitTestShapes", () => {
  const rectShape: RectShape = {
    id: "rect-1",
    type: "rect",
    x: 100,
    y: 100,
    w: 200,
    h: 150,
  };

  const lineShape: LineShape = {
    id: "line-1",
    type: "line",
    x1: 400,
    y1: 100,
    x2: 500,
    y2: 200,
    thickness: 2,
    color: "#000",
    marker: "none",
  };

  const shapes: Shape[] = [rectShape, lineShape];

  it("returns null for empty shapes array", () => {
    expect(hitTestShapes(200, 175, [], 10)).toBeNull();
  });

  it("returns null when point is outside all shapes", () => {
    expect(hitTestShapes(0, 0, shapes, 10)).toBeNull();
    expect(hitTestShapes(700, 700, shapes, 10)).toBeNull();
  });

  it("hits rectangle when point is inside", () => {
    expect(hitTestShapes(200, 175, shapes, 10)).toEqual(rectShape);
    expect(hitTestShapes(100, 100, shapes, 10)).toEqual(rectShape); // Corner
    expect(hitTestShapes(300, 250, shapes, 10)).toEqual(rectShape); // Opposite corner
  });

  it("hits line when point is close enough (within tolerance)", () => {
    // Point on the line
    expect(hitTestShapes(450, 150, shapes, 10)).toEqual(lineShape);
    // Point near the line (within gridSize * 0.6 = 6)
    expect(hitTestShapes(453, 153, shapes, 10)).toEqual(lineShape);
  });

  it("does not hit line when point is too far", () => {
    // Point far from line
    expect(hitTestShapes(450, 100, shapes, 10)).toBeNull();
  });

  it("returns topmost shape when shapes overlap (last in array)", () => {
    const overlappingRect: RectShape = {
      id: "rect-2",
      type: "rect",
      x: 150,
      y: 125,
      w: 100,
      h: 100,
    };
    const overlappingShapes = [rectShape, overlappingRect];
    // Point is inside both rectangles, should return the last one (on top)
    expect(hitTestShapes(175, 150, overlappingShapes, 10)).toEqual(overlappingRect);
  });

  it("skips undefined shapes", () => {
    const shapesWithUndefined = [rectShape, undefined as unknown as Shape, lineShape];
    expect(hitTestShapes(200, 175, shapesWithUndefined, 10)).toEqual(rectShape);
  });
});

// =============================================================================
// calculateShapeMeasurements
// =============================================================================
describe("calculateShapeMeasurements", () => {
  const rect1: RectShape = { id: "rect-1", type: "rect", x: 0, y: 0, w: 100, h: 50 };
  const rect2: RectShape = { id: "rect-2", type: "rect", x: 0, y: 0, w: 200, h: 100 };
  const line1: LineShape = {
    id: "line-1",
    type: "line",
    x1: 0,
    y1: 0,
    x2: 100,
    y2: 0,
    thickness: 1,
    color: "#000",
    marker: "none",
  };
  const line2: LineShape = {
    id: "line-2",
    type: "line",
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 50,
    thickness: 1,
    color: "#000",
    marker: "none",
  };

  const shapes: Shape[] = [rect1, rect2, line1, line2];

  it("returns zeros when no shapes are selected", () => {
    const result = calculateShapeMeasurements(shapes, new Set(), null);
    expect(result).toEqual({
      totalLength: 0,
      area: 0,
      perimeter: 0,
      selectedCount: 0,
    });
  });

  it("calculates measurements for a single rectangle (via selectedId)", () => {
    const result = calculateShapeMeasurements(shapes, new Set(), "rect-1");
    expect(result).toEqual({
      totalLength: 0,
      area: 5000, // 100 * 50
      perimeter: 300, // 2 * (100 + 50)
      selectedCount: 1,
    });
  });

  it("calculates measurements for a single line (via selectedId)", () => {
    const result = calculateShapeMeasurements(shapes, new Set(), "line-1");
    expect(result).toEqual({
      totalLength: 100, // Horizontal line of length 100
      area: 0,
      perimeter: 0,
      selectedCount: 1,
    });
  });

  it("calculates measurements for multiple rectangles (via selectedIds)", () => {
    const result = calculateShapeMeasurements(shapes, new Set(["rect-1", "rect-2"]), null);
    expect(result).toEqual({
      totalLength: 0,
      area: 25000, // 5000 + 20000
      perimeter: 900, // 300 + 600
      selectedCount: 2,
    });
  });

  it("calculates measurements for multiple lines (via selectedIds)", () => {
    const result = calculateShapeMeasurements(shapes, new Set(["line-1", "line-2"]), null);
    expect(result).toEqual({
      totalLength: 150, // 100 + 50
      area: 0,
      perimeter: 0,
      selectedCount: 2,
    });
  });

  it("calculates combined measurements for mixed shapes", () => {
    const result = calculateShapeMeasurements(
      shapes,
      new Set(["rect-1", "line-1"]),
      null
    );
    expect(result).toEqual({
      totalLength: 100,
      area: 5000,
      perimeter: 300,
      selectedCount: 2,
    });
  });

  it("handles diagonal line correctly", () => {
    const diagonalLine: LineShape = {
      id: "diagonal",
      type: "line",
      x1: 0,
      y1: 0,
      x2: 30,
      y2: 40,
      thickness: 1,
      color: "#000",
      marker: "none",
    };
    const result = calculateShapeMeasurements([diagonalLine], new Set(["diagonal"]), null);
    expect(result.totalLength).toBe(50); // 3-4-5 triangle: sqrt(30^2 + 40^2) = 50
    expect(result.selectedCount).toBe(1);
  });

  it("combines selectedIds and selectedId (union)", () => {
    const result = calculateShapeMeasurements(shapes, new Set(["rect-1"]), "line-1");
    expect(result.selectedCount).toBe(2);
    expect(result.area).toBe(5000);
    expect(result.totalLength).toBe(100);
  });
});

// =============================================================================
// getCursorStyle
// =============================================================================
describe("getCursorStyle", () => {
  it('returns "ns-resize" when resizing', () => {
    expect(getCursorStyle(true, false, null)).toBe("ns-resize");
    expect(getCursorStyle(true, true, "move")).toBe("ns-resize"); // Resizing takes priority
  });

  it('returns "move" when dragging', () => {
    expect(getCursorStyle(false, true, null)).toBe("move");
    expect(getCursorStyle(false, true, "copy")).toBe("move"); // Dragging takes priority over action mode
  });

  it('returns cursor based on actionMode when not resizing or dragging', () => {
    expect(getCursorStyle(false, false, "move")).toBe("move");
    expect(getCursorStyle(false, false, "resize")).toBe("ns-resize");
    expect(getCursorStyle(false, false, "copy")).toBe("copy");
    expect(getCursorStyle(false, false, "delete")).toBe("not-allowed");
  });

  it('returns "default" when no special state', () => {
    expect(getCursorStyle(false, false, null)).toBe("default");
  });

  it("prioritizes in order: resizing > dragging > actionMode > default", () => {
    // Test all flags true
    expect(getCursorStyle(true, true, "copy")).toBe("ns-resize");
    // Test dragging and action mode
    expect(getCursorStyle(false, true, "copy")).toBe("move");
    // Test only action mode
    expect(getCursorStyle(false, false, "copy")).toBe("copy");
  });
});

// =============================================================================
// calculateViewBox
// =============================================================================
describe("calculateViewBox", () => {
  const canvasSize = { w: 800, h: 600 };
  const zoom = 1;

  it("returns fallback viewBox for empty shapes array", () => {
    const result = calculateViewBox({ shapes: [], canvasSize, zoom });
    expect(result.bounds).toBeNull();
    expect(result.viewBox).toBe("0 0 800 800"); // Max of w,h
  });

  it("calculates viewBox for single rectangle", () => {
    const shapes: Shape[] = [
      { id: "rect-1", type: "rect", x: 100, y: 100, w: 200, h: 200 },
    ];
    const result = calculateViewBox({ shapes, canvasSize, zoom, padding: 80 });

    expect(result.bounds).not.toBeNull();
    expect(result.bounds!.minX).toBe(100);
    expect(result.bounds!.minY).toBe(100);
    expect(result.bounds!.maxX).toBe(300);
    expect(result.bounds!.maxY).toBe(300);

    // Content is 200x200, size = max(200,200) + 80*2 = 360
    // Center = (100+300)/2, (100+300)/2 = 200, 200
    // viewX = 200 - 360/2 = 20, viewY = 20
    expect(result.viewBox).toBe("20 20 360 360");
  });

  it("calculates viewBox for multiple rectangles", () => {
    const shapes: Shape[] = [
      { id: "rect-1", type: "rect", x: 0, y: 0, w: 100, h: 50 },
      { id: "rect-2", type: "rect", x: 200, y: 100, w: 100, h: 100 },
    ];
    const result = calculateViewBox({ shapes, canvasSize, zoom, padding: 0 });

    expect(result.bounds!.minX).toBe(0);
    expect(result.bounds!.minY).toBe(0);
    expect(result.bounds!.maxX).toBe(300);
    expect(result.bounds!.maxY).toBe(200);

    // Content is 300x200, size = max(300,200) = 300 (square)
    // CenterX = 150, CenterY = 100
    // viewX = 150 - 150 = 0, viewY = 100 - 150 = -50
    expect(result.viewBox).toBe("0 -50 300 300");
  });

  it("calculates viewBox for lines", () => {
    const shapes: Shape[] = [
      { id: "line-1", type: "line", x1: 50, y1: 50, x2: 250, y2: 150, thickness: 2, color: "#000", marker: "none" },
    ];
    const result = calculateViewBox({ shapes, canvasSize, zoom, padding: 0 });

    expect(result.bounds!.minX).toBe(50);
    expect(result.bounds!.minY).toBe(50);
    expect(result.bounds!.maxX).toBe(250);
    expect(result.bounds!.maxY).toBe(150);
  });

  it("calculates viewBox for horizontal dimension with offset", () => {
    const shapes: Shape[] = [
      {
        id: "dim-1",
        type: "dimension",
        x1: 100,
        y1: 200,
        x2: 300,
        y2: 200,
        dimType: "horizontal",
        label: "200",
        offset: 50,
      } as Shape,
    ];
    const result = calculateViewBox({ shapes, canvasSize, zoom, padding: 0, dimFontSize: 28 });

    expect(result.bounds!.minX).toBe(100);
    expect(result.bounds!.maxX).toBe(300);
    expect(result.bounds!.minY).toBe(200);
    // maxY should include offset + textBoxHeight + 20*scale
    // offset=50, textBoxHeight=28*1.3=36.4, 20*1=20
    // maxY = 200 + 50 + 36.4 + 20 = 306.4
    expect(result.bounds!.maxY).toBeCloseTo(306.4, 0);
  });

  it("calculates viewBox for vertical dimension with offset", () => {
    const shapes: Shape[] = [
      {
        id: "dim-2",
        type: "dimension",
        x1: 100,
        y1: 100,
        x2: 100,
        y2: 300,
        dimType: "vertical",
        label: "200",
        offset: 50,
      } as Shape,
    ];
    const result = calculateViewBox({ shapes, canvasSize, zoom, padding: 0, dimFontSize: 28 });

    expect(result.bounds!.minY).toBe(100);
    expect(result.bounds!.maxY).toBe(300);
    expect(result.bounds!.minX).toBe(100);
    // maxX should include offset + textWidth
    // offset=50, textWidth = 3 * (28 * 0.65) + 30 = 3*18.2 + 30 = 84.6
    // maxX = 100 + 50 + 84.6 = 234.6
    expect(result.bounds!.maxX).toBeCloseTo(234.6, 0);
  });

  it("applies custom padding", () => {
    const shapes: Shape[] = [
      { id: "rect-1", type: "rect", x: 0, y: 0, w: 100, h: 100 },
    ];
    const result = calculateViewBox({ shapes, canvasSize, zoom, padding: 50 });

    // Content is 100x100, size = 100 + 50*2 = 200
    // Center = 50, 50
    // viewX = 50 - 100 = -50, viewY = -50
    expect(result.viewBox).toBe("-50 -50 200 200");
  });

  it("creates square viewBox for non-square content", () => {
    const shapes: Shape[] = [
      { id: "rect-1", type: "rect", x: 0, y: 0, w: 400, h: 100 },
    ];
    const result = calculateViewBox({ shapes, canvasSize, zoom, padding: 0 });

    // Content is 400x100, size = max(400, 100) = 400 (forces square)
    // CenterX = 200, CenterY = 50
    // viewX = 200 - 200 = 0, viewY = 50 - 200 = -150
    expect(result.viewBox).toBe("0 -150 400 400");
  });

  it("handles mixed shapes (rect + dimension)", () => {
    const shapes: Shape[] = [
      { id: "rect-1", type: "rect", x: 100, y: 100, w: 200, h: 200 },
      {
        id: "dim-1",
        type: "dimension",
        x1: 100,
        y1: 300, // Below the rect
        x2: 300,
        y2: 300,
        dimType: "horizontal",
        label: "200",
      } as Shape,
    ];
    const result = calculateViewBox({ shapes, canvasSize, zoom, padding: 0, dimFontSize: 28 });

    expect(result.bounds!.minX).toBe(100);
    expect(result.bounds!.maxX).toBe(300);
    expect(result.bounds!.minY).toBe(100);
    // maxY should be from the dimension (300 + offset + textBox)
    expect(result.bounds!.maxY).toBeGreaterThan(300);
  });

  it("scales dimension bounds with dimFontSize", () => {
    const shapesSmall: Shape[] = [
      {
        id: "dim-1",
        type: "dimension",
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 0,
        dimType: "horizontal",
        label: "100",
      } as Shape,
    ];
    const resultSmall = calculateViewBox({ shapes: shapesSmall, canvasSize, zoom, padding: 0, dimFontSize: 16 });
    const resultLarge = calculateViewBox({ shapes: shapesSmall, canvasSize, zoom, padding: 0, dimFontSize: 48 });

    // Larger font size should result in larger maxY (more space for text)
    expect(resultLarge.bounds!.maxY).toBeGreaterThan(resultSmall.bounds!.maxY);
  });
});
