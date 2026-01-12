import React, { useMemo } from "react";
import { Group, Line, Rect, Text } from "react-konva";

// Isometric transformation constants
const ISO_ANGLE = 30; // degrees
const COS_30 = Math.cos((ISO_ANGLE * Math.PI) / 180);
const SIN_30 = Math.sin((ISO_ANGLE * Math.PI) / 180);

// Kitchen dimensions in mm (standard modular kitchen)
const STANDARD_BASE_HEIGHT_MM = 850; // 850mm base cabinet height
const STANDARD_WALL_HEIGHT_MM = 720; // 720mm wall cabinet height
const STANDARD_DEPTH_MM = 600; // 600mm depth
const BACKSPLASH_HEIGHT_MM = 600; // Gap between base and wall cabinets
const COUNTERTOP_THICKNESS_MM = 40;

// Colors for isometric kitchen
const COLORS = {
  baseFront: "#E8E8E8",
  baseSide: "#D0D0D0",
  baseTop: "#F5F5F5",
  wallFront: "#F0F0F0",
  wallSide: "#D8D8D8",
  wallTop: "#FFFFFF",
  countertop: "#4A4A4A",
  countertopSide: "#3A3A3A",
  handle: "#888888",
  border: "#666666",
  shutterBorder: "#444444",
};

export interface KitchenLayout {
  type: "STRAIGHT" | "L_SHAPE" | "U_SHAPE" | "ISLAND";
  totalWidthMm: number;
  baseUnits: KitchenUnit[];
  wallUnits: KitchenUnit[];
  // For L-shape and U-shape layouts
  returnBaseUnits?: KitchenUnit[]; // Units on the return/perpendicular run
  returnWallUnits?: KitchenUnit[];
  returnWidthMm?: number; // Length of the return run
  // For U-shape - second return
  secondReturnBaseUnits?: KitchenUnit[];
  secondReturnWallUnits?: KitchenUnit[];
  secondReturnWidthMm?: number;
}

export interface KitchenUnit {
  id: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  shutterCount: number;
  hasDrawers?: boolean;
  drawerCount?: number;
  appliance?: "SINK" | "HOB" | "CHIMNEY" | "OVEN" | "DISHWASHER" | null;
  position: number; // Position along the run (in mm from start)
}

// Convert 3D point to 2D isometric projection
function toIsometric(x: number, y: number, z: number): { x: number; y: number } {
  return {
    x: (x - z) * COS_30,
    y: (x + z) * SIN_30 - y,
  };
}

// Default scale factor for rendering (mm to pixels)
const DEFAULT_SCALE = 0.15;

interface IsometricCabinetProps {
  x: number; // Position X in mm
  y: number; // Position Y (height from floor) in mm
  z: number; // Position Z (depth) in mm
  width: number; // Width in mm
  height: number; // Height in mm
  depth: number; // Depth in mm
  shutterCount: number;
  hasDrawers?: boolean;
  drawerCount?: number;
  frontColor: string;
  sideColor: string;
  topColor: string;
  label?: string;
  onClick?: () => void;
  scale?: number;
}

