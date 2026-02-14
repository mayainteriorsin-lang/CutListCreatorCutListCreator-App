/**
 * useCanvasZoom
 *
 * Hook for canvas pinch-to-zoom and pan functionality on mobile.
 * Supports:
 * - Two-finger pinch to zoom in/out
 * - Two-finger pan when zoomed
 * - Double-tap to reset zoom
 */

import { useState, useCallback, useRef } from "react";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";

interface UseCanvasZoomProps {
  minScale?: number;
  maxScale?: number;
  stageRef: React.RefObject<Konva.Stage | null>;
}

interface UseCanvasZoomReturn {
  scale: number;
  position: { x: number; y: number };
  handleWheel: (e: KonvaEventObject<WheelEvent>) => void;
  handleTouchStart: (e: KonvaEventObject<TouchEvent>) => void;
  handleTouchMove: (e: KonvaEventObject<TouchEvent>) => void;
  handleTouchEnd: (e: KonvaEventObject<TouchEvent>) => void;
  resetZoom: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  isZoomed: boolean;
}

// Calculate distance between two touch points
function getDistance(p1: Touch, p2: Touch): number {
  return Math.sqrt(
    Math.pow(p2.clientX - p1.clientX, 2) + Math.pow(p2.clientY - p1.clientY, 2)
  );
}

// Calculate center point between two touches
function getCenter(p1: Touch, p2: Touch): { x: number; y: number } {
  return {
    x: (p1.clientX + p2.clientX) / 2,
    y: (p1.clientY + p2.clientY) / 2,
  };
}

export function useCanvasZoom({
  minScale = 0.5,
  maxScale = 3,
  stageRef,
}: UseCanvasZoomProps): UseCanvasZoomReturn {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Track touch state for pinch gesture
  const lastDistRef = useRef<number | null>(null);
  const lastCenterRef = useRef<{ x: number; y: number } | null>(null);
  const isPinchingRef = useRef(false);
  const lastTapRef = useRef<number>(0);

  // Handle mouse wheel zoom (desktop)
  const handleWheel = useCallback(
    (e: KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = scale;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const mousePointTo = {
        x: (pointer.x - position.x) / oldScale,
        y: (pointer.y - position.y) / oldScale,
      };

      // Zoom direction
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const scaleBy = 1.1;
      let newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
      newScale = Math.max(minScale, Math.min(maxScale, newScale));

      const newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };

      setScale(newScale);
      setPosition(newPos);
    },
    [scale, position, minScale, maxScale, stageRef]
  );

  // Handle touch start (detect pinch start)
  const handleTouchStart = useCallback((e: KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;

    // Check for double-tap to reset
    if (touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        // Double tap detected - reset zoom
        setScale(1);
        setPosition({ x: 0, y: 0 });
        lastTapRef.current = 0;
      } else {
        lastTapRef.current = now;
      }
    }

    // Initialize pinch tracking
    if (touches.length === 2) {
      e.evt.preventDefault();
      isPinchingRef.current = true;
      lastDistRef.current = getDistance(touches[0], touches[1]);
      lastCenterRef.current = getCenter(touches[0], touches[1]);
    }
  }, []);

  // Handle touch move (pinch gesture)
  const handleTouchMove = useCallback(
    (e: KonvaEventObject<TouchEvent>) => {
      const touches = e.evt.touches;

      // Handle pinch zoom
      if (touches.length === 2 && isPinchingRef.current) {
        e.evt.preventDefault();

        const newDist = getDistance(touches[0], touches[1]);
        const newCenter = getCenter(touches[0], touches[1]);

        if (lastDistRef.current && lastCenterRef.current) {
          // Calculate scale change
          const scaleFactor = newDist / lastDistRef.current;
          let newScale = scale * scaleFactor;
          newScale = Math.max(minScale, Math.min(maxScale, newScale));

          // Calculate pan movement
          const deltaX = newCenter.x - lastCenterRef.current.x;
          const deltaY = newCenter.y - lastCenterRef.current.y;

          setScale(newScale);
          setPosition((prev) => ({
            x: prev.x + deltaX,
            y: prev.y + deltaY,
          }));
        }

        lastDistRef.current = newDist;
        lastCenterRef.current = newCenter;
      }
    },
    [scale, minScale, maxScale]
  );

  // Handle touch end
  const handleTouchEnd = useCallback((e: KonvaEventObject<TouchEvent>) => {
    if (e.evt.touches.length < 2) {
      isPinchingRef.current = false;
      lastDistRef.current = null;
      lastCenterRef.current = null;
    }
  }, []);

  // Reset zoom to default
  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Zoom in by fixed amount
  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(maxScale, prev * 1.2));
  }, [maxScale]);

  // Zoom out by fixed amount
  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(minScale, prev / 1.2));
  }, [minScale]);

  return {
    scale,
    position,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetZoom,
    zoomIn,
    zoomOut,
    isZoomed: scale !== 1 || position.x !== 0 || position.y !== 0,
  };
}
