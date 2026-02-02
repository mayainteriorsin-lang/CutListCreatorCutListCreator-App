import React, { useMemo, useRef, useCallback, useImperativeHandle, forwardRef, useState, useEffect, Suspense } from "react";
import { Canvas, useThree, useFrame, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, OrthographicCamera, Grid, Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import jsPDF from "jspdf";
import {
  useDesignCanvasStore,
} from "../../../store/v2/useDesignCanvasStore";
import { logger } from "../../../services/logger";
import type { DrawnUnit, UnitType } from "../../../../types";
import type {
  FloorPlanWall,
  FloorPlanFloor,
  FloorPlanAppliance,
  KitchenConfig,
  Imported3DModel,
} from "../state/types";
import Model3DControls from "./Model3DControls";
import Toolbar3D from "./toolbar/Toolbar3D";

// Scale: 1 unit = 1mm in real world, but we render in meters for Three.js
const MM_TO_M = 0.001;

// Default room dimensions when no floor plan exists (in meters)
const DEFAULT_ROOM_WIDTH = 6;
const DEFAULT_ROOM_DEPTH = 5;
const DEFAULT_ROOM_HEIGHT = 3;

// View mode type
export type FloorPlan3DViewMode = "perspective" | "top" | "front" | "left" | "right" | "isometric";

// Export handle type for parent components
export interface FloorPlan3DHandle {
  captureScreenshot: (format?: "png" | "jpg", quality?: number) => Promise<string | null>;
  capture360Panorama: (frames?: number) => Promise<string[]>;
  exportToPDF: (title?: string) => Promise<void>;
  zoomToFit: () => void;
  resetCamera: () => void;
}

// Screenshot capture helper component
function ScreenshotCapture({
  onCapture,
  panoramaConfig,
}: {
  onCapture: (captureFunc: () => string | null) => void;
  panoramaConfig?: { frames: number; onFrame: (dataUrl: string) => void; onComplete: () => void } | null;
}) {
  const { gl, scene, camera } = useThree();
  const frameRef = useRef(0);
  const [isPanorama, setIsPanorama] = useState(false);
  const originalCameraPos = useRef<THREE.Vector3 | null>(null);
  const panoramaTarget = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.2, 0));

  // Capture single screenshot
  const captureScreenshot = useCallback(() => {
    try {
      gl.render(scene, camera);
      return gl.domElement.toDataURL("image/png");
    } catch {
      logger.error('Screenshot capture failed', undefined, { context: 'floor-plan-3d' });
      return null;
    }
  }, [gl, scene, camera]);

  // Register capture function
  useEffect(() => {
    onCapture(captureScreenshot);
  }, [onCapture, captureScreenshot]);

  // Handle panorama capture
  // Handle panorama capture
  useEffect(() => {
    if (panoramaConfig && !isPanorama) {
      // Defer state update to next tick to avoid synchronous setState warning
      const timer = setTimeout(() => {
        setIsPanorama(true);
        frameRef.current = 0;
        originalCameraPos.current = camera.position.clone();

        // Get scene center for panorama rotation
        if (camera instanceof THREE.PerspectiveCamera || camera instanceof THREE.OrthographicCamera) {
          const target = new THREE.Vector3();
          camera.getWorldDirection(target);
          panoramaTarget.current.copy(camera.position).add(target.multiplyScalar(5));
        }
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [panoramaConfig, isPanorama, camera]);

  // Panorama frame capture
  useFrame(() => {
    if (isPanorama && panoramaConfig && originalCameraPos.current) {
      const { frames, onFrame, onComplete } = panoramaConfig;

      if (frameRef.current < frames) {
        const angle = (frameRef.current / frames) * Math.PI * 2;
        const radius = originalCameraPos.current.distanceTo(panoramaTarget.current);

        camera.position.set(
          panoramaTarget.current.x + Math.sin(angle) * radius,
          camera.position.y,
          panoramaTarget.current.z + Math.cos(angle) * radius
        );
        camera.lookAt(panoramaTarget.current);

        gl.render(scene, camera);
        const dataUrl = gl.domElement.toDataURL("image/png");
        onFrame(dataUrl);

        frameRef.current++;
      } else {
        // Restore camera and complete
        camera.position.copy(originalCameraPos.current);
        setIsPanorama(false);
        onComplete();
      }
    }
  });

  return null;
}

// Camera controller for zoom to fit and reset
function CameraController({
  onReady,
  defaultPosition,
  defaultTarget,
  sceneBounds,
}: {
  onReady: (controller: { zoomToFit: () => void; resetCamera: () => void }) => void;
  defaultPosition: [number, number, number];
  defaultTarget: [number, number, number];
  sceneBounds: { min: THREE.Vector3; max: THREE.Vector3 } | null;
}) {
  const { camera, controls } = useThree();

  const zoomToFit = useCallback(() => {
    if (!sceneBounds) return;

    const center = new THREE.Vector3();
    center.addVectors(sceneBounds.min, sceneBounds.max).multiplyScalar(0.5);

    const size = new THREE.Vector3();
    size.subVectors(sceneBounds.max, sceneBounds.min);
    const maxDim = Math.max(size.x, size.y, size.z);

    // Position camera to fit the scene
    const distance = maxDim * 1.5;
    camera.position.set(center.x + distance * 0.7, center.y + distance * 0.5, center.z + distance * 0.7);

    // Make camera look at center
    camera.lookAt(center.x, center.y, center.z);

    // Update controls target if available
    if (controls && (controls as any).target) {
      (controls as any).target.set(center.x, center.y, center.z);
      (controls as any).update();
    }
  }, [camera, controls, sceneBounds]);

  const resetCamera = useCallback(() => {
    camera.position.set(...defaultPosition);

    // Make camera look at target
    camera.lookAt(...defaultTarget);

    // Update controls if available
    if (controls && (controls as any).target) {
      (controls as any).target.set(...defaultTarget);
      (controls as any).update();
    }
  }, [camera, controls, defaultPosition, defaultTarget]);

  useEffect(() => {
    onReady({ zoomToFit, resetCamera });
  }, [onReady, zoomToFit, resetCamera]);

  return null;
}

// Dimension label component for 3D
function DimensionLabel({
  position,
  text,
  color = "#ffffff",
}: {
  position: [number, number, number];
  text: string;
  color?: string;
}) {
  return (
    <Html position={position} center distanceFactor={10}>
      <div className="bg-slate-800/90 px-1.5 py-0.5 rounded text-[10px] text-white whitespace-nowrap border border-slate-600/50 shadow-lg">
        {text}
      </div>
    </Html>
  );
}

// Unit type colors
const UNIT_COLORS: Record<UnitType, { body: string; accent: string }> = {
  wardrobe: { body: "#8B4513", accent: "#A0522D" }, // Brown wood
  kitchen: { body: "#4a7c59", accent: "#2d2d2d" }, // Green with dark counter
  tv_unit: { body: "#2F4F4F", accent: "#1a1a1a" }, // Dark slate
  shoe_rack: { body: "#CD853F", accent: "#8B4513" }, // Peru brown
  study_table: { body: "#5F9EA0", accent: "#4682B4" }, // Cadet blue
  dresser: { body: "#BC8F8F", accent: "#8B7355" }, // Rosy brown
  book_shelf: { body: "#8B7355", accent: "#6B4423" }, // Tan
  crockery: { body: "#E6E6FA", accent: "#B0C4DE" }, // Lavender
  pooja: { body: "#FFD700", accent: "#DAA520" }, // Gold
  vanity: { body: "#F5F5DC", accent: "#D3D3D3" }, // Beige
  bar_unit: { body: "#4A0E0E", accent: "#1a1a1a" }, // Dark red
  display_unit: { body: "#87CEEB", accent: "#4682B4" }, // Sky blue
};

// Fallback lighting
function FallbackLighting() {
  return (
    <>
      <hemisphereLight args={["#87CEEB", "#f5f5f5", 0.6]} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} castShadow />
    </>
  );
}

// 3D Floor component (for floor plan mode) with selection and move support
function Floor3D({
  floor,
  scaleMmPerPx,
  isSelected,
  onSelect,
  isSelectMode,
  isMoveMode,
  onMove,
}: {
  floor: FloorPlanFloor;
  scaleMmPerPx: number;
  isSelected?: boolean;
  onSelect?: (floorId: string) => void;
  isSelectMode?: boolean;
  isMoveMode?: boolean;
  onMove?: (floorId: string, deltaX: number, deltaY: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; z: number } | null>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const widthM = (floor.width * scaleMmPerPx) * MM_TO_M;
  const depthM = (floor.height * scaleMmPerPx) * MM_TO_M;
  const centerXM = ((floor.x + floor.width / 2) * scaleMmPerPx) * MM_TO_M;
  const centerZM = ((floor.y + floor.height / 2) * scaleMmPerPx) * MM_TO_M;

  // Calculate dimensions in mm for display
  const widthMm = floor.width * scaleMmPerPx;
  const depthMm = floor.height * scaleMmPerPx;

  // Handle click - for select mode
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    if (!isSelectMode) return;
    e.stopPropagation();
    onSelect?.(floor.id);
  }, [isSelectMode, onSelect, floor.id]);

  // Handle pointer down - start drag for move mode
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!isMoveMode || !isSelected) return;
    e.stopPropagation();
    setIsDragging(true);
    // Get the intersection point on the floor plane
    const point = e.point;
    dragStartRef.current = { x: point.x, z: point.z };
    document.body.style.cursor = "grabbing";
    // Capture pointer for drag
    (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
  }, [isMoveMode, isSelected]);

  // Handle pointer move - drag for move mode
  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!isDragging || !dragStartRef.current || !isMoveMode) return;
    e.stopPropagation();
    const point = e.point;
    const deltaXM = point.x - dragStartRef.current.x;
    const deltaZM = point.z - dragStartRef.current.z;
    // Convert from meters back to canvas pixels
    const deltaXPx = (deltaXM / MM_TO_M) / scaleMmPerPx;
    const deltaYPx = (deltaZM / MM_TO_M) / scaleMmPerPx;
    onMove?.(floor.id, deltaXPx, deltaYPx);
    // Update drag start for continuous movement
    dragStartRef.current = { x: point.x, z: point.z };
  }, [isDragging, isMoveMode, scaleMmPerPx, floor.id, onMove]);

  // Handle pointer up - end drag
  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    e.stopPropagation();
    setIsDragging(false);
    dragStartRef.current = null;
    document.body.style.cursor = isMoveMode ? "grab" : "default";
    (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
  }, [isDragging, isMoveMode]);

  // Handle pointer over
  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!isSelectMode && !isMoveMode) return;
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = isMoveMode && isSelected ? "grab" : "pointer";
  }, [isSelectMode, isMoveMode, isSelected]);

  // Handle pointer out
  const handlePointerOut = useCallback(() => {
    if (!isDragging) {
      setHovered(false);
      document.body.style.cursor = "default";
    }
  }, [isDragging]);

  return (
    <group>
      {/* Selection outline */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[centerXM, 0.005, centerZM]}>
          <planeGeometry args={[widthM + 0.05, depthM + 0.05]} />
          <meshBasicMaterial color={isMoveMode ? "#22c55e" : "#fbbf24"} transparent opacity={0.3} />
        </mesh>
      )}
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centerXM, 0.01, centerZM]}
        receiveShadow
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <planeGeometry args={[widthM, depthM]} />
        <meshStandardMaterial
          color={isSelected ? (isMoveMode ? "#bbf7d0" : "#fde68a") : hovered ? "#f5e6d3" : "#e8e0d5"}
          emissive={isSelected ? (isMoveMode ? "#22c55e" : "#fbbf24") : hovered ? "#fbbf24" : "#000000"}
          emissiveIntensity={isSelected ? 0.2 : hovered ? 0.1 : 0}
        />
      </mesh>
      <Grid
        position={[centerXM, 0.001, centerZM]}
        args={[widthM, depthM]}
        cellSize={0.1}
        cellThickness={0.5}
        cellColor="#d4ccc0"
        sectionSize={0.5}
        sectionThickness={1}
        sectionColor="#b8a99a"
        fadeDistance={25}
        fadeStrength={1}
      />
      {/* Selection label */}
      {(isSelected || hovered) && isSelectMode && (
        <Html position={[centerXM, 0.2, centerZM]} center distanceFactor={10}>
          <div className="bg-amber-500/90 px-2 py-1 rounded text-[10px] text-white whitespace-nowrap shadow-lg">
            Floor: {(widthMm / 1000).toFixed(2)}m × {(depthMm / 1000).toFixed(2)}m
          </div>
        </Html>
      )}
    </group>
  );
}