// Render a single isometric cabinet
const IsometricCabinet: React.FC<IsometricCabinetProps> = ({
  x,
  y,
  z,
  width,
  height,
  depth,
  shutterCount,
  hasDrawers,
  drawerCount = 0,
  frontColor,
  sideColor,
  topColor,
  label,
  onClick,
  scale = DEFAULT_SCALE,
}) => {
  // Calculate all 8 corners of the box
  const corners = useMemo(() => {
    const w = width * scale;
    const h = height * scale;
    const d = depth * scale;
    const px = x * scale;
    const py = y * scale;
    const pz = z * scale;

    return {
      // Front face corners
      frontBottomLeft: toIsometric(px, py, pz),
      frontBottomRight: toIsometric(px + w, py, pz),
      frontTopLeft: toIsometric(px, py + h, pz),
      frontTopRight: toIsometric(px + w, py + h, pz),
      // Back face corners
      backBottomLeft: toIsometric(px, py, pz + d),
      backBottomRight: toIsometric(px + w, py, pz + d),
      backTopLeft: toIsometric(px, py + h, pz + d),
      backTopRight: toIsometric(px + w, py + h, pz + d),
    };
  }, [x, y, z, width, height, depth, scale]);

  // Calculate shutter divider positions
  const shutterDividers = useMemo(() => {
    if (shutterCount <= 1) return [];
    const dividers = [];
    const shutterWidth = width / shutterCount;
    for (let i = 1; i < shutterCount; i++) {
      const divX = x + shutterWidth * i;
      dividers.push({
        bottom: toIsometric(divX * scale, y * scale, z * scale),
        top: toIsometric(divX * scale, (y + height) * scale, z * scale),
      });
    }
    return dividers;
  }, [x, y, z, width, height, shutterCount, scale]);

  // Calculate drawer positions
  const drawerLines = useMemo(() => {
    if (!hasDrawers || drawerCount <= 0) return [];
    const lines = [];
    const drawerHeight = height / (drawerCount + 1); // +1 for bottom section
    for (let i = 1; i <= drawerCount; i++) {
      const lineY = y + drawerHeight * i;
      lines.push({
        left: toIsometric(x * scale, lineY * scale, z * scale),
        right: toIsometric((x + width) * scale, lineY * scale, z * scale),
      });
    }
    return lines;
  }, [x, y, width, height, hasDrawers, drawerCount, scale]);

  // Handle positions (center of each shutter)
  const handles = useMemo(() => {
    const handlePositions = [];
    const shutterWidth = width / shutterCount;
    const handleY = y + height * 0.85; // 85% up from bottom
    for (let i = 0; i < shutterCount; i++) {
      const handleX = x + shutterWidth * (i + 0.5);
      handlePositions.push(toIsometric(handleX * scale, handleY * scale, z * scale));
    }
    return handlePositions;
  }, [x, y, z, width, height, shutterCount, scale]);

  return (
    <Group onClick={onClick}>
      {/* Top face */}
      <Line
        points={[
          corners.frontTopLeft.x,
          corners.frontTopLeft.y,
          corners.frontTopRight.x,
          corners.frontTopRight.y,
          corners.backTopRight.x,
          corners.backTopRight.y,
          corners.backTopLeft.x,
          corners.backTopLeft.y,
        ]}
        closed
        fill={topColor}
        stroke={COLORS.border}
        strokeWidth={1}
      />

      {/* Right side face */}
      <Line
        points={[
          corners.frontTopRight.x,
          corners.frontTopRight.y,
          corners.frontBottomRight.x,
          corners.frontBottomRight.y,
          corners.backBottomRight.x,
          corners.backBottomRight.y,
          corners.backTopRight.x,
          corners.backTopRight.y,
        ]}
        closed
        fill={sideColor}
        stroke={COLORS.border}
        strokeWidth={1}
      />

      {/* Front face */}
      <Line
        points={[
          corners.frontTopLeft.x,
          corners.frontTopLeft.y,
          corners.frontTopRight.x,
          corners.frontTopRight.y,
          corners.frontBottomRight.x,
          corners.frontBottomRight.y,
          corners.frontBottomLeft.x,
          corners.frontBottomLeft.y,
        ]}
        closed
        fill={frontColor}
        stroke={COLORS.border}
        strokeWidth={1}
      />

      {/* Shutter divider lines */}
      {shutterDividers.map((divider, idx) => (
        <Line
          key={`divider-${idx}`}
          points={[divider.bottom.x, divider.bottom.y, divider.top.x, divider.top.y]}
          stroke={COLORS.shutterBorder}
          strokeWidth={2}
        />
      ))}

      {/* Drawer lines */}
      {drawerLines.map((line, idx) => (
        <Line
          key={`drawer-${idx}`}
          points={[line.left.x, line.left.y, line.right.x, line.right.y]}
          stroke={COLORS.shutterBorder}
          strokeWidth={1.5}
        />
      ))}

      {/* Handles */}
      {handles.map((handle, idx) => (
        <Rect
          key={`handle-${idx}`}
          x={handle.x - 2}
          y={handle.y - 8}
          width={4}
          height={16}
          fill={COLORS.handle}
          cornerRadius={2}
        />
      ))}

      {/* Label */}
      {label && (
        <Text
          x={corners.frontTopLeft.x + 5}
          y={corners.frontTopLeft.y + 5}
          text={label}
          fontSize={10}
          fill="#333"
        />
      )}
    </Group>
  );
};

// Countertop component
interface CountertopProps {
  x: number;
  y: number;
  z: number;
  width: number;
  depth: number;
  thickness?: number;
  scale?: number;
}

