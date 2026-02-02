/**
 * Pricing types and constants for Visual Quotation module
 * Materials, finishes, add-ons, configuration
 */

// ============================================================================
// Draw Mode / Rate Mode Types
// ============================================================================

/**
 * RateMode - Determines which rates to display based on draw mode
 * - SHUTTER: Shows shutter rate only (default draw mode)
 * - SHUTTER_LOFT: Shows both shutter and loft rates
 * - LOFT_ONLY: Shows loft rate only
 */
export type RateMode = "SHUTTER" | "SHUTTER_LOFT" | "LOFT_ONLY";

/**
 * Quick rate preview for toolbar display
 */
export interface QuickRatePreview {
  mode: RateMode;
  summaryText: string; // e.g., "₹750/sqft" or "S: ₹400 | L: ₹1200"
  breakdown: {
    shutterRate?: number;
    loftRate?: number;
    carcassRate?: number;
  };
}

// ============================================================================
// Wardrobe Configuration Types
// ============================================================================

// Wardrobe configuration types
export type WardrobeType = "shutter" | "sliding" | "open";

export type WardrobeAddOn =
  | "carcass"
  | "shutter"
  | "loft"
  | "dresser"
  | "mirror"
  | "study_table"
  | "internal_drawers"
  | "pullout_trays"
  | "shoe_rack"
  | "tie_holder"
  | "trouser_hanger"
  | "led_lighting"
  // Kitchen-specific add-ons
  | "chimney"
  | "hob"
  | "sink"
  | "basket_carousel"
  | "cutlery_tray"
  | "bottle_pullout"
  | "tall_unit"
  | "magic_corner"
  | "tandem_box"
  | "dish_drainer"
  | "cup_saucer_holder"
  | "thali_basket"
  | "oil_pullout"
  | "masala_pullout"
  | "dustbin_pullout"
  | "microwave_unit"
  | "fridge_unit"
  | "granite_counter"
  | "profile_handle"
  | "led_strip"
  | "display_unit"
  | "book_shelf";

export type CarcassMaterial = "plywood" | "mdf" | "particle_board" | "hdhmr";
export type CarcassThickness = "18mm" | "25mm";
export type EdgeBand = "pvc_0.8mm" | "pvc_2mm" | "abs_2mm";

export type ShutterMaterial = "laminate" | "acrylic" | "veneer" | "lacquer" | "membrane";
export type ShutterFinish = "matte" | "gloss" | "textured" | "super_matte";
export type HandleType = "j_profile" | "g_profile" | "knob" | "bar" | "concealed" | "none";

export type PricingUnit = "sqft" | "unit" | "rft";

export interface AddOnPricing {
  id: WardrobeAddOn;
  name: string;
  enabled: boolean;
  pricePerUnit: number;
  pricingUnit: PricingUnit;
}

export interface MaterialPricing {
  material: string;
  pricePerSqft: number;
}

export interface WardrobeConfig {
  wardrobeType: WardrobeType;
  addOns: WardrobeAddOn[];
  addOnPricing: AddOnPricing[];
  carcass: {
    material: CarcassMaterial;
    thickness: CarcassThickness;
    edgeBand: EdgeBand;
    materialPrice: number;
    thicknessPrice: number;
    edgeBandPrice: number;
  };
  shutter: {
    material: ShutterMaterial;
    finish: ShutterFinish;
    handleType: HandleType;
    materialPrice: number;
    finishPrice: number;
    handlePrice: number;
  };
}

// Default add-on pricing arrays
export const DEFAULT_ADDON_PRICING: AddOnPricing[] = [
  { id: "loft", name: "Loft", enabled: false, pricePerUnit: 750, pricingUnit: "sqft" },
  { id: "dresser", name: "Dresser Unit", enabled: false, pricePerUnit: 850, pricingUnit: "sqft" },
  { id: "mirror", name: "Mirror", enabled: false, pricePerUnit: 800, pricingUnit: "sqft" },
  { id: "study_table", name: "Study Table", enabled: false, pricePerUnit: 700, pricingUnit: "sqft" },
  { id: "internal_drawers", name: "Internal Drawers", enabled: false, pricePerUnit: 2500, pricingUnit: "unit" },
  { id: "pullout_trays", name: "Pull-out Trays", enabled: false, pricePerUnit: 1800, pricingUnit: "unit" },
  { id: "shoe_rack", name: "Shoe Rack", enabled: false, pricePerUnit: 600, pricingUnit: "sqft" },
  { id: "tie_holder", name: "Tie Holder", enabled: false, pricePerUnit: 350, pricingUnit: "unit" },
  { id: "trouser_hanger", name: "Trouser Hanger", enabled: false, pricePerUnit: 1200, pricingUnit: "unit" },
  { id: "led_lighting", name: "LED Lighting", enabled: false, pricePerUnit: 150, pricingUnit: "rft" },
];

