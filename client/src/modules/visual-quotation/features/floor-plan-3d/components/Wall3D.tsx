
import React, { useState, useRef, useCallback } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { logger } from '../../../services/logger';
import type { FloorPlanWall } from '../../state/types';

const MM_TO_M = 0.001;

export function Wall3D({
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

    const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
        if (!isSelectMode) return;
        e.stopPropagation();
        onSelect?.(wall.id);
    }, [isSelectMode, onSelect, wall.id]);

    const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (!isMoveMode || !isSelected) return;
        e.stopPropagation();
        setIsDragging(true);
        const point = e.point;
        dragStartRef.current = { x: point.x, z: point.z };
        document.body.style.cursor = "grabbing";
        (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    }, [isMoveMode, isSelected]);

    const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (!isDragging || !dragStartRef.current || !isMoveMode) return;
        e.stopPropagation();
        const point = e.point;
        const deltaXM = point.x - dragStartRef.current.x;
        const deltaZM = point.z - dragStartRef.current.z;
        const deltaXPx = (deltaXM / MM_TO_M) / scaleMmPerPx;
        const deltaYPx = (deltaZM / MM_TO_M) / scaleMmPerPx;
        onMove?.(wall.id, deltaXPx, deltaYPx);
        dragStartRef.current = { x: point.x, z: point.z };
    }, [isDragging, isMoveMode, scaleMmPerPx, wall.id, onMove]);

    const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (!isDragging) return;
        e.stopPropagation();
        setIsDragging(false);
        dragStartRef.current = null;
        document.body.style.cursor = isMoveMode ? "grab" : "default";
        (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
    }, [isDragging, isMoveMode]);

    const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (!isSelectMode && !isMoveMode) return;
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = isMoveMode && isSelected ? "grab" : "pointer";
    }, [isSelectMode, isMoveMode, isSelected]);

    const handlePointerOut = useCallback(() => {
        if (!isDragging) {
            setHovered(false);
            document.body.style.cursor = "default";
        }
    }, [isDragging]);

    if (!wall.startPoint || !wall.endPoint) {
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
