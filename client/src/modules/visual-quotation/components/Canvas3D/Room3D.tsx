import React, { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, OrthographicCamera, Grid } from "@react-three/drei";
import * as THREE from "three";
import { useVisualQuotationStore, DrawnUnit } from "../../store/visualQuotationStore";
import Unit3D from "./Unit3D";

// Room dimensions in meters (for 3D scale)
const ROOM_WIDTH = 5; // 5 meters wide
const ROOM_HEIGHT = 3; // 3 meters tall (ceiling height)
const ROOM_DEPTH = 4; // 4 meters deep

// Fallback lighting (replaces external HDR Environment to avoid network failures)
function FallbackLighting() {
  return (
    <>
      <hemisphereLight args={["#87CEEB", "#f5f5f5", 0.6]} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} />
    </>
  );
}

// Safe Environment wrapper - uses fallback lighting to avoid network dependency
// The Environment presets require external CDN which can fail offline
function SafeEnvironment() {
  // Use fallback lighting instead of external HDR to avoid network failures
  return <FallbackLighting />;
}

// Wall component
function Wall({
  position,
  rotation,
  size,
  color = "#f5f5f5",
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  size: [number, number];
  color?: string;
}) {
  return (
    <mesh position={position} rotation={rotation || [0, 0, 0]}>
      <planeGeometry args={size} />
      <meshStandardMaterial color={color} side={THREE.DoubleSide} />
    </mesh>
  );
}

// Floor component with grid pattern
function Floor({ width, depth }: { width: number; depth: number }) {
  return (
    <group>
      {/* Main floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#e8e8e8" />
      </mesh>
      {/* Grid overlay */}
      <Grid
        position={[0, 0.01, 0]}
        args={[width, depth]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#cccccc"
        sectionSize={1}
        sectionThickness={1}
        sectionColor="#999999"
        fadeDistance={25}
        fadeStrength={1}
      />
    </group>
  );
}

// Edge tube - renders a dark line as a thin cylinder between two points
function EdgeTube({ start, end, color = "#1a1a1a", radius = 0.015 }: {
  start: [number, number, number];
  end: [number, number, number];
  color?: string;
  radius?: number;
}) {
  const { position, rotation, length } = useMemo(() => {
    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);

    // Calculate midpoint for position
    const midpoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);

    // Calculate length
    const len = startVec.distanceTo(endVec);

    // Calculate rotation to align cylinder with line direction
    const direction = new THREE.Vector3().subVectors(endVec, startVec).normalize();
    const quaternion = new THREE.Quaternion();
    // Default cylinder is along Y axis, so we rotate from Y to our direction
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);

    return {
      position: [midpoint.x, midpoint.y, midpoint.z] as [number, number, number],
      rotation: [euler.x, euler.y, euler.z] as [number, number, number],
      length: len,
    };
  }, [start, end]);

  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[radius, radius, length, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

// Room edge lines - dark lines for all corners and edges using tubes
// Perspective mode: 3 walls (back, left, right) | Isometric mode: 2 walls (back, left)
function RoomEdges({ viewMode }: { viewMode: Room3DViewMode }) {
  const w = ROOM_WIDTH / 2;
  const h = ROOM_HEIGHT;
  const d = ROOM_DEPTH / 2;
  const edgeColor = "#000000"; // Pure black
  const edgeRadius = 0.025; // Tube thickness

  // Define edges based on view mode
  const edges = useMemo(() => {
    const baseEdges: Array<{ start: [number, number, number]; end: [number, number, number] }> = [
      // Floor edges - back and left (always visible)
      { start: [-w, 0, -d], end: [w, 0, -d] },   // Back
      { start: [-w, 0, -d], end: [-w, 0, d] },   // Left

      // Ceiling edges - back and left (always visible)
      { start: [-w, h, -d], end: [w, h, -d] },   // Back
      { start: [-w, h, -d], end: [-w, h, d] },   // Left

      // Vertical edges - back-left and back-right corners (always visible)
      { start: [-w, 0, -d], end: [-w, h, -d] },  // Back-left corner
      { start: [w, 0, -d], end: [w, h, -d] },    // Back-right corner
    ];

    // Add right wall edges only in perspective mode
    if (viewMode === "perspective") {
      baseEdges.push(
        { start: [w, 0, -d], end: [w, 0, d] },   // Right floor edge
        { start: [w, h, -d], end: [w, h, d] },   // Right ceiling edge
      );
    }

    return baseEdges;
  }, [w, h, d, viewMode]);

  return (
    <group>
      {edges.map((edge, index) => (
        <EdgeTube
          key={index}
          start={edge.start}
          end={edge.end}
          color={edgeColor}
          radius={edgeRadius}
        />
      ))}
    </group>
  );
}

// Room shell - walls and floor
// Perspective mode: 3 walls (back, left, right) | Isometric mode: 2 walls (back, left)
function RoomShell({ viewMode }: { viewMode: Room3DViewMode }) {
  const wallColor = "#fafafa";
  const backWallColor = "#f0f0f0";

  return (
    <group>
      {/* Floor */}
      <Floor width={ROOM_WIDTH} depth={ROOM_DEPTH} />

      {/* Back wall (where units are placed) */}
      <Wall
        position={[0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2]}
        size={[ROOM_WIDTH, ROOM_HEIGHT]}
        color={backWallColor}
      />

      {/* Left wall */}
      <Wall
        position={[-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        size={[ROOM_DEPTH, ROOM_HEIGHT]}
        color={wallColor}
      />

      {/* Right wall - only in perspective mode */}
      {viewMode === "perspective" && (
        <Wall
          position={[ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0]}
          rotation={[0, -Math.PI / 2, 0]}
          size={[ROOM_DEPTH, ROOM_HEIGHT]}
          color={wallColor}
        />
      )}

      {/* Room edge lines */}
      <RoomEdges viewMode={viewMode} />
    </group>
  );
}

// Convert 2D canvas units to 3D room coordinates
function convertToRoom3D(
  unit: DrawnUnit,
  canvasWidth: number,
  canvasHeight: number
): { position: [number, number, number]; size: [number, number, number] } {
  // Map canvas pixels to room meters
  // Assume the back wall represents the full canvas width
  const scaleX = ROOM_WIDTH / canvasWidth;
  const scaleY = ROOM_HEIGHT / canvasHeight;

  // Unit dimensions in meters
  const unitWidth = unit.box.width * scaleX;
  const unitHeight = unit.box.height * scaleY;
  const unitDepth = (unit.depthMm || 600) / 1000; // Convert mm to meters, default 600mm

  // Position: center of the unit
  // X: map from canvas left-to-right to room left-to-right
  const centerX = (unit.box.x + unit.box.width / 2) * scaleX - ROOM_WIDTH / 2;
  // Y: map from canvas top-to-bottom to room bottom-to-top
  const centerY = ROOM_HEIGHT - (unit.box.y + unit.box.height / 2) * scaleY;
  // Z: place against back wall
  const centerZ = -ROOM_DEPTH / 2 + unitDepth / 2;

  return {
    position: [centerX, centerY, centerZ],
    size: [unitWidth, unitHeight, unitDepth],
  };
}

// Main 3D Scene
function Scene({ canvasWidth, canvasHeight, viewMode }: { canvasWidth: number; canvasHeight: number; viewMode: Room3DViewMode }) {
  const { drawnUnits, activeUnitIndex } = useVisualQuotationStore();

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-5, 5, 5]} intensity={0.3} />

      {/* Room structure */}
      <RoomShell viewMode={viewMode} />

      {/* Render all units */}
      {drawnUnits.map((unit, index) => {
        const { position, size } = convertToRoom3D(unit, canvasWidth, canvasHeight);
        const isActive = index === activeUnitIndex;

        return (
          <Unit3D
            key={unit.id}
            unit={unit}
            position={position}
            size={size}
            isActive={isActive}
            unitIndex={index}
          />
        );
      })}
    </>
  );
}

