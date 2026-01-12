import React, { useRef, useState } from "react";
import { ThreeEvent } from "@react-three/fiber";
import { RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";
import { DrawnUnit, useVisualQuotationStore } from "../../store/visualQuotationStore";

// Unit type colors
const UNIT_TYPE_COLORS: Record<string, string> = {
  wardrobe: "#8B4513", // Brown wood
  kitchen: "#D2691E", // Chocolate
  tv_unit: "#4A4A4A", // Dark gray
  dresser: "#A0522D", // Sienna
  study_table: "#654321", // Dark brown
  shoe_rack: "#8B7355", // Tan
  book_shelf: "#6B4423", // Medium brown
  crockery_unit: "#CD853F", // Peru
  pooja_unit: "#DAA520", // Goldenrod
  vanity: "#F5DEB3", // Wheat
  bar_unit: "#2F1810", // Very dark brown
  display_unit: "#D2B48C", // Tan
  other: "#808080", // Gray
};

// Unit type labels
const UNIT_TYPE_LABELS: Record<string, string> = {
  wardrobe: "Wardrobe",
  kitchen: "Kitchen",
  tv_unit: "TV Unit",
  dresser: "Dresser",
  study_table: "Study Table",
  shoe_rack: "Shoe Rack",
  book_shelf: "Book Shelf",
  crockery_unit: "Crockery Unit",
  pooja_unit: "Pooja Unit",
  vanity: "Vanity",
  bar_unit: "Bar Unit",
  display_unit: "Display Unit",
  other: "Other",
};

interface Unit3DProps {
  unit: DrawnUnit;
  position: [number, number, number];
  size: [number, number, number]; // [width, height, depth]
  isActive: boolean;
  unitIndex: number;
}

// Single shutter door component
function ShutterDoor({
  position,
  size,
  color,
  handleSide = "right",
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  handleSide?: "left" | "right";
}) {
  const [hovered, setHovered] = useState(false);

  // Door frame (slightly inset from cabinet)
  const doorWidth = size[0] - 0.01;
  const doorHeight = size[1] - 0.01;
  const doorDepth = 0.02;

  // Handle position
  const handleX = handleSide === "right" ? doorWidth / 2 - 0.03 : -doorWidth / 2 + 0.03;
  const handleY = 0;

  return (
    <group position={position}>
      {/* Door panel */}
      <RoundedBox
        args={[doorWidth, doorHeight, doorDepth]}
        radius={0.005}
        smoothness={4}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={hovered ? "#e0e0e0" : color}
          roughness={0.3}
          metalness={0.1}
        />
      </RoundedBox>

      {/* Handle */}
      <mesh position={[handleX, handleY, doorDepth / 2 + 0.01]}>
        <cylinderGeometry args={[0.008, 0.008, 0.08]} />
        <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

// Loft section component
function LoftSection({
  position,
  size,
  shutterCount,
  color,
}: {
  position: [number, number, number];
  size: [number, number, number];
  shutterCount: number;
  color: string;
}) {
  const shutterWidth = size[0] / shutterCount;

  return (
    <group position={position}>
      {/* Loft carcass */}
      <RoundedBox args={size} radius={0.01} smoothness={4}>
        <meshStandardMaterial color="#666666" roughness={0.5} />
      </RoundedBox>

      {/* Loft shutters */}
      {Array.from({ length: shutterCount }).map((_, i) => {
        const shutterX = -size[0] / 2 + shutterWidth / 2 + i * shutterWidth;
        return (
          <ShutterDoor
            key={`loft-${i}`}
            position={[shutterX, 0, size[2] / 2 + 0.01]}
            size={[shutterWidth - 0.01, size[1] - 0.02, 0.02]}
            color="#a0a0a0"
            handleSide={i % 2 === 0 ? "right" : "left"}
          />
        );
      })}
    </group>
  );
}

const Unit3D: React.FC<Unit3DProps> = ({ unit, position, size, isActive, unitIndex }) => {
  const groupRef = useRef<THREE.Group>(null);
  const { setActiveUnitIndex, setActiveEditPart } = useVisualQuotationStore();

  const [width, height, depth] = size;
  const color: string = UNIT_TYPE_COLORS[unit.unitType] || UNIT_TYPE_COLORS.other || "#808080";
  const label = UNIT_TYPE_LABELS[unit.unitType] || unit.unitType;

  // Calculate shutters based on unit configuration
  const shutterCount = unit.shutterCount || 2;
  const rowCount = unit.sectionCount || 1;
  const shutterWidth = width / shutterCount;
  const shutterHeight = height / rowCount;

  // Handle click to select unit
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setActiveUnitIndex(unitIndex);
    setActiveEditPart("shutter");
  };

  return (
    <group ref={groupRef} position={position} onClick={handleClick}>
      {/* Main carcass (cabinet body) */}
      <RoundedBox
        args={[width, height, depth]}
        radius={0.01}
        smoothness={4}
      >
        <meshStandardMaterial
          color={isActive ? "#4a4a4a" : "#555555"}
          roughness={0.6}
          metalness={0.1}
        />
      </RoundedBox>

      {/* Selection highlight */}
      {isActive && (
        <mesh>
          <boxGeometry args={[width + 0.02, height + 0.02, depth + 0.02]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.2} />
        </mesh>
      )}

      {/* Shutter doors - grid layout */}
      {Array.from({ length: rowCount }).map((_, rowIdx) => {
        const rowY = height / 2 - shutterHeight / 2 - rowIdx * shutterHeight;

        return Array.from({ length: shutterCount }).map((_, colIdx) => {
          const shutterX = -width / 2 + shutterWidth / 2 + colIdx * shutterWidth;

          return (
            <ShutterDoor
              key={`shutter-${rowIdx}-${colIdx}`}
              position={[shutterX, rowY - height / 2 + shutterHeight / 2, depth / 2 + 0.01]}
              size={[shutterWidth - 0.01, shutterHeight - 0.01, 0.02]}
              color={color}
              handleSide={colIdx % 2 === 0 ? "right" : "left"}
            />
          );
        });
      })}

      {/* Loft section if enabled */}
      {unit.loftEnabled && unit.loftHeightMm > 0 && (
        <LoftSection
          position={[0, height / 2 + (unit.loftHeightMm / 1000) / 2 + 0.02, 0]}
          size={[width, unit.loftHeightMm / 1000, depth * 0.8]}
          shutterCount={unit.loftShutterCount || 3}
          color={color}
        />
      )}

      {/* Unit label */}
      <Text
        position={[0, -height / 2 - 0.1, depth / 2]}
        fontSize={0.08}
        color={isActive ? "#3b82f6" : "#333333"}
        anchorX="center"
        anchorY="top"
      >
        {`${label} ${unitIndex + 1}`}
      </Text>

      {/* Dimensions label */}
      {isActive && (
        <Text
          position={[0, height / 2 + 0.1, depth / 2]}
          fontSize={0.06}
          color="#666666"
          anchorX="center"
          anchorY="bottom"
        >
          {`${unit.widthMm || 0}mm x ${unit.heightMm || 0}mm`}
        </Text>
      )}
    </group>
  );
};

export default Unit3D;
