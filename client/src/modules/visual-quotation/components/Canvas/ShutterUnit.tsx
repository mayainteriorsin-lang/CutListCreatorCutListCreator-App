/**
 * ShutterUnit - Realistic shutter rendering component for Konva canvas
 *
 * Renders a wardrobe unit with:
 * - Individual shutter door panels with borders
 * - Vertical bar handles on each door (realistic style)
 * - Horizontal divider lines for rows (based on sectionCount)
 * - Loft section visually separated at top (when loftEnabled)
 * - Resize handles when selected
 *
 * For wardrobe_carcass units, renders carcass structure (same as Design page):
 * - Panel boxes with real thickness
 * - Center posts
 * - Shelves
 * - Skirting
 */

import React from "react";
import { Group, Rect, Line, Circle } from "react-konva";
import type { DrawnUnit, HandleType } from "../../types";

// Carcass colors matching Design page
const CARCASS_COLORS = {
  panel: "#d4d4d4",
  panelStroke: "#333",
  back: "#f0f0f0",
  backStroke: "#999",
  centerPost: "#c0c0c0",
  shelf: "#d4d4d4",
  skirting: "#b8b8b8",
};

interface ShutterUnitProps {
  unit: DrawnUnit;
  isSelected: boolean;
  onClick: () => void;
  onResize?: (newBox: { x: number; y: number; width: number; height: number }) => void;
}

/**
 * Render carcass view for wardrobe_carcass units (same as Design page)
 */
