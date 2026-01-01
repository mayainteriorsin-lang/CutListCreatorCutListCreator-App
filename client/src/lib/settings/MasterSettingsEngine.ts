/**
 * MasterSettingsEngine
 *
 * Handles:
 *  - Global plywood brand defaults
 *  - Global laminate code (front / inner) defaults
 *  - Sync-to-all logic when panelsLinked = true
 *  - Apply defaults to new cabinets
 *  - Cabinet update helpers for master settings changes
 *
 * Extracted from home.tsx for reuse across:
 * - CSV import
 * - Design Center
 * - Quotation Module
 * - Panel Builder
 * - PDF summary
 */

import type { Cabinet } from '@shared/schema';

// ============================================================================
// Types
// ============================================================================

export interface MasterSettings {
  masterPlywoodBrand: string | null;
  masterLaminateCode: string | null;
  masterInnerLaminateCode: string | null;
  optimizePlywoodUsage?: boolean | string;
}

export interface MasterDefaults {
  plywoodBrand: string;
  laminateCode: string;
  innerLaminateCode: string;
}

export interface SyncPanelFields {
  topPanelLaminateCode: string;
  bottomPanelLaminateCode: string;
  leftPanelLaminateCode: string;
  rightPanelLaminateCode: string;
}

export interface SyncInnerPanelFields {
  topPanelInnerLaminateCode: string;
  bottomPanelInnerLaminateCode: string;
  leftPanelInnerLaminateCode: string;
  rightPanelInnerLaminateCode: string;
}

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_PLYWOOD_BRAND = 'Apple Ply 16mm BWP';
export const DEFAULT_LAMINATE_CODE = '';
export const DEFAULT_INNER_LAMINATE_CODE = '';

// ============================================================================
// Master Defaults
// ============================================================================

/**
 * Get master defaults from settings or fallback values.
 */
export function getMasterDefaults(
  masterPlywoodBrand: string,
  masterLaminateCode: string,
  masterInnerLaminateCode: string,
  masterSettings?: Partial<MasterSettings> | null
): MasterDefaults {
  return {
    plywoodBrand: masterPlywoodBrand || (masterSettings as any)?.masterPlywoodBrand || DEFAULT_PLYWOOD_BRAND,
    laminateCode: masterLaminateCode || masterSettings?.masterLaminateCode || DEFAULT_LAMINATE_CODE,
    innerLaminateCode: masterInnerLaminateCode || (masterSettings as any)?.masterInnerLaminateCode || (masterSettings as any)?.innerLaminateCode || DEFAULT_INNER_LAMINATE_CODE
  };
}

/**
 * Apply master defaults to a new cabinet.
 * Comprehensive version that handles all panel fields and shutters.
 */
export function applyMasterDefaultsToCabinet(
  cabinet: Cabinet,
  defaults: MasterDefaults
): Cabinet {
  return {
    ...cabinet,
    A: cabinet.A ?? defaults.plywoodBrand,
    plywoodType: cabinet.plywoodType || defaults.plywoodBrand,
    B: (cabinet as any).B ?? defaults.laminateCode,
    C: (cabinet as any).C ?? defaults.innerLaminateCode,
    topPanelLaminateCode: cabinet.topPanelLaminateCode || defaults.laminateCode,
    bottomPanelLaminateCode: cabinet.bottomPanelLaminateCode || defaults.laminateCode,
    leftPanelLaminateCode: cabinet.leftPanelLaminateCode || defaults.laminateCode,
    rightPanelLaminateCode: cabinet.rightPanelLaminateCode || defaults.laminateCode,
    backPanelLaminateCode: cabinet.backPanelLaminateCode || defaults.laminateCode,
    shutterLaminateCode: cabinet.shutterLaminateCode || defaults.laminateCode,
    topPanelInnerLaminateCode: cabinet.topPanelInnerLaminateCode || defaults.innerLaminateCode,
    bottomPanelInnerLaminateCode: cabinet.bottomPanelInnerLaminateCode || defaults.innerLaminateCode,
    leftPanelInnerLaminateCode: cabinet.leftPanelInnerLaminateCode || defaults.innerLaminateCode,
    rightPanelInnerLaminateCode: cabinet.rightPanelInnerLaminateCode || defaults.innerLaminateCode,
    backPanelInnerLaminateCode: cabinet.backPanelInnerLaminateCode || defaults.innerLaminateCode,
    innerLaminateCode: cabinet.innerLaminateCode || defaults.innerLaminateCode,
    shutters: (cabinet.shutters || []).map(shutter => ({
      ...shutter,
      laminateCode: shutter.laminateCode || defaults.laminateCode,
      innerLaminateCode: (shutter as any).innerLaminateCode || defaults.innerLaminateCode
    }))
  };
}

// ============================================================================
// Sync Logic (when panelsLinked = true)
// ============================================================================

/**
 * Get synced panel values for front laminate when panels are linked.
 * Returns field values that should be set on all main panels (not back panel).
 */
export function getSyncedFrontLaminateValues(newValue: string): SyncPanelFields {
  return {
    topPanelLaminateCode: newValue,
    bottomPanelLaminateCode: newValue,
    leftPanelLaminateCode: newValue,
    rightPanelLaminateCode: newValue
  };
}

/**
 * Get synced panel values for inner laminate when panels are linked.
 * Returns field values that should be set on all main panels (not back panel).
 */
export function getSyncedInnerLaminateValues(newValue: string): SyncInnerPanelFields {
  return {
    topPanelInnerLaminateCode: newValue,
    bottomPanelInnerLaminateCode: newValue,
    leftPanelInnerLaminateCode: newValue,
    rightPanelInnerLaminateCode: newValue
  };
}