export const DEFAULT_KITCHEN_ADDON_PRICING: AddOnPricing[] = [
  { id: "loft", name: "Loft", enabled: false, pricePerUnit: 750, pricingUnit: "sqft" },
  { id: "chimney", name: "Chimney", enabled: false, pricePerUnit: 15000, pricingUnit: "unit" },
  { id: "hob", name: "Hob/Cooktop", enabled: false, pricePerUnit: 12000, pricingUnit: "unit" },
  { id: "sink", name: "Sink", enabled: false, pricePerUnit: 8000, pricingUnit: "unit" },
  { id: "basket_carousel", name: "Basket/Carousel", enabled: false, pricePerUnit: 4500, pricingUnit: "unit" },
  { id: "cutlery_tray", name: "Cutlery Tray", enabled: false, pricePerUnit: 1500, pricingUnit: "unit" },
  { id: "bottle_pullout", name: "Bottle Pull-out", enabled: false, pricePerUnit: 3500, pricingUnit: "unit" },
  { id: "tall_unit", name: "Tall Unit", enabled: false, pricePerUnit: 1200, pricingUnit: "sqft" },
  { id: "magic_corner", name: "Magic Corner", enabled: false, pricePerUnit: 8500, pricingUnit: "unit" },
  { id: "tandem_box", name: "Tandem Box", enabled: false, pricePerUnit: 3500, pricingUnit: "unit" },
  { id: "dish_drainer", name: "Dish Drainer", enabled: false, pricePerUnit: 2500, pricingUnit: "unit" },
  { id: "cup_saucer_holder", name: "Cup & Saucer Holder", enabled: false, pricePerUnit: 1800, pricingUnit: "unit" },
  { id: "thali_basket", name: "Thali Basket", enabled: false, pricePerUnit: 2200, pricingUnit: "unit" },
  { id: "oil_pullout", name: "Oil Pull-out", enabled: false, pricePerUnit: 2800, pricingUnit: "unit" },
  { id: "masala_pullout", name: "Masala Pull-out", enabled: false, pricePerUnit: 2500, pricingUnit: "unit" },
  { id: "dustbin_pullout", name: "Dustbin Pull-out", enabled: false, pricePerUnit: 3000, pricingUnit: "unit" },
  { id: "microwave_unit", name: "Microwave Unit", enabled: false, pricePerUnit: 900, pricingUnit: "sqft" },
  { id: "fridge_unit", name: "Fridge Unit", enabled: false, pricePerUnit: 900, pricingUnit: "sqft" },
  { id: "granite_counter", name: "Granite/Quartz Counter", enabled: false, pricePerUnit: 450, pricingUnit: "sqft" },
  { id: "profile_handle", name: "Profile Handle", enabled: false, pricePerUnit: 250, pricingUnit: "rft" },
  { id: "led_strip", name: "LED Strip", enabled: false, pricePerUnit: 180, pricingUnit: "rft" },
];

export const DEFAULT_TV_UNIT_ADDON_PRICING: AddOnPricing[] = [
  { id: "loft", name: "Loft", enabled: false, pricePerUnit: 750, pricingUnit: "sqft" },
  { id: "led_lighting", name: "LED Backlight", enabled: false, pricePerUnit: 200, pricingUnit: "rft" },
  { id: "internal_drawers", name: "Drawers", enabled: false, pricePerUnit: 2500, pricingUnit: "unit" },
  { id: "pullout_trays", name: "Pull-out Trays", enabled: false, pricePerUnit: 1800, pricingUnit: "unit" },
  { id: "mirror", name: "Mirror Panel", enabled: false, pricePerUnit: 800, pricingUnit: "sqft" },
  { id: "display_unit", name: "Display Shelf", enabled: false, pricePerUnit: 650, pricingUnit: "sqft" },
  { id: "profile_handle", name: "Profile Handle", enabled: false, pricePerUnit: 250, pricingUnit: "rft" },
];

export const DEFAULT_DRESSER_ADDON_PRICING: AddOnPricing[] = [
  { id: "mirror", name: "Mirror", enabled: false, pricePerUnit: 800, pricingUnit: "sqft" },
  { id: "internal_drawers", name: "Drawers", enabled: false, pricePerUnit: 2500, pricingUnit: "unit" },
  { id: "pullout_trays", name: "Jewelry Trays", enabled: false, pricePerUnit: 2000, pricingUnit: "unit" },
  { id: "led_lighting", name: "LED Lighting", enabled: false, pricePerUnit: 150, pricingUnit: "rft" },
  { id: "profile_handle", name: "Profile Handle", enabled: false, pricePerUnit: 250, pricingUnit: "rft" },
];

