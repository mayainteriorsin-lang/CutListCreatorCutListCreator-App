
import React, { useState, useMemo, useCallback } from 'react';
import { useThree, ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useDesignCanvasStore } from '../../../store/v2/useDesignCanvasStore';
import type { FloorPlanWall, FloorPlanFloor } from '../../state/types';

const MM_TO_M = 0.001;

interface DrawingLayerProps {
    scaleMmPerPx: number;
}

export function DrawingLayer({ scaleMmPerPx }: DrawingLayerProps) {
    const drawMode = useDesignCanvasStore(s => s.floorPlan.drawMode);
    const addFloorPlanWall = useDesignCanvasStore(s => s.addFloorPlanWall);
    const addFloorPlanFloor = useDesignCanvasStore(s => s.addFloorPlanFloor);
    const addKitchenRun = useDesignCanvasStore(s => s.addKitchenRun);

    const { camera, raycaster, pointer } = useThree();
    const [drawStart, setDrawStart] = useState<THREE.Vector3 | null>(null);
    const [drawCurrent, setDrawCurrent] = useState<THREE.Vector3 | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const floorPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

    // Get point on floor plane
    const getFloorPoint = useCallback(() => {
        raycaster.setFromCamera(pointer, camera);
        const point = new THREE.Vector3();
        raycaster.ray.intersectPlane(floorPlane, point);
        return point;
    }, [camera, raycaster, pointer, floorPlane]);

    // Convert 3D point to 2D pixel coordinates
    const toPixelCoords = useCallback((point: THREE.Vector3) => {
        const xMm = point.x / MM_TO_M;
        const yMm = point.z / MM_TO_M;
        return {
            x: xMm / scaleMmPerPx,
            y: yMm / scaleMmPerPx,
        };
    }, [scaleMmPerPx]);

    // Handle pointer down - start drawing
    const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (['select', 'move', 'pan', 'none'].includes(drawMode)) return;

        e.stopPropagation();
        const point = getFloorPoint();
        if (!point) return;

        // Snap to grid (0.1m)
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

        // Ortho snapping for walls/kitchen
        if (['wall', 'kitchen_base', 'kitchen_wall'].includes(drawMode)) {
            const dx = Math.abs(point.x - drawStart.x);
            const dz = Math.abs(point.z - drawStart.z);
            if (dx > dz) {
                point.z = drawStart.z;
            } else {
                point.x = drawStart.x;
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

        const dx = drawCurrent.x - drawStart.x;
        const dz = drawCurrent.z - drawStart.z;
        const lengthM = Math.sqrt(dx * dx + dz * dz);
        const lengthMm = lengthM / MM_TO_M;

        // Minimum size check (100mm)
        if (lengthM < 0.1 && drawMode !== "floor") {
            setIsDrawing(false);
            setDrawStart(null);
            setDrawCurrent(null);
            return;
        }

        if (drawMode === "wall") {
            const angle = Math.atan2(dz, dx) * (180 / Math.PI);
            addFloorPlanWall({
                startPoint: { x: start2D.x, y: start2D.y },
                endPoint: { x: end2D.x, y: end2D.y },
                thicknessMm: 150,
                heightMm: 2700,
                lengthMm: lengthMm,
                rotation: angle,
                isExterior: false,
                openings: [],
            } as Omit<FloorPlanWall, "id">);
        } else if (drawMode === "floor") {
            const minX = Math.min(start2D.x, end2D.x);
            const minY = Math.min(start2D.y, end2D.y);
            const width = Math.abs(end2D.x - start2D.x);
            const height = Math.abs(end2D.y - start2D.y);

            if (width > 10 && height > 10) {
                addFloorPlanFloor({
                    x: minX,
                    y: minY,
                    width: width,
                    height: height,
                    color: "#e2e8f0",
                    shape: "rectangle",
                } as Omit<FloorPlanFloor, "id">);
            }
        } else if (drawMode === "kitchen_base" || drawMode === "kitchen_wall") {
            const lengthFt = lengthMm / 304.8;
            if (lengthFt >= 1) {
                addKitchenRun(
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
    }, [isDrawing, drawStart, drawCurrent, drawMode, toPixelCoords, addFloorPlanWall, addFloorPlanFloor, addKitchenRun]);

    const previewColor = useMemo(() => {
        switch (drawMode) {
            case "wall": return "#94a3b8";
            case "floor": return "#fbbf24";
            case "kitchen_base": return "#22c55e";
            case "kitchen_wall": return "#3b82f6";
            default: return "#6366f1";
        }
    }, [drawMode]);

    if (['select', 'move', 'pan', 'none'].includes(drawMode)) return null;

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
                    {(['wall', 'kitchen_base', 'kitchen_wall'].includes(drawMode)) && (
                        <group>
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