/**
 * Sync front laminate to all panels of a cabinet (for panelsLinked mode).
 * Back panel is NOT synced - it's always independent.
 */
export function syncFrontLaminateToAllPanels<T extends Partial<Cabinet>>(
  cabinet: T,
  masterLaminate: string
): T {
  return {
    ...cabinet,
    topPanelLaminateCode: masterLaminate,
    bottomPanelLaminateCode: masterLaminate,
    leftPanelLaminateCode: masterLaminate,
    rightPanelLaminateCode: masterLaminate
    // Note: backPanelLaminateCode is NOT synced - always independent
  };
}

/**
 * Sync inner laminate to all panels of a cabinet (for panelsLinked mode).
 * Back panel is NOT synced - it's always independent.
 */
export function syncInnerLaminateToAllPanels<T extends Partial<Cabinet>>(
  cabinet: T,
  masterInnerLaminate: string
): T {
  return {
    ...cabinet,
    topPanelInnerLaminateCode: masterInnerLaminate,
    bottomPanelInnerLaminateCode: masterInnerLaminate,
    leftPanelInnerLaminateCode: masterInnerLaminate,
    rightPanelInnerLaminateCode: masterInnerLaminate
    // Note: backPanelInnerLaminateCode is NOT synced - always independent
  };
}

// ============================================================================
// Cabinet Update Helpers (for master settings changes)
// ============================================================================

/**
 * Update all cabinets with new plywood brand (main panels only).
 * Back panel plywood is independent.
 */
export function updateCabinetsPlywood(cabinets: Cabinet[], newPlywood: string): Cabinet[] {
  return cabinets.map(cabinet => ({
    ...cabinet,
    plywoodType: newPlywood
    // backPanelPlywoodBrand is now independent
  }));
}

/**
 * Update all cabinets with new laminate code (all panels including back and shutters).
 */
export function updateCabinetsLaminateCode(cabinets: Cabinet[], newCode: string): Cabinet[] {
  return cabinets.map(cabinet => ({
    ...cabinet,
    topPanelLaminateCode: newCode,
    bottomPanelLaminateCode: newCode,
    leftPanelLaminateCode: newCode,
    rightPanelLaminateCode: newCode,
    backPanelLaminateCode: newCode,
    shutterLaminateCode: newCode
  }));
}

/**
 * Update all cabinets with new inner laminate code.
 */
export function updateCabinetsInnerLaminateCode(cabinets: Cabinet[], newCode: string): Cabinet[] {
  return cabinets.map(cabinet => ({
    ...cabinet,
    innerLaminateCode: newCode
  }));
}

/**
 * Update all cabinets with new wood grain settings.
 */
export function updateCabinetsWoodGrains(cabinets: Cabinet[], enabled: boolean): Cabinet[] {
  return cabinets.map(cabinet => ({
    ...cabinet,
    topPanelGrainDirection: enabled,
    bottomPanelGrainDirection: enabled,
    leftPanelGrainDirection: enabled,
    rightPanelGrainDirection: enabled,
    backPanelGrainDirection: enabled,
    shutterGrainDirection: enabled
  }));
}

// ============================================================================
// Plywood Brand Memory Helpers
// ============================================================================

/**
 * Check if a plywood brand exists in the memory list.
 */
export function plywoodBrandExists(brandMemory: string[], brand: string): boolean {
  return brandMemory.includes(brand);
}

/**
 * Check if a laminate code exists in the memory list.
 */
export function laminateCodeExists(laminateMemory: string[], code: string): boolean {
  return laminateMemory.includes(code);
}

// ============================================================================
// Initialization Helpers
// ============================================================================

/**
 * Initialize master plywood brand from settings or options.
 */
export function initializeMasterPlywoodBrand(
  currentValue: string,
  masterSettings: Partial<MasterSettings> | null | undefined,
  plywoodOptions: Array<{ brand: string }>,
  isLoading: boolean
): string | null {
  // Already have a value
  if (currentValue) return null;

  // Try from master settings
  const masterBrand = (masterSettings as any)?.masterPlywoodBrand;
  if (masterBrand) return masterBrand;

  // Fallback to first option if not loading and options available
  if (!isLoading && plywoodOptions.length > 0) {
    return plywoodOptions[0].brand;
  }

  return null;
}

/**
 * Initialize master laminate code from settings.
 */
export function initializeMasterLaminateCode(
  currentValue: string,
  masterSettings: Partial<MasterSettings> | null | undefined
): string | null {
  if (currentValue) return null;

  if (masterSettings?.masterLaminateCode) {
    return masterSettings.masterLaminateCode;
  }

  return null;
}

/**
 * Initialize master inner laminate code from settings.
 */
export function initializeMasterInnerLaminateCode(
  currentValue: string,
  masterSettings: Partial<MasterSettings> | null | undefined
): string | null {
  if (currentValue) return null;

  const inner = (masterSettings as any)?.masterInnerLaminateCode ?? (masterSettings as any)?.innerLaminateCode;
  if (inner) return inner;

  return null;
}

/**
 * Parse optimize plywood usage setting from backend.
 * Backend may store as string "true"/"false" or boolean.
 */
export function parseOptimizePlywoodUsage(
  masterSettings: Partial<MasterSettings> | null | undefined
): boolean | null {
  if (!masterSettings) return null;

  const val = (masterSettings as any).optimizePlywoodUsage;
  if (val === undefined) return null;

  return val === 'true' || val === true;
}