export const DEFAULT_STUDY_TABLE_ADDON_PRICING: AddOnPricing[] = [
  { id: "internal_drawers", name: "Drawers", enabled: false, pricePerUnit: 2500, pricingUnit: "unit" },
  { id: "pullout_trays", name: "Keyboard Tray", enabled: false, pricePerUnit: 1500, pricingUnit: "unit" },
  { id: "book_shelf", name: "Book Shelf", enabled: false, pricePerUnit: 600, pricingUnit: "sqft" },
  { id: "led_lighting", name: "Study Light", enabled: false, pricePerUnit: 800, pricingUnit: "unit" },
  { id: "profile_handle", name: "Profile Handle", enabled: false, pricePerUnit: 250, pricingUnit: "rft" },
];

export const DEFAULT_SHOE_RACK_ADDON_PRICING: AddOnPricing[] = [
  { id: "loft", name: "Top Storage", enabled: false, pricePerUnit: 750, pricingUnit: "sqft" },
  { id: "internal_drawers", name: "Drawers", enabled: false, pricePerUnit: 2500, pricingUnit: "unit" },
  { id: "pullout_trays", name: "Pull-out Racks", enabled: false, pricePerUnit: 1800, pricingUnit: "unit" },
  { id: "mirror", name: "Mirror Door", enabled: false, pricePerUnit: 800, pricingUnit: "sqft" },
  { id: "led_lighting", name: "LED Lighting", enabled: false, pricePerUnit: 150, pricingUnit: "rft" },
];

export const DEFAULT_BOOK_SHELF_ADDON_PRICING: AddOnPricing[] = [
  { id: "loft", name: "Top Storage", enabled: false, pricePerUnit: 750, pricingUnit: "sqft" },
  { id: "internal_drawers", name: "Drawers", enabled: false, pricePerUnit: 2500, pricingUnit: "unit" },
  { id: "display_unit", name: "Display Shelf", enabled: false, pricePerUnit: 650, pricingUnit: "sqft" },
  { id: "led_lighting", name: "LED Lighting", enabled: false, pricePerUnit: 150, pricingUnit: "rft" },
  { id: "profile_handle", name: "Profile Handle", enabled: false, pricePerUnit: 250, pricingUnit: "rft" },
];

export const DEFAULT_CROCKERY_ADDON_PRICING: AddOnPricing[] = [
  { id: "loft", name: "Loft", enabled: false, pricePerUnit: 750, pricingUnit: "sqft" },
  { id: "display_unit", name: "Glass Display", enabled: false, pricePerUnit: 850, pricingUnit: "sqft" },
  { id: "internal_drawers", name: "Drawers", enabled: false, pricePerUnit: 2500, pricingUnit: "unit" },
  { id: "pullout_trays", name: "Pull-out Trays", enabled: false, pricePerUnit: 1800, pricingUnit: "unit" },
  { id: "led_lighting", name: "LED Lighting", enabled: false, pricePerUnit: 200, pricingUnit: "rft" },
  { id: "mirror", name: "Mirror Back", enabled: false, pricePerUnit: 800, pricingUnit: "sqft" },
  { id: "profile_handle", name: "Profile Handle", enabled: false, pricePerUnit: 250, pricingUnit: "rft" },
];

export const DEFAULT_POOJA_ADDON_PRICING: AddOnPricing[] = [
  { id: "loft", name: "Top Storage", enabled: false, pricePerUnit: 750, pricingUnit: "sqft" },
  { id: "internal_drawers", name: "Drawers", enabled: false, pricePerUnit: 2500, pricingUnit: "unit" },
  { id: "led_lighting", name: "LED Diya Light", enabled: false, pricePerUnit: 250, pricingUnit: "unit" },
  { id: "mirror", name: "Brass Work", enabled: false, pricePerUnit: 1200, pricingUnit: "sqft" },
  { id: "display_unit", name: "Bell Hanging", enabled: false, pricePerUnit: 500, pricingUnit: "unit" },
  { id: "profile_handle", name: "Carved Handle", enabled: false, pricePerUnit: 350, pricingUnit: "unit" },
];