// 3D Wall component (for floor plan mode) with selection and move support
function Wall3D({
  wall,
  scaleMmPerPx,
  isSelected,
  onSelect,
  isSelectMode,
  isMoveMode,
  onMove,
}: {
  wall: FloorPlanWall;
  scaleMmPerPx: number;
  isSelected?: boolean;
  onSelect?: (wallId: string) => void;
  isSelectMode?: boolean;
  isMoveMode?: boolean;
  onMove?: (wallId: string, deltaX: number, deltaY: number) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; z: number } | null>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  // Handle click - for select mode
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    if (!isSelectMode) return;
    e.stopPropagation();
    onSelect?.(wall.id);
  }, [isSelectMode, onSelect, wall.id]);

  // Handle pointer down - start drag for move mode
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!isMoveMode || !isSelected) return;
    e.stopPropagation();
    setIsDragging(true);
    const point = e.point;
    dragStartRef.current = { x: point.x, z: point.z };
    document.body.style.cursor = "grabbing";
    (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
  }, [isMoveMode, isSelected]);

  // Handle pointer move - drag for move mode
  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!isDragging || !dragStartRef.current || !isMoveMode) return;
    e.stopPropagation();
    const point = e.point;
    const deltaXM = point.x - dragStartRef.current.x;
    const deltaZM = point.z - dragStartRef.current.z;
    // Convert from meters back to canvas pixels
    const deltaXPx = (deltaXM / MM_TO_M) / scaleMmPerPx;
    const deltaYPx = (deltaZM / MM_TO_M) / scaleMmPerPx;
    onMove?.(wall.id, deltaXPx, deltaYPx);
    dragStartRef.current = { x: point.x, z: point.z };
  }, [isDragging, isMoveMode, scaleMmPerPx, wall.id, onMove]);

  // Handle pointer up - end drag
  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    e.stopPropagation();
    setIsDragging(false);
    dragStartRef.current = null;
    document.body.style.cursor = isMoveMode ? "grab" : "default";
    (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
  }, [isDragging, isMoveMode]);

  // Handle pointer over
  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!isSelectMode && !isMoveMode) return;
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = isMoveMode && isSelected ? "grab" : "pointer";
  }, [isSelectMode, isMoveMode, isSelected]);

  // Handle pointer out
  const handlePointerOut = useCallback(() => {
    if (!isDragging) {
      setHovered(false);
      document.body.style.cursor = "default";
    }
  }, [isDragging]);

  // Safety check for wall data
  if (!wall.startPoint || !wall.endPoint) {
    logger.warn('Wall missing endpoints', { wallId: wall?.id, context: 'floor-plan-3d' });
    return null;
  }

  const startXM = (wall.startPoint.x * scaleMmPerPx) * MM_TO_M;
  const startZM = (wall.startPoint.y * scaleMmPerPx) * MM_TO_M;
  const endXM = (wall.endPoint.x * scaleMmPerPx) * MM_TO_M;
  const endZM = (wall.endPoint.y * scaleMmPerPx) * MM_TO_M;

  const lengthM = wall.lengthMm * MM_TO_M;
  const heightM = wall.heightMm * MM_TO_M;
  const thicknessM = wall.thicknessMm * MM_TO_M;

  const centerX = (startXM + endXM) / 2;
  const centerZ = (startZM + endZM) / 2;
  const centerY = heightM / 2;
  const angle = Math.atan2(endZM - startZM, endXM - startXM);

  return (
    <group>
      {/* Selection outline */}
      {isSelected && (
        <mesh position={[centerX, centerY, centerZ]} rotation={[0, -angle, 0]}>
          <boxGeometry args={[lengthM + 0.05, heightM + 0.05, thicknessM + 0.05]} />
          <meshBasicMaterial color={isMoveMode ? "#22c55e" : "#94a3b8"} wireframe transparent opacity={0.5} />
        </mesh>
      )}
      <mesh
        ref={meshRef}
        position={[centerX, centerY, centerZ]}
        rotation={[0, -angle, 0]}
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <boxGeometry args={[lengthM, heightM, thicknessM]} />
        <meshStandardMaterial
          color={isSelected ? (isMoveMode ? "#bbf7d0" : "#cbd5e1") : hovered ? "#e2e8f0" : "#f5f5f0"}
          emissive={isSelected ? (isMoveMode ? "#22c55e" : "#64748b") : hovered ? "#94a3b8" : "#000000"}
          emissiveIntensity={isSelected ? 0.2 : hovered ? 0.1 : 0}
        />
      </mesh>
      {/* Selection label */}
      {(isSelected || hovered) && (isSelectMode || isMoveMode) && (
        <Html position={[centerX, centerY + heightM / 2 + 0.2, centerZ]} center distanceFactor={10}>
          <div className="bg-slate-600/90 px-2 py-1 rounded text-[10px] text-white whitespace-nowrap shadow-lg">
            Wall: {(wall.lengthMm / 1000).toFixed(2)}m × {(wall.heightMm / 1000).toFixed(2)}m
          </div>
        </Html>
      )}
    </group>
  );
}

