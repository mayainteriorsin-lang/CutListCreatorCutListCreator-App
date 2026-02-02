/**
 * Rates Configuration
 *
 * Local rate definitions for the design module pricing engine.
 * This decouples the design module from visual-quotation module.
 *
 * The RateConfig interface is compatible with WardrobeConfig from
 * visual-quotation, allowing seamless integration when needed.
 */

// ── Rate Configuration Interface ──────────────────────────────────────

/**
 * Carcass pricing breakdown (per sqft)
 */
export interface CarcassRates {
  materialPrice: number;
  thicknessPrice: number;
  edgeBandPrice: number;
}

/**
 * Shutter pricing breakdown (per sqft)
 */
export interface ShutterRates {
  materialPrice: number;
  finishPrice: number;
  handlePrice: number;
}

/**
 * Rate configuration for module pricing
 * Compatible with WardrobeConfig.carcass and WardrobeConfig.shutter
 */
export interface RateConfig {
  carcass: CarcassRates;
  shutter: ShutterRates;
}

// ── Default Prices (matching visual-quotation defaults) ───────────────

/** Carcass material prices per sqft */
export const CARCASS_MATERIAL_PRICES = {
  plywood: 650,
  mdf: 450,
  particle_board: 350,
  hdhmr: 550,
} as const;

/** Carcass thickness price additions per sqft */
export const CARCASS_THICKNESS_PRICES = {
  "18mm": 0,
  "25mm": 150,
} as const;

/** Edge band prices per sqft */
export const EDGE_BAND_PRICES = {
  "pvc_0.8mm": 50,
  "pvc_2mm": 100,
  "abs_2mm": 150,
} as const;

/** Shutter material prices per sqft */
export const SHUTTER_MATERIAL_PRICES = {
  laminate: 350,
  acrylic: 650,
  veneer: 550,
  lacquer: 750,
  membrane: 400,
} as const;

/** Shutter finish price additions per sqft */
export const SHUTTER_FINISH_PRICES = {
  matte: 0,
  gloss: 100,
  textured: 50,
  super_matte: 150,
} as const;

/** Handle type prices per sqft */
export const HANDLE_TYPE_PRICES = {
  j_profile: 50,
  g_profile: 75,
  knob: 25,
  bar: 100,
  concealed: 150,
  none: 0,
} as const;

// ── Default Configuration ─────────────────────────────────────────────

/**
 * Default rate configuration
 * Matches DEFAULT_WARDROBE_CONFIG from visual-quotation
 */
export const DEFAULT_RATE_CONFIG: RateConfig = {
  carcass: {
    materialPrice: CARCASS_MATERIAL_PRICES.plywood,     // 650
    thicknessPrice: CARCASS_THICKNESS_PRICES["18mm"],   // 0
    edgeBandPrice: EDGE_BAND_PRICES["pvc_2mm"],         // 100
  },
  shutter: {
    materialPrice: SHUTTER_MATERIAL_PRICES.laminate,    // 350
    finishPrice: SHUTTER_FINISH_PRICES.matte,           // 0
    handlePrice: HANDLE_TYPE_PRICES.j_profile,          // 50
  },
};

// ── Rate Calculation Functions ────────────────────────────────────────

/**
 * Calculate carcass rate from config
 * Rate = material + thickness + edge band (per sqft)
 */
export function getCarcassRate(config: RateConfig): number {
  return config.carcass.materialPrice + config.carcass.thicknessPrice + config.carcass.edgeBandPrice;
}

/**
 * Calculate shutter rate from config
 * Rate = material + finish + handle (per sqft)
 */
export function getShutterRate(config: RateConfig): number {
  return config.shutter.materialPrice + config.shutter.finishPrice + config.shutter.handlePrice;
}

/**
 * Calculate combined rate (carcass + shutter)
 */
export function getCombinedRate(config: RateConfig): number {
  return getCarcassRate(config) + getShutterRate(config);
}

/**
 * Create a rate config from custom prices
 */
export function createRateConfig(
  carcassMaterial: keyof typeof CARCASS_MATERIAL_PRICES = "plywood",
  carcassThickness: keyof typeof CARCASS_THICKNESS_PRICES = "18mm",
  edgeBand: keyof typeof EDGE_BAND_PRICES = "pvc_2mm",
  shutterMaterial: keyof typeof SHUTTER_MATERIAL_PRICES = "laminate",
  shutterFinish: keyof typeof SHUTTER_FINISH_PRICES = "matte",
  handleType: keyof typeof HANDLE_TYPE_PRICES = "j_profile"
): RateConfig {
  return {
    carcass: {
      materialPrice: CARCASS_MATERIAL_PRICES[carcassMaterial],
      thicknessPrice: CARCASS_THICKNESS_PRICES[carcassThickness],
      edgeBandPrice: EDGE_BAND_PRICES[edgeBand],
    },
    shutter: {
      materialPrice: SHUTTER_MATERIAL_PRICES[shutterMaterial],
      finishPrice: SHUTTER_FINISH_PRICES[shutterFinish],
      handlePrice: HANDLE_TYPE_PRICES[handleType],
    },
  };
}
