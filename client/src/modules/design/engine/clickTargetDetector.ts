/**
 * Click Target Detector
 *
 * Pure functions for detecting what element was clicked on the canvas.
 * Extracts geometry logic from DesignCanvas for testability and reusability.
 */

import type { Shape, RectShape } from "../types";
import type { ModuleConfig, WardrobeSection } from "./shapeGenerator";

// ============================================================================
// TYPES
// ============================================================================

export type ClickTargetType = "panel" | "centerPost" | "section" | "shelf" | "outside" | "empty";

export interface ClickTarget {
  type: ClickTargetType;
  /** Panel ID if clicked on a carcass panel */
  panelId?: string;
  /** Section index (0-based) if clicked inside a section */
  sectionIndex?: number;
  /** Section type if clicked inside a section */
  sectionType?: string;
  /** Current shelf count for the section */
  shelfCount?: number;
  /** Post index if clicked on a center post */
  postIndex?: number;
  /** Shelf ID if clicked on a shelf */
  shelfId?: string;
}

export interface WardrobeBounds {
  ox: number;  // Origin X
  oy: number;  // Origin Y
  width: number;
  height: number;
  thickness: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get wardrobe bounds from shapes or moduleConfig
 */
export function getWardrobeBounds(
  moduleConfig: ModuleConfig,
  shapes: Shape[]
): WardrobeBounds | null {
  const { widthMm, heightMm, carcassThicknessMm } = moduleConfig;
  const T = carcassThicknessMm ?? 18;

  // Try MOD-LEFT first (wardrobe_carcass)
  let leftPanel = shapes.find(s => s.id === "MOD-LEFT") as RectShape | undefined;
  let topPanel = shapes.find(s => s.id === "MOD-TOP") as RectShape | undefined;

  // If MOD-LEFT not found, find bounds from all rect shapes
  if (!leftPanel) {
    const rectShapes = shapes.filter(s => s.type === "rect") as RectShape[];
    if (rectShapes.length === 0) return null;

    const minX = Math.min(...rectShapes.map(r => r.x));
    const minY = Math.min(...rectShapes.map(r => r.y));
    leftPanel = { type: "rect", id: "temp", x: minX, y: minY, w: T, h: heightMm } as RectShape;
    topPanel = { type: "rect", id: "temp", x: minX, y: minY, w: widthMm, h: T } as RectShape;
  }

  return {
    ox: leftPanel.x,
    oy: topPanel?.y ?? leftPanel.y,
    width: widthMm,
    height: heightMm,
    thickness: T,
  };
}

/**
 * Check if click is on a carcass panel (left, right, top, bottom)
 */
export function checkPanelClick(
  point: { x: number; y: number },
  bounds: WardrobeBounds
): string | null {
  const { ox, oy, width, height, thickness: T } = bounds;

  if (point.x < ox + T && point.x >= ox) return "left";
  if (point.x > ox + width - T && point.x <= ox + width) return "right";
  if (point.y < oy + T && point.y >= oy) return "top";
  if (point.y > oy + height - T && point.y <= oy + height) return "bottom";

  return null;
}

/**
 * Check if click is on a center post
 */
export function checkCenterPostClick(
  point: { x: number; y: number },
  bounds: WardrobeBounds,
  postCount: number
): number | null {
  if (postCount <= 0) return null;

  const { ox, width, thickness: T } = bounds;
  const innerW = width - T * 2;
  const totalPostThickness = postCount * T;
  const sectionW = (innerW - totalPostThickness) / (postCount + 1);

  for (let i = 1; i <= postCount; i++) {
    const postX = ox + T + sectionW * i + T * (i - 1);
    if (point.x >= postX && point.x <= postX + T) {
      return i;
    }
  }

  return null;
}

/**
 * Detect which section was clicked (for sections array)
 */
export function detectSectionFromSectionsArray(
  point: { x: number; y: number },
  bounds: WardrobeBounds,
  sections: WardrobeSection[]
): { index: number; section: WardrobeSection } | null {
  const { ox, width, thickness: T } = bounds;
  const innerWidth = width - T * 2;
  const partitionCount = Math.max(0, sections.length - 1);
  const availableWidth = innerWidth - partitionCount * T;
  const autoWidth = sections.length > 0 ? availableWidth / sections.length : innerWidth;

  let currentX = ox + T;

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const secW = section.widthMm > 0 ? section.widthMm : autoWidth;
    const secEnd = currentX + secW;

    if (point.x >= currentX && point.x < secEnd) {
      return { index: i, section };
    }

    currentX = secEnd + T;
  }