// View mode type - exported for parent component use
export type Room3DViewMode = "isometric" | "perspective";

// Isometric camera settings - lower zoom to show full room
const ISOMETRIC_ZOOM = 80;
const ISOMETRIC_POSITION: [number, number, number] = [8, 8, 8];

// Main Room3D component
interface Room3DProps {
  canvasWidth: number;
  canvasHeight: number;
  viewMode?: Room3DViewMode;
  zoomLevel?: number; // Zoom percentage (50-200)
}

const Room3D: React.FC<Room3DProps> = ({ canvasWidth, canvasHeight, viewMode = "perspective", zoomLevel = 100 }) => {
  // Calculate zoom factor from percentage (100% = 1.0)
  const zoomFactor = zoomLevel / 100;

  // Apply zoom to camera settings
  const isoZoom = ISOMETRIC_ZOOM * zoomFactor;
  const perspectiveFov = 60 / zoomFactor; // Lower FOV = more zoomed in

  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-800 to-slate-900">
      {/* 3D Canvas - key forces remount when view changes to avoid OrbitControls camera reference issues */}
      <Canvas key={`${viewMode}-${zoomLevel}`} shadows className="!bg-transparent">
        {viewMode === "isometric" ? (
          <OrthographicCamera
            makeDefault
            zoom={isoZoom}
            position={ISOMETRIC_POSITION}
            near={0.1}
            far={1000}
          />
        ) : (
          <PerspectiveCamera
            makeDefault
            position={[0, 2, 4]}
            fov={perspectiveFov}
          />
        )}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={2}
          maxDistance={15}
          maxPolarAngle={Math.PI / 2 - 0.1}
          target={viewMode === "isometric" ? [0, 1, 0] : [0, 1.2, -1]}
        />
        <Scene canvasWidth={canvasWidth} canvasHeight={canvasHeight} viewMode={viewMode} />
        <SafeEnvironment />
      </Canvas>
    </div>
  );
};

export default Room3D;
