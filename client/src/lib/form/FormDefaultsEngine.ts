/**
 * FormDefaultsEngine
 *
 * Handles default values for cabinet forms including:
 * - Default cabinet model
 * - Default laminate codes
 * - Default grain toggles
 * - Default shutter data
 * - Default shelves + center post
 * - Default back-panel plywood brand
 *
 * Extracted from home.tsx for reuse across:
 * - CSV import
 * - Design Center
 * - Quotation
 * - Templates
 */

import type { Cabinet } from '@shared/schema';

// ============================================================================
// Types
// ============================================================================

export interface MasterDefaults {
  plywoodBrand: string;
  laminateCode: string;
  innerLaminateCode: string;
}

export interface CabinetMemory {
  height?: number;
  width?: number;
  depth?: number;
  widthReduction?: number;
  roomName?: string;
  plywoodType?: string;
  backPanelPlywoodBrand?: string;
  shutterPlywoodBrand?: string;
  topPanelLaminateCode?: string;
  bottomPanelLaminateCode?: string;
  leftPanelLaminateCode?: string;
  rightPanelLaminateCode?: string;
  backPanelLaminateCode?: string;
  topPanelInnerLaminateCode?: string;
  bottomPanelInnerLaminateCode?: string;
  leftPanelInnerLaminateCode?: string;
  rightPanelInnerLaminateCode?: string;
  backPanelInnerLaminateCode?: string;
  backPanelWidthReduction?: number;
  backPanelHeightReduction?: number;
  shutterLaminateCode?: string;
  shutterInnerLaminateCode?: string;
}

export interface ShutterMemory {
  shutterLaminateCode?: string;
  shutterInnerLaminateCode?: string;
  shutterPlywoodBrand?: string;
}

// ============================================================================
// Default Constants
// ============================================================================

export const DEFAULT_HEIGHT = 800;
export const DEFAULT_WIDTH = 600;
export const DEFAULT_DEPTH = 450;
export const DEFAULT_WIDTH_REDUCTION = 36;
export const DEFAULT_BACK_PANEL_PLYWOOD = 'Apple ply 6mm BWP';
export const DEFAULT_MAIN_PLYWOOD = 'Apple Ply 16mm BWP';

// ============================================================================
// Form Default Values (for useForm initialization)
// ============================================================================

/**
 * Get default cabinet values for form initialization.
 * Uses stored memory with master settings as fallback.
 */