const IsometricCountertop: React.FC<CountertopProps> = ({
  x,
  y,
  z,
  width,
  depth,
  thickness = COUNTERTOP_THICKNESS_MM,
  scale = DEFAULT_SCALE,
}) => {
  const corners = useMemo(() => {
    const w = width * scale;
    const h = thickness * scale;
    const d = (depth + 20) * scale; // Slight overhang
    const px = (x - 10) * scale; // Overhang on sides
    const py = y * scale;
    const pz = (z - 10) * scale;

    return {
      frontBottomLeft: toIsometric(px, py, pz),
      frontBottomRight: toIsometric(px + w + 20 * scale, py, pz),
      frontTopLeft: toIsometric(px, py + h, pz),
      frontTopRight: toIsometric(px + w + 20 * scale, py + h, pz),
      backBottomLeft: toIsometric(px, py, pz + d),
      backBottomRight: toIsometric(px + w + 20 * scale, py, pz + d),
      backTopLeft: toIsometric(px, py + h, pz + d),
      backTopRight: toIsometric(px + w + 20 * scale, py + h, pz + d),
    };
  }, [x, y, z, width, depth, thickness, scale]);

  return (
    <Group>
      {/* Top face */}
      <Line
        points={[
          corners.frontTopLeft.x,
          corners.frontTopLeft.y,
          corners.frontTopRight.x,
          corners.frontTopRight.y,
          corners.backTopRight.x,
          corners.backTopRight.y,
          corners.backTopLeft.x,
          corners.backTopLeft.y,
        ]}
        closed
        fill={COLORS.countertop}
        stroke="#333"
        strokeWidth={1}
      />

      {/* Front face */}
      <Line
        points={[
          corners.frontTopLeft.x,
          corners.frontTopLeft.y,
          corners.frontTopRight.x,
          corners.frontTopRight.y,
          corners.frontBottomRight.x,
          corners.frontBottomRight.y,
          corners.frontBottomLeft.x,
          corners.frontBottomLeft.y,
        ]}
        closed
        fill={COLORS.countertopSide}
        stroke="#333"
        strokeWidth={1}
      />

      {/* Right side face */}
      <Line
        points={[
          corners.frontTopRight.x,
          corners.frontTopRight.y,
          corners.frontBottomRight.x,
          corners.frontBottomRight.y,
          corners.backBottomRight.x,
          corners.backBottomRight.y,
          corners.backTopRight.x,
          corners.backTopRight.y,
        ]}
        closed
        fill={COLORS.countertopSide}
        stroke="#333"
        strokeWidth={1}
      />
    </Group>
  );
};

export interface IsometricKitchenProps {
  layout: KitchenLayout;
  offsetX?: number;
  offsetY?: number;
  scale?: number;
  onUnitClick?: (unitId: string, type: "base" | "wall") => void;
}

