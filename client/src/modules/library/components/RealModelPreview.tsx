/**
 * Real Model Preview Component
 * Renders actual furniture model using the same engine as Design page.
 */

import { useMemo } from "react";
import type { LibraryModule } from "../types";
import type { ModuleConfig } from "@/modules/design/engine/shapeGenerator";
import { generateModuleShapes } from "@/modules/design/engine/shapeGenerator";
import type { Shape, RectShape, LineShape } from "@/modules/design/types";

interface RealModelPreviewProps {
  module: LibraryModule;
  className?: string;
  showDimensions?: boolean;
}

// Default dimensions for templates (used when dimensions are 0)
const DEFAULT_DIMS = {
  width: 2400,
  height: 2400,
  depth: 560,
};

// Colors for the preview
const COLORS = {
  panel: "#e2e8f0",      // Light gray for panels
  stroke: "#64748b",     // Medium gray for strokes
  back: "#f1f5f9",       // Very light for back panel
  dimension: "#475569",  // Dark gray for dimension text
  grid: "#f8fafc",       // Background
};

/**
 * Convert LibraryModule to ModuleConfig for shape generation
 */
function libraryModuleToConfig(module: LibraryModule): ModuleConfig {
  // If fullConfig is available, use it for exact reproduction
  if (module.fullConfig) {
    const fc = module.fullConfig as ModuleConfig;
    // Use stored dimensions or defaults if it's a template (dimensions = 0)
    return {
      ...fc,
      widthMm: fc.widthMm > 0 ? fc.widthMm : DEFAULT_DIMS.width,
      heightMm: fc.heightMm > 0 ? fc.heightMm : DEFAULT_DIMS.height,
      depthMm: fc.depthMm > 0 ? fc.depthMm : DEFAULT_DIMS.depth,
    };
  }

  // Fallback: reconstruct config from module fields
  const width = module.widthMm > 0 ? module.widthMm : DEFAULT_DIMS.width;
  const height = module.heightMm > 0 ? module.heightMm : DEFAULT_DIMS.height;
  const depth = module.depthMm > 0 ? module.depthMm : DEFAULT_DIMS.depth;

  return {
    name: module.name,
    unitType: module.unitType,
    widthMm: width,
    heightMm: height,
    depthMm: depth,
    carcassThicknessMm: module.carcassThicknessMm || 18,
    backPanelThicknessMm: 10,
    sectionCount: module.sectionCount || 1,
    shutterCount: module.shutterCount || 0,
    loftEnabled: module.loftEnabled || false,
    loftHeightMm: module.loftHeightMm || 0,
    carcassMaterial: module.carcassMaterial || "plywood",
    shutterMaterial: module.shutterMaterial || "laminate",
    sections: module.sections?.map((s) => ({
      type: s.type,
      widthMm: s.widthMm || 0,
      shelfCount: s.shelfCount,
      drawerCount: s.drawerCount,
      rodHeightPct: s.rodHeightPct,
    })),
  };
}

/**
 * Render a rectangle shape
 */
function renderRect(rect: RectShape, scale: number) {
  const { id, x, y, w, h, fill, stroke, rx, opacity } = rect;

  // Skip invisible or very thin elements
  if (w * scale < 1 || h * scale < 1) return null;

  // Determine colors based on ID
  let fillColor = fill || COLORS.panel;
  let strokeColor = stroke || COLORS.stroke;

  if (id?.includes("BACK")) {
    fillColor = COLORS.back;
    strokeColor = "#cbd5e1";
  }

  return (
    <rect
      key={id}
      x={x * scale}
      y={y * scale}
      width={w * scale}
      height={h * scale}
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={0.5}
      rx={(rx || 0) * scale}
      opacity={opacity ?? 1}
    />
  );
}

/**
 * Render a line shape
 */
