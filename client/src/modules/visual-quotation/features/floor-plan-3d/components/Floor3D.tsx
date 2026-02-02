
import React, { useState, useRef, useCallback } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { Html, Grid } from '@react-three/drei';
import * as THREE from 'three';
import type { FloorPlanFloor } from '../../state/types';

const MM_TO_M = 0.001;

export function Floor3D({
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

    const widthMm = floor.width * scaleMmPerPx;
    const depthMm = floor.height * scaleMmPerPx;

    const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
        if (!isSelectMode) return;
        e.stopPropagation();
        onSelect?.(floor.id);
    }, [isSelectMode, onSelect, floor.id]);

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
        onMove?.(floor.id, deltaXPx, deltaYPx);
        dragStartRef.current = { x: point.x, z: point.z };
    }, [isDragging, isMoveMode, scaleMmPerPx, floor.id, onMove]);

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

    return (
        <group>
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