function renderCarcassContent(unit: DrawnUnit, isSelected: boolean): React.ReactNode {
  const { box } = unit;
  const lc = unit.libraryConfig || {};

  // Calculate scale factor for mm to canvas pixels
  const scaleX = box.width / (unit.widthMm || 2400);
  const scaleY = box.height / (unit.heightMm || 2400);

  // Extract config values
  const carcassThickness = (lc.carcassThicknessMm as number) || 18;
  // Use larger minimum thickness (8px) for visibility on 2D canvas
  // Scale proportionally but ensure thick panels are visible
  const T = Math.max(8, Math.min(15, carcassThickness * scaleX * 2)); // 8-15px range

  // Center posts: ALWAYS use centerPostCount from libraryConfig for wardrobe_carcass
  // This ensures Design page config is respected over any calculated dividers
  const configPostCount = (lc.centerPostCount as number) ?? 0;
  const hasExplicitDividers = configPostCount === 0 && unit.shutterDividerXs && unit.shutterDividerXs.length > 0;
  const postCount = configPostCount > 0 ? configPostCount : (hasExplicitDividers ? unit.shutterDividerXs.length : 0);

  const skirtingEnabled = (lc.skirtingEnabled as boolean) || false;
  const skirtingH = skirtingEnabled ? Math.max(5, ((lc.skirtingHeightMm as number) || 115) * scaleY) : 0;

  // Panel enable state
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
  const innerW = W - T * 2;
  const postH = H - T * 2 - skirtingH;

  // Selection stroke style
  const strokeColor = isSelected ? "#3b82f6" : CARCASS_COLORS.panelStroke;

  // Back panel
  if (panels.back) {
    const backInset = 2;
    elements.push(
      <Rect key="back" x={ox + T + backInset} y={oy + T + backInset}
        width={W - T * 2 - backInset * 2} height={H - T * 2 - skirtingH - backInset * 2}
        fill={CARCASS_COLORS.back} stroke={CARCASS_COLORS.backStroke} strokeWidth={0.5} />
    );
  }

  // Left panel
  if (panels.left) {
    elements.push(
      <Rect key="left" x={ox} y={oy} width={T} height={H}
        fill={CARCASS_COLORS.panel} stroke={strokeColor} strokeWidth={1} />
    );
  }

  // Right panel
  if (panels.right) {
    elements.push(
      <Rect key="right" x={ox + W - T} y={oy} width={T} height={H}
        fill={CARCASS_COLORS.panel} stroke={strokeColor} strokeWidth={1} />
    );
  }

  // Top panel
  if (panels.top) {
    elements.push(
      <Rect key="top" x={ox + T} y={oy} width={W - T * 2} height={T}
        fill={CARCASS_COLORS.panel} stroke={strokeColor} strokeWidth={1} />
    );
  }

  // Bottom panel
  const bottomY = oy + H - T - skirtingH;
  if (panels.bottom) {
    elements.push(
      <Rect key="bottom" x={ox + T} y={bottomY} width={W - T * 2} height={T}
        fill={CARCASS_COLORS.panel} stroke={strokeColor} strokeWidth={1} />
    );
  }

  // Skirting
  if (skirtingEnabled) {
    elements.push(
      <Rect key="skirting" x={ox} y={oy + H - skirtingH} width={W} height={skirtingH}
        fill={CARCASS_COLORS.skirting} stroke={strokeColor} strokeWidth={1} />
    );
  }

  // Center posts - always calculate from postCount for consistent rendering
  // This matches the Design page's generateWardrobeCarcassShapes behavior
  if (postCount > 0) {
    const totalPostThickness = postCount * T;
    const sectionCountCalc = postCount + 1;
    const sectionW = (innerW - totalPostThickness) / sectionCountCalc;

    for (let i = 1; i <= postCount; i++) {
      const postX = ox + T + sectionW * i + T * (i - 1);
      elements.push(
        <Rect key={`post-${i}`} x={postX} y={oy + T} width={T} height={postH}
          fill={CARCASS_COLORS.centerPost} stroke={strokeColor} strokeWidth={1} />
      );
    }
  } else if (hasExplicitDividers) {
    // Fallback: use shutterDividerXs only if no centerPostCount was specified
    const sortedDividers = [...unit.shutterDividerXs].sort((a, b) => a - b);
    for (let i = 0; i < sortedDividers.length; i++) {
      const dividerX = sortedDividers[i];
      elements.push(
        <Rect key={`post-${i}`} x={dividerX - T / 2} y={oy + T} width={T} height={postH}
          fill={CARCASS_COLORS.centerPost} stroke={strokeColor} strokeWidth={1} />
      );
    }
  }

  // Shelves from sections config OR horizontalDividerYs
  // NOTE: For wardrobe_carcass, we ONLY render shelves if explicitly configured in sections
  // This matches the Design page's generateWardrobeCarcassShapes behavior
  const sections = (lc.sections as Array<{ type: string; widthMm?: number; shelfCount?: number; shelfPositions?: number[] }>) || [];
  // Use postCount (already calculated from centerPostCount or fallback)
  const verticalSectionCount = postCount + 1;
  const totalPostThickness = postCount * T;
  const sectionW = (innerW - totalPostThickness) / verticalSectionCount;

  // For wardrobe_carcass, sectionCount refers to VERTICAL sections (from center posts), not horizontal rows
  // Only use horizontalDividerYs or sections[].shelfCount for shelves, NOT sectionCount

  if (sections.length > 0) {
    let currentX = ox + T;
    const secH = H - T * 2 - skirtingH;
    const secY = oy + T;

    // Iterate through ALL sections from libraryConfig (not limited by unit.sectionCount)
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const secW = section.widthMm && section.widthMm > 0 ? section.widthMm * scaleX : sectionW;
      const shelfCount = section.shelfCount ?? 0;

      if (shelfCount > 0) {
        for (let j = 1; j <= shelfCount; j++) {
          const totalShelfThickness = shelfCount * T;
          const availableHeight = secH - totalShelfThickness;
          const spacing = availableHeight / (shelfCount + 1);
          const shelfY = secY + spacing * j + T * (j - 1);

          elements.push(
            <Rect key={`shelf-${i}-${j}`} x={currentX} y={shelfY} width={secW} height={T}
              fill={CARCASS_COLORS.shelf} stroke={strokeColor} strokeWidth={1} />
          );
        }
      }
      currentX += secW + T;
    }
  } else if (unit.horizontalDividerYs && unit.horizontalDividerYs.length > 0) {
    const sortedDividers = [...unit.horizontalDividerYs].sort((a, b) => a - b);
    for (let i = 0; i < sortedDividers.length; i++) {
      const dividerY = sortedDividers[i];
      elements.push(
        <Rect key={`shelf-row-${i}`} x={ox + T} y={dividerY - T / 2} width={innerW} height={T}
          fill={CARCASS_COLORS.shelf} stroke={strokeColor} strokeWidth={1} />
      );
    }
  }
  // NOTE: For wardrobe_carcass, horizontal shelves come ONLY from sections[].shelfCount
  // or horizontalDividerYs - NOT from sectionCount (which is vertical sections)

  return <>{elements}</>;
}