export function getFormDefaultValues(
  generateUUID: () => string,
  cabinetIndex: number,
  storedMemory: CabinetMemory,
  masterDefaults: MasterDefaults
): Partial<Cabinet> {
  return {
    id: generateUUID(),
    name: `Shutter #${cabinetIndex}`,
    type: 'single',
    configurationMode: 'advanced',

    // Use stored memory or defaults
    height: storedMemory.height ?? DEFAULT_HEIGHT,
    width: storedMemory.width ?? DEFAULT_WIDTH,
    depth: storedMemory.depth ?? DEFAULT_DEPTH,
    widthReduction: storedMemory.widthReduction ?? DEFAULT_WIDTH_REDUCTION,

    // Center post defaults
    centerPostEnabled: false,
    centerPostQuantity: 1,
    centerPostHeight: 764,
    centerPostDepth: 430,
    centerPostLaminateCode: '',

    // Shelves defaults
    shelvesQuantity: 1,
    shelvesEnabled: false,
    shelvesLaminateCode: '',

    // Shutter defaults
    shuttersEnabled: false,
    shutterCount: 1,
    shutterType: 'Standard',
    shutterHeightReduction: 0,
    shutterWidthReduction: 0,
    shutters: [],

    // Use stored memory with master settings as fallback for laminates
    shutterLaminateCode: storedMemory.shutterLaminateCode ?? masterDefaults.laminateCode,
    shutterInnerLaminateCode: storedMemory.shutterInnerLaminateCode ?? masterDefaults.innerLaminateCode,
    topPanelLaminateCode: storedMemory.topPanelLaminateCode ?? masterDefaults.laminateCode,
    bottomPanelLaminateCode: storedMemory.bottomPanelLaminateCode ?? storedMemory.topPanelLaminateCode ?? masterDefaults.laminateCode,
    leftPanelLaminateCode: storedMemory.leftPanelLaminateCode ?? storedMemory.topPanelLaminateCode ?? masterDefaults.laminateCode,
    rightPanelLaminateCode: storedMemory.rightPanelLaminateCode ?? storedMemory.topPanelLaminateCode ?? masterDefaults.laminateCode,
    backPanelLaminateCode: storedMemory.backPanelLaminateCode ?? masterDefaults.laminateCode,

    // Use stored memory with master settings as fallback for inner laminates
    topPanelInnerLaminateCode: storedMemory.topPanelInnerLaminateCode ?? masterDefaults.innerLaminateCode,
    bottomPanelInnerLaminateCode: storedMemory.bottomPanelInnerLaminateCode ?? storedMemory.topPanelInnerLaminateCode ?? masterDefaults.innerLaminateCode,
    leftPanelInnerLaminateCode: storedMemory.leftPanelInnerLaminateCode ?? storedMemory.topPanelInnerLaminateCode ?? masterDefaults.innerLaminateCode,
    rightPanelInnerLaminateCode: storedMemory.rightPanelInnerLaminateCode ?? storedMemory.topPanelInnerLaminateCode ?? masterDefaults.innerLaminateCode,
    backPanelInnerLaminateCode: storedMemory.backPanelInnerLaminateCode ?? storedMemory.topPanelInnerLaminateCode ?? masterDefaults.innerLaminateCode,
    centerPostInnerLaminateCode: masterDefaults.innerLaminateCode,
    shelvesInnerLaminateCode: masterDefaults.innerLaminateCode,

    // Use stored memory with master settings as fallback for plywood
    plywoodType: storedMemory.plywoodType ?? masterDefaults.plywoodBrand,
    backPanelPlywoodBrand: storedMemory.backPanelPlywoodBrand ?? DEFAULT_BACK_PANEL_PLYWOOD,
    shutterPlywoodBrand: storedMemory.shutterPlywoodBrand ?? '',
    innerLaminateCode: masterDefaults.innerLaminateCode,

    // Grain direction fields - default to false for new forms
    topPanelGrainDirection: false,
    bottomPanelGrainDirection: false,
    leftPanelGrainDirection: false,
    rightPanelGrainDirection: false,
    backPanelGrainDirection: false,
    shutterGrainDirection: false,

    // PATCH 20: Gaddi fields - default to true (enabled)
    topPanelGaddi: true,
    bottomPanelGaddi: true,
    leftPanelGaddi: true,
    rightPanelGaddi: true,
    shutterGaddi: false
  };
}

// ============================================================================
// Form Reset Values (after adding a cabinet)
// ============================================================================

/**
 * Get cabinet values for form reset after adding a cabinet.
 * Uses memory values with computed grain directions.
 */
export function getFormResetValues(
  generateUUID: () => string,
  cabinetIndex: number,
  memory: CabinetMemory,
  shutterMemory: ShutterMemory,
  hasTopWoodGrain: boolean,
  hasBackWoodGrain: boolean
): Partial<Cabinet> {
  return {
    id: generateUUID(),
    name: `Shutter #${cabinetIndex}`,
    type: 'single',
    roomName: memory.roomName,
    height: memory.height ?? DEFAULT_HEIGHT,
    width: memory.width ?? DEFAULT_WIDTH,
    depth: memory.depth ?? DEFAULT_DEPTH,
    centerPostEnabled: false,
    centerPostQuantity: 1,
    centerPostHeight: (memory.height ?? DEFAULT_HEIGHT) - 36,
    centerPostDepth: (memory.depth ?? DEFAULT_DEPTH) - 20,
    centerPostLaminateCode: '',
    shelvesQuantity: 1,
    shelvesEnabled: false,
    shelvesLaminateCode: '',
    widthReduction: memory.widthReduction ?? DEFAULT_WIDTH_REDUCTION,

    shuttersEnabled: false,
    shutterCount: 1,
    shutterType: 'Standard',
    shutterHeightReduction: 0,
    shutterWidthReduction: 0,
    shutters: [],
    shutterLaminateCode: shutterMemory.shutterLaminateCode ?? '',
    shutterInnerLaminateCode: shutterMemory.shutterInnerLaminateCode ?? '',
    shutterGaddi: false,
    configurationMode: 'advanced',

    // Use ALL saved laminate codes
    topPanelLaminateCode: memory.topPanelLaminateCode ?? '',
    bottomPanelLaminateCode: memory.bottomPanelLaminateCode ?? memory.topPanelLaminateCode ?? '',
    leftPanelLaminateCode: memory.leftPanelLaminateCode ?? memory.topPanelLaminateCode ?? '',
    rightPanelLaminateCode: memory.rightPanelLaminateCode ?? memory.topPanelLaminateCode ?? '',
    backPanelLaminateCode: memory.backPanelLaminateCode ?? '',

    // Use ALL saved inner laminate codes
    topPanelInnerLaminateCode: memory.topPanelInnerLaminateCode ?? '',
    bottomPanelInnerLaminateCode: memory.bottomPanelInnerLaminateCode ?? memory.topPanelInnerLaminateCode ?? '',
    leftPanelInnerLaminateCode: memory.leftPanelInnerLaminateCode ?? memory.topPanelInnerLaminateCode ?? '',
    rightPanelInnerLaminateCode: memory.rightPanelInnerLaminateCode ?? memory.topPanelInnerLaminateCode ?? '',
    backPanelInnerLaminateCode: memory.backPanelInnerLaminateCode ?? memory.topPanelInnerLaminateCode ?? '',
    innerLaminateCode: '',

    // Use ALL saved plywood brands
    plywoodType: memory.plywoodType ?? DEFAULT_MAIN_PLYWOOD,
    backPanelPlywoodBrand: memory.backPanelPlywoodBrand ?? DEFAULT_BACK_PANEL_PLYWOOD,
    shutterPlywoodBrand: shutterMemory.shutterPlywoodBrand ?? '',

    // Initialize grain directions from database preferences
    topPanelGrainDirection: hasTopWoodGrain,
    bottomPanelGrainDirection: hasTopWoodGrain,
    leftPanelGrainDirection: hasTopWoodGrain,
    rightPanelGrainDirection: hasTopWoodGrain,
    backPanelGrainDirection: hasBackWoodGrain,
    shutterGrainDirection: false,

    // PATCH 20: Gaddi fields - default to true (enabled)
    topPanelGaddi: true,
    bottomPanelGaddi: true,
    leftPanelGaddi: true,
    rightPanelGaddi: true
  };
}