const IsometricKitchen: React.FC<IsometricKitchenProps> = ({
  layout,
  offsetX = 400,
  offsetY = 400,
  scale = DEFAULT_SCALE,
  onUnitClick,
}) => {
  return (
    <Group x={offsetX} y={offsetY}>
      {/* ===== MAIN RUN (along X-axis) ===== */}
      {/* Render base cabinets */}
      {layout.baseUnits.map((unit) => (
        <IsometricCabinet
          key={`base-${unit.id}`}
          x={unit.position}
          y={0}
          z={0}
          width={unit.widthMm}
          height={unit.heightMm}
          depth={unit.depthMm}
          shutterCount={unit.shutterCount}
          hasDrawers={unit.hasDrawers}
          drawerCount={unit.drawerCount}
          frontColor={COLORS.baseFront}
          sideColor={COLORS.baseSide}
          topColor={COLORS.baseTop}
          label={`B${unit.id}`}
          onClick={() => onUnitClick?.(unit.id, "base")}
          scale={scale}
        />
      ))}

      {/* Render countertop */}
      {layout.baseUnits.length > 0 && (
        <IsometricCountertop
          x={0}
          y={STANDARD_BASE_HEIGHT_MM}
          z={0}
          width={layout.totalWidthMm}
          depth={STANDARD_DEPTH_MM}
          scale={scale}
        />
      )}

      {/* Render wall cabinets */}
      {layout.wallUnits.map((unit) => (
        <IsometricCabinet
          key={`wall-${unit.id}`}
          x={unit.position}
          y={STANDARD_BASE_HEIGHT_MM + COUNTERTOP_THICKNESS_MM + BACKSPLASH_HEIGHT_MM}
          z={0}
          width={unit.widthMm}
          height={unit.heightMm}
          depth={unit.depthMm}
          shutterCount={unit.shutterCount}
          frontColor={COLORS.wallFront}
          sideColor={COLORS.wallSide}
          topColor={COLORS.wallTop}
          label={`W${unit.id}`}
          onClick={() => onUnitClick?.(unit.id, "wall")}
          scale={scale}
        />
      ))}

      {/* ===== L-SHAPE RETURN RUN (along Z-axis, perpendicular) ===== */}
      {(layout.type === "L_SHAPE" || layout.type === "U_SHAPE") && layout.returnBaseUnits && (
        <>
          {/* Return base cabinets - positioned along Z-axis from the end of main run */}
          {layout.returnBaseUnits.map((unit) => (
            <IsometricCabinet
              key={`return-base-${unit.id}`}
              x={layout.totalWidthMm} // Start at end of main run
              y={0}
              z={unit.position + STANDARD_DEPTH_MM} // Offset by main run depth
              width={unit.depthMm} // Swap width/depth for perpendicular orientation
              height={unit.heightMm}
              depth={unit.widthMm}
              shutterCount={unit.shutterCount}
              hasDrawers={unit.hasDrawers}
              drawerCount={unit.drawerCount}
              frontColor={COLORS.baseFront}
              sideColor={COLORS.baseSide}
              topColor={COLORS.baseTop}
              label={`RB${unit.id}`}
              onClick={() => onUnitClick?.(unit.id, "base")}
              scale={scale}
            />
          ))}

          {/* Return countertop */}
          {layout.returnWidthMm && layout.returnWidthMm > 0 && (
            <IsometricCountertop
              x={layout.totalWidthMm - STANDARD_DEPTH_MM}
              y={STANDARD_BASE_HEIGHT_MM}
              z={STANDARD_DEPTH_MM}
              width={STANDARD_DEPTH_MM}
              depth={layout.returnWidthMm}
              scale={scale}
            />
          )}

          {/* Return wall cabinets */}
          {layout.returnWallUnits?.map((unit) => (
            <IsometricCabinet
              key={`return-wall-${unit.id}`}
              x={layout.totalWidthMm}
              y={STANDARD_BASE_HEIGHT_MM + COUNTERTOP_THICKNESS_MM + BACKSPLASH_HEIGHT_MM}
              z={unit.position + STANDARD_DEPTH_MM}
              width={unit.depthMm}
              height={unit.heightMm}
              depth={unit.widthMm}
              shutterCount={unit.shutterCount}
              frontColor={COLORS.wallFront}
              sideColor={COLORS.wallSide}
              topColor={COLORS.wallTop}
              label={`RW${unit.id}`}
              onClick={() => onUnitClick?.(unit.id, "wall")}
              scale={scale}
            />
          ))}
        </>
      )}

      {/* ===== U-SHAPE SECOND RETURN RUN (opposite side) ===== */}
      {layout.type === "U_SHAPE" && layout.secondReturnBaseUnits && (
        <>
          {/* Second return base cabinets - positioned at start of main run */}
          {layout.secondReturnBaseUnits.map((unit) => (
            <IsometricCabinet
              key={`return2-base-${unit.id}`}
              x={-STANDARD_DEPTH_MM} // Start before main run
              y={0}
              z={unit.position + STANDARD_DEPTH_MM}
              width={unit.depthMm}
              height={unit.heightMm}
              depth={unit.widthMm}
              shutterCount={unit.shutterCount}
              hasDrawers={unit.hasDrawers}
              drawerCount={unit.drawerCount}
              frontColor={COLORS.baseFront}
              sideColor={COLORS.baseSide}
              topColor={COLORS.baseTop}
              label={`R2B${unit.id}`}
              onClick={() => onUnitClick?.(unit.id, "base")}
              scale={scale}
            />
          ))}

          {/* Second return countertop */}
          {layout.secondReturnWidthMm && layout.secondReturnWidthMm > 0 && (
            <IsometricCountertop
              x={-STANDARD_DEPTH_MM}
              y={STANDARD_BASE_HEIGHT_MM}
              z={STANDARD_DEPTH_MM}
              width={STANDARD_DEPTH_MM}
              depth={layout.secondReturnWidthMm}
              scale={scale}
            />
          )}

          {/* Second return wall cabinets */}
          {layout.secondReturnWallUnits?.map((unit) => (
            <IsometricCabinet
              key={`return2-wall-${unit.id}`}
              x={-STANDARD_DEPTH_MM}
              y={STANDARD_BASE_HEIGHT_MM + COUNTERTOP_THICKNESS_MM + BACKSPLASH_HEIGHT_MM}
              z={unit.position + STANDARD_DEPTH_MM}
              width={unit.depthMm}
              height={unit.heightMm}
              depth={unit.widthMm}
              shutterCount={unit.shutterCount}
              frontColor={COLORS.wallFront}
              sideColor={COLORS.wallSide}
              topColor={COLORS.wallTop}
              label={`R2W${unit.id}`}
              onClick={() => onUnitClick?.(unit.id, "wall")}
              scale={scale}
            />
          ))}
        </>
      )}
    </Group>
  );
};

