
import { useState, useCallback, useRef } from 'react';
import { ThreeEvent, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Constants
const MM_TO_M = 0.001;

export interface DragHandlers {
    onConfigsPointerDown: (e: ThreeEvent<PointerEvent>) => void;
    onConfigsPointerMove: (e: ThreeEvent<PointerEvent>) => void;
    onConfigsPointerUp: (e: ThreeEvent<PointerEvent>) => void;
    onConfigsPointerOver: (e: ThreeEvent<PointerEvent>) => void;
    onConfigsPointerOut: (e: ThreeEvent<PointerEvent>) => void;
    isDragging: boolean;
    hovered: boolean;
}

export interface UseDraggableProps {
    id: string;
    isSelected?: boolean;
    isMoveMode?: boolean;
    isSelectMode?: boolean;
    onSelect?: (id: string) => void;
    onMove?: (id: string, deltaX: number, deltaY: number) => void;
    scaleMmPerPx: number;
}

export function useInteractionEngine() {
    // Utility for grid snapping
    const snapToGrid = useCallback((val: number, step: number = 0.1) => {
        return Math.round(val / step) * step;
    }, []);

    // Utility for coordinate conversion
    const toPixelCoords = useCallback((point: THREE.Vector3, scaleMmPerPx: number) => {
        const xMm = point.x / MM_TO_M;
        const yMm = point.z / MM_TO_M; // Z is Y in 2D
        return {
            x: xMm / scaleMmPerPx,
            y: yMm / scaleMmPerPx,
        };
    }, []);

    return {
        snapToGrid,
        toPixelCoords
    };
}

// Hook for draggable objects (Walls, Floors, Units)
export function useDraggable({
    id,
    isSelected,
    isMoveMode,
    isSelectMode,
    onSelect,
    onMove,
    scaleMmPerPx
}: UseDraggableProps): DragHandlers {
    const [hovered, setHovered] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{ x: number; z: number } | null>(null);

    // Handle click - for select mode
    const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
        if (!isSelectMode) return;
        e.stopPropagation();
        onSelect?.(id);
    }, [isSelectMode, onSelect, id]);

    // Handle pointer down - start drag
    const onConfigsPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (!isMoveMode || !isSelected) return;
        e.stopPropagation();
        setIsDragging(true);
        const point = e.point;
        dragStartRef.current = { x: point.x, z: point.z };
        document.body.style.cursor = "grabbing";
        (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    }, [isMoveMode, isSelected]);

    // Handle pointer move - dragging
    const onConfigsPointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (!isDragging || !dragStartRef.current || !isMoveMode) return;
        e.stopPropagation();
        const point = e.point;
        const deltaXM = point.x - dragStartRef.current.x;
        const deltaZM = point.z - dragStartRef.current.z;

        // Convert from meters back to canvas pixels
        const deltaXPx = (deltaXM / MM_TO_M) / scaleMmPerPx;
        const deltaYPx = (deltaZM / MM_TO_M) / scaleMmPerPx;

        onMove?.(id, deltaXPx, deltaYPx);

        // Update drag start for continuous movement
        dragStartRef.current = { x: point.x, z: point.z };
    }, [isDragging, isMoveMode, scaleMmPerPx, id, onMove]);

    // Handle pointer up - end drag
    const onConfigsPointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (!isDragging) return;
        e.stopPropagation();
        setIsDragging(false);
        dragStartRef.current = null;
        document.body.style.cursor = isMoveMode ? "grab" : "default";
        (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
    }, [isDragging, isMoveMode]);

    // Hover handlers
    const onConfigsPointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (!isSelectMode && !isMoveMode) return;
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = isMoveMode && isSelected ? "grab" : "pointer";
    }, [isSelectMode, isMoveMode, isSelected]);

    const onConfigsPointerOut = useCallback((e: ThreeEvent<PointerEvent>) => {
        if (!isDragging) {
            setHovered(false);
            document.body.style.cursor = "default";
        }
    }, [isDragging]);

    return {
        onConfigsPointerDown,
        onConfigsPointerMove,
        onConfigsPointerUp,
        onConfigsPointerOver,
        onConfigsPointerOut,
        isDragging,
        hovered
    };
}
