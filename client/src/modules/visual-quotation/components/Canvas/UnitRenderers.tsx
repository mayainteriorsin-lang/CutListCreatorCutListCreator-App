import React from "react";
import { Rect, Line, Group, Shape } from "react-konva";
import type { DrawnUnit, CanvasViewMode } from "../../types";

interface UnitRenderProps {
  unit: DrawnUnit;
  isActive: boolean;
  viewMode: CanvasViewMode;
}

// Colors matching the Design page style
const CARCASS_COLORS = {
  panel: "#d4d4d4",
  panelStroke: "#333",
  back: "#f0f0f0",
  backStroke: "#999",
  centerPost: "#c0c0c0",
  shelf: "#d4d4d4",
  skirting: "#b8b8b8",
};

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
 * Render unit in Carcass View (Design page style)
 * Shows panels with real thickness, center posts, and shelves
 * Works with both libraryConfig and basic DrawnUnit properties
 */
function renderCarcassView(unit: DrawnUnit, isActive: boolean): React.ReactNode {
  const box = unit.box;
  const lc = unit.libraryConfig || {};

  // Calculate scale factor for mm to canvas pixels
  const scaleX = box.width / (unit.widthMm || 2400);
  const scaleY = box.height / (unit.heightMm || 2400);

  // Extract config values - fall back to DrawnUnit properties
  const carcassThickness = (lc.carcassThicknessMm as number) || 18;
  const T = carcassThickness * scaleX; // Panel thickness in canvas pixels

  // Center posts: from libraryConfig OR derive from shutterCount-1 (shutters between posts)
  const postCount = (lc.centerPostCount as number) ?? Math.max(0, unit.shutterCount - 1);

  const skirtingEnabled = (lc.skirtingEnabled as boolean) || false;
  const skirtingH = skirtingEnabled ? ((lc.skirtingHeightMm as number) || 115) * scaleY : 0;

  // Panel enable state (all enabled by default)
  const rawPanels = (lc.panelsEnabled as { top?: boolean; bottom?: boolean; left?: boolean; right?: boolean; back?: boolean }) || {};
  const panels = {
    top: rawPanels.top !== false,
    bottom: rawPanels.bottom !== false,
    left: rawPanels.left !== false,
    right: rawPanels.right !== false,
    back: rawPanels.back !== false,
  };

  const elements: React.ReactNode[] = [];
  const ox = box.x;
  const oy = box.y;
  const W = box.width;
  const H = box.height;

  // Back panel (drawn first, behind everything)
  if (panels.back) {
    const backInset = 3;
    const backH = H - T * 2 - skirtingH;
    elements.push(
      <Rect
        key="back"
        x={ox + T + backInset}
        y={oy + T + backInset}
        width={W - T * 2 - backInset * 2}
        height={backH - backInset * 2}
        fill={CARCASS_COLORS.back}
        stroke={CARCASS_COLORS.backStroke}
        strokeWidth={0.5}
        listening={false}
      />
    );
  }

  // Left panel
  if (panels.left) {
    elements.push(
      <Rect key="left" x={ox} y={oy} width={T} height={H}
        fill={CARCASS_COLORS.panel} stroke={CARCASS_COLORS.panelStroke} strokeWidth={1} listening={false} />
    );
  }

  // Right panel
  if (panels.right) {
    elements.push(
      <Rect key="right" x={ox + W - T} y={oy} width={T} height={H}
        fill={CARCASS_COLORS.panel} stroke={CARCASS_COLORS.panelStroke} strokeWidth={1} listening={false} />
    );
  }

  // Top panel
  if (panels.top) {
    elements.push(
      <Rect key="top" x={ox + T} y={oy} width={W - T * 2} height={T}
        fill={CARCASS_COLORS.panel} stroke={CARCASS_COLORS.panelStroke} strokeWidth={1} listening={false} />
    );
  }

  // Bottom panel
  const bottomY = oy + H - T - skirtingH;
  if (panels.bottom) {
    elements.push(
      <Rect key="bottom" x={ox + T} y={bottomY} width={W - T * 2} height={T}
        fill={CARCASS_COLORS.panel} stroke={CARCASS_COLORS.panelStroke} strokeWidth={1} listening={false} />
    );
  }

  // Skirting
  if (skirtingEnabled) {
    elements.push(
      <Rect key="skirting" x={ox} y={oy + H - skirtingH} width={W} height={skirtingH}
        fill={CARCASS_COLORS.skirting} stroke={CARCASS_COLORS.panelStroke} strokeWidth={1} listening={false} />
    );
  }

  // Center posts - use shutterDividerXs positions if available, otherwise calculate
  const innerW = W - T * 2;
  const postH = H - T * 2 - skirtingH;

  // Check if we have explicit divider positions from the 2D canvas
  const hasExplicitDividers = unit.shutterDividerXs && unit.shutterDividerXs.length > 0;

  if (hasExplicitDividers) {
    // Use the exact shutterDividerXs positions as center post locations
    const sortedDividers = [...unit.shutterDividerXs].sort((a, b) => a - b);
    for (let i = 0; i < sortedDividers.length; i++) {
      const dividerX = sortedDividers[i];
      elements.push(
        <Rect key={`post-${i}`} x={dividerX - T / 2} y={oy + T} width={T} height={postH}
          fill={CARCASS_COLORS.centerPost} stroke={CARCASS_COLORS.panelStroke} strokeWidth={1} listening={false} />
      );
    }
  } else if (postCount > 0) {
    // Calculate evenly spaced posts
    const totalPostThickness = postCount * T;
    const sectionCount = postCount + 1;
    const sectionW = (innerW - totalPostThickness) / sectionCount;

    for (let i = 1; i <= postCount; i++) {
      const postX = ox + T + sectionW * i + T * (i - 1);
      elements.push(
        <Rect key={`post-${i}`} x={postX} y={oy + T} width={T} height={postH}
          fill={CARCASS_COLORS.centerPost} stroke={CARCASS_COLORS.panelStroke} strokeWidth={1} listening={false} />
      );
    }
  }

  // Calculate sectionCount and sectionW for shelf rendering
  const actualPostCount = hasExplicitDividers ? unit.shutterDividerXs.length : postCount;
  const sectionCount = actualPostCount + 1;
  const totalPostThickness = actualPostCount * T;
  const sectionW = (innerW - totalPostThickness) / sectionCount;

  // Shelves from sections config OR from horizontalDividerYs
  const sections = (lc.sections as Array<{ type: string; widthMm?: number; shelfCount?: number; shelfPositions?: number[] }>) || [];

  if (sections.length > 0) {
    // Use libraryConfig sections
    let currentX = ox + T;
    const secH = H - T * 2 - skirtingH;
    const secY = oy + T;

    for (let i = 0; i < sections.length && i < sectionCount; i++) {
      const section = sections[i];
      const secW = section.widthMm && section.widthMm > 0 ? section.widthMm * (box.width / (unit.widthMm || 2400)) : sectionW;
      const shelfCount = section.shelfCount ?? 0;

      if (shelfCount > 0) {
        const hasCustomPositions = section.shelfPositions && section.shelfPositions.length > 0;

        for (let j = 1; j <= shelfCount; j++) {
          let shelfY: number;

          if (hasCustomPositions && section.shelfPositions![j - 1] !== undefined) {
            const pct = section.shelfPositions![j - 1];
            shelfY = secY + (pct / 100) * secH;
          } else {
            const totalShelfThickness = shelfCount * T;
            const availableHeight = secH - totalShelfThickness;
            const spacing = availableHeight / (shelfCount + 1);
            shelfY = secY + spacing * j + T * (j - 1);
          }

          elements.push(
            <Rect key={`shelf-${i}-${j}`} x={currentX} y={shelfY} width={secW} height={T}
              fill={CARCASS_COLORS.shelf} stroke={CARCASS_COLORS.panelStroke} strokeWidth={1} listening={false} />
          );
        }
      }

      currentX += secW + T;
    }
  } else if (unit.horizontalDividerYs && unit.horizontalDividerYs.length > 0) {
    // Fallback: use horizontalDividerYs as shelf positions (from 2D page manual creation)
    // Draw shelves spanning full inner width at each horizontal divider position
    const sortedDividers = [...unit.horizontalDividerYs].sort((a, b) => a - b);

    for (let i = 0; i < sortedDividers.length; i++) {
      const dividerY = sortedDividers[i];
      // Draw shelf at this Y position, spanning full inner width
      elements.push(
        <Rect key={`shelf-row-${i}`} x={ox + T} y={dividerY - T / 2} width={innerW} height={T}
          fill={CARCASS_COLORS.shelf} stroke={CARCASS_COLORS.panelStroke} strokeWidth={1} listening={false} />
      );
    }
  }

  return <>{elements}</>;
}

/**
 * Render unit in Front View (2D - default)
 * Uses carcass view for wardrobe_carcass units (same as Design page)
 */
export function renderFrontView(unit: DrawnUnit, isActive: boolean): React.ReactNode {
  // Always use carcass rendering for wardrobe_carcass (same as Design page)
  if (unit.unitType === "wardrobe_carcass") {
    return renderCarcassView(unit, isActive);
  }

  // Default shutter-style rendering
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
