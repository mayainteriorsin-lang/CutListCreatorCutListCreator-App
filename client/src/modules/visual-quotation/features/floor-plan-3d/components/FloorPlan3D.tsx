
import React, { useMemo, useRef, useCallback, useImperativeHandle, forwardRef, useState, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, OrthographicCamera } from "@react-three/drei";
import * as THREE from "three";
import jsPDF from "jspdf";
import { useDesignCanvasStore } from "../../../store/v2/useDesignCanvasStore";
import { logger } from "../../../services/logger";

// Layers
import { ExteriorLayer } from "../layers/ExteriorLayer";
import { UnitLayer } from "../layers/UnitLayer";
import { DrawingLayer } from "../layers/DrawingLayer";
import { GizmoLayer } from "../layers/GizmoLayer";

// Components
import { SceneLighting } from "./SceneLighting";
import { CameraController, ScreenshotCapture } from "./CameraUtils";

const MM_TO_M = 0.001;
const DEFAULT_ROOM_WIDTH = 6;
const DEFAULT_ROOM_DEPTH = 5;
const DEFAULT_ROOM_HEIGHT = 3;
const ORTHO_ZOOM = 80;

export type FloorPlan3DViewMode = "perspective" | "top" | "front" | "left" | "right" | "isometric";

export interface FloorPlan3DHandle {
  captureScreenshot: (format?: "png" | "jpg", quality?: number) => Promise<string | null>;
  capture360Panorama: (frames?: number) => Promise<string[]>;
  exportToPDF: (title?: string) => Promise<void>;
  zoomToFit: () => void;
  resetCamera: () => void;
}

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
  // Store Access
  const {
    floorPlan,
    select3DModel,
    deleteFloorPlanWall,
    deleteFloorPlanFloor
  } = useDesignCanvasStore();

  const { floors, scaleMmPerPx, walls } = floorPlan;

  // Local State for lightweight interactions
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [showDimensions, setShowDimensions] = useState(false);
  const [panoramaConfig, setPanoramaConfig] = useState<{
    frames: number;
    onFrame: (dataUrl: string) => void;
    onComplete: () => void;
  } | null>(null);

  // Refs
  const captureFunc = useRef<(() => string | null) | null>(null);
  const cameraControllerRef = useRef<{ zoomToFit: () => void; resetCamera: () => void } | null>(null);

  // Handlers - Selection
  const clearAllSelections = useCallback(() => {
    setSelectedUnitId(null);
    setSelectedFloorId(null);
    setSelectedWallId(null);
    select3DModel(null);
  }, [select3DModel]);

  const handleSelectFloor = useCallback((id: string) => {
    clearAllSelections();
    setSelectedFloorId(id);
  }, [clearAllSelections]);

  const handleSelectWall = useCallback((id: string) => {
    clearAllSelections();
    setSelectedWallId(id);
  }, [clearAllSelections]);

  // Keyboard support for deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

        if (selectedWallId) {
          deleteFloorPlanWall(selectedWallId);
          setSelectedWallId(null);
          e.preventDefault();
        } else if (selectedFloorId) {
          deleteFloorPlanFloor(selectedFloorId);
          setSelectedFloorId(null);
          e.preventDefault();
        }
        // Unit deletion is handled globally or in UnitLayer if we moved logic there, 
        // but typically deletion is a global app concern. 
        // For now, only wiring up Wall/Floor deletion as per legacy.
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedWallId, selectedFloorId, deleteFloorPlanWall, deleteFloorPlanFloor]);

  // Camera Actions
  const zoomToFit = useCallback(() => {
    cameraControllerRef.current?.zoomToFit();
  }, []);

  const resetCamera = useCallback(() => {
    cameraControllerRef.current?.resetCamera();
  }, []);

  // Export Actions
  const handleCaptureReady = useCallback((func: () => string | null) => {
    captureFunc.current = func;
  }, []);

  const captureScreenshot = useCallback(async (format: "png" | "jpg" = "png", quality = 0.92): Promise<string | null> => {
    if (!captureFunc.current) return null;
    const dataUrl = captureFunc.current();
    if (!dataUrl) return null;

    if (format === "jpg") {
      const img = new Image();
      return new Promise((resolve) => {
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#1e293b";
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

  const capture360Panorama = useCallback(async (frames = 36): Promise<string[]> => {
    return new Promise((resolve) => {
      const capturedFrames: string[] = [];
      setPanoramaConfig({
        frames,
        onFrame: (dataUrl) => capturedFrames.push(dataUrl),
        onComplete: () => {
          setPanoramaConfig(null);
          resolve(capturedFrames);
        },
      });
    });
  }, []);

  const exportToPDF = useCallback(async (title = "3D Room View"): Promise<void> => {
    const dataUrl = await captureScreenshot("png");
    if (!dataUrl) return;
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    pdf.setFontSize(18);
    pdf.setTextColor(30, 41, 59);
    pdf.text(title, 14, 15);
    pdf.setFontSize(10);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    pdf.addImage(dataUrl, "PNG", 14, 30, 267, 150);
    pdf.setFontSize(9);
    pdf.text(`View Mode: ${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)}`, 14, 188);
    pdf.save(`3d-room-${Date.now()}.pdf`);
  }, [captureScreenshot, viewMode]);

  // Expose API
  useImperativeHandle(ref, () => ({
    captureScreenshot,
    capture360Panorama,
    exportToPDF,
    zoomToFit,
    resetCamera,
  }), [captureScreenshot, capture360Panorama, exportToPDF, zoomToFit, resetCamera]);

  useEffect(() => {
    onExportReady?.({ captureScreenshot, capture360Panorama, exportToPDF, zoomToFit, resetCamera });
  }, [onExportReady, captureScreenshot, capture360Panorama, exportToPDF, zoomToFit, resetCamera]);


  // Camera Configuration calculation
  const hasFloorPlan = floors.length > 0;
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
    const targetY = 1.2;

    switch (viewMode) {
      case "top": return { target: [centerX, 0, centerZ], position: [centerX, distance, centerZ], useOrtho: true, enableRotate: false };
      case "front": return { target: [centerX, targetY, centerZ], position: [centerX, targetY, centerZ + distance], useOrtho: true, enableRotate: false };
      case "left": return { target: [centerX, targetY, centerZ], position: [centerX - distance, targetY, centerZ], useOrtho: true, enableRotate: false };
      case "right": return { target: [centerX, targetY, centerZ], position: [centerX + distance, targetY, centerZ], useOrtho: true, enableRotate: false };
      case "isometric":
        const isoOffset = distance * 0.7;
        return { target: [centerX, targetY, centerZ], position: [centerX + isoOffset, targetY + isoOffset, centerZ + isoOffset], useOrtho: true, enableRotate: true };
      default: return { target: [centerX, targetY, centerZ], position: [centerX + maxDim * 0.8, maxDim * 0.6, centerZ + maxDim * 0.8], useOrtho: false, enableRotate: true };
    }
  }, [floors, scaleMmPerPx, hasFloorPlan, viewMode]);

  // Scene Bounds for AutoZoom
  const sceneBounds = useMemo(() => {
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
  }, [hasFloorPlan, floors, scaleMmPerPx]);


  const zoomFactor = zoomLevel / 100;

  return (
    <div className="w-full h-full bg-gradient-to-b from-slate-800 to-slate-900 relative">
      <GizmoLayer
        onZoomToFit={zoomToFit}
        onResetCamera={resetCamera}
        showDimensions={showDimensions}
        onToggleDimensions={() => setShowDimensions(!showDimensions)}
        selectedFloorId={selectedFloorId}
        selectedWallId={selectedWallId}
        selectedUnitId={selectedUnitId}
        onClearSelection={clearAllSelections}
        setSelectedUnitId={setSelectedUnitId}
      />

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
            <OrthographicCamera makeDefault zoom={ORTHO_ZOOM * zoomFactor} position={cameraConfig.position as any} near={0.1} far={1000} />
          ) : (
            <PerspectiveCamera makeDefault position={cameraConfig.position as any} fov={60 / zoomFactor} />
          )}

          <OrbitControls
            makeDefault // Important for gizmos to work with controls
            enablePan={true}
            enableZoom={true}
            enableRotate={cameraConfig.enableRotate}
            minDistance={1}
            maxDistance={50}
            target={cameraConfig.target as any}
          />

          <SceneLighting floors={floors} scaleMmPerPx={scaleMmPerPx} />

          <ExteriorLayer
            scaleMmPerPx={scaleMmPerPx}
            selectedFloorId={selectedFloorId}
            selectedWallId={selectedWallId}
            onSelectFloor={handleSelectFloor}
            onSelectWall={handleSelectWall}
          />

          <UnitLayer
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
          />

          <DrawingLayer scaleMmPerPx={scaleMmPerPx} />

          <CameraController
            onReady={(controller) => { cameraControllerRef.current = controller; }}
            defaultPosition={cameraConfig.position as any}
            defaultTarget={cameraConfig.target as any}
            sceneBounds={sceneBounds}
          />

          <ScreenshotCapture onCapture={handleCaptureReady} panoramaConfig={panoramaConfig} />
        </Canvas>
      </Suspense>
    </div>
  );
});

FloorPlan3D.displayName = "FloorPlan3D";
export default FloorPlan3D;
