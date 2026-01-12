/**
 * PATCH 22: Pure Cabinet Preparation Function
 *
 * Extracts the pure data transformation logic from the add cabinet flow.
 * This function has NO side effects - it only transforms data.
 *
 * Side effects (state updates, toasts, focus, etc.) remain in the UI layer.
 */

import type { Cabinet } from "@shared/schema";

// ============================================================================
// Types
// ============================================================================

export interface PrepareCabinetInput {
  /** Raw cabinet data from form */
  cabinet: Cabinet;
  /** Current configuration mode from UI state */
  configurationMode: "basic" | "advanced";
  /** Wood grain preferences from database */
  woodGrainsPreferences: Record<string, boolean>;
}

export interface PrepareCabinetResult {
  /** Fully prepared cabinet ready for storage */
  cabinet: Cabinet;
  /** Whether this is a shutter-only (basic mode) cabinet */
  isShutterOnly: boolean;
}

// ============================================================================
// Pure Functions
// ============================================================================

/**
 * Compute grain directions based on laminate codes and wood grain preferences.
 * Pure function - no side effects.
 */
export function computeGrainDirections(
  cabinet: Cabinet,
  preferences: Record<string, boolean>
): Partial<Cabinet> {
  // Helper to safely extract base laminate code (before + sign)
  const extractBaseCode = (code: string | undefined): string =>
    (code || "").split("+")[0]?.trim() || "";

  // Extract front laminate codes
  const topCode = extractBaseCode(cabinet.topPanelLaminateCode);
  const bottomCode = extractBaseCode(cabinet.bottomPanelLaminateCode);
  const leftCode = extractBaseCode(cabinet.leftPanelLaminateCode);
  const rightCode = extractBaseCode(cabinet.rightPanelLaminateCode);
  const backCode = extractBaseCode(cabinet.backPanelLaminateCode);
  const shutterCode = extractBaseCode(cabinet.shutterLaminateCode);

  // Use inner laminate codes for shelves/center posts
  const shelvesCode = extractBaseCode(cabinet.shelvesInnerLaminateCode || cabinet.innerLaminateCode);
  const centerPostCode = extractBaseCode(cabinet.centerPostInnerLaminateCode || cabinet.innerLaminateCode);

  return {
    topPanelGrainDirection: preferences[topCode] === true,
    bottomPanelGrainDirection: preferences[bottomCode] === true,
    leftPanelGrainDirection: preferences[leftCode] === true,
    rightPanelGrainDirection: preferences[rightCode] === true,
    backPanelGrainDirection: preferences[backCode] === true,
    shutterGrainDirection: preferences[shutterCode] === true,
    shelvesGrainDirection: preferences[shelvesCode] === true,
    centerPostGrainDirection: preferences[centerPostCode] === true,
  };
}

/**
 * Normalize cabinet data with defaults for optional fields.
 * Pure function - no side effects.
 */
export function normalizeCabinetData(cabinet: Cabinet): Cabinet {
  return {
    ...cabinet,
    // Add defaults for inner laminate codes
    topPanelInnerLaminateCode: cabinet.topPanelInnerLaminateCode ?? "",
    bottomPanelInnerLaminateCode: cabinet.bottomPanelInnerLaminateCode ?? "",
    leftPanelInnerLaminateCode: cabinet.leftPanelInnerLaminateCode ?? "",
    rightPanelInnerLaminateCode: cabinet.rightPanelInnerLaminateCode ?? "",
    backPanelInnerLaminateCode: cabinet.backPanelInnerLaminateCode ?? "",
    shutterLaminateCode: cabinet.shutterLaminateCode ?? "",
    shutters: cabinet.shutters ?? [],
    innerLaminateCode: cabinet.innerLaminateCode ?? "",
    configurationMode: cabinet.configurationMode ?? "advanced",
  };
}

/**
 * Convert cabinet to shutter-only format for basic mode.
 * Pure function - no side effects.
 */
export function toShutterOnlyCabinet(cabinet: Cabinet): Cabinet {
  return {
    ...cabinet,
    configurationMode: "basic",
    depth: 0, // Zero depth signals shutter-only
    shuttersEnabled: true,
    shutterCount: cabinet.shutterCount || 1,
    shutterLaminateCode: cabinet.shutterLaminateCode || "",
    shutterInnerLaminateCode: cabinet.shutterInnerLaminateCode || "",
    shutters: [
      {
        width: cabinet.width,
        height: cabinet.height,
        laminateCode: cabinet.shutterLaminateCode || "",
      },
    ],
    // Clear carcass-related fields
    centerPostEnabled: false,
    shelvesEnabled: false,
  };
}

/**
 * Apply gaddi defaults to cabinet.
 * Pure function - no side effects.
 */
export function applyGaddiDefaults(cabinet: Cabinet): Cabinet {
  return {
    ...cabinet,
    topPanelGaddi: cabinet.topPanelGaddi ?? true,
    bottomPanelGaddi: cabinet.bottomPanelGaddi ?? true,
    leftPanelGaddi: cabinet.leftPanelGaddi ?? true,
    rightPanelGaddi: cabinet.rightPanelGaddi ?? true,
  };
}

