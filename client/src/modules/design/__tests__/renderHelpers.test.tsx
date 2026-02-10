/**
 * Tests for renderHelpers
 *
 * Tests the extracted rendering functions for grid, shapes, and UI elements.
 */

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import {
  COLORS,
  renderGrid,
  renderRect,
  renderLine,
  renderShape,
  renderTempShape,
  renderAlignmentGuides,
  renderComponentPreview,
  renderBoundaryGuides,
} from "../components/renderHelpers";
import { renderDimension, DEFAULT_DIMENSION_FONT_SIZE } from "../dimensions";
import type { DimensionShape, RectShape, LineShape, AlignmentGuide, ComponentTemplate as Component } from "../types";

// Mock renderDimension to return a simple SVG element for testing
vi.mock("../dimensions", async () => {
  const actual = await vi.importActual("../dimensions");
  return {
    ...actual,
    renderDimension: vi.fn().mockImplementation((dim, fontSize) => {
      if (dim.dimType === "radius") return null;
      return <text fontSize={fontSize}>{dim.label || "100"}</text>;
    }),
  };
});

// Helper to render SVG elements
const renderInSvg = (element: React.ReactElement | null) => {
  if (!element) return render(<svg data-testid="empty" />);
  return render(<svg data-testid="svg-container">{element}</svg>);
};