const ShutterUnit: React.FC<ShutterUnitProps> = ({ unit, isSelected, onClick, onResize }) => {
  const { box, shutterCount: rawShutterCount, sectionCount: rawSectionCount, loftEnabled, loftOnly, loftShutterCount: rawLoftShutterCount, loftHeightRatio, wardrobeConfig } = unit;

  // Check if this is a wardrobe_carcass - render carcass style (same as Design page)
  const isWardrobeCarcass = unit.unitType === "wardrobe_carcass";

  // Ensure we have valid counts (default to 1 if undefined or 0)
  const shutterCount = rawShutterCount || 1;
  const sectionCount = rawSectionCount || 1;
  const loftShutterCount = rawLoftShutterCount || 1;

  // Handle type from config or default to bar
  const handleType: HandleType = wardrobeConfig?.shutter?.handle || "bar";

  // Colors - same for all units (loft-only and regular)
  const frameColor = isSelected ? "#3b82f6" : "#4b5563";
  const doorColor = isSelected ? "#f1f5f9" : "#ffffff"; // White base for real shutter look
  const doorBorderColor = isSelected ? "#3b82f6" : "#4b5563"; // Light black border

  // For loft-only units, the entire box is the loft (no main section)
  // For regular units with loft, calculate loft height (default 20% of height)
  const loftHeight = loftOnly ? box.height : (loftEnabled ? box.height * (loftHeightRatio || 0.2) : 0);
  const mainHeight = loftOnly ? 0 : box.height - loftHeight;
  const mainY = box.y + loftHeight;

  // Gap between doors (in pixels)
  const doorGap = 3;
  const doorPadding = 4; // Padding from outer frame

  // Calculate shutter widths (accounting for gaps)
  const totalGapWidth = (shutterCount - 1) * doorGap + doorPadding * 2;
  const shutterWidth = (box.width - totalGapWidth) / shutterCount;

  // Calculate row heights
  const totalGapHeight = (sectionCount - 1) * doorGap + doorPadding * 2;
  const rowHeight = (mainHeight - totalGapHeight) / sectionCount;

  // Loft calculations
  const loftTotalGap = (loftShutterCount - 1) * doorGap + doorPadding * 2;
  const loftShutterWidth = (box.width - loftTotalGap) / loftShutterCount;
  const loftDoorHeight = loftHeight - doorPadding * 2;

  // Render vertical bar handle - alternating position based on door index
  const renderVerticalHandle = (doorX: number, doorY: number, doorWidth: number, doorHeight: number, doorIndex: number, totalShutters: number) => {
    const handleLength = Math.min(doorHeight * 0.35, 50); // 35% of door height, max 50px

    // Alternate handle position: even index = right side, odd index = left side
    // Special case: for 3 shutters, rightmost door (index 2) has handle on left
    const isLeftSide = doorIndex % 2 === 1 || (totalShutters === 3 && doorIndex === 2);
    const handleX = isLeftSide ? doorX + 10 : doorX + doorWidth - 10;
    const handleStartY = doorY + (doorHeight - handleLength) / 2;

    if (handleType === "none") return null;

    // Simple black vertical line for all handle types
    return (
      <Line
        points={[handleX, handleStartY, handleX, handleStartY + handleLength]}
        stroke="#1e293b"
        strokeWidth={2}
        lineCap="round"
      />
    );
  };

  // Render a single door panel (same color for loft and main)
  const renderDoorPanel = (x: number, y: number, width: number, height: number) => {
    return (
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={doorColor}
        stroke={doorBorderColor}
        strokeWidth={2}
        cornerRadius={3}
      />
    );
  };

  // For wardrobe_carcass, render carcass structure (same as Design page)
  if (isWardrobeCarcass) {
    return (
      <Group
        onClick={onClick}
        draggable
        onDragEnd={(e) => {
          if (onResize) {
            // Add drag delta to original box position
            const deltaX = e.target.x();
            const deltaY = e.target.y();
            onResize({ ...box, x: box.x + deltaX, y: box.y + deltaY });
            // Reset group position since box coordinates are absolute
            e.target.position({ x: 0, y: 0 });
          }
        }}
        x={0}
        y={0}
      >
        {renderCarcassContent(unit, isSelected)}

        {/* Selection highlight */}
        {isSelected && (
          <>
            <Rect
              x={box.x - 3}
              y={box.y - 3}
              width={box.width + 6}
              height={box.height + 6}
              stroke="#3b82f6"
              strokeWidth={1}
              dash={[6, 4]}
              fill="transparent"
              opacity={0.6}
            />
            {/* Corner resize handles */}
            {[
              { x: box.x, y: box.y, cursor: "nw-resize", anchor: "top-left" },
              { x: box.x + box.width, y: box.y, cursor: "ne-resize", anchor: "top-right" },
              { x: box.x, y: box.y + box.height, cursor: "sw-resize", anchor: "bottom-left" },
              { x: box.x + box.width, y: box.y + box.height, cursor: "se-resize", anchor: "bottom-right" },
            ].map((handle) => (
              <Circle
                key={handle.anchor}
                x={handle.x}
                y={handle.y}
                radius={4}
                fill="#3b82f6"
                stroke="#fff"
                strokeWidth={1}
                draggable
                onMouseEnter={(e) => {
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = handle.cursor;
                }}
                onMouseLeave={(e) => {
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = "default";
                }}
                onDragMove={(e) => {
                  if (!onResize) return;
                  const pos = e.target.position();
                  let newBox = { ...box };
                  if (handle.anchor === "top-left") {
                    newBox = { x: pos.x, y: pos.y, width: box.x + box.width - pos.x, height: box.y + box.height - pos.y };
                  } else if (handle.anchor === "top-right") {
                    newBox = { x: box.x, y: pos.y, width: pos.x - box.x, height: box.y + box.height - pos.y };
                  } else if (handle.anchor === "bottom-left") {
                    newBox = { x: pos.x, y: box.y, width: box.x + box.width - pos.x, height: pos.y - box.y };
                  } else if (handle.anchor === "bottom-right") {
                    newBox = { x: box.x, y: box.y, width: pos.x - box.x, height: pos.y - box.y };
                  }
                  if (newBox.width >= 40 && newBox.height >= 40) {
                    onResize(newBox);
                  }
                }}
                onDragEnd={(e) => {
                  e.target.position({ x: handle.x, y: handle.y });
                }}
              />
            ))}
          </>
        )}
      </Group>
    );
  }

  // Default shutter-style rendering for other unit types
  return (
    <Group
      onClick={onClick}
      draggable
      onDragEnd={(e) => {
        if (onResize) {
          // Add drag delta to original box position
          const deltaX = e.target.x();
          const deltaY = e.target.y();
          onResize({ ...box, x: box.x + deltaX, y: box.y + deltaY });
          // Reset group position since box coordinates are absolute
          e.target.position({ x: 0, y: 0 });
        }
      }}
      x={0}
      y={0}
    >
      {/* Outer Frame */}
      <Rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        fill="transparent"
        stroke={frameColor}
        strokeWidth={isSelected ? 3 : 2}
      />

      {/* Loft Section (if enabled or loft-only) */}
      {(loftEnabled || loftOnly) && loftHeight > 0 && (
        <>
          {/* Loft frame background */}
          <Rect
            x={box.x}
            y={box.y}
            width={box.width}
            height={loftHeight}
            fill="#f1f5f9"
            stroke={doorBorderColor}
            strokeWidth={isSelected ? 2 : 1.5}
          />

          {/* Loft door panels */}
          {Array.from({ length: loftShutterCount }).map((_, i) => {
            const doorX = box.x + doorPadding + i * (loftShutterWidth + doorGap);
            const doorY = box.y + doorPadding;
            return (
              <React.Fragment key={`loft-door-${i}`}>
                {renderDoorPanel(doorX, doorY, loftShutterWidth, loftDoorHeight)}
                {renderVerticalHandle(doorX, doorY, loftShutterWidth, loftDoorHeight, i, loftShutterCount)}
              </React.Fragment>
            );
          })}

          {/* Loft separator line - only show if there's a main section below */}
          {!loftOnly && (
            <Line
              points={[box.x, box.y + loftHeight, box.x + box.width, box.y + loftHeight]}
              stroke={doorBorderColor}
              strokeWidth={2}
            />
          )}
        </>
      )}

      {/* Main Unit Background - skip for loft-only */}
      {!loftOnly && mainHeight > 0 && (
        <Rect
          x={box.x}
          y={mainY}
          width={box.width}
          height={mainHeight}
          fill="#f1f5f9"
        />
      )}

      {/* Main door panels - grid of shutterCount x sectionCount - skip for loft-only */}
      {!loftOnly && mainHeight > 0 && Array.from({ length: shutterCount }).map((_, colIdx) => {
        const doorX = box.x + doorPadding + colIdx * (shutterWidth + doorGap);

        return Array.from({ length: sectionCount }).map((_, rowIdx) => {
          const doorY = mainY + doorPadding + rowIdx * (rowHeight + doorGap);

          return (
            <React.Fragment key={`door-${colIdx}-${rowIdx}`}>
              {renderDoorPanel(doorX, doorY, shutterWidth, rowHeight)}
              {renderVerticalHandle(doorX, doorY, shutterWidth, rowHeight, colIdx, shutterCount)}
            </React.Fragment>
          );
        });
      })}

      {/* Selection highlight and resize handles */}
      {isSelected && (
        <>
          {/* Dashed selection border */}
          <Rect
            x={box.x - 3}
            y={box.y - 3}
            width={box.width + 6}
            height={box.height + 6}
            stroke="#3b82f6"
            strokeWidth={1}
            dash={[6, 4]}
            fill="transparent"
            opacity={0.6}
          />

          {/* Corner resize handles */}
          {[
            { x: box.x, y: box.y, cursor: "nw-resize", anchor: "top-left" },
            { x: box.x + box.width, y: box.y, cursor: "ne-resize", anchor: "top-right" },
            { x: box.x, y: box.y + box.height, cursor: "sw-resize", anchor: "bottom-left" },
            { x: box.x + box.width, y: box.y + box.height, cursor: "se-resize", anchor: "bottom-right" },
          ].map((handle) => (
            <Circle
              key={handle.anchor}
              x={handle.x}
              y={handle.y}
              radius={4}
              fill="#3b82f6"
              stroke="#fff"
              strokeWidth={1}
              draggable
              onMouseEnter={(e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = handle.cursor;
              }}
              onMouseLeave={(e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = "default";
              }}
              onDragMove={(e) => {
                if (!onResize) return;
                const pos = e.target.position();
                let newBox = { ...box };

                if (handle.anchor === "top-left") {
                  newBox = {
                    x: pos.x,
                    y: pos.y,
                    width: box.x + box.width - pos.x,
                    height: box.y + box.height - pos.y,
                  };
                } else if (handle.anchor === "top-right") {
                  newBox = {
                    x: box.x,
                    y: pos.y,
                    width: pos.x - box.x,
                    height: box.y + box.height - pos.y,
                  };
                } else if (handle.anchor === "bottom-left") {
                  newBox = {
                    x: pos.x,
                    y: box.y,
                    width: box.x + box.width - pos.x,
                    height: pos.y - box.y,
                  };
                } else if (handle.anchor === "bottom-right") {
                  newBox = {
                    x: box.x,
                    y: box.y,
                    width: pos.x - box.x,
                    height: pos.y - box.y,
                  };
                }

                // Minimum size constraint
                if (newBox.width >= 40 && newBox.height >= 40) {
                  onResize(newBox);
                }
              }}
              onDragEnd={(e) => {
                // Reset handle position to corner after drag
                e.target.position({ x: handle.x, y: handle.y });
              }}
            />
          ))}

          {/* Edge resize handles (midpoints) */}
          {[
            { x: box.x + box.width / 2, y: box.y, cursor: "n-resize", anchor: "top" },
            { x: box.x + box.width / 2, y: box.y + box.height, cursor: "s-resize", anchor: "bottom" },
            { x: box.x, y: box.y + box.height / 2, cursor: "w-resize", anchor: "left" },
            { x: box.x + box.width, y: box.y + box.height / 2, cursor: "e-resize", anchor: "right" },
          ].map((handle) => (
            <Rect
              key={handle.anchor}
              x={handle.x - 3}
              y={handle.y - 3}
              width={6}
              height={6}
              fill="#3b82f6"
              stroke="#fff"
              strokeWidth={1}
              cornerRadius={1}
              draggable
              onMouseEnter={(e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = handle.cursor;
              }}
              onMouseLeave={(e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = "default";
              }}
              onDragMove={(e) => {
                if (!onResize) return;
                const pos = e.target.position();
                let newBox = { ...box };

                if (handle.anchor === "top") {
                  const newY = pos.y + 3;
                  newBox = { ...box, y: newY, height: box.y + box.height - newY };
                } else if (handle.anchor === "bottom") {
                  newBox = { ...box, height: pos.y + 3 - box.y };
                } else if (handle.anchor === "left") {
                  const newX = pos.x + 3;
                  newBox = { ...box, x: newX, width: box.x + box.width - newX };
                } else if (handle.anchor === "right") {
                  newBox = { ...box, width: pos.x + 3 - box.x };
                }

                // Minimum size constraint
                if (newBox.width >= 40 && newBox.height >= 40) {
                  onResize(newBox);
                }
              }}
              onDragEnd={(e) => {
                // Reset handle position after drag
                e.target.position({ x: handle.x - 3, y: handle.y - 3 });
              }}
            />
          ))}
        </>
      )}
    </Group>
  );
};

export default ShutterUnit;