// Handle component for cabinet doors
function CabinetHandle({
  position,
  rotation = 0,
  isVertical = true,
}: {
  position: [number, number, number];
  rotation?: number;
  isVertical?: boolean;
}) {
  const handleLength = isVertical ? 0.12 : 0.08;
  const handleRadius = 0.008;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Handle bar */}
      <mesh rotation={isVertical ? [0, 0, 0] : [0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[handleRadius, handleLength, 4, 8]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Handle mounts */}
      <mesh position={[0, isVertical ? handleLength / 2 + 0.01 : 0, -0.01]}>
        <cylinderGeometry args={[0.012, 0.012, 0.02, 8]} />
        <meshStandardMaterial color="#a0a0a0" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, isVertical ? -handleLength / 2 - 0.01 : 0, -0.01]}>
        <cylinderGeometry args={[0.012, 0.012, 0.02, 8]} />
        <meshStandardMaterial color="#a0a0a0" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

// 3D Drawn Unit component - renders any unit type with selection and move support
function DrawnUnit3D({
  unit,
  canvasWidth,
  canvasHeight,
  useFloorPlanCoords,
  scaleMmPerPx,
  isSelected,
  onSelect,
  showDimensions,
  isSelectMode,
  isMoveMode,
  onMove,
}: {
  unit: DrawnUnit;
  canvasWidth: number;
  canvasHeight: number;
  useFloorPlanCoords: boolean;
  scaleMmPerPx: number;
  isSelected?: boolean;
  onSelect?: (unitId: string) => void;
  showDimensions?: boolean;
  isSelectMode?: boolean;
  isMoveMode?: boolean;
  onMove?: (unitId: string, deltaX: number, deltaY: number) => void;
}) {
  const colors = UNIT_COLORS[unit.unitType] || UNIT_COLORS.wardrobe;
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; z: number } | null>(null);

  // Dimensions in meters
  const widthM = unit.widthMm * MM_TO_M;
  const heightM = unit.heightMm * MM_TO_M;
  const depthM = unit.depthMm * MM_TO_M;

  // Calculate position based on mode
  let posX: number, posY: number, posZ: number;

  if (useFloorPlanCoords) {
    // Floor plan mode: use pixel coordinates scaled to real world
    const unitCenterXPx = unit.box.x + unit.box.width / 2;
    const unitCenterYPx = unit.box.y + unit.box.height / 2;
    posX = (unitCenterXPx * scaleMmPerPx) * MM_TO_M;
    posZ = (unitCenterYPx * scaleMmPerPx) * MM_TO_M;
    posY = heightM / 2;
  } else {
    // Default room mode: place against back wall
    const scaleX = DEFAULT_ROOM_WIDTH / canvasWidth;
    const scaleY = DEFAULT_ROOM_HEIGHT / canvasHeight;

    const centerX = (unit.box.x + unit.box.width / 2) * scaleX - DEFAULT_ROOM_WIDTH / 2;
    const centerY = DEFAULT_ROOM_HEIGHT - (unit.box.y + unit.box.height / 2) * scaleY;

    posX = centerX;
    posY = centerY;
    posZ = -DEFAULT_ROOM_DEPTH / 2 + depthM / 2 + 0.02;
  }

  // Render loft if enabled
  const loftHeightM = unit.loftEnabled ? unit.loftHeightMm * MM_TO_M : 0;

  // Calculate number of shutter sections for handles
  const shutterSections = unit.shutterDividerXs.length + 1;
  const sectionWidth = widthM / shutterSections;

  // Selection/hover color adjustment
  const bodyColor = isSelected ? (isMoveMode ? "#86efac" : "#4f94cd") : hovered ? colors.body : colors.body;
  const emissiveIntensity = isSelected ? 0.15 : hovered ? 0.05 : 0;

  // Handle click - for select mode
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    if (!isSelectMode && !isMoveMode) return;
    e.stopPropagation();
    onSelect?.(unit.id);
  }, [isSelectMode, isMoveMode, onSelect, unit.id]);

  // Handle pointer down - start drag for move mode
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!isMoveMode || !isSelected) return;
    e.stopPropagation();
    setIsDragging(true);
    const point = e.point;
    dragStartRef.current = { x: point.x, z: point.z };
    document.body.style.cursor = "grabbing";
    (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
  }, [isMoveMode, isSelected]);

  // Handle pointer move - drag for move mode
  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!isDragging || !dragStartRef.current || !isMoveMode) return;
    e.stopPropagation();
    const point = e.point;
    const deltaXM = point.x - dragStartRef.current.x;
    const deltaZM = point.z - dragStartRef.current.z;
    // Convert from meters back to canvas pixels
    const deltaXPx = (deltaXM / MM_TO_M) / scaleMmPerPx;
    const deltaYPx = (deltaZM / MM_TO_M) / scaleMmPerPx;
    onMove?.(unit.id, deltaXPx, deltaYPx);
    dragStartRef.current = { x: point.x, z: point.z };
  }, [isDragging, isMoveMode, scaleMmPerPx, unit.id, onMove]);

  // Handle pointer up - end drag
  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    e.stopPropagation();
    setIsDragging(false);
    dragStartRef.current = null;
    document.body.style.cursor = isMoveMode ? "grab" : "default";
    (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
  }, [isDragging, isMoveMode]);

  // Handle pointer over
  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = isMoveMode && isSelected ? "grab" : "pointer";
  }, [isMoveMode, isSelected]);

  // Handle pointer out
  const handlePointerOut = useCallback(() => {
    if (!isDragging) {
      setHovered(false);
      document.body.style.cursor = "default";
    }
  }, [isDragging]);

  return (
    <group
      position={[posX, 0, posZ]}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Selection outline */}
      {isSelected && (
        <mesh position={[0, posY, 0]}>
          <boxGeometry args={[widthM + 0.02, heightM + 0.02, depthM + 0.02]} />
          <meshBasicMaterial color={isMoveMode ? "#22c55e" : "#00aaff"} wireframe transparent opacity={0.5} />
        </mesh>
      )}

      {/* Main cabinet body */}
      <mesh position={[0, posY, 0]} castShadow receiveShadow>
        <boxGeometry args={[widthM, heightM, depthM]} />
        <meshStandardMaterial color={bodyColor} emissive={bodyColor} emissiveIntensity={emissiveIntensity} />
      </mesh>

      {/* Shutter lines (vertical divisions) */}
      {unit.shutterDividerXs.map((divX, idx) => {
        const lineX = (divX - 0.5) * widthM;
        return (
          <mesh key={`div-${idx}`} position={[lineX, posY, depthM / 2 + 0.002]}>
            <boxGeometry args={[0.005, heightM * 0.95, 0.001]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
        );
      })}

      {/* Horizontal divisions */}
      {unit.horizontalDividerYs.map((divY, idx) => {
        const lineY = posY + (0.5 - divY) * heightM;
        return (
          <mesh key={`hdiv-${idx}`} position={[0, lineY, depthM / 2 + 0.002]}>
            <boxGeometry args={[widthM * 0.95, 0.005, 0.001]} />
            <meshBasicMaterial color="#1a1a1a" />
          </mesh>
        );
      })}

      {/* Handles for each shutter section */}
      {Array.from({ length: shutterSections }).map((_, idx) => {
        const sectionCenterX = -widthM / 2 + sectionWidth * (idx + 0.5);
        // Position handle on right side of each section (except last which is on left)
        const handleX = idx === shutterSections - 1
          ? sectionCenterX - sectionWidth * 0.35
          : sectionCenterX + sectionWidth * 0.35;
        return (
          <CabinetHandle
            key={`handle-${idx}`}
            position={[handleX, posY, depthM / 2 + 0.025]}
            isVertical={true}
          />
        );
      })}

      {/* Loft if enabled */}
      {unit.loftEnabled && loftHeightM > 0 && (
        <mesh position={[0, posY + heightM / 2 + loftHeightM / 2 + 0.01, 0]} castShadow receiveShadow>
          <boxGeometry args={[widthM, loftHeightM, depthM]} />
          <meshStandardMaterial color={colors.accent} />
        </mesh>
      )}

      {/* Dimension labels */}
      {showDimensions && (
        <>
          {/* Width dimension */}
          <DimensionLabel
            position={[0, posY + heightM / 2 + 0.15, depthM / 2 + 0.1]}
            text={`${unit.widthMm}mm`}
          />
          {/* Height dimension */}
          <DimensionLabel
            position={[widthM / 2 + 0.15, posY, depthM / 2 + 0.1]}
            text={`${unit.heightMm}mm`}
          />
          {/* Depth dimension (for floor plan mode) */}
          {useFloorPlanCoords && (
            <DimensionLabel
              position={[widthM / 2 + 0.1, posY - heightM / 2 - 0.1, 0]}
              text={`D: ${unit.depthMm}mm`}
            />
          )}
        </>
      )}

      {/* Add-ons */}
      {unit.drawnAddOns.map((addOn) => {
        const addOnWidthM = addOn.widthMm * MM_TO_M;
        const addOnHeightM = addOn.heightMm * MM_TO_M;
        const addOnDepthM = (addOn.depthMm || unit.depthMm) * MM_TO_M;

        // Position relative to unit
        const addOnX = ((addOn.box.x + addOn.box.width / 2 - unit.box.x - unit.box.width / 2) / unit.box.width) * widthM;
        const addOnY = posY + ((unit.box.y + unit.box.height / 2 - addOn.box.y - addOn.box.height / 2) / unit.box.height) * heightM;

        return (
          <mesh key={addOn.id} position={[addOnX, addOnY, depthM / 2 + addOnDepthM / 2 + 0.01]} castShadow receiveShadow>
            <boxGeometry args={[addOnWidthM, addOnHeightM, addOnDepthM]} />
            <meshStandardMaterial color={colors.accent} />
          </mesh>
        );
      })}
    </group>
  );
}