export default IsometricKitchen;

// Helper to create a default straight kitchen layout
export function createDefaultKitchenLayout(totalWidthMm: number): KitchenLayout {
  // Create base units (600mm each is standard)
  const unitWidth = 600;
  const unitCount = Math.max(1, Math.floor(totalWidthMm / unitWidth));
  const actualWidth = unitCount * unitWidth;

  const baseUnits: KitchenUnit[] = [];
  const wallUnits: KitchenUnit[] = [];

  for (let i = 0; i < unitCount; i++) {
    baseUnits.push({
      id: `${i + 1}`,
      widthMm: unitWidth,
      heightMm: STANDARD_BASE_HEIGHT_MM,
      depthMm: STANDARD_DEPTH_MM,
      shutterCount: i === 0 ? 2 : 1, // First unit has 2 shutters (under sink)
      hasDrawers: i === unitCount - 1, // Last unit has drawers
      drawerCount: i === unitCount - 1 ? 3 : 0,
      appliance: i === 0 ? "SINK" : i === 1 ? "HOB" : null,
      position: i * unitWidth,
    });

    wallUnits.push({
      id: `${i + 1}`,
      widthMm: unitWidth,
      heightMm: STANDARD_WALL_HEIGHT_MM,
      depthMm: 350, // Wall cabinets are shallower
      shutterCount: 1,
      position: i * unitWidth,
    });
  }

  return {
    type: "STRAIGHT",
    totalWidthMm: actualWidth,
    baseUnits,
    wallUnits,
  };
}

// Helper to create an L-shape kitchen layout
export function createLShapeKitchenLayout(
  mainWidthMm: number,
  returnWidthMm: number
): KitchenLayout {
  const unitWidth = 600;

  // Main run units
  const mainUnitCount = Math.max(1, Math.floor(mainWidthMm / unitWidth));
  const actualMainWidth = mainUnitCount * unitWidth;

  const baseUnits: KitchenUnit[] = [];
  const wallUnits: KitchenUnit[] = [];

  for (let i = 0; i < mainUnitCount; i++) {
    baseUnits.push({
      id: `M${i + 1}`,
      widthMm: unitWidth,
      heightMm: STANDARD_BASE_HEIGHT_MM,
      depthMm: STANDARD_DEPTH_MM,
      shutterCount: i === 0 ? 2 : 1,
      hasDrawers: false,
      drawerCount: 0,
      appliance: i === 0 ? "SINK" : i === 1 ? "HOB" : null,
      position: i * unitWidth,
    });

    wallUnits.push({
      id: `M${i + 1}`,
      widthMm: unitWidth,
      heightMm: STANDARD_WALL_HEIGHT_MM,
      depthMm: 350,
      shutterCount: 1,
      position: i * unitWidth,
    });
  }

  // Return run units
  const returnUnitCount = Math.max(1, Math.floor(returnWidthMm / unitWidth));
  const actualReturnWidth = returnUnitCount * unitWidth;

  const returnBaseUnits: KitchenUnit[] = [];
  const returnWallUnits: KitchenUnit[] = [];

  for (let i = 0; i < returnUnitCount; i++) {
    returnBaseUnits.push({
      id: `R${i + 1}`,
      widthMm: unitWidth,
      heightMm: STANDARD_BASE_HEIGHT_MM,
      depthMm: STANDARD_DEPTH_MM,
      shutterCount: 1,
      hasDrawers: i === returnUnitCount - 1,
      drawerCount: i === returnUnitCount - 1 ? 3 : 0,
      appliance: null,
      position: i * unitWidth,
    });

    returnWallUnits.push({
      id: `R${i + 1}`,
      widthMm: unitWidth,
      heightMm: STANDARD_WALL_HEIGHT_MM,
      depthMm: 350,
      shutterCount: 1,
      position: i * unitWidth,
    });
  }

  return {
    type: "L_SHAPE",
    totalWidthMm: actualMainWidth,
    baseUnits,
    wallUnits,
    returnBaseUnits,
    returnWallUnits,
    returnWidthMm: actualReturnWidth,
  };
}