function renderLine(line: LineShape, scale: number) {
  const { id, x1, y1, x2, y2, thickness, color } = line;

  // For thick lines, render as rectangle
  if (thickness && thickness > 2) {
    const isVertical = Math.abs(x2 - x1) < Math.abs(y2 - y1);
    if (isVertical) {
      return (
        <rect
          key={id}
          x={(x1 - thickness / 2) * scale}
          y={Math.min(y1, y2) * scale}
          width={thickness * scale}
          height={Math.abs(y2 - y1) * scale}
          fill={color || COLORS.panel}
          stroke={COLORS.stroke}
          strokeWidth={0.3}
        />
      );
    } else {
      return (
        <rect
          key={id}
          x={Math.min(x1, x2) * scale}
          y={(y1 - thickness / 2) * scale}
          width={Math.abs(x2 - x1) * scale}
          height={thickness * scale}
          fill={color || COLORS.panel}
          stroke={COLORS.stroke}
          strokeWidth={0.3}
        />
      );
    }
  }

  return (
    <line
      key={id}
      x1={x1 * scale}
      y1={y1 * scale}
      x2={x2 * scale}
      y2={y2 * scale}
      stroke={color || COLORS.stroke}
      strokeWidth={0.5}
    />
  );
}

export default function RealModelPreview({
  module,
  className,
  showDimensions = false,
}: RealModelPreviewProps) {
  // Generate shapes from module config
  const { shapes, bounds, scale } = useMemo(() => {
    const config = libraryModuleToConfig(module);
    const origin = { x: 0, y: 0 };

    try {
      const generatedShapes = generateModuleShapes(config, origin);

      // Calculate bounds
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      for (const shape of generatedShapes) {
        if (shape.type === "rect") {
          const r = shape as RectShape;
          minX = Math.min(minX, r.x);
          minY = Math.min(minY, r.y);
          maxX = Math.max(maxX, r.x + r.w);
          maxY = Math.max(maxY, r.y + r.h);
        } else if (shape.type === "line") {
          const l = shape as LineShape;
          minX = Math.min(minX, l.x1, l.x2);
          minY = Math.min(minY, l.y1, l.y2);
          maxX = Math.max(maxX, l.x1, l.x2);
          maxY = Math.max(maxY, l.y1, l.y2);
        }
      }

      // Add padding
      const padding = 50;
      minX -= padding;
      minY -= padding;
      maxX += padding;
      maxY += padding;

      const width = maxX - minX;
      const height = maxY - minY;

      // Calculate scale to fit in preview area (200x150 nominal)
      const scaleX = 200 / width;
      const scaleY = 150 / height;
      const finalScale = Math.min(scaleX, scaleY, 0.1); // Cap at 0.1 for very large models

      return {
        shapes: generatedShapes,
        bounds: { minX, minY, maxX, maxY, width, height },
        scale: finalScale,
      };
    } catch (e) {
      console.warn("Failed to generate shapes for preview:", e);
      return { shapes: [], bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 }, scale: 1 };
    }
  }, [module]);

  // Get actual dimensions for display
  const dims = {
    width: module.widthMm > 0 ? module.widthMm : DEFAULT_DIMS.width,
    height: module.heightMm > 0 ? module.heightMm : DEFAULT_DIMS.height,
  };

  // Calculate viewBox
  const viewWidth = bounds.width * scale + 20;
  const viewHeight = bounds.height * scale + (showDimensions ? 40 : 20);

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background */}
        <rect x="0" y="0" width={viewWidth} height={viewHeight} fill={COLORS.grid} />

        {/* Shapes group - translate to center */}
        <g transform={`translate(${10 - bounds.minX * scale}, ${10 - bounds.minY * scale})`}>
          {shapes.map((shape) => {
            if (shape.type === "rect") {
              return renderRect(shape as RectShape, scale);
            } else if (shape.type === "line") {
              return renderLine(shape as LineShape, scale);
            }
            return null;
          })}
        </g>

        {/* Dimension labels */}
        {showDimensions && (
          <g className="dimensions">
            {/* Width at bottom */}
            <text
              x={viewWidth / 2}
              y={viewHeight - 5}
              textAnchor="middle"
              fontSize="8"
              fill={COLORS.dimension}
              fontFamily="monospace"
            >
              {dims.width}mm
            </text>
            {/* Height on left - rotated */}
            <text
              x="8"
              y={viewHeight / 2}
              textAnchor="middle"
              fontSize="8"
              fill={COLORS.dimension}
              fontFamily="monospace"
              transform={`rotate(-90, 8, ${viewHeight / 2})`}
            >
              {dims.height}mm
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