// 3D Kitchen Base Unit component
function KitchenBaseUnit3D({
  run,
  scaleMmPerPx,
}: {
  run: {
    id: string;
    startPoint: { x: number; y: number };
    endPoint: { x: number; y: number };
    lengthFt: number;
    depthMm: number;
    heightMm: number;
    rotation: number;
  };
  scaleMmPerPx: number;
}) {
  const startXM = (run.startPoint.x * scaleMmPerPx) * MM_TO_M;
  const startZM = (run.startPoint.y * scaleMmPerPx) * MM_TO_M;
  const endXM = (run.endPoint.x * scaleMmPerPx) * MM_TO_M;
  const endZM = (run.endPoint.y * scaleMmPerPx) * MM_TO_M;

  const lengthM = run.lengthFt * 0.3048;
  const depthM = run.depthMm * MM_TO_M;
  const heightM = run.heightMm * MM_TO_M;

  const centerX = (startXM + endXM) / 2;
  const centerZ = (startZM + endZM) / 2;
  const centerY = heightM / 2;
  const angle = Math.atan2(endZM - startZM, endXM - startXM);

  const offsetZ = depthM / 2 + 0.02;
  const offsetX = Math.sin(angle) * offsetZ;
  const offsetZFinal = Math.cos(angle) * offsetZ;

  return (
    <group position={[centerX + offsetX, 0, centerZ + offsetZFinal]}>
      <mesh position={[0, centerY, 0]} rotation={[0, -angle, 0]} castShadow receiveShadow>
        <boxGeometry args={[lengthM, heightM, depthM]} />
        <meshStandardMaterial color="#4a7c59" />
      </mesh>
      <mesh position={[0, heightM + 0.02, 0]} rotation={[0, -angle, 0]} castShadow receiveShadow>
        <boxGeometry args={[lengthM + 0.05, 0.04, depthM + 0.025]} />
        <meshStandardMaterial color="#2d2d2d" />
      </mesh>
    </group>
  );
}

// 3D Kitchen Wall Unit component
function KitchenWallUnit3D({
  run,
  scaleMmPerPx,
}: {
  run: {
    id: string;
    startPoint: { x: number; y: number };
    endPoint: { x: number; y: number };
    lengthFt: number;
    depthMm: number;
    heightMm: number;
    rotation: number;
  };
  scaleMmPerPx: number;
}) {
  const startXM = (run.startPoint.x * scaleMmPerPx) * MM_TO_M;
  const startZM = (run.startPoint.y * scaleMmPerPx) * MM_TO_M;
  const endXM = (run.endPoint.x * scaleMmPerPx) * MM_TO_M;
  const endZM = (run.endPoint.y * scaleMmPerPx) * MM_TO_M;

  const lengthM = run.lengthFt * 0.3048;
  const depthM = run.depthMm * MM_TO_M;
  const heightM = run.heightMm * MM_TO_M;
  const bottomY = 1.4;

  const centerX = (startXM + endXM) / 2;
  const centerZ = (startZM + endZM) / 2;
  const centerY = bottomY + heightM / 2;
  const angle = Math.atan2(endZM - startZM, endXM - startXM);

  const offsetZ = depthM / 2 + 0.01;
  const offsetX = Math.sin(angle) * offsetZ;
  const offsetZFinal = Math.cos(angle) * offsetZ;

  return (
    <mesh
      position={[centerX + offsetX, centerY, centerZ + offsetZFinal]}
      rotation={[0, -angle, 0]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[lengthM, heightM, depthM]} />
      <meshStandardMaterial color="#3b6b4a" />
    </mesh>
  );
}