export const DEFAULT_VANITY_ADDON_PRICING: AddOnPricing[] = [
  { id: "mirror", name: "Mirror", enabled: false, pricePerUnit: 800, pricingUnit: "sqft" },
  { id: "internal_drawers", name: "Drawers", enabled: false, pricePerUnit: 2500, pricingUnit: "unit" },
  { id: "pullout_trays", name: "Pull-out Trays", enabled: false, pricePerUnit: 1800, pricingUnit: "unit" },
  { id: "granite_counter", name: "Granite Counter", enabled: false, pricePerUnit: 450, pricingUnit: "sqft" },
  { id: "sink", name: "Basin/Sink", enabled: false, pricePerUnit: 5000, pricingUnit: "unit" },
  { id: "led_lighting", name: "LED Mirror Light", enabled: false, pricePerUnit: 200, pricingUnit: "rft" },
  { id: "profile_handle", name: "Profile Handle", enabled: false, pricePerUnit: 250, pricingUnit: "rft" },
];

export const DEFAULT_BAR_UNIT_ADDON_PRICING: AddOnPricing[] = [
  { id: "loft", name: "Top Storage", enabled: false, pricePerUnit: 750, pricingUnit: "sqft" },
  { id: "display_unit", name: "Glass Display", enabled: false, pricePerUnit: 850, pricingUnit: "sqft" },
  { id: "internal_drawers", name: "Drawers", enabled: false, pricePerUnit: 2500, pricingUnit: "unit" },
  { id: "bottle_pullout", name: "Bottle Rack", enabled: false, pricePerUnit: 3500, pricingUnit: "unit" },
  { id: "led_lighting", name: "LED Lighting", enabled: false, pricePerUnit: 200, pricingUnit: "rft" },
  { id: "mirror", name: "Mirror Back", enabled: false, pricePerUnit: 800, pricingUnit: "sqft" },
  { id: "granite_counter", name: "Counter Top", enabled: false, pricePerUnit: 450, pricingUnit: "sqft" },
  { id: "profile_handle", name: "Profile Handle", enabled: false, pricePerUnit: 250, pricingUnit: "rft" },
];

export const DEFAULT_DISPLAY_UNIT_ADDON_PRICING: AddOnPricing[] = [
  { id: "loft", name: "Top Storage", enabled: false, pricePerUnit: 750, pricingUnit: "sqft" },
  { id: "display_unit", name: "Glass Shelves", enabled: false, pricePerUnit: 750, pricingUnit: "sqft" },
  { id: "internal_drawers", name: "Drawers", enabled: false, pricePerUnit: 2500, pricingUnit: "unit" },
  { id: "led_lighting", name: "LED Lighting", enabled: false, pricePerUnit: 200, pricingUnit: "rft" },
  { id: "mirror", name: "Mirror Back", enabled: false, pricePerUnit: 800, pricingUnit: "sqft" },
  { id: "profile_handle", name: "Profile Handle", enabled: false, pricePerUnit: 250, pricingUnit: "rft" },
];

// Material base prices (per sqft)
export const CARCASS_MATERIAL_PRICES: Record<CarcassMaterial, number> = {
  plywood: 650,
  mdf: 450,
  particle_board: 350,
  hdhmr: 550,
};

export const CARCASS_THICKNESS_PRICES: Record<CarcassThickness, number> = {
  "18mm": 0,
  "25mm": 150,
};

export const EDGE_BAND_PRICES: Record<EdgeBand, number> = {
  "pvc_0.8mm": 50,
  "pvc_2mm": 100,
  "abs_2mm": 150,
};

export const SHUTTER_MATERIAL_PRICES: Record<ShutterMaterial, number> = {
  laminate: 350,
  acrylic: 650,
  veneer: 550,
  lacquer: 750,
  membrane: 400,
};

export const SHUTTER_FINISH_PRICES: Record<ShutterFinish, number> = {
  matte: 0,
  gloss: 100,
  textured: 50,
  super_matte: 150,
};

export const HANDLE_TYPE_PRICES: Record<HandleType, number> = {
  j_profile: 50,
  g_profile: 75,
  knob: 25,
  bar: 100,
  concealed: 150,
  none: 0,
};

export const DEFAULT_WARDROBE_CONFIG: WardrobeConfig = {
  wardrobeType: "shutter",
  addOns: [],
  addOnPricing: DEFAULT_ADDON_PRICING,
  carcass: {
    material: "plywood",
    thickness: "18mm",
    edgeBand: "pvc_2mm",
    materialPrice: CARCASS_MATERIAL_PRICES.plywood,
    thicknessPrice: CARCASS_THICKNESS_PRICES["18mm"],
    edgeBandPrice: EDGE_BAND_PRICES["pvc_2mm"],
  },
  shutter: {
    material: "laminate",
    finish: "matte",
    handleType: "j_profile",
    materialPrice: SHUTTER_MATERIAL_PRICES.laminate,
    finishPrice: SHUTTER_FINISH_PRICES.matte,
    handlePrice: HANDLE_TYPE_PRICES.j_profile,
  },
};