/**
 * Main pure function to prepare a cabinet for storage.
 * Combines all transformations without side effects.
 */
export function prepareCabinet(input: PrepareCabinetInput): PrepareCabinetResult {
  const { cabinet, configurationMode, woodGrainsPreferences } = input;

  // Step 1: Set configuration mode
  let prepared: Cabinet = {
    ...cabinet,
    configurationMode,
  };

  // Step 2: Normalize cabinet data
  prepared = normalizeCabinetData(prepared);

  // Step 3: Handle basic mode (shutter-only)
  const isShutterOnly = configurationMode === "basic";
  if (isShutterOnly) {
    prepared = toShutterOnlyCabinet(prepared);
  }

  // Step 4: Apply gaddi defaults
  prepared = applyGaddiDefaults(prepared);

  // Step 5: Compute grain directions
  const grainDirections = computeGrainDirections(prepared, woodGrainsPreferences);
  prepared = {
    ...prepared,
    ...grainDirections,
  };

  return {
    cabinet: prepared,
    isShutterOnly,
  };
}

// ============================================================================
// Memory Extraction (for persistence - still pure)
// ============================================================================

export interface CabinetMemoryData {
  roomName?: string;
  customRoomName?: string;
  height?: number;
  width?: number;
  depth?: number;
  widthReduction?: number;
  plywoodType?: string;
  topPanelPlywoodBrand?: string;
  bottomPanelPlywoodBrand?: string;
  leftPanelPlywoodBrand?: string;
  rightPanelPlywoodBrand?: string;
  backPanelPlywoodBrand?: string;
  shutterPlywoodBrand?: string;
  topPanelLaminateCode?: string;
  bottomPanelLaminateCode?: string;
  leftPanelLaminateCode?: string;
  rightPanelLaminateCode?: string;
  backPanelLaminateCode?: string;
  shutterLaminateCode?: string;
  topPanelInnerLaminateCode?: string;
  bottomPanelInnerLaminateCode?: string;
  leftPanelInnerLaminateCode?: string;
  rightPanelInnerLaminateCode?: string;
  backPanelInnerLaminateCode?: string;
  shutterInnerLaminateCode?: string;
}

/**
 * Extract memory data from cabinet for persistence.
 * Pure function - no side effects.
 */
export function extractCabinetMemory(cabinet: Cabinet): CabinetMemoryData {
  return {
    roomName: cabinet.roomName,
    customRoomName: cabinet.roomName === "Manual Type" ? cabinet.roomName : undefined,
    height: cabinet.height,
    width: cabinet.width,
    depth: cabinet.depth,
    widthReduction: cabinet.widthReduction,
    plywoodType: cabinet.plywoodType,
    topPanelPlywoodBrand: (cabinet as any).topPanelPlywoodBrand,
    bottomPanelPlywoodBrand: (cabinet as any).bottomPanelPlywoodBrand,
    leftPanelPlywoodBrand: (cabinet as any).leftPanelPlywoodBrand,
    rightPanelPlywoodBrand: (cabinet as any).rightPanelPlywoodBrand,
    backPanelPlywoodBrand: cabinet.backPanelPlywoodBrand,
    shutterPlywoodBrand: cabinet.shutterPlywoodBrand,
    topPanelLaminateCode: cabinet.topPanelLaminateCode,
    bottomPanelLaminateCode: cabinet.bottomPanelLaminateCode,
    leftPanelLaminateCode: cabinet.leftPanelLaminateCode,
    rightPanelLaminateCode: cabinet.rightPanelLaminateCode,
    backPanelLaminateCode: cabinet.backPanelLaminateCode,
    shutterLaminateCode: cabinet.shutterLaminateCode,
    topPanelInnerLaminateCode: cabinet.topPanelInnerLaminateCode,
    bottomPanelInnerLaminateCode: cabinet.bottomPanelInnerLaminateCode,
    leftPanelInnerLaminateCode: cabinet.leftPanelInnerLaminateCode,
    rightPanelInnerLaminateCode: cabinet.rightPanelInnerLaminateCode,
    backPanelInnerLaminateCode: cabinet.backPanelInnerLaminateCode,
    shutterInnerLaminateCode: cabinet.shutterInnerLaminateCode,
  };
}

export interface ShutterMemoryData {
  shutterPlywoodBrand?: string;
  shutterLaminateCode?: string;
  shutterInnerLaminateCode?: string;
}

/**
 * Extract shutter memory data from cabinet for persistence.
 * Pure function - no side effects.
 */
export function extractShutterMemory(cabinet: Cabinet): ShutterMemoryData {
  return {
    shutterPlywoodBrand: cabinet.shutterPlywoodBrand,
    shutterLaminateCode: cabinet.shutterLaminateCode,
    shutterInnerLaminateCode: cabinet.shutterInnerLaminateCode,
  };
}
