/**
 * Canvas Utility Functions
 *
 * Contains canvas capture functions, view transforms, and global refs.
 * Extracted from CanvasStage to enable reuse and reduce component size.
 */

import Konva from "konva";
import { useDesignCanvasStore } from "../../store/v2/useDesignCanvasStore";
import type { CanvasViewMode } from "../../types";

// Global stage ref for canvas capture
let globalStageRef: Konva.Stage | null = null;
// Global ref for grid group to hide during export
let globalGridGroupRef: Konva.Group | null = null;

/**
 * Set the global stage reference from the canvas component
 */
export function setGlobalStageRef(ref: Konva.Stage | null) {
  globalStageRef = ref;
}

/**
 * Get the global stage reference
 */
export function getGlobalStageRef(): Konva.Stage | null {
  return globalStageRef;
}

/**
 * Set the grid group reference for hiding during export
 */
export function setGridGroupRef(ref: Konva.Group | null) {
  globalGridGroupRef = ref;
}

/**
 * Get transform properties for different view modes
 * intensity is 0-100, where 100 is max effect
 */
export function getViewModeTransform(
  viewMode: CanvasViewMode,
  width: number,
  height: number,
  intensity: number = 50
) {
  const factor = intensity / 100; // Convert to 0-1 range

  switch (viewMode) {
    case "isometric":
      // Isometric: rotate and skew to create 3D effect
      return {
        rotation: -15 * factor,
        scaleX: 1,
        scaleY: 1 - 0.15 * factor, // 0.85 at max
        skewX: 0.3 * factor,
        skewY: 0,
        offsetX: width * 0.1 * factor,
        offsetY: -height * 0.05 * factor,
      };
    case "top":
      // Top/bird's eye: compress vertically to simulate looking from above
      return {
        rotation: 0,
        scaleX: 1,
        scaleY: 1 - 0.5 * factor, // 0.5 at max
        skewX: 0,
        skewY: 0,
        offsetX: 0,
        offsetY: -height * 0.25 * factor,
      };
    case "perspective":
      // Perspective: slight rotation with depth effect
      return {
        rotation: -10 * factor,
        scaleX: 1,
        scaleY: 1 - 0.1 * factor, // 0.9 at max
        skewX: 0.15 * factor,
        skewY: 0,
        offsetX: width * 0.05 * factor,
        offsetY: 0,
      };
    case "front":
    default:
      // Front view: no transformation
      return {
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        skewX: 0,
        skewY: 0,
        offsetX: 0,
        offsetY: 0,
      };
  }
}

/**
 * Capture the current canvas as a base64 PNG image
 * If units are drawn, captures only the region containing units (cropped)
 * Otherwise captures the full canvas
 * Grid is hidden during export for clean output
 */
export function captureCanvasImage(): string | null {
  if (!globalStageRef) return null;
  try {
    // Hide grid during export
    if (globalGridGroupRef) {
      globalGridGroupRef.hide();
    }

    // Get current drawn units from store to calculate bounds
    const { drawnUnits, wardrobeBox, loftBox } = useDesignCanvasStore.getState();

    // Calculate bounding box of all units
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    let hasUnits = false;

    // Include all saved drawn units
    drawnUnits.forEach((unit) => {
      if (unit.box && unit.box.width > 0 && unit.box.height > 0) {
        hasUnits = true;
        minX = Math.min(minX, unit.box.x);
        minY = Math.min(minY, unit.box.y);
        maxX = Math.max(maxX, unit.box.x + unit.box.width);
        maxY = Math.max(maxY, unit.box.y + unit.box.height);

        // Include loft if present
        if (unit.loftEnabled && unit.loftBox) {
          minY = Math.min(minY, unit.loftBox.y);
          maxX = Math.max(maxX, unit.loftBox.x + unit.loftBox.width);
          maxY = Math.max(maxY, unit.loftBox.y + unit.loftBox.height);
        }
      }
    });

    // Include current wardrobe box if being drawn
    if (wardrobeBox && wardrobeBox.width > 0 && wardrobeBox.height > 0) {
      hasUnits = true;
      minX = Math.min(minX, wardrobeBox.x);
      minY = Math.min(minY, wardrobeBox.y);
      maxX = Math.max(maxX, wardrobeBox.x + wardrobeBox.width);
      maxY = Math.max(maxY, wardrobeBox.y + wardrobeBox.height);
    }

    // Include current loft box if present
    if (loftBox && loftBox.width > 0 && loftBox.height > 0) {
      minY = Math.min(minY, loftBox.y);
      maxX = Math.max(maxX, loftBox.x + loftBox.width);
      maxY = Math.max(maxY, loftBox.y + loftBox.height);
    }

    let result: string | null = null;

    // If we have units, capture the cropped region with padding
    if (hasUnits && minX !== Infinity) {
      const padding = 30; // Padding around the units
      const bottomPadding = 40; // Extra padding at bottom for dimension labels
      const x = Math.max(0, minX - padding);
      const y = Math.max(0, minY - padding);
      const width = maxX - minX + padding * 2;
      const height = maxY - minY + padding + bottomPadding;

      result = globalStageRef.toDataURL({
        pixelRatio: 4, // 4K Ultra HD quality
        x,
        y,
        width,
        height,
      });
    } else {
      // Fallback: capture full canvas
      result = globalStageRef.toDataURL({ pixelRatio: 4 }); // 4K Ultra HD quality
    }

    // Restore grid visibility after export
    if (globalGridGroupRef) {
      globalGridGroupRef.show();
    }

    return result;
  } catch {
    // Restore grid visibility on error
    if (globalGridGroupRef) {
      globalGridGroupRef.show();
    }
    return null;
  }
}

/**
 * Capture a cropped region of the canvas as a base64 PNG image
 * @param bounds - The region to capture {x, y, width, height}
 * @param padding - Extra padding around the bounds (default 20px)
 */
export function captureCanvasRegion(
  bounds: { x: number; y: number; width: number; height: number },
  padding = 20
): string | null {
  if (!globalStageRef) return null;
  try {
    const x = Math.max(0, bounds.x - padding);
    const y = Math.max(0, bounds.y - padding);
    const width = bounds.width + padding * 2;
    const height = bounds.height + padding * 2;
    return globalStageRef.toDataURL({
      pixelRatio: 4, // 4K Ultra HD quality
      x,
      y,
      width,
      height,
    });
  } catch {
    return null;
  }
}