  return null;
}

/**
 * Detect which section was clicked (for wardrobe_carcass without explicit sections)
 */
export function detectSectionFromPostCount(
  point: { x: number; y: number },
  bounds: WardrobeBounds,
  postCount: number
): number {
  const { ox, width, thickness: T } = bounds;
  const numSections = postCount + 1;
  const innerWidth = width - T * 2;
  const totalPostThickness = postCount * T;
  const sectionW = (innerWidth - totalPostThickness) / numSections;

  let currentX = ox + T;

  for (let i = 0; i < numSections; i++) {
    const secEnd = currentX + sectionW;

    if (point.x >= currentX && point.x < secEnd) {
      return i;
    }

    currentX = secEnd + T;
  }

  return 0; // Default to first section
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Determine what element was clicked on the canvas
 *
 * @param svgPoint - Click position in SVG coordinates
 * @param moduleConfig - Current module configuration
 * @param shapes - Current shapes array
 * @returns ClickTarget describing what was clicked
 */
export function getClickTarget(
  svgPoint: { x: number; y: number },
  moduleConfig: ModuleConfig | null,
  shapes: Shape[]
): ClickTarget {
  // No module config - nothing to detect
  if (!moduleConfig) {
    return { type: "empty" };
  }

  const { unitType, sections } = moduleConfig;

  // Only wardrobe types support click detection
  if (unitType !== "wardrobe" && unitType !== "wardrobe_carcass") {
    return { type: "empty" };
  }

  // Get wardrobe bounds
  const bounds = getWardrobeBounds(moduleConfig, shapes);
  if (!bounds) {
    return { type: "empty" };
  }

  const { ox, oy, width, height } = bounds;

  // Check if click is outside wardrobe bounds
  if (svgPoint.x < ox || svgPoint.x > ox + width ||
      svgPoint.y < oy || svgPoint.y > oy + height) {
    return { type: "outside" };
  }

  // Check if click is on a carcass panel
  const panelKey = checkPanelClick(svgPoint, bounds);
  if (panelKey) {
    const panelIdMap: Record<string, string> = {
      left: "MOD-LEFT",
      right: "MOD-RIGHT",
      top: "MOD-TOP",
      bottom: "MOD-BOTTOM",
    };
    return {
      type: "panel",
      panelId: panelIdMap[panelKey],
    };
  }

  // Check if click is on a center post
  const postCount = moduleConfig.centerPostCount ?? 0;
  const postIndex = checkCenterPostClick(svgPoint, bounds, postCount);
  if (postIndex !== null) {
    return {
      type: "centerPost",
      postIndex,
    };
  }

  // Detect section
  if (sections && sections.length > 0) {
    const result = detectSectionFromSectionsArray(svgPoint, bounds, sections);
    if (result) {
      // Only return section for types that support shelves
      if (result.section.type === "shelves" || result.section.type === "short_hang") {
        return {
          type: "section",
          sectionIndex: result.index,
          sectionType: result.section.type,
          shelfCount: result.section.shelfCount ?? 0,
        };
      }
    }
  } else {
    // For wardrobe_carcass without explicit sections
    const sectionIndex = detectSectionFromPostCount(svgPoint, bounds, postCount);
    return {
      type: "section",
      sectionIndex,
      sectionType: "shelves",
      shelfCount: 0,
    };
  }

  return { type: "empty" };
}

/**
 * Convert client coordinates to SVG coordinates
 */
export function clientToSvgCoordinates(
  clientX: number,
  clientY: number,
  svg: SVGSVGElement
): { x: number; y: number } | null {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;

  const ctm = svg.getScreenCTM();
  if (!ctm) return null;

  const svgPoint = point.matrixTransform(ctm.inverse());
  return { x: svgPoint.x, y: svgPoint.y };
}

/**
 * Calculate menu position to avoid going off-screen
 */
export function calculateMenuPosition(
  clientX: number,
  clientY: number,
  menuWidth: number = 220,
  menuHeight: number = 200
): { x: number; y: number } {
  const x = Math.min(clientX + 20, window.innerWidth - menuWidth);
  const y = Math.max(100, Math.min(clientY - 50, window.innerHeight - menuHeight));
  return { x, y };
}
