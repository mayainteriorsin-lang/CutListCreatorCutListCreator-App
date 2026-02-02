/**
 * Design Module - Engine Barrel Export
 *
 * Central export point for all engine functionality.
 * Provides shape generation, panel cutlist generation, and pricing.
 */

// ── Shape Generator ──────────────────────────────────────────────────
export {
  generateModuleShapes,
  MODULE_DEFAULTS,
  DEFAULT_WARDROBE_SECTIONS,
} from "./shapeGenerator";

export type {
  ModuleConfig,
  WardrobeSection,
  WardrobeSectionType,
} from "./shapeGenerator";

// ── Panel Generator ──────────────────────────────────────────────────
export {
  generateModuleCutlistPanels,
  generateCuttingList,
  calculateBackPanelLayout,
  fitsInSheet,
  SHEET_WIDTH,
  SHEET_HEIGHT,
} from "./panelGenerator";

export type {
  ModuleCutlistPanel,
  CuttingListItem,
  BackPanelLayout,
} from "./panelGenerator";

// ── Pricing Engine ───────────────────────────────────────────────────
export {
  calculateModulePricing,
} from "./pricingEngine";

export type {
  ModulePricingResult,
} from "./pricingEngine";

// ── Rate Configuration ──────────────────────────────────────────────
export {
  DEFAULT_RATE_CONFIG,
  getCarcassRate,
  getShutterRate,
  getCombinedRate,
  createRateConfig,
  CARCASS_MATERIAL_PRICES,
  CARCASS_THICKNESS_PRICES,
  EDGE_BAND_PRICES,
  SHUTTER_MATERIAL_PRICES,
  SHUTTER_FINISH_PRICES,
  HANDLE_TYPE_PRICES,
} from "./rates";

export type {
  RateConfig,
  CarcassRates,
  ShutterRates,
} from "./rates";

// ── Validation ──────────────────────────────────────────────────────
export {
  validateModuleConfig,
  sanitizeModuleConfig,
  isValidModuleConfig,
  VALIDATION_LIMITS,
} from "./validation";

export type {
  ValidationError,
  ValidationResult,
} from "./validation";