describe("renderHelpers", () => {
  // ... (keeping existing tests) ...

  // =========================================================================
  // renderDimension
  // =========================================================================
  describe("renderDimension", () => {
    it("renders horizontal dimension", () => {
      const dim: DimensionShape = {
        id: "dim-1",
        type: "dimension",
        x1: 0,
        y1: 100,
        x2: 200,
        y2: 100,
        dimType: "horizontal",
        label: "200",
        offset: 30,
      };

      const { container } = renderInSvg(renderDimension(dim, DEFAULT_DIMENSION_FONT_SIZE));

      // Should NOT have dimension lines or polygons in the new unified style
      const lines = container.querySelectorAll("line");
      expect(lines.length).toBe(0);

      const polygons = container.querySelectorAll("polygon");
      expect(polygons.length).toBe(0);

      // Should have label text
      const text = container.querySelector("text");
      expect(text?.textContent).toBe("200");
    });

    it("renders vertical dimension", () => {
      const dim: DimensionShape = {
        id: "dim-2",
        type: "dimension",
        x1: 100,
        y1: 0,
        x2: 100,
        y2: 200,
        dimType: "vertical",
        label: "200",
        offset: 30,
      };

      const { container } = renderInSvg(renderDimension(dim, DEFAULT_DIMENSION_FONT_SIZE));

      const lines = container.querySelectorAll("line");
      expect(lines.length).toBe(0);

      const polygons = container.querySelectorAll("polygon");
      expect(polygons.length).toBe(0);
    });

    it("uses calculated length when label is empty", () => {
      const dim: DimensionShape = {
        id: "dim-3",
        type: "dimension",
        x1: 0,
        y1: 100,
        x2: 100,
        y2: 100,
        dimType: "horizontal",
        label: "",
        offset: 30,
      };

      const { container } = renderInSvg(renderDimension(dim, DEFAULT_DIMENSION_FONT_SIZE));
      const text = container.querySelector("text");
      expect(text?.textContent).toBe("100");
    });

    it("returns null for unsupported dimType", () => {
      const dim: DimensionShape = {
        id: "dim-4",
        type: "dimension",
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 100,
        dimType: "radius",
        label: "50",
        offset: 30,
      };

      const result = renderDimension(dim, DEFAULT_DIMENSION_FONT_SIZE);
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // renderRect
  // =========================================================================
  describe("renderRect", () => {
    const baseRect: RectShape = {
      id: "rect-1",
      type: "rect",
      x: 50,
      y: 50,
      w: 100,
      h: 80,
    };

    it("renders basic rectangle", () => {
      const { container } = renderInSvg(
        renderRect({
          rect: baseRect,
          isSelected: false,
          isHovered: false,
        })
      );

      const rect = container.querySelector("rect");
      expect(rect).toBeTruthy();
      expect(rect?.getAttribute("x")).toBe("50");
      expect(rect?.getAttribute("y")).toBe("50");
      expect(rect?.getAttribute("width")).toBe("100");
      expect(rect?.getAttribute("height")).toBe("80");
    });

    it("renders selected rectangle with handles", () => {
      const { container } = renderInSvg(
        renderRect({
          rect: baseRect,
          isSelected: true,
          isHovered: false,
        })
      );

      // Should have selection handles (4 corner squares)
      const rects = container.querySelectorAll("rect");
      expect(rects.length).toBe(5); // 1 main + 4 handles

      // Should have dimension text
      const text = container.querySelector("text");
      expect(text?.textContent).toContain("100");
      expect(text?.textContent).toContain("80");
    });

    it("renders hovered rectangle with highlight", () => {
      const modRect: RectShape = {
        ...baseRect,
        id: "MOD-rect-1",
      };

      const { container } = renderInSvg(
        renderRect({
          rect: modRect,
          isSelected: false,
          isHovered: true,
        })
      );

      const rect = container.querySelector("rect");
      expect(rect?.getAttribute("fill")).toBe("#e0f2fe");
    });

    it("uses custom fill and stroke", () => {
      const customRect: RectShape = {
        ...baseRect,
        fill: "#ff0000",
        stroke: "#00ff00",
        strokeWidth: 2,
      };

      const { container } = renderInSvg(
        renderRect({
          rect: customRect,
          isSelected: false,
          isHovered: false,
        })
      );

      const rect = container.querySelector("rect");
      expect(rect?.getAttribute("fill")).toBe("#ff0000");
      expect(rect?.getAttribute("stroke")).toBe("#00ff00");
    });

    it("applies rounded corners when rx is set", () => {
      const roundedRect: RectShape = {
        ...baseRect,
        rx: 8,
      };

      const { container } = renderInSvg(
        renderRect({
          rect: roundedRect,
          isSelected: false,
          isHovered: false,
        })
      );

      const rect = container.querySelector("rect");
      expect(rect?.getAttribute("rx")).toBe("8");
    });
  });

  // =========================================================================
  // renderLine
  // =========================================================================
  describe("renderLine", () => {
    const baseLine: LineShape = {
      id: "line-1",
      type: "line",
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 0,
      thickness: 18,
      color: "#ffffff",
      marker: "none",
    };

    it("renders basic line as polygon", () => {
      const { container } = renderInSvg(
        renderLine({
          line: baseLine,
          isSelected: false,
        })
      );

      // Non-MOD lines render as polygon (for thickness)
      const polygon = container.querySelector("polygon");
      expect(polygon).toBeTruthy();
    });

    it("renders MOD line as simple line", () => {
      const modLine: LineShape = {
        ...baseLine,
        id: "MOD-line-1",
      };

      const { container } = renderInSvg(
        renderLine({
          line: modLine,
          isSelected: false,
        })
      );

      const line = container.querySelector("line");
      expect(line).toBeTruthy();
    });

    it("renders selected line with handles", () => {
      const { container } = renderInSvg(
        renderLine({
          line: baseLine,
          isSelected: true,
        })
      );

      // Should have selection handles (2 endpoint squares)
      const rects = container.querySelectorAll("rect");
      expect(rects.length).toBe(2);

      // Should have dimension text
      const text = container.querySelector("text");
      expect(text?.textContent).toContain("100");
      expect(text?.textContent).toContain("18mm");
    });

    it("renders arrow marker", () => {
      const arrowLine: LineShape = {
        ...baseLine,
        marker: "arrow",
      };

      const { container } = renderInSvg(
        renderLine({
          line: arrowLine,
          isSelected: false,
        })
      );

      // Should have arrow polygon (in addition to line body polygon)
      const polygons = container.querySelectorAll("polygon");
      expect(polygons.length).toBeGreaterThanOrEqual(2);
    });

    it("shows custom label when set", () => {
      const labeledLine: LineShape = {
        ...baseLine,
        customLabel: "Custom Label",
      };

      const { container } = renderInSvg(
        renderLine({
          line: labeledLine,
          isSelected: false,
        })
      );

      const text = container.querySelector("text");
      expect(text?.textContent).toBe("Custom Label");
    });

    it("hides dimension when showDimension is false", () => {
      const noDimLine: LineShape = {
        ...baseLine,
        showDimension: false,
      };

      const { container } = renderInSvg(
        renderLine({
          line: noDimLine,
          isSelected: false,
        })
      );

      // Should not have dimension text for unselected line
      const texts = container.querySelectorAll("text");
      expect(texts.length).toBe(0);
    });
  });

  // =========================================================================
  // renderShape (dispatcher)
  // =========================================================================
  describe("renderShape", () => {
    it("dispatches to renderDimension for dimension shapes", () => {
      const dim: DimensionShape = {
        id: "dim-1",
        type: "dimension",
        x1: 0,
        y1: 100,
        x2: 100,
        y2: 100,
        dimType: "horizontal",
        label: "100",
        offset: 30,
      };

      const { container } = renderInSvg(
        renderShape({
          shape: dim,
          isSelected: false,
          isHovered: false,
        })
      );

      // Should have dimension elements (only text in unified style)
      expect(container.querySelectorAll("text").length).toBe(1);
      expect(container.querySelectorAll("polygon").length).toBe(0);
    });

    it("dispatches to renderRect for rect shapes", () => {
      const rect: RectShape = {
        id: "rect-1",
        type: "rect",
        x: 0,
        y: 0,
        w: 100,
        h: 100,
      };

      const { container } = renderInSvg(
        renderShape({
          shape: rect,
          isSelected: false,
          isHovered: false,
        })
      );

      expect(container.querySelector("rect")).toBeTruthy();
    });

    it("dispatches to renderLine for line shapes", () => {
      const line: LineShape = {
        id: "line-1",
        type: "line",
        x1: 0,
        y1: 0,
        x2: 100,
        y2: 0,
        thickness: 18,
        color: "#ffffff",
        marker: "none",
      };

      const { container } = renderInSvg(
        renderShape({
          shape: line,
          isSelected: false,
          isHovered: false,
        })
      );

      expect(container.querySelector("polygon")).toBeTruthy();
    });
  });

  // =========================================================================
  // renderTempShape
  // =========================================================================
  describe("renderTempShape", () => {
    it("returns null when temp is null", () => {
      const result = renderTempShape({ temp: null });
      expect(result).toBeNull();
    });

    it("renders temp rect with dashed stroke", () => {
      const { container } = renderInSvg(
        renderTempShape({
          temp: { type: "rect", x: 10, y: 10, w: 50, h: 50 },
        })
      );

      const rect = container.querySelector("rect");
      expect(rect).toBeTruthy();
      expect(rect?.getAttribute("stroke-dasharray")).toBe("6 3");
    });

    it("renders temp line with dashed stroke", () => {
      const { container } = renderInSvg(
        renderTempShape({
          temp: { type: "line", x1: 0, y1: 0, x2: 100, y2: 100, thickness: 18 },
        })
      );

      const polygon = container.querySelector("polygon");
      expect(polygon).toBeTruthy();
      expect(polygon?.getAttribute("stroke-dasharray")).toBe("6 3");
    });

    it("shows dimensions text for temp line", () => {
      const { container } = renderInSvg(
        renderTempShape({
          temp: { type: "line", x1: 0, y1: 0, x2: 100, y2: 0, thickness: 18 },
        })
      );

      const text = container.querySelector("text");
      expect(text?.textContent).toContain("100");
      expect(text?.textContent).toContain("18mm");
    });
  });

  // =========================================================================
  // renderAlignmentGuides
  // =========================================================================
  describe("renderAlignmentGuides", () => {
    it("renders empty when no guides", () => {
      const { container } = renderInSvg(renderAlignmentGuides({ guides: [] }));
      const lines = container.querySelectorAll("line");
      expect(lines.length).toBe(0);
    });

    it("renders horizontal guide", () => {
      const guides: AlignmentGuide[] = [
        { type: "horizontal", position: 100, start: 0, end: 500 },
      ];

      const { container } = renderInSvg(renderAlignmentGuides({ guides }));
      const line = container.querySelector("line");

      expect(line?.getAttribute("x1")).toBe("0");
      expect(line?.getAttribute("y1")).toBe("100");
      expect(line?.getAttribute("x2")).toBe("500");
      expect(line?.getAttribute("y2")).toBe("100");
    });

    it("renders vertical guide", () => {
      const guides: AlignmentGuide[] = [
        { type: "vertical", position: 200, start: 0, end: 400 },
      ];

      const { container } = renderInSvg(renderAlignmentGuides({ guides }));
      const line = container.querySelector("line");

      expect(line?.getAttribute("x1")).toBe("200");
      expect(line?.getAttribute("y1")).toBe("0");
      expect(line?.getAttribute("x2")).toBe("200");
      expect(line?.getAttribute("y2")).toBe("400");
    });

    it("renders multiple guides", () => {
      const guides: AlignmentGuide[] = [
        { type: "horizontal", position: 100, start: 0, end: 500 },
        { type: "vertical", position: 200, start: 0, end: 400 },
        { type: "horizontal", position: 300, start: 0, end: 500 },
      ];

      const { container } = renderInSvg(renderAlignmentGuides({ guides }));
      const lines = container.querySelectorAll("line");

      expect(lines.length).toBe(3);
    });
  });

  // =========================================================================
  // renderComponentPreview
  // =========================================================================
  describe("renderComponentPreview", () => {
    const component: Component = {
      id: "comp-1",
      name: "Test Component",
      category: "test",
      width: 100,
      height: 80,
      shapes: [
        { type: "rect", x: 0, y: 0, w: 100, h: 80 },
        { type: "line", x1: 0, y1: 40, x2: 100, y2: 40 },
      ],
    };

    it("renders component shapes at cursor position", () => {
      const { container } = renderInSvg(
        renderComponentPreview({
          component,
          cursorPos: { x: 50, y: 50 },
        })
      );

      const rect = container.querySelector("rect");
      expect(rect?.getAttribute("x")).toBe("50");
      expect(rect?.getAttribute("y")).toBe("50");

      const line = container.querySelector("line");
      expect(line?.getAttribute("x1")).toBe("50");
      expect(line?.getAttribute("y1")).toBe("90"); // 50 + 40
    });

    it("renders component name label", () => {
      const { container } = renderInSvg(
        renderComponentPreview({
          component,
          cursorPos: { x: 50, y: 50 },
        })
      );

      const text = container.querySelector("text");
      expect(text?.textContent).toBe("Test Component");
    });

    it("applies opacity to preview group", () => {
      const { container } = renderInSvg(
        renderComponentPreview({
          component,
          cursorPos: { x: 0, y: 0 },
        })
      );

      const group = container.querySelector("g");
      expect(group?.getAttribute("opacity")).toBe("0.5");
    });
  });

  // =========================================================================
  // renderBoundaryGuides
  // =========================================================================
  describe("renderBoundaryGuides", () => {
    it("renders left and right boundary lines", () => {
      const { container } = renderInSvg(
        renderBoundaryGuides({
          minX: 100,
          maxX: 500,
          topY: 50,
          height: 300,
        })
      );

      const lines = container.querySelectorAll("line");
      expect(lines.length).toBe(2);

      // Left boundary
      expect(lines[0].getAttribute("x1")).toBe("100");
      expect(lines[0].getAttribute("x2")).toBe("100");

      // Right boundary
      expect(lines[1].getAttribute("x1")).toBe("500");
      expect(lines[1].getAttribute("x2")).toBe("500");
    });

    it("renders drag zone highlight rect", () => {
      const { container } = renderInSvg(
        renderBoundaryGuides({
          minX: 100,
          maxX: 500,
          topY: 50,
          height: 300,
        })
      );

      const rect = container.querySelector("rect");
      expect(rect?.getAttribute("x")).toBe("100");
      expect(rect?.getAttribute("y")).toBe("50");
      expect(rect?.getAttribute("width")).toBe("400"); // 500 - 100
      expect(rect?.getAttribute("height")).toBe("300");
    });

    it("applies correct styling to boundary lines", () => {
      const { container } = renderInSvg(
        renderBoundaryGuides({
          minX: 100,
          maxX: 500,
          topY: 50,
          height: 300,
        })
      );

      const line = container.querySelector("line");
      expect(line?.getAttribute("stroke")).toBe("#ef4444");
      expect(line?.getAttribute("stroke-dasharray")).toBe("4 4");
    });
  });
});
