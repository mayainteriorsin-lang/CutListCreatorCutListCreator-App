import React from "react";
import { Rect, Line, Group, Shape } from "react-konva";
import type { DrawnUnit, CanvasViewMode } from "../../store/visualQuotationStore";

interface UnitRenderProps {
  unit: DrawnUnit;
  isActive: boolean;
  viewMode: CanvasViewMode;
}

// Isometric projection constants
const ISO_ANGLE = Math.PI / 6; // 30 degrees
const ISO_COS = Math.cos(ISO_ANGLE);
const ISO_SIN = Math.sin(ISO_ANGLE);

// Convert 3D point to isometric 2D
function toIsometric(x: number, y: number, z: number): { x: number; y: number } {
  return {
    x: (x - z) * ISO_COS,
    y: (x + z) * ISO_SIN - y,
  };
}

// Default depth for 3D views (visual representation)
const DEPTH_PX = 60;

/**
 * Render unit in Front View (2D - default)
 */
export function renderFrontView(unit: DrawnUnit, isActive: boolean): React.ReactNode {
  const box = unit.box;
  const GAP = 3;
  const FRAME = 4;

  const verticalDividers = [...unit.shutterDividerXs].sort((a, b) => a - b);
  const columnEdges = [box.x, ...verticalDividers, box.x + box.width];
  const horizontalDividers = unit.horizontalDividerYs ? [...unit.horizontalDividerYs].sort((a, b) => a - b) : [];
  const rowEdges = [box.y, ...horizontalDividers, box.y + box.height];

  return (
    <>
      {/* Outer frame */}
      <Rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        stroke="#4b5563"
        strokeWidth={2}
        fill="#d1d5db"
        opacity={isActive ? 1 : 0.7}
        listening={false}
      />
      {/* Shutter panels */}
      {rowEdges.slice(0, -1).map((topEdge, rowIdx) => {
        const bottomEdge = rowEdges[rowIdx + 1]!;
        const isFirstRow = rowIdx === 0;
        const isLastRow = rowIdx === rowEdges.length - 2;

        return columnEdges.slice(0, -1).map((leftEdge, colIdx) => {
          const rightEdge = columnEdges[colIdx + 1]!;
          const isFirstCol = colIdx === 0;
          const isLastCol = colIdx === columnEdges.length - 2;

          const shutterX = leftEdge + GAP / 2 + (isFirstCol ? FRAME : 0);
          const shutterW = rightEdge - leftEdge - GAP - (isFirstCol ? FRAME : 0) - (isLastCol ? FRAME : 0);
          const shutterY = topEdge + GAP / 2 + (isFirstRow ? FRAME : 0);
          const shutterH = bottomEdge - topEdge - GAP - (isFirstRow ? FRAME : 0) - (isLastRow ? FRAME : 0);
          const handleX = colIdx % 2 === 0 ? shutterX + shutterW - 12 : shutterX + 12;
          const handleY = shutterY + shutterH / 2;

          return (
            <React.Fragment key={`front-${rowIdx}-${colIdx}`}>
              <Rect
                x={shutterX}
                y={shutterY}
                width={Math.max(10, shutterW)}
                height={Math.max(10, shutterH)}
                fill="#e5e7eb"
                stroke="#9ca3af"
                strokeWidth={1}
                cornerRadius={2}
                listening={false}
              />
              <Line
                points={[handleX, handleY - 15, handleX, handleY + 15]}
                stroke="#6b7280"
                strokeWidth={3}
                lineCap="round"
                listening={false}
              />
            </React.Fragment>
          );
        });
      })}
    </>
  );
}

/**
 * Render unit in Top View (Bird's eye)
 */
export function renderTopView(unit: DrawnUnit, isActive: boolean): React.ReactNode {
  const box = unit.box;
  const depth = DEPTH_PX;

  // In top view, we show width (x) and depth (y represents depth from above)
  // Height is not visible from top
  const verticalDividers = [...unit.shutterDividerXs].sort((a, b) => a - b);
  const columnEdges = [box.x, ...verticalDividers, box.x + box.width];

  return (
    <>
      {/* Main body from top - shows width and depth */}
      <Rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={depth}
        fill="#d1d5db"
        stroke="#4b5563"
        strokeWidth={2}
        opacity={isActive ? 1 : 0.7}
        listening={false}
      />
      {/* Shutter divisions from top - just lines showing where shutters are */}
      {columnEdges.slice(1, -1).map((xPos, idx) => (
        <Line
          key={`top-div-${idx}`}
          points={[xPos, box.y, xPos, box.y + depth]}
          stroke="#6b7280"
          strokeWidth={1}
          dash={[4, 4]}
          listening={false}
        />
      ))}
      {/* Depth label */}
      {unit.depthMm > 0 && (
        <Rect
          x={box.x + box.width / 2 - 25}
          y={box.y + depth / 2 - 10}
          width={50}
          height={20}
          fill="rgba(255,255,255,0.8)"
          cornerRadius={4}
          listening={false}
        />
      )}
    </>
  );
}