// ============================================================================
// Cabinet Reset Values (for resetCabinetDefaults)
// ============================================================================

/**
 * Get cabinet values for resetting to defaults.
 * Used by resetToDefaults function.
 */
export function getCabinetResetDefaults(
  generateUUID: () => string,
  cabinetIndex: number,
  configurationMode: string,
  cabinetMemory: CabinetMemory,
  shutterMemory: ShutterMemory
): Partial<Cabinet> {
  return {
    id: generateUUID(),
    name: `Shutter #${cabinetIndex}`,
    type: 'single',
    configurationMode: configurationMode as any,
    height: cabinetMemory.height ?? DEFAULT_HEIGHT,
    width: cabinetMemory.width ?? DEFAULT_WIDTH,
    depth: cabinetMemory.depth ?? DEFAULT_DEPTH,
    centerPostEnabled: false,
    centerPostQuantity: 1,
    centerPostHeight: 764,
    centerPostDepth: 430,
    centerPostLaminateCode: '',
    shelvesQuantity: 1,
    shelvesEnabled: false,
    shelvesLaminateCode: '',
    widthReduction: cabinetMemory.widthReduction ?? DEFAULT_WIDTH_REDUCTION,
    backPanelWidthReduction: cabinetMemory.backPanelWidthReduction ?? 20,
    backPanelHeightReduction: cabinetMemory.backPanelHeightReduction ?? 20,
    shuttersEnabled: false,
    shutterCount: 1,
    shutterType: 'Standard',
    shutterHeightReduction: 0,
    shutterWidthReduction: 0,
    shutters: [],
    shutterLaminateCode: shutterMemory.shutterLaminateCode ?? '',
    shutterInnerLaminateCode: shutterMemory.shutterInnerLaminateCode ?? '',
    plywoodType: cabinetMemory.plywoodType ?? undefined,
    backPanelPlywoodBrand: cabinetMemory.backPanelPlywoodBrand ?? DEFAULT_BACK_PANEL_PLYWOOD,
    shutterPlywoodBrand: shutterMemory.shutterPlywoodBrand ?? undefined,
    topPanelLaminateCode: cabinetMemory.topPanelLaminateCode ?? '',
    bottomPanelLaminateCode: cabinetMemory.topPanelLaminateCode ?? '',
    leftPanelLaminateCode: cabinetMemory.topPanelLaminateCode ?? '',
    rightPanelLaminateCode: cabinetMemory.topPanelLaminateCode ?? '',
    backPanelLaminateCode: cabinetMemory.backPanelLaminateCode ?? '',
    topPanelInnerLaminateCode: cabinetMemory.topPanelInnerLaminateCode ?? '',
    bottomPanelInnerLaminateCode: cabinetMemory.bottomPanelInnerLaminateCode ?? '',
    leftPanelInnerLaminateCode: cabinetMemory.leftPanelInnerLaminateCode ?? '',
    rightPanelInnerLaminateCode: cabinetMemory.rightPanelInnerLaminateCode ?? '',
    backPanelInnerLaminateCode: cabinetMemory.backPanelInnerLaminateCode ?? '',
    innerLaminateCode: cabinetMemory.topPanelInnerLaminateCode ?? '',
    topPanelGrainDirection: false,
    bottomPanelGrainDirection: false,
    leftPanelGrainDirection: false,
    rightPanelGrainDirection: false,
    backPanelGrainDirection: false,
    shutterGrainDirection: false,

    // PATCH 20: Gaddi fields - default to true (enabled)
    topPanelGaddi: true,
    bottomPanelGaddi: true,
    leftPanelGaddi: true,
    rightPanelGaddi: true,
    shutterGaddi: false
  };
}

