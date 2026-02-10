/**
 * Render Helpers for DesignCanvas
 *
 * Extracted rendering functions for grid, shapes, and temporary shapes.
 * Improves code organization and testability.
 */

import React from "react";
import type {
  Shape,
  LineShape,
  RectShape,
  DimensionShape,
  ComponentRectDef,
  ComponentLineDef,
  AlignmentGuide,
  Component,
} from "../types";
import { getAngle } from "../utils/geometry";
import { renderDimension, DEFAULT_DIMENSION_FONT_SIZE, DIMENSION_COLOR, DIMENSION_FONT_FAMILY } from "../dimensions";

// =============================================================================
// CONSTANTS
// =============================================================================

export const COLORS = {
  CYAN: "#00e5ff",
  WHITE: "#e0e0e0",
  GREEN: "#00cc66",
  YELLOW: "#ffee00",
} as const;

// =============================================================================
// GRID RENDERING
// =============================================================================

interface GridOptions {
  gridSize: number;
  gridVisible: boolean;
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Render the grid (no ruler marks)
 */
export function renderGrid({
  gridSize,
  gridVisible,
  canvasWidth,
  canvasHeight,
}: GridOptions): React.ReactElement {
  const fine = gridSize;
  const medium = gridSize * 10;

  return (
    <>
      <defs>
        <pattern
          id="gridFine"
          width={fine}
          height={fine}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={fine} cy={fine} r={0.5} fill="#999" />
        </pattern>
        {medium > fine && (
          <pattern
            id="gridMedium"
            width={medium}
            height={medium}
            patternUnits="userSpaceOnUse"
          >
            <line
              x1={medium - 2}
              y1={medium}
              x2={medium + 2}
              y2={medium}
              stroke="#777"
              strokeWidth={0.5}
            />
            <line
              x1={medium}
              y1={medium - 2}
              x2={medium}
              y2={medium + 2}
              stroke="#777"
              strokeWidth={0.5}
            />
          </pattern>
        )}
      </defs>
      <rect width={canvasWidth} height={canvasHeight} fill="#ffffff" />
      {gridVisible && (
        <rect
          width={canvasWidth}
          height={canvasHeight}
          fill="url(#gridFine)"
        />
      )}
      {gridVisible && medium > fine && (
        <rect
          width={canvasWidth}
          height={canvasHeight}
          fill="url(#gridMedium)"
        />
      )}
    </>
  );
}

// =============================================================================
// RECT RENDERING
// =============================================================================

/**
 * Shape IDs that are locked (non-interactive)
 * - MOD-BACK: Back panel should not block selection of posts/shelves
 */
const LOCKED_SHAPE_IDS = new Set(["MOD-BACK"]);

interface RectRenderOptions {
  rect: RectShape;
  isSelected: boolean;
  isHovered: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  actionMode?: "move" | "resize" | "copy" | "delete" | null;
  cursorPos?: { x: number; y: number } | null;
  dimFontSize?: number;
}

/**
 * Render a rectangle shape with selection and hover states
 * Locked shapes (like back panel) have pointer-events: none
 */
export function renderRect({
  rect: r,
  isSelected,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  actionMode,
  cursorPos,
  dimFontSize = DEFAULT_DIMENSION_FONT_SIZE,
}: RectRenderOptions): React.ReactElement {
  const rFill = r.fill ?? "none";
  const rStroke = r.stroke ?? COLORS.CYAN;
  const rStrokeW = r.strokeWidth ?? 1;
  const isModRect = r.id.startsWith("MOD-");
  const isLocked = LOCKED_SHAPE_IDS.has(r.id);
  const isCenterPost = r.id.startsWith("MOD-POST-");

  // For center posts in resize mode: check if cursor is in 80px padding area
  const HIT_PADDING = 80;
  let isInPadding = false;

  if (isCenterPost && isSelected && actionMode === "resize" && cursorPos) {
    // Check if cursor is directly on the post
    const isOnPost = cursorPos.x >= r.x && cursorPos.x <= r.x + r.w &&
                     cursorPos.y >= r.y && cursorPos.y <= r.y + r.h;

    // Check if cursor is in the padding area (but not on post)
    const inPaddingArea = cursorPos.x >= r.x - HIT_PADDING && cursorPos.x <= r.x + r.w + HIT_PADDING &&
                          cursorPos.y >= r.y - HIT_PADDING && cursorPos.y <= r.y + r.h + HIT_PADDING;
    isInPadding = inPaddingArea && !isOnPost;
  }

  // Only show arrows when in 40px padding area (not directly on post)
  const showArrowsInPadding = isCenterPost && isSelected && actionMode === "resize" && isInPadding;

  // Locked shapes don't show selection/hover states
  const selStroke = isLocked
    ? rStroke
    : isSelected
      ? COLORS.GREEN
      : isHovered
        ? "#3b82f6"
        : rStroke;

  return (
    <g
      key={r.id}
      style={{
        cursor: isLocked ? "default" : isModRect ? "pointer" : undefined,
        pointerEvents: isLocked ? "none" : undefined, // Clicks pass through locked shapes
      }}
      onMouseEnter={isLocked ? undefined : onMouseEnter}
      onMouseLeave={isLocked ? undefined : onMouseLeave}
    >
      <rect
        x={r.x}
        y={r.y}
        width={r.w}
        height={r.h}
        rx={r.rx ?? 0}
        fill={isHovered && isModRect && !isLocked ? "#e0f2fe" : rFill}
        stroke={selStroke}
        strokeWidth={isSelected && !isLocked ? rStrokeW + 1 : rStrokeW}
        opacity={r.opacity ?? 1}
      />
      {isSelected && !isLocked && (
        <g>
          {/* Corner handles */}
          <rect x={r.x - 3} y={r.y - 3} width={6} height={6} fill={COLORS.GREEN} />
          <rect
            x={r.x + r.w - 3}
            y={r.y - 3}
            width={6}
            height={6}
            fill={COLORS.GREEN}
          />
          <rect
            x={r.x - 3}
            y={r.y + r.h - 3}
            width={6}
            height={6}
            fill={COLORS.GREEN}
          />
          <rect
            x={r.x + r.w - 3}
            y={r.y + r.h - 3}
            width={6}
            height={6}
            fill={COLORS.GREEN}
          />

          {/* UNIFIED dimension display - same color for all */}
          <text
            x={r.x + r.w / 2}
            y={r.y - 8}
            textAnchor="middle"
            fontSize={14}
            fontWeight="bold"
            fill={DIMENSION_COLOR}
            fontFamily={DIMENSION_FONT_FAMILY}
          >
            {Math.round(r.w)} × {Math.round(r.h)}
          </text>
        </g>
      )}
      {/* Resize handles for center posts - arrows only when in 40px padding area */}
      {showArrowsInPadding && (
        <g>
          {/* Top resize arrow */}
          <circle
            cx={r.x + r.w / 2}
            cy={r.y - 15}
            r={12}
            fill="#3b82f6"
            stroke="#fff"
            strokeWidth={2}
          />
          <text
            x={r.x + r.w / 2}
            y={r.y - 10}
            textAnchor="middle"
            fontSize={16}
            fontWeight="bold"
            fill="#fff"
          >
            ↑
          </text>
          {/* Bottom resize arrow */}
          <circle
            cx={r.x + r.w / 2}
            cy={r.y + r.h + 15}
            r={12}
            fill="#3b82f6"
            stroke="#fff"
            strokeWidth={2}
          />
          <text
            x={r.x + r.w / 2}
            y={r.y + r.h + 20}
            textAnchor="middle"
            fontSize={16}
            fontWeight="bold"
            fill="#fff"
          >
            ↓
          </text>
        </g>
      )}
      {/* Height display for center posts in resize mode - shown next to post */}
      {isCenterPost && isSelected && actionMode === "resize" && (
        <text
          x={r.x + r.w + dimFontSize * 0.5}
          y={r.y + r.h / 2 + dimFontSize * 0.3}
          textAnchor="start"
          fontSize={dimFontSize}
          fontWeight="bold"
          fill={DIMENSION_COLOR}
          fontFamily={DIMENSION_FONT_FAMILY}
        >
          {Math.round(r.h)}
        </text>
      )}
    </g>
  );
}

// =============================================================================
// LINE RENDERING
// =============================================================================

interface LineRenderOptions {
  line: LineShape;
  isSelected: boolean;
}

/**
 * Render a line shape with selection state
 */
export function renderLine({
  line: l,
  isSelected,
}: LineRenderOptions): React.ReactElement {
  const mx = (l.x1 + l.x2) / 2;
  const my = (l.y1 + l.y2) / 2;
  const len = Math.round(Math.hypot(l.x2 - l.x1, l.y2 - l.y1));
  const lineCol = (l.color ?? "#000000") === "#000000" ? COLORS.WHITE : l.color!;
  const selCol = isSelected ? COLORS.GREEN : lineCol;
  const T = l.thickness ?? 18;
  const isModLine = l.id.startsWith("MOD-");
  const angle = getAngle(l.x1, l.y1, l.x2, l.y2);
  const rad = (angle * Math.PI) / 180;
  const halfT = T / 2;
  const nx = -Math.sin(rad) * halfT;
  const ny = Math.cos(rad) * halfT;
  const pts = `${l.x1 + nx},${l.y1 + ny} ${l.x2 + nx},${l.y2 + ny} ${l.x2 - nx},${l.y2 - ny} ${l.x1 - nx},${l.y1 - ny}`;

  return (
    <g key={l.id}>
      {isModLine ? (
        <line
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke={selCol}
          strokeWidth={l.thickness ?? 1}
        />
      ) : (
        <>
          <polygon points={pts} fill="none" stroke={selCol} strokeWidth={1} />
          {T >= 10 && (
            <>
              <line
                x1={l.x1 + nx * 0.6}
                y1={l.y1 + ny * 0.6}
                x2={l.x2 + nx * 0.6}
                y2={l.y2 + ny * 0.6}
                stroke={selCol}
                strokeWidth={0.3}
                opacity={0.3}
              />
              <line
                x1={l.x1 - nx * 0.6}
                y1={l.y1 - ny * 0.6}
                x2={l.x2 - nx * 0.6}
                y2={l.y2 - ny * 0.6}
                stroke={selCol}
                strokeWidth={0.3}
                opacity={0.3}
              />
            </>
          )}
          <line
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke={selCol}
            strokeWidth={0.3}
            strokeDasharray="4 3"
            opacity={0.4}
          />
        </>
      )}
      {l.marker === "arrow" &&
        (() => {
          const arrowLen = 12;
          const ax = l.x2 - arrowLen * Math.cos(rad);
          const ay = l.y2 - arrowLen * Math.sin(rad);
          return (
            <polygon
              points={`${l.x2},${l.y2} ${ax + 5 * Math.sin(rad)},${ay - 5 * Math.cos(rad)} ${ax - 5 * Math.sin(rad)},${ay + 5 * Math.cos(rad)}`}
              fill={selCol}
            />
          );
        })()}
      {isSelected && (
        <>
          <rect x={l.x1 - 3} y={l.y1 - 3} width={6} height={6} fill={COLORS.GREEN} />
          <rect x={l.x2 - 3} y={l.y2 - 3} width={6} height={6} fill={COLORS.GREEN} />
          <text
            x={mx}
            y={my - halfT - 6}
            textAnchor="middle"
            fontSize={10}
            fill={COLORS.YELLOW}
            fontFamily="'Courier New', monospace"
          >{`${len} x ${T}mm`}</text>
        </>
      )}
      {!isSelected && !isModLine && l.showDimension !== false && (
        <text
          x={mx}
          y={my - halfT - 4}
          textAnchor="middle"
          fontSize={9}
          fill="#888"
          fontFamily="'Courier New', monospace"
        >
          {l.customLabel || `${len} x ${T}`}
        </text>
      )}
    </g>
  );
}

// =============================================================================
// SHAPE RENDERING (DISPATCHER)
// =============================================================================

interface ShapeRenderOptions {
  shape: Shape;
  isSelected: boolean;
  isHovered: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  dimFontSize?: number;
  actionMode?: "move" | "resize" | "copy" | "delete" | null;
  cursorPos?: { x: number; y: number } | null;
}

/**
 * Render any shape type
 */
export function renderShape({
  shape,
  isSelected,
  isHovered,
  onMouseEnter,
  onMouseLeave,
  dimFontSize = DEFAULT_DIMENSION_FONT_SIZE,
  actionMode,
  cursorPos,
}: ShapeRenderOptions): React.ReactElement | null {
  if (shape.type === "dimension") {
    return renderDimension(shape as DimensionShape, dimFontSize);
  } else if (shape.type === "rect") {
    return renderRect({
      rect: shape as RectShape,
      isSelected,
      isHovered,
      onMouseEnter,
      onMouseLeave,
      actionMode,
      cursorPos,
      dimFontSize,
    });
  } else if (shape.type === "line") {
    return renderLine({
      line: shape as LineShape,
      isSelected,
    });
  }
  return null;
}

// =============================================================================
// TEMP SHAPE RENDERING
// =============================================================================

interface TempShapeOptions {
  temp: Partial<Shape> | null;
}

/**
 * Render temporary shape during creation
 */
export function renderTempShape({ temp }: TempShapeOptions): React.ReactElement | null {
  if (!temp) return null;

  if (temp.type === "rect") {
    const r = temp as Partial<RectShape>;
    return (
      <rect
        x={r.x ?? 0}
        y={r.y ?? 0}
        width={r.w ?? 0}
        height={r.h ?? 0}
        fill="none"
        stroke={COLORS.CYAN}
        strokeWidth={1}
        strokeDasharray="6 3"
      />
    );
  }

  if (temp.type === "line") {
    const l = temp as Partial<LineShape>;
    const c = l.color === "#000000" ? COLORS.WHITE : l.color || COLORS.WHITE;
    const T = l.thickness ?? 18;
    const x1 = l.x1 ?? 0;
    const y1 = l.y1 ?? 0;
    const x2 = l.x2 ?? 0;
    const y2 = l.y2 ?? 0;
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const halfT = T / 2;
    const nx = -Math.sin(ang) * halfT;
    const ny = Math.cos(ang) * halfT;
    const pts = `${x1 + nx},${y1 + ny} ${x2 + nx},${y2 + ny} ${x2 - nx},${y2 - ny} ${x1 - nx},${y1 - ny}`;
    const len = Math.hypot(x2 - x1, y2 - y1);

    return (
      <g>
        <polygon
          points={pts}
          fill="none"
          stroke={c}
          strokeWidth={0.8}
          strokeDasharray="6 3"
        />
        <text
          x={(x1 + x2) / 2}
          y={(y1 + y2) / 2 - halfT - 6}
          textAnchor="middle"
          fontSize={10}
          fill={c}
          fontFamily="'Courier New', monospace"
        >{`${Math.round(len)} x ${T}mm`}</text>
      </g>
    );
  }

  return null;
}

// =============================================================================
// ALIGNMENT GUIDES RENDERING
// =============================================================================

interface AlignmentGuidesOptions {
  guides: AlignmentGuide[];
}

/**
 * Render alignment guides
 */
export function renderAlignmentGuides({
  guides,
}: AlignmentGuidesOptions): React.ReactElement {
  return (
    <g id="alignment-guides">
      {guides.map((guide, idx) => (
        <line
          key={`guide-${idx}`}
          x1={guide.type === "horizontal" ? guide.start : guide.position}
          y1={guide.type === "horizontal" ? guide.position : guide.start}
          x2={guide.type === "horizontal" ? guide.end : guide.position}
          y2={guide.type === "horizontal" ? guide.position : guide.end}
          stroke="#ffee00"
          strokeWidth={0.5}
          strokeDasharray="4 3"
          opacity={0.6}
        />
      ))}
    </g>
  );
}

// =============================================================================
// COMPONENT PREVIEW RENDERING
// =============================================================================

interface ComponentPreviewOptions {
  component: Component;
  cursorPos: { x: number; y: number };
}

/**
 * Render component preview at cursor position
 */
export function renderComponentPreview({
  component,
  cursorPos,
}: ComponentPreviewOptions): React.ReactElement {
  return (
    <g opacity={0.5}>
      {component.shapes.map((shapeDef, idx) => {
        if (shapeDef.type === "rect") {
          const r = shapeDef as ComponentRectDef;
          return (
            <rect
              key={`preview-${idx}`}
              x={cursorPos.x + (r.x || 0)}
              y={cursorPos.y + (r.y || 0)}
              width={r.w}
              height={r.h}
              fill="none"
              stroke="#00e5ff"
              strokeWidth={0.8}
              strokeDasharray="4 3"
            />
          );
        } else {
          const l = shapeDef as ComponentLineDef;
          return (
            <line
              key={`preview-${idx}`}
              x1={cursorPos.x + (l.x1 || 0)}
              y1={cursorPos.y + (l.y1 || 0)}
              x2={cursorPos.x + (l.x2 || 0)}
              y2={cursorPos.y + (l.y2 || 0)}
              stroke="#00e5ff"
              strokeWidth={0.8}
              strokeDasharray="4 3"
            />
          );
        }
      })}
      <text
        x={cursorPos.x + component.width / 2}
        y={cursorPos.y - 8}
        textAnchor="middle"
        fontSize={10}
        fill="#00e5ff"
        fontFamily="'Courier New', monospace"
      >
        {component.name}
      </text>
    </g>
  );
}

// =============================================================================
// BOUNDARY GUIDES RENDERING (for center post drag)
// =============================================================================

interface BoundaryGuidesOptions {
  minX: number;
  maxX: number;
  topY: number;
  height: number;
}

/**
 * Render boundary guides during center post drag
 */
export function renderBoundaryGuides({
  minX,
  maxX,
  topY,
  height,
}: BoundaryGuidesOptions): React.ReactElement {
  return (
    <g id="boundary-guides">
      {/* Left boundary line */}
      <line
        x1={minX}
        y1={topY}
        x2={minX}
        y2={topY + height}
        stroke="#ef4444"
        strokeWidth={1}
        strokeDasharray="4 4"
        opacity={0.7}
      />
      {/* Right boundary line */}
      <line
        x1={maxX}
        y1={topY}
        x2={maxX}
        y2={topY + height}
        stroke="#ef4444"
        strokeWidth={1}
        strokeDasharray="4 4"
        opacity={0.7}
      />
      {/* Drag zone highlight */}
      <rect
        x={minX}
        y={topY}
        width={maxX - minX}
        height={height}
        fill="#fef3c7"
        opacity={0.15}
      />
    </g>
  );
}

// Inner dimensions are now rendered via ../dimensions/DimensionRenderer.tsx