/**
 * Render unit in Isometric View (3D angled)
 */
export function renderIsometricView(unit: DrawnUnit, isActive: boolean): React.ReactNode {
  const box = unit.box;
  const depth = DEPTH_PX;
  const GAP = 3;
  const FRAME = 4;

  // Isometric offsets
  const dxTop = depth * 0.7;
  const dyTop = depth * 0.4;

  const verticalDividers = [...unit.shutterDividerXs].sort((a, b) => a - b);
  const columnEdges = [0, ...verticalDividers.map(d => d - box.x), box.width];
  const horizontalDividers = unit.horizontalDividerYs ? [...unit.horizontalDividerYs].sort((a, b) => a - b) : [];
  const rowEdges = [0, ...horizontalDividers.map(d => d - box.y), box.height];

  return (
    <Group x={box.x} y={box.y}>
      {/* Top face */}
      <Shape
        sceneFunc={(ctx, shape) => {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(box.width, 0);
          ctx.lineTo(box.width + dxTop, -dyTop);
          ctx.lineTo(dxTop, -dyTop);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        }}
        fill="#a8b0ba"
        stroke="#4b5563"
        strokeWidth={1}
        listening={false}
      />
      {/* Right side face */}
      <Shape
        sceneFunc={(ctx, shape) => {
          ctx.beginPath();
          ctx.moveTo(box.width, 0);
          ctx.lineTo(box.width + dxTop, -dyTop);
          ctx.lineTo(box.width + dxTop, box.height - dyTop);
          ctx.lineTo(box.width, box.height);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        }}
        fill="#8b939e"
        stroke="#4b5563"
        strokeWidth={1}
        listening={false}
      />
      {/* Front face - main wardrobe view */}
      <Rect
        x={0}
        y={0}
        width={box.width}
        height={box.height}
        fill="#d1d5db"
        stroke="#4b5563"
        strokeWidth={2}
        opacity={isActive ? 1 : 0.8}
        listening={false}
      />
      {/* Shutter panels on front face */}
      {rowEdges.slice(0, -1).map((topEdge, rowIdx) => {
        const bottomEdge = rowEdges[rowIdx + 1]!;
        const isFirstRow = rowIdx === 0;
        const isLastRow = rowIdx === rowEdges.length - 2;

        return columnEdges.slice(0, -1).map((leftEdge, colIdx) => {
          const rightEdge = columnEdges[colIdx + 1]!;
          const isFirstCol = colIdx === 0;
          const isLastCol = colIdx === columnEdges.length - 2;

          const shutterX = leftEdge + GAP / 2 + (isFirstCol ? FRAME : 0);
          const shutterW = rightEdge - leftEdge - GAP - (isFirstCol ? FRAME : 0) - (isLastCol ? FRAME : 0);
          const shutterY = topEdge + GAP / 2 + (isFirstRow ? FRAME : 0);
          const shutterH = bottomEdge - topEdge - GAP - (isFirstRow ? FRAME : 0) - (isLastRow ? FRAME : 0);
          const handleX = colIdx % 2 === 0 ? shutterX + shutterW - 10 : shutterX + 10;
          const handleY = shutterY + shutterH / 2;

          return (
            <React.Fragment key={`iso-${rowIdx}-${colIdx}`}>
              <Rect
                x={shutterX}
                y={shutterY}
                width={Math.max(10, shutterW)}
                height={Math.max(10, shutterH)}
                fill="#e5e7eb"
                stroke="#9ca3af"
                strokeWidth={1}
                cornerRadius={2}
                listening={false}
              />
              <Line
                points={[handleX, handleY - 12, handleX, handleY + 12]}
                stroke="#6b7280"
                strokeWidth={2}
                lineCap="round"
                listening={false}
              />
            </React.Fragment>
          );
        });
      })}
    </Group>
  );
}

/**
 * Render unit in Perspective View (3D with vanishing point)
 */