// 3D Appliance component
function Appliance3D({
  appliance,
  scaleMmPerPx,
}: {
  appliance: FloorPlanAppliance;
  scaleMmPerPx: number;
}) {
  const xM = ((appliance.x + appliance.widthPx / 2) * scaleMmPerPx) * MM_TO_M;
  const zM = ((appliance.y + appliance.heightPx / 2) * scaleMmPerPx) * MM_TO_M;
  const widthM = (appliance.widthPx * scaleMmPerPx) * MM_TO_M;
  const depthM = (appliance.heightPx * scaleMmPerPx) * MM_TO_M;

  let heightM = 0.1;
  let color = "#666666";
  let yPos = 0.85;

  switch (appliance.type) {
    case "hob": heightM = 0.05; color = "#1a1a1a"; yPos = 0.87; break;
    case "sink": heightM = 0.2; color = "#c0c0c0"; yPos = 0.85; break;
    case "chimney": heightM = 0.6; color = "#808080"; yPos = 1.8; break;
    case "fridge": heightM = 1.8; color = "#f0f0f0"; yPos = heightM / 2; break;
    case "microwave": heightM = 0.35; color = "#2a2a2a"; yPos = 1.5; break;
    case "oven": heightM = 0.6; color = "#333333"; yPos = 0.45; break;
    case "dishwasher": heightM = 0.82; color = "#e0e0e0"; yPos = heightM / 2; break;
    case "washing_machine": heightM = 0.85; color = "#f5f5f5"; yPos = heightM / 2; break;
  }

  return (
    <mesh position={[xM, yPos, zM]} rotation={[0, (appliance.rotation * Math.PI) / 180, 0]} castShadow receiveShadow>
      <boxGeometry args={[widthM, heightM, depthM]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

// Loading placeholder for imported 3D models
function ModelLoadingPlaceholder({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshStandardMaterial color="#6366f1" wireframe />
    </mesh>
  );
}

// 3D Imported Model component - renders GLB/GLTF models
function ImportedModel3D({
  model,
  isSelected,
  onSelect,
}: {
  model: Imported3DModel;
  isSelected?: boolean;
  onSelect?: (modelId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const groupRef = useRef<THREE.Group>(null);

  // Load the GLTF/GLB model
  const { scene } = useGLTF(model.sourceUrl || "", undefined, undefined, (error) => {
    logger.error('3D model load failed', error instanceof Error ? error : new Error(String(error)), { context: 'floor-plan-3d' });
    setLoadError(true);
  });

  // Clone the scene to allow multiple instances
  const clonedScene = useMemo(() => {
    if (!scene) return null;
    const clone = scene.clone();
    // Enable shadows on all meshes
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  if (loadError || !model.visible) {
    return null;
  }

  if (!clonedScene) {
    return <ModelLoadingPlaceholder position={[model.position.x, model.position.y, model.position.z]} />;
  }

  return (
    <group
      ref={groupRef}
      position={[model.position.x, model.position.y, model.position.z]}
      rotation={[model.rotation.x, model.rotation.y, model.rotation.z]}
      scale={[model.scale.x, model.scale.y, model.scale.z]}
      onClick={(e) => {
        e.stopPropagation();
        if (!model.locked) {
          onSelect?.(model.id);
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (!model.locked) {
          setHovered(true);
          document.body.style.cursor = "pointer";
        }
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "default";
      }}
    >
      {/* Selection outline */}
      {isSelected && (
        <mesh>
          <boxGeometry args={[1.1, 1.1, 1.1]} />
          <meshBasicMaterial color="#00aaff" wireframe transparent opacity={0.5} />
        </mesh>
      )}

      {/* Hover highlight */}
      {hovered && !isSelected && (
        <mesh>
          <boxGeometry args={[1.05, 1.05, 1.05]} />
          <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.3} />
        </mesh>
      )}

      {/* The actual 3D model */}
      <primitive object={clonedScene} />

      {/* Model label */}
      {(isSelected || hovered) && (
        <Html position={[0, 1.2, 0]} center distanceFactor={10}>
          <div className="bg-slate-800/90 px-2 py-1 rounded text-[10px] text-white whitespace-nowrap border border-slate-600/50 shadow-lg">
            {model.name}
            {model.locked && " 🔒"}
          </div>
        </Html>
      )}
    </group>
  );
}

// Wrapper component to handle Suspense for model loading
function ImportedModel3DWrapper({
  model,
  isSelected,
  onSelect,
}: {
  model: Imported3DModel;
  isSelected?: boolean;
  onSelect?: (modelId: string) => void;
}) {
  if (!model.sourceUrl) {
    return null;
  }

  return (
    <Suspense fallback={<ModelLoadingPlaceholder position={[model.position.x, model.position.y, model.position.z]} />}>
      <ImportedModel3D model={model} isSelected={isSelected} onSelect={onSelect} />
    </Suspense>
  );
}

// Main 3D Scene - handles both floor plan mode and default room mode
function Scene({
  floors,
  walls,
  appliances,
  kitchenConfig,
  scaleMmPerPx,
  drawnUnits,
  canvasWidth,
  canvasHeight,
  viewMode,
  selectedUnitId,
  onSelectUnit,
  showDimensions,
  imported3DModels,
  selectedModelId,
  onSelectModel,
  isSelectMode,
  isMoveMode,
  selectedFloorId,
  onSelectFloor,
  onMoveFloor,
  selectedWallId,
  onSelectWall,
  onMoveWall,
  onMoveUnit,
}: {
  floors: FloorPlanFloor[];
  walls: FloorPlanWall[];
  appliances: FloorPlanAppliance[];
  kitchenConfig: KitchenConfig | null;
  scaleMmPerPx: number;
  drawnUnits: DrawnUnit[];
  canvasWidth: number;
  canvasHeight: number;
  viewMode: FloorPlan3DViewMode;
  selectedUnitId?: string | null;
  onSelectUnit?: (unitId: string | null) => void;
  showDimensions?: boolean;
  imported3DModels?: Imported3DModel[];
  selectedModelId?: string | null;
  onSelectModel?: (modelId: string | null) => void;
  isSelectMode?: boolean;
  isMoveMode?: boolean;
  selectedFloorId?: string | null;
  onSelectFloor?: (floorId: string | null) => void;
  onMoveFloor?: (floorId: string, deltaX: number, deltaY: number) => void;
  selectedWallId?: string | null;
  onSelectWall?: (wallId: string | null) => void;
  onMoveWall?: (wallId: string, deltaX: number, deltaY: number) => void;
  onMoveUnit?: (unitId: string, deltaX: number, deltaY: number) => void;
}) {
  const hasFloorPlan = floors.length > 0;

  // Calculate scene center
  const sceneCenter = useMemo(() => {
    if (hasFloorPlan) {
      const floor = floors[0];
      const centerX = ((floor.x + floor.width / 2) * scaleMmPerPx) * MM_TO_M;
      const centerZ = ((floor.y + floor.height / 2) * scaleMmPerPx) * MM_TO_M;
      return { x: centerX, z: centerZ };
    }
    return { x: 0, z: 0 };
  }, [floors, scaleMmPerPx, hasFloorPlan]);

  return (
    <>
      {/* Enhanced Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[sceneCenter.x + 5, 10, sceneCenter.z + 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[sceneCenter.x - 5, 5, sceneCenter.z + 3]} intensity={0.3} />
      <FallbackLighting />

      {/* Soft fill lights for better ambient lighting (instead of external HDRI) */}
      <pointLight position={[sceneCenter.x, 4, sceneCenter.z]} intensity={0.3} color="#fff5e6" />
      <pointLight position={[sceneCenter.x - 3, 2, sceneCenter.z + 3]} intensity={0.15} color="#e6f0ff" />

      {/* Room structure - only render user-drawn floors and walls */}
      {floors.map((floor) => (
        <Floor3D
          key={floor.id}
          floor={floor}
          scaleMmPerPx={scaleMmPerPx}
          isSelected={selectedFloorId === floor.id}
          onSelect={onSelectFloor}
          isSelectMode={isSelectMode}
          isMoveMode={isMoveMode}
          onMove={onMoveFloor}
        />
      ))}
      {walls.map((wall) => (
        <Wall3D
          key={wall.id}
          wall={wall}
          scaleMmPerPx={scaleMmPerPx}
          isSelected={selectedWallId === wall.id}
          onSelect={onSelectWall}
          isSelectMode={isSelectMode}
          isMoveMode={isMoveMode}
          onMove={onMoveWall}
        />
      ))}

      {/* Render all drawn units with selection and move support */}
      {drawnUnits.map((unit) => (
        <DrawnUnit3D
          key={unit.id}
          unit={unit}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          useFloorPlanCoords={hasFloorPlan}
          scaleMmPerPx={scaleMmPerPx}
          isSelected={selectedUnitId === unit.id}
          onSelect={onSelectUnit}
          showDimensions={showDimensions}
          isSelectMode={isSelectMode}
          isMoveMode={isMoveMode}
          onMove={onMoveUnit}
        />
      ))}

      {/* Kitchen-specific elements (only in floor plan mode) */}
      {hasFloorPlan && kitchenConfig?.baseUnit?.runs.map((run) => (
        <KitchenBaseUnit3D key={run.id} run={run} scaleMmPerPx={scaleMmPerPx} />
      ))}
      {hasFloorPlan && kitchenConfig?.wallUnit?.runs.map((run) => (
        <KitchenWallUnit3D key={run.id} run={run} scaleMmPerPx={scaleMmPerPx} />
      ))}
      {hasFloorPlan && appliances.map((appliance) => (
        <Appliance3D key={appliance.id} appliance={appliance} scaleMmPerPx={scaleMmPerPx} />
      ))}

      {/* Render imported 3D models */}
      {imported3DModels?.map((model) => (
        <ImportedModel3DWrapper
          key={model.id}
          model={model}
          isSelected={selectedModelId === model.id}
          onSelect={onSelectModel}
        />
      ))}
    </>
  );
}

// 3D Drawing Interaction Component - handles drawing walls, floors, kitchen units in 3D
function Drawing3DInteraction({
  drawMode,
  scaleMmPerPx,
  onAddWall,
  onAddFloor,
  onAddKitchenRun,
}: {
  drawMode: string;
  scaleMmPerPx: number;
  onAddWall: (wall: Omit<FloorPlanWall, "id">) => void;
  onAddFloor: (floor: Omit<FloorPlanFloor, "id">) => void;
  onAddKitchenRun: (type: "base" | "wall", run: { startPoint: { x: number; y: number }; endPoint: { x: number; y: number }; lengthFt: number }) => void;
}) {
  const { camera, gl, raycaster, pointer } = useThree();
  const [drawStart, setDrawStart] = useState<THREE.Vector3 | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<THREE.Vector3 | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const floorPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  // Get point on floor plane from mouse position
  const getFloorPoint = useCallback(() => {
    raycaster.setFromCamera(pointer, camera);
    const point = new THREE.Vector3();
    raycaster.ray.intersectPlane(floorPlane, point);
    return point;
  }, [camera, raycaster, pointer, floorPlane]);

  // Convert 3D point to 2D pixel coordinates (for store)
  const toPixelCoords = useCallback((point: THREE.Vector3) => {
    // Convert from meters to mm, then to pixels
    const xMm = point.x / MM_TO_M;
    const yMm = point.z / MM_TO_M; // Z in 3D = Y in 2D
    return {
      x: xMm / scaleMmPerPx,
      y: yMm / scaleMmPerPx,
    };
  }, [scaleMmPerPx]);

  // Handle pointer down - start drawing
  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (drawMode === "select" || drawMode === "move" || drawMode === "pan" || drawMode === "none") return;

    e.stopPropagation();
    const point = getFloorPoint();
    if (!point) return;

    // Snap to grid (0.1m = 100mm)
    point.x = Math.round(point.x * 10) / 10;
    point.z = Math.round(point.z * 10) / 10;

    setDrawStart(point.clone());
    setDrawCurrent(point.clone());
    setIsDrawing(true);
  }, [drawMode, getFloorPoint]);

  // Handle pointer move - update preview
  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!isDrawing || !drawStart) return;

    const point = getFloorPoint();
    if (!point) return;

    // Snap to grid
    point.x = Math.round(point.x * 10) / 10;
    point.z = Math.round(point.z * 10) / 10;

    // Snap to horizontal/vertical for walls
    if (drawMode === "wall" || drawMode === "kitchen_base" || drawMode === "kitchen_wall") {
      const dx = Math.abs(point.x - drawStart.x);
      const dz = Math.abs(point.z - drawStart.z);
      if (dx > dz) {
        point.z = drawStart.z; // Snap horizontal
      } else {
        point.x = drawStart.x; // Snap vertical
      }
    }

    setDrawCurrent(point.clone());
  }, [isDrawing, drawStart, drawMode, getFloorPoint]);

  // Handle pointer up - finish drawing
  const handlePointerUp = useCallback(() => {
    if (!isDrawing || !drawStart || !drawCurrent) {
      setIsDrawing(false);
      return;
    }

    const start2D = toPixelCoords(drawStart);
    const end2D = toPixelCoords(drawCurrent);

    // Calculate length/size
    const dx = drawCurrent.x - drawStart.x;
    const dz = drawCurrent.z - drawStart.z;
    const lengthM = Math.sqrt(dx * dx + dz * dz);
    const lengthMm = lengthM / MM_TO_M;

    // Minimum size check (100mm = 0.1m)
    if (lengthM < 0.1 && drawMode !== "floor") {
      setIsDrawing(false);
      setDrawStart(null);
      setDrawCurrent(null);
      return;
    }

    if (drawMode === "wall") {
      // Create wall
      const angle = Math.atan2(dz, dx) * (180 / Math.PI);
      onAddWall({
        startPoint: { x: start2D.x, y: start2D.y },
        endPoint: { x: end2D.x, y: end2D.y },
        thicknessMm: 150, // 150mm default thickness
        heightMm: 2700, // 2.7m default height
        lengthMm: lengthMm,
        rotation: angle,
        isExterior: false,
        openings: [],
      });
    } else if (drawMode === "floor") {
      // Create floor (rectangle)
      const minX = Math.min(start2D.x, end2D.x);
      const minY = Math.min(start2D.y, end2D.y);
      const width = Math.abs(end2D.x - start2D.x);
      const height = Math.abs(end2D.y - start2D.y);

      if (width > 10 && height > 10) { // Minimum 10px
        onAddFloor({
          x: minX,
          y: minY,
          width: width,
          height: height,
          color: "#e2e8f0",
          shape: "rectangle",
        });
      }
    } else if (drawMode === "kitchen_base" || drawMode === "kitchen_wall") {
      // Create kitchen run
      const lengthFt = lengthMm / 304.8;
      if (lengthFt >= 1) { // Minimum 1ft
        onAddKitchenRun(
          drawMode === "kitchen_base" ? "base" : "wall",
          {
            startPoint: start2D,
            endPoint: end2D,
            lengthFt: lengthFt,
          }
        );
      }
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDrawCurrent(null);
  }, [isDrawing, drawStart, drawCurrent, drawMode, toPixelCoords, onAddWall, onAddFloor, onAddKitchenRun]);

  // Preview colors
  const previewColor = useMemo(() => {
    switch (drawMode) {
      case "wall": return "#94a3b8";
      case "floor": return "#fbbf24";
      case "kitchen_base": return "#22c55e";
      case "kitchen_wall": return "#3b82f6";
      default: return "#6366f1";
    }
  }, [drawMode]);

  // Only render if in a drawing mode
  if (drawMode === "select" || drawMode === "move" || drawMode === "pan" || drawMode === "none") return null;

  return (
    <>
      {/* Invisible floor plane for raycasting */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.001, 0]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        visible={false}
      >
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Drawing preview */}
      {isDrawing && drawStart && drawCurrent && (
        <>
          {/* Wall/Kitchen preview - line */}
          {(drawMode === "wall" || drawMode === "kitchen_base" || drawMode === "kitchen_wall") && (
            <group>
              {/* Preview line */}
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    count={2}
                    array={new Float32Array([
                      drawStart.x, 0.1, drawStart.z,
                      drawCurrent.x, 0.1, drawCurrent.z,
                    ])}
                    itemSize={3}
                  />
                </bufferGeometry>
                <lineBasicMaterial color={previewColor} linewidth={3} />
              </line>
              {/* Start point */}
              <mesh position={[drawStart.x, 0.1, drawStart.z]}>
                <sphereGeometry args={[0.05, 16, 16]} />
                <meshBasicMaterial color={previewColor} />
              </mesh>
              {/* End point */}
              <mesh position={[drawCurrent.x, 0.1, drawCurrent.z]}>
                <sphereGeometry args={[0.05, 16, 16]} />
                <meshBasicMaterial color={previewColor} />
              </mesh>
              {/* Length label */}
              <Html position={[(drawStart.x + drawCurrent.x) / 2, 0.3, (drawStart.z + drawCurrent.z) / 2]} center>
                <div className="bg-slate-800/90 px-2 py-1 rounded text-xs text-white whitespace-nowrap">
                  {(Math.sqrt(
                    Math.pow(drawCurrent.x - drawStart.x, 2) +
                    Math.pow(drawCurrent.z - drawStart.z, 2)
                  ) / MM_TO_M / 304.8).toFixed(1)} ft
                </div>
              </Html>
            </group>
          )}

          {/* Floor preview - rectangle */}
          {drawMode === "floor" && (
            <mesh
              position={[
                (drawStart.x + drawCurrent.x) / 2,
                0.01,
                (drawStart.z + drawCurrent.z) / 2,
              ]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry
                args={[
                  Math.abs(drawCurrent.x - drawStart.x),
                  Math.abs(drawCurrent.z - drawStart.z),
                ]}
              />
              <meshBasicMaterial color={previewColor} transparent opacity={0.3} side={THREE.DoubleSide} />
            </mesh>
          )}
        </>
      )}
    </>
  );
}

// Orthographic camera zoom for different views
const ORTHO_ZOOM = 80;

// Main FloorPlan3D component
interface FloorPlan3DProps {
  viewMode?: FloorPlan3DViewMode;
  zoomLevel?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  onExportReady?: (handle: FloorPlan3DHandle) => void;
}

const FloorPlan3D = forwardRef<FloorPlan3DHandle, FloorPlan3DProps>(({
  viewMode = "perspective",
  zoomLevel = 100,
  canvasWidth = 800,
  canvasHeight = 600,
  onExportReady,
}, ref) => {
  const { floorPlan, drawnUnits, models3D, select3DModel, addFloorPlanWall, addFloorPlanFloor, addKitchenRun, deleteFloorPlanWall, deleteFloorPlanFloor, updateFloorPlanFloor, updateFloorPlanWall, updateDrawnUnitById } = useDesignCanvasStore();
  const { floors, walls, appliances, kitchenConfig, scaleMmPerPx, drawMode } = floorPlan;

  // Screenshot capture function reference
  const captureFunc = useRef<(() => string | null) | null>(null);
  const [panoramaConfig, setPanoramaConfig] = useState<{
    frames: number;
    onFrame: (dataUrl: string) => void;
    onComplete: () => void;
  } | null>(null);

  // Selection and dimensions state
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [showDimensions, setShowDimensions] = useState(false);

  // Check if in select mode (drawMode === "select")
  const isSelectMode = drawMode === "select";

  // Check if in move mode (drawMode === "move")
  const isMoveMode = drawMode === "move";

  // Handle move for floors
  const handleMoveFloor = useCallback((floorId: string, deltaX: number, deltaY: number) => {
    const floor = floors.find(f => f.id === floorId);
    if (!floor) return;
    updateFloorPlanFloor(floorId, {
      x: floor.x + deltaX,
      y: floor.y + deltaY,
    });
  }, [floors, updateFloorPlanFloor]);

  // Handle move for walls
  const handleMoveWall = useCallback((wallId: string, deltaX: number, deltaY: number) => {
    const wall = walls.find(w => w.id === wallId);
    if (!wall || !wall.startPoint || !wall.endPoint) return;
    updateFloorPlanWall(wallId, {
      startPoint: {
        x: wall.startPoint.x + deltaX,
        y: wall.startPoint.y + deltaY,
      },
      endPoint: {
        x: wall.endPoint.x + deltaX,
        y: wall.endPoint.y + deltaY,
      },
    });
  }, [walls, updateFloorPlanWall]);

  // Handle move for drawn units
  const handleMoveUnit = useCallback((unitId: string, deltaX: number, deltaY: number) => {
    const unit = drawnUnits.find(u => u.id === unitId);
    if (!unit) return;
    updateDrawnUnitById(unitId, {
      box: {
        ...unit.box,
        x: unit.box.x + deltaX,
        y: unit.box.y + deltaY,
      },
    });
  }, [drawnUnits, updateDrawnUnitById]);

  // Handle keyboard delete for selected items
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        // Don't delete if user is typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }

        if (selectedWallId) {
          deleteFloorPlanWall(selectedWallId);
          setSelectedWallId(null);
          e.preventDefault();
        } else if (selectedFloorId) {
          deleteFloorPlanFloor(selectedFloorId);
          setSelectedFloorId(null);
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedWallId, selectedFloorId, deleteFloorPlanWall, deleteFloorPlanFloor]);

  // Clear all selections helper
  const clearAllSelections = useCallback(() => {
    setSelectedUnitId(null);
    setSelectedFloorId(null);
    setSelectedWallId(null);
    select3DModel(null);
  }, [select3DModel]);

  // Handle model selection
  const handleSelectModel = useCallback((modelId: string | null) => {
    select3DModel(modelId);
    // Deselect other items when selecting a model
    if (modelId) {
      setSelectedUnitId(null);
      setSelectedFloorId(null);
      setSelectedWallId(null);
    }
  }, [select3DModel]);

  // Handle unit selection - deselect others when selecting a unit
  const handleSelectUnit = useCallback((unitId: string | null) => {
    setSelectedUnitId(unitId);
    if (unitId) {
      select3DModel(null);
      setSelectedFloorId(null);
      setSelectedWallId(null);
    }
  }, [select3DModel]);

  // Handle adding kitchen run from drawing tool
  const handleAddKitchenRun = useCallback((type: "base" | "wall", run: { startPoint: { x: number; y: number }; endPoint: { x: number; y: number }; lengthFt: number }) => {
    // Determine default dimensions based on type
    const heightMm = type === "base" ? 850 : 600;
    const depthMm = type === "base" ? 600 : 350;

    // Calculate rotation angle (simple version - aligned with run direction)
    // For now, defaulting to 0 as runs will orient themselves based on start/end
    const rotation = 0;

    addKitchenRun(type, {
      ...run,
      wallId: "none", // Not attached to a specific wall yet
      rotation,
      heightMm,
      depthMm,
    });
  }, [addKitchenRun]);

  // Handle floor selection
  const handleSelectFloor = useCallback((floorId: string | null) => {
    setSelectedFloorId(floorId);
    if (floorId) {
      setSelectedUnitId(null);
      setSelectedWallId(null);
      select3DModel(null);
    }
  }, [select3DModel]);

  // Handle wall selection
  const handleSelectWall = useCallback((wallId: string | null) => {
    setSelectedWallId(wallId);
    if (wallId) {
      setSelectedUnitId(null);
      setSelectedFloorId(null);
      select3DModel(null);
    }
  }, [select3DModel]);

  // Camera controller reference
  const cameraControllerRef = useRef<{ zoomToFit: () => void; resetCamera: () => void } | null>(null);

  // Capture screenshot
  const captureScreenshot = useCallback(async (format: "png" | "jpg" = "png", quality = 0.92): Promise<string | null> => {
    if (!captureFunc.current) return null;

    const dataUrl = captureFunc.current();
    if (!dataUrl) return null;

    if (format === "jpg") {
      // Convert to JPEG
      const img = new Image();
      return new Promise((resolve) => {
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#1e293b"; // Background color
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/jpeg", quality));
          } else {
            resolve(dataUrl);
          }
        };
        img.src = dataUrl;
      });
    }

    return dataUrl;
  }, []);

  // Capture 360° panorama
  const capture360Panorama = useCallback(async (frames = 36): Promise<string[]> => {
    return new Promise((resolve) => {
      const capturedFrames: string[] = [];

      setPanoramaConfig({
        frames,
        onFrame: (dataUrl) => {
          capturedFrames.push(dataUrl);
        },
        onComplete: () => {
          setPanoramaConfig(null);
          resolve(capturedFrames);
        },
      });
    });
  }, []);

  // Export to PDF
  const exportToPDF = useCallback(async (title = "3D Room View"): Promise<void> => {
    const dataUrl = await captureScreenshot("png");
    if (!dataUrl) return;

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Add title
    pdf.setFontSize(18);
    pdf.setTextColor(30, 41, 59);
    pdf.text(title, 14, 15);

    // Add timestamp
    pdf.setFontSize(10);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

    // Add 3D render image
    const imgWidth = 267; // A4 landscape width minus margins
    const imgHeight = 150; // Proportional height
    pdf.addImage(dataUrl, "PNG", 14, 30, imgWidth, imgHeight);

    // Add view mode info
    pdf.setFontSize(9);
    pdf.text(`View Mode: ${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}`, 14, 188);

    // Download PDF
    pdf.save(`3d-room-${Date.now()}.pdf`);
  }, [captureScreenshot, viewMode]);

  // Zoom to fit function
  const zoomToFit = useCallback(() => {
    cameraControllerRef.current?.zoomToFit();
  }, []);

  // Reset camera function
  const resetCamera = useCallback(() => {
    cameraControllerRef.current?.resetCamera();
  }, []);

  // Toggle dimensions
  const toggleDimensions = useCallback(() => {
    setShowDimensions((prev) => !prev);
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    captureScreenshot,
    capture360Panorama,
    exportToPDF,
    zoomToFit,
    resetCamera,
  }), [captureScreenshot, capture360Panorama, exportToPDF, zoomToFit, resetCamera]);

  // Notify parent when export functions are ready
  useEffect(() => {
    if (onExportReady) {
      onExportReady({
        captureScreenshot,
        capture360Panorama,
        exportToPDF,
        zoomToFit,
        resetCamera,
      });
    }
  }, [onExportReady, captureScreenshot, capture360Panorama, exportToPDF, zoomToFit, resetCamera]);

  // Register capture function from child
  const handleCaptureReady = useCallback((func: () => string | null) => {
    captureFunc.current = func;
  }, []);

  const hasFloorPlan = floors.length > 0;
  // Always show 3D canvas - user can draw floor/walls directly in 3D even with no content
  // The empty state message is removed so user sees a blank 3D canvas ready for drawing
  const hasContent = true; // Always show 3D view when this component is rendered

  // Calculate camera configuration based on view mode and scene
  const cameraConfig = useMemo(() => {
    let centerX = 0, centerZ = 0, roomWidth = DEFAULT_ROOM_WIDTH, roomDepth = DEFAULT_ROOM_DEPTH;

    if (hasFloorPlan) {
      const floor = floors[0];
      centerX = ((floor.x + floor.width / 2) * scaleMmPerPx) * MM_TO_M;
      centerZ = ((floor.y + floor.height / 2) * scaleMmPerPx) * MM_TO_M;
      roomWidth = (floor.width * scaleMmPerPx) * MM_TO_M;
      roomDepth = (floor.height * scaleMmPerPx) * MM_TO_M;
    }

    const maxDim = Math.max(roomWidth, roomDepth);
    const distance = maxDim * 1.5;
    const targetY = 1.2; // Eye-level target height

    // Calculate position and target based on view mode
    switch (viewMode) {
      case "top":
        return {
          target: [centerX, 0, centerZ] as [number, number, number],
          position: [centerX, distance, centerZ] as [number, number, number],
          useOrtho: true,
          enableRotate: false, // Lock rotation for top view
        };
      case "front":
        return {
          target: [centerX, targetY, centerZ] as [number, number, number],
          position: [centerX, targetY, centerZ + distance] as [number, number, number],
          useOrtho: true,
          enableRotate: false,
        };
      case "left":
        return {
          target: [centerX, targetY, centerZ] as [number, number, number],
          position: [centerX - distance, targetY, centerZ] as [number, number, number],
          useOrtho: true,
          enableRotate: false,
        };
      case "right":
        return {
          target: [centerX, targetY, centerZ] as [number, number, number],
          position: [centerX + distance, targetY, centerZ] as [number, number, number],
          useOrtho: true,
          enableRotate: false,
        };
      case "isometric":
        // Classic isometric angle (45° rotation, ~35.264° elevation)
        const isoOffset = distance * 0.7;
        return {
          target: [centerX, targetY, centerZ] as [number, number, number],
          position: [centerX + isoOffset, targetY + isoOffset, centerZ + isoOffset] as [number, number, number],
          useOrtho: true,
          enableRotate: true,
        };
      case "perspective":
      default:
        return {
          target: [centerX, targetY, centerZ] as [number, number, number],
          position: [centerX + maxDim * 0.8, maxDim * 0.6, centerZ + maxDim * 0.8] as [number, number, number],
          useOrtho: false,
          enableRotate: true,
        };
    }
  }, [floors, scaleMmPerPx, hasFloorPlan, viewMode]);

  // Zoom factor
  const zoomFactor = zoomLevel / 100;
  const orthoZoom = ORTHO_ZOOM * zoomFactor;
  const perspectiveFov = 60 / zoomFactor;

  // Show empty state if nothing to display
  if (!hasContent) {
    return (
      <div className="w-full h-full bg-gradient-to-b from-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <p className="text-lg font-medium">No Content to Display</p>
          <p className="text-sm mt-2">Draw units or create a floor plan to see 3D view</p>
        </div>
      </div>
    );
  }

  // Calculate scene bounds for zoom to fit
  const sceneBounds = useMemo(() => {
    if (!hasContent) return null;

    const min = new THREE.Vector3(-DEFAULT_ROOM_WIDTH / 2, 0, -DEFAULT_ROOM_DEPTH / 2);
    const max = new THREE.Vector3(DEFAULT_ROOM_WIDTH / 2, DEFAULT_ROOM_HEIGHT, DEFAULT_ROOM_DEPTH / 2);

    if (hasFloorPlan && floors.length > 0) {
      const floor = floors[0];
      min.x = (floor.x * scaleMmPerPx) * MM_TO_M;
      min.z = (floor.y * scaleMmPerPx) * MM_TO_M;
      max.x = ((floor.x + floor.width) * scaleMmPerPx) * MM_TO_M;
      max.z = ((floor.y + floor.height) * scaleMmPerPx) * MM_TO_M;
      max.y = 3;
    }

    return { min, max };
  }, [hasFloorPlan, floors, scaleMmPerPx, hasContent]);

  // Handle camera controller ready
  const handleCameraControllerReady = useCallback((controller: { zoomToFit: () => void; resetCamera: () => void }) => {
    cameraControllerRef.current = controller;
  }, []);

  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-800 to-slate-900 relative">
      {/* Select Mode Indicator */}
      {isSelectMode && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-blue-600 px-3 py-1 rounded-full text-[10px] font-semibold text-white shadow-lg">
          SELECT MODE - Click on Floor or Wall to select
        </div>
      )}

      {/* Move Mode Indicator */}
      {isMoveMode && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-green-600 px-3 py-1 rounded-full text-[10px] font-semibold text-white shadow-lg">
          MOVE MODE - Drag selected Floor or Wall to reposition
        </div>
      )}

      {/* Floating toolbar for 3D controls */}
      <Toolbar3D
        onZoomToFit={zoomToFit}
        onResetCamera={resetCamera}
        selectedFloorId={selectedFloorId}
        selectedWallId={selectedWallId}
        selectedUnitId={selectedUnitId}
        onClearSelection={clearAllSelections}
        showDimensions={showDimensions}
        onToggleDimensions={toggleDimensions}
      />

      {/* Selected unit info */}
      {selectedUnitId && (
        <div className="absolute bottom-2 left-2 z-10 bg-slate-800/90 p-2 rounded-lg shadow-lg backdrop-blur-sm text-xs text-white">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Selected:</span>
            <span className="font-medium">{drawnUnits.find(u => u.id === selectedUnitId)?.unitType || "Unit"}</span>
            <button
              onClick={() => setSelectedUnitId(null)}
              className="ml-2 text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 3D Model Controls Panel */}
      {models3D.selectedModelId && (
        <Model3DControls className="absolute bottom-2 left-2 z-10 w-64" />
      )}

      {/* Selected Floor/Wall Info Panel */}
      {(isSelectMode || isMoveMode) && (selectedFloorId || selectedWallId) && (
        <div className="absolute bottom-2 left-2 z-10 bg-slate-800/90 p-3 rounded-lg shadow-lg backdrop-blur-sm text-xs text-white min-w-[200px]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-300">
              {selectedFloorId ? "Floor Selected" : "Wall Selected"}
            </span>
            <button
              onClick={clearAllSelections}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          {selectedFloorId && floors.find(f => f.id === selectedFloorId) && (() => {
            const floor = floors.find(f => f.id === selectedFloorId)!;
            const widthMm = floor.width * scaleMmPerPx;
            const depthMm = floor.height * scaleMmPerPx;
            return (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Width:</span>
                  <span className="text-amber-400 font-medium">{(widthMm / 1000).toFixed(2)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Depth:</span>
                  <span className="text-amber-400 font-medium">{(depthMm / 1000).toFixed(2)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Area:</span>
                  <span className="text-green-400 font-medium">{((widthMm / 1000) * (depthMm / 1000)).toFixed(2)} m²</span>
                </div>
              </div>
            );
          })()}
          {selectedWallId && walls.find(w => w.id === selectedWallId) && (() => {
            const wall = walls.find(w => w.id === selectedWallId)!;
            return (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Length:</span>
                  <span className="text-slate-200 font-medium">{(wall.lengthMm / 1000).toFixed(2)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Height:</span>
                  <span className="text-slate-200 font-medium">{(wall.heightMm / 1000).toFixed(2)}m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Thickness:</span>
                  <span className="text-slate-200 font-medium">{wall.thicknessMm}mm</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      <Suspense fallback={
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800/50">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-slate-400 border-t-blue-500 rounded-full mx-auto mb-2" />
            <p className="text-slate-400 text-sm">Loading 3D View...</p>
          </div>
        </div>
      }>
        <Canvas
          shadows
          className="!bg-transparent"
          style={{ width: '100%', height: '100%' }}
          gl={{ preserveDrawingBuffer: true }}
          onPointerMissed={clearAllSelections}
          raycaster={{ filter: (items) => items }}
        >
          {cameraConfig.useOrtho ? (
            <OrthographicCamera makeDefault zoom={orthoZoom} position={cameraConfig.position} near={0.1} far={1000} />
          ) : (
            <PerspectiveCamera makeDefault position={cameraConfig.position} fov={perspectiveFov} />
          )}
          {drawMode === "pan" && (
            <OrbitControls
              enablePan={true}
              enableZoom={true}
              enableRotate={cameraConfig.enableRotate}
              minDistance={1}
              maxDistance={50}
              maxPolarAngle={viewMode === "top" ? Math.PI : Math.PI / 2 - 0.05}
              target={cameraConfig.target}
            />
          )}
          <CameraController
            onReady={handleCameraControllerReady}
            defaultPosition={cameraConfig.position}
            defaultTarget={cameraConfig.target}
            sceneBounds={sceneBounds}
          />
          <Scene
            floors={floors}
            walls={walls}
            appliances={appliances}
            kitchenConfig={kitchenConfig}
            scaleMmPerPx={scaleMmPerPx}
            drawnUnits={drawnUnits}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            viewMode={viewMode}
            selectedUnitId={selectedUnitId}
            onSelectUnit={handleSelectUnit}
            showDimensions={showDimensions}
            imported3DModels={models3D.models}
            selectedModelId={models3D.selectedModelId}
            onSelectModel={handleSelectModel}
            isSelectMode={isSelectMode}
            isMoveMode={isMoveMode}
            selectedFloorId={selectedFloorId}
            onSelectFloor={handleSelectFloor}
            onMoveFloor={handleMoveFloor}
            selectedWallId={selectedWallId}
            onSelectWall={handleSelectWall}
            onMoveWall={handleMoveWall}
            onMoveUnit={handleMoveUnit}
          />
          <Drawing3DInteraction
            drawMode={drawMode}
            scaleMmPerPx={scaleMmPerPx}
            onAddWall={addFloorPlanWall}
            onAddFloor={addFloorPlanFloor}
            onAddKitchenRun={handleAddKitchenRun}
          />
          <ScreenshotCapture onCapture={handleCaptureReady} panoramaConfig={panoramaConfig} />
        </Canvas>
      </Suspense>
    </div>
  );
});

FloorPlan3D.displayName = "FloorPlan3D";

export default FloorPlan3D;