// ============================================================================
// Quick Cabinet Defaults
// ============================================================================

export interface QuickCabinetConfig {
  height: number;
  width: number;
  shutterQuantity: number;
  quantity: number;
}

/**
 * Get default cabinet values for quick cabinet creation.
 */
export function getQuickCabinetDefaults(
  generateUUID: () => string,
  cabinetName: string,
  cabinetType: string,
  config: QuickCabinetConfig,
  cabinetMemory: CabinetMemory,
  shutters: any[]
): Partial<Cabinet> {
  return {
    id: generateUUID(),
    name: cabinetName,
    type: cabinetType as any,
    configurationMode: 'advanced',
    height: config.height,
    width: config.width,
    depth: DEFAULT_DEPTH,
    centerPostEnabled: false,
    centerPostQuantity: 1,
    centerPostHeight: 764,
    centerPostDepth: 430,
    centerPostLaminateCode: '',
    shelvesQuantity: 1,
    shelvesEnabled: false,
    shelvesLaminateCode: '',
    widthReduction: DEFAULT_WIDTH_REDUCTION,
    shuttersEnabled: false,
    shutterCount: config.shutterQuantity,
    shutterType: 'Standard',
    shutterHeightReduction: 0,
    shutterWidthReduction: 0,
    shutters,
    topPanelLaminateCode: cabinetMemory.topPanelLaminateCode ?? '',
    bottomPanelLaminateCode: cabinetMemory.topPanelLaminateCode ?? '',
    leftPanelLaminateCode: cabinetMemory.topPanelLaminateCode ?? '',
    rightPanelLaminateCode: cabinetMemory.topPanelLaminateCode ?? '',
    backPanelLaminateCode: cabinetMemory.backPanelLaminateCode ?? '',
    topPanelInnerLaminateCode: '',
    bottomPanelInnerLaminateCode: '',
    leftPanelInnerLaminateCode: '',
    rightPanelInnerLaminateCode: '',
    backPanelInnerLaminateCode: '',
    centerPostInnerLaminateCode: '',
    shelvesInnerLaminateCode: '',
    innerLaminateCode: '',
    plywoodType: cabinetMemory.plywoodType ?? undefined,
    backPanelPlywoodBrand: cabinetMemory.backPanelPlywoodBrand ?? DEFAULT_BACK_PANEL_PLYWOOD,
    shutterPlywoodBrand: cabinetMemory.shutterPlywoodBrand ?? undefined,
    shutterLaminateCode: cabinetMemory.shutterLaminateCode ?? '',
    shutterInnerLaminateCode: cabinetMemory.shutterInnerLaminateCode ?? '',
    backPanelWidthReduction: 0,
    backPanelHeightReduction: 0,
    topPanelGrainDirection: false,
    bottomPanelGrainDirection: false,
    leftPanelGrainDirection: false,
    rightPanelGrainDirection: false,
    backPanelGrainDirection: false,
    shutterGrainDirection: false,

    // PATCH 20: Gaddi fields - default to true (enabled)
    topPanelGaddi: true,
    bottomPanelGaddi: true,
    leftPanelGaddi: true,
    rightPanelGaddi: true,
    shutterGaddi: false
  };
}

// ============================================================================
// Grain Direction Helpers
// ============================================================================

/**
 * Compute whether a laminate code has wood grain preference enabled.
 */
export function hasWoodGrainPreference(
  laminateCode: string | undefined,
  woodGrainsPreferences: Record<string, boolean>
): boolean {
  if (!laminateCode) return false;
  const frontCode = laminateCode.split('+')[0].trim();
  return !!(frontCode && woodGrainsPreferences[frontCode] === true);
}