export function renderPerspectiveView(unit: DrawnUnit, isActive: boolean): React.ReactNode {
  const box = unit.box;
  const depth = DEPTH_PX * 0.8;
  const GAP = 3;
  const FRAME = 4;

  // Perspective effect - sides taper towards a vanishing point
  const perspectiveRatio = 0.85; // How much the back is smaller than front
  const dxRight = depth * 0.6;
  const dyRight = depth * 0.15;

  const verticalDividers = [...unit.shutterDividerXs].sort((a, b) => a - b);
  const columnEdges = [0, ...verticalDividers.map(d => d - box.x), box.width];
  const horizontalDividers = unit.horizontalDividerYs ? [...unit.horizontalDividerYs].sort((a, b) => a - b) : [];
  const rowEdges = [0, ...horizontalDividers.map(d => d - box.y), box.height];

  // Calculate perspective-adjusted back corners
  const backWidth = box.width * perspectiveRatio;
  const backHeight = box.height * perspectiveRatio;
  const backOffsetX = (box.width - backWidth) / 2;
  const backOffsetY = (box.height - backHeight) / 2;

  return (
    <Group x={box.x} y={box.y}>
      {/* Top face with perspective */}
      <Shape
        sceneFunc={(ctx, shape) => {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(box.width, 0);
          ctx.lineTo(box.width + dxRight - backOffsetX, -dyRight + backOffsetY);
          ctx.lineTo(dxRight + backOffsetX, -dyRight + backOffsetY);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        }}
        fill="#a8b0ba"
        stroke="#4b5563"
        strokeWidth={1}
        listening={false}
      />
      {/* Right side face with perspective */}
      <Shape
        sceneFunc={(ctx, shape) => {
          ctx.beginPath();
          ctx.moveTo(box.width, 0);
          ctx.lineTo(box.width + dxRight - backOffsetX, -dyRight + backOffsetY);
          ctx.lineTo(box.width + dxRight - backOffsetX, backHeight - dyRight + backOffsetY);
          ctx.lineTo(box.width, box.height);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        }}
        fill="#8b939e"
        stroke="#4b5563"
        strokeWidth={1}
        listening={false}
      />
      {/* Front face - main wardrobe view */}
      <Rect
        x={0}
        y={0}
        width={box.width}
        height={box.height}
        fill="#d1d5db"
        stroke="#4b5563"
        strokeWidth={2}
        opacity={isActive ? 1 : 0.8}
        listening={false}
      />
      {/* Shutter panels on front face */}
      {rowEdges.slice(0, -1).map((topEdge, rowIdx) => {
        const bottomEdge = rowEdges[rowIdx + 1]!;
        const isFirstRow = rowIdx === 0;
        const isLastRow = rowIdx === rowEdges.length - 2;

        return columnEdges.slice(0, -1).map((leftEdge, colIdx) => {
          const rightEdge = columnEdges[colIdx + 1]!;
          const isFirstCol = colIdx === 0;
          const isLastCol = colIdx === columnEdges.length - 2;

          const shutterX = leftEdge + GAP / 2 + (isFirstCol ? FRAME : 0);
          const shutterW = rightEdge - leftEdge - GAP - (isFirstCol ? FRAME : 0) - (isLastCol ? FRAME : 0);
          const shutterY = topEdge + GAP / 2 + (isFirstRow ? FRAME : 0);
          const shutterH = bottomEdge - topEdge - GAP - (isFirstRow ? FRAME : 0) - (isLastRow ? FRAME : 0);
          const handleX = colIdx % 2 === 0 ? shutterX + shutterW - 10 : shutterX + 10;
          const handleY = shutterY + shutterH / 2;

          return (
            <React.Fragment key={`persp-${rowIdx}-${colIdx}`}>
              <Rect
                x={shutterX}
                y={shutterY}
                width={Math.max(10, shutterW)}
                height={Math.max(10, shutterH)}
                fill="#e5e7eb"
                stroke="#9ca3af"
                strokeWidth={1}
                cornerRadius={2}
                listening={false}
              />
              <Line
                points={[handleX, handleY - 12, handleX, handleY + 12]}
                stroke="#6b7280"
                strokeWidth={2}
                lineCap="round"
                listening={false}
              />
            </React.Fragment>
          );
        });
      })}
    </Group>
  );
}

/**
 * Main renderer that switches between view modes
 */
export function renderUnitByViewMode(
  unit: DrawnUnit,
  isActive: boolean,
  viewMode: CanvasViewMode
): React.ReactNode {
  switch (viewMode) {
    case "top":
      return renderTopView(unit, isActive);
    case "isometric":
      return renderIsometricView(unit, isActive);
    case "perspective":
      return renderPerspectiveView(unit, isActive);
    case "front":
    default:
      return renderFrontView(unit, isActive);
  }
}