// Helper to create a U-shape kitchen layout
export function createUShapeKitchenLayout(
  mainWidthMm: number,
  returnWidthMm: number,
  secondReturnWidthMm: number
): KitchenLayout {
  const unitWidth = 600;

  // Main run units
  const mainUnitCount = Math.max(1, Math.floor(mainWidthMm / unitWidth));
  const actualMainWidth = mainUnitCount * unitWidth;

  const baseUnits: KitchenUnit[] = [];
  const wallUnits: KitchenUnit[] = [];

  for (let i = 0; i < mainUnitCount; i++) {
    baseUnits.push({
      id: `M${i + 1}`,
      widthMm: unitWidth,
      heightMm: STANDARD_BASE_HEIGHT_MM,
      depthMm: STANDARD_DEPTH_MM,
      shutterCount: i === Math.floor(mainUnitCount / 2) ? 2 : 1, // Center unit has sink
      hasDrawers: false,
      drawerCount: 0,
      appliance: i === Math.floor(mainUnitCount / 2) ? "SINK" : null,
      position: i * unitWidth,
    });

    wallUnits.push({
      id: `M${i + 1}`,
      widthMm: unitWidth,
      heightMm: STANDARD_WALL_HEIGHT_MM,
      depthMm: 350,
      shutterCount: 1,
      position: i * unitWidth,
    });
  }

  // First return run (right side)
  const returnUnitCount = Math.max(1, Math.floor(returnWidthMm / unitWidth));
  const actualReturnWidth = returnUnitCount * unitWidth;

  const returnBaseUnits: KitchenUnit[] = [];
  const returnWallUnits: KitchenUnit[] = [];

  for (let i = 0; i < returnUnitCount; i++) {
    returnBaseUnits.push({
      id: `R${i + 1}`,
      widthMm: unitWidth,
      heightMm: STANDARD_BASE_HEIGHT_MM,
      depthMm: STANDARD_DEPTH_MM,
      shutterCount: 1,
      hasDrawers: i === returnUnitCount - 1,
      drawerCount: i === returnUnitCount - 1 ? 3 : 0,
      appliance: i === 0 ? "HOB" : null,
      position: i * unitWidth,
    });

    returnWallUnits.push({
      id: `R${i + 1}`,
      widthMm: unitWidth,
      heightMm: STANDARD_WALL_HEIGHT_MM,
      depthMm: 350,
      shutterCount: 1,
      position: i * unitWidth,
    });
  }

  // Second return run (left side)
  const secondReturnUnitCount = Math.max(1, Math.floor(secondReturnWidthMm / unitWidth));
  const actualSecondReturnWidth = secondReturnUnitCount * unitWidth;

  const secondReturnBaseUnits: KitchenUnit[] = [];
  const secondReturnWallUnits: KitchenUnit[] = [];

  for (let i = 0; i < secondReturnUnitCount; i++) {
    secondReturnBaseUnits.push({
      id: `L${i + 1}`,
      widthMm: unitWidth,
      heightMm: STANDARD_BASE_HEIGHT_MM,
      depthMm: STANDARD_DEPTH_MM,
      shutterCount: 1,
      hasDrawers: i === secondReturnUnitCount - 1,
      drawerCount: i === secondReturnUnitCount - 1 ? 3 : 0,
      appliance: null,
      position: i * unitWidth,
    });

    secondReturnWallUnits.push({
      id: `L${i + 1}`,
      widthMm: unitWidth,
      heightMm: STANDARD_WALL_HEIGHT_MM,
      depthMm: 350,
      shutterCount: 1,
      position: i * unitWidth,
    });
  }

  return {
    type: "U_SHAPE",
    totalWidthMm: actualMainWidth,
    baseUnits,
    wallUnits,
    returnBaseUnits,
    returnWallUnits,
    returnWidthMm: actualReturnWidth,
    secondReturnBaseUnits,
    secondReturnWallUnits,
    secondReturnWidthMm: actualSecondReturnWidth,
  };
}
