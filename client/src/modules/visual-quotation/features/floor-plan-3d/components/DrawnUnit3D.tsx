
import React, { useState, useRef, useCallback } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { DrawnUnit } from '../../../types';
import { DimensionLabel, CabinetHandle, UNIT_COLORS } from './Shared';

const MM_TO_M = 0.001;
const DEFAULT_ROOM_WIDTH = 6;
const DEFAULT_ROOM_DEPTH = 5;
const DEFAULT_ROOM_HEIGHT = 3;

export function DrawnUnit3D({
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

    const widthM = unit.widthMm * MM_TO_M;
    const heightM = unit.heightMm * MM_TO_M;
    const depthM = unit.depthMm * MM_TO_M;

    let posX: number, posY: number, posZ: number;

    if (useFloorPlanCoords) {
        const unitCenterXPx = unit.box.x + unit.box.width / 2;
        const unitCenterYPx = unit.box.y + unit.box.height / 2;
        posX = (unitCenterXPx * scaleMmPerPx) * MM_TO_M;
        posZ = (unitCenterYPx * scaleMmPerPx) * MM_TO_M;
        posY = heightM / 2;
    } else {
        const scaleX = DEFAULT_ROOM_WIDTH / canvasWidth;
        const scaleY = DEFAULT_ROOM_HEIGHT / canvasHeight;

        const centerX = (unit.box.x + unit.box.width / 2) * scaleX - DEFAULT_ROOM_WIDTH / 2;
        const centerY = DEFAULT_ROOM_HEIGHT - (unit.box.y + unit.box.height / 2) * scaleY;

        posX = centerX;
        posY = centerY;
        posZ = -DEFAULT_ROOM_DEPTH / 2 + depthM / 2 + 0.02;
    }

    const loftHeightM = unit.loftEnabled ? unit.loftHeightMm * MM_TO_M : 0;
    const shutterSections = unit.shutterDividerXs.length + 1;
    const sectionWidth = widthM / shutterSections;

    const bodyColor = isSelected ? (isMoveMode ? "#86efac" : "#4f94cd") : hovered ? colors.body : colors.body;
    const emissiveIntensity = isSelected ? 0.15 : hovered ? 0.05 : 0;

    const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
        if (!isSelectMode && !isMoveMode) return;
        e.stopPropagation();
        onSelect?.(unit.id);
    }, [isSelectMode, isMoveMode, onSelect, unit.id]);

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
        onMove?.(unit.id, deltaXPx, deltaYPx);
        dragStartRef.current = { x: point.x, z: point.z };
    }, [isDragging, isMoveMode, scaleMmPerPx, unit.id, onMove]);

    const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (!isDragging) return;
        e.stopPropagation();
        setIsDragging(false);
        dragStartRef.current = null;
        document.body.style.cursor = isMoveMode ? "grab" : "default";
        (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
    }, [isDragging, isMoveMode]);

    const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = isMoveMode && isSelected ? "grab" : "pointer";
    }, [isMoveMode, isSelected]);

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

            {/* Shutter lines */}
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

            {/* Handles */}
            {Array.from({ length: shutterSections }).map((_, idx) => {
                const sectionCenterX = -widthM / 2 + sectionWidth * (idx + 0.5);
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

            {/* Loft */}
            {unit.loftEnabled && loftHeightM > 0 && (
                <mesh position={[0, posY + heightM / 2 + loftHeightM / 2 + 0.01, 0]} castShadow receiveShadow>
                    <boxGeometry args={[widthM, loftHeightM, depthM]} />
                    <meshStandardMaterial color={colors.accent} />
                </mesh>
            )}

            {/* Dimensions */}
            {showDimensions && (
                <>
                    <DimensionLabel
                        position={[0, posY + heightM / 2 + 0.15, depthM / 2 + 0.1]}
                        text={`${unit.widthMm}mm`}
                    />
                    <DimensionLabel
                        position={[widthM / 2 + 0.15, posY, depthM / 2 + 0.1]}
                        text={`${unit.heightMm}mm`}
                    />
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
