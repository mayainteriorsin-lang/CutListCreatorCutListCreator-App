/** Source of a library module */
export type LibraryModuleSource = "predefined" | "custom";

/** Room-based category for organizing templates */
export type LibraryCategory =
  | "bedroom"   // wardrobe, dresser
  | "kitchen"   // kitchen modules
  | "living"    // tv_unit, bar_unit, display_unit
  | "study"     // study_table, book_shelf
  | "utility"   // shoe_rack, pooja_unit, vanity, crockery_unit
  | "custom";   // user-defined

/** Wardrobe section type for library persistence */
export interface LibraryWardrobeSection {
  type: "long_hang" | "short_hang" | "shelves" | "drawers" | "open";
  widthMm: number;
  shelfCount?: number;
  drawerCount?: number;
  rodHeightPct?: number;
}

/** Unified library module - represents any saved furniture module template */
export interface LibraryModule {
  id: string;
  name: string;
  unitType: string; // "wardrobe", "kitchen", "tv_unit", etc.
  source: LibraryModuleSource;
  description?: string;

  // Dimensions (mm)
  widthMm: number;
  heightMm: number;
  depthMm: number;

  // Configuration summary
  shutterCount?: number;
  loftEnabled?: boolean;
  loftHeightMm?: number;
  sectionCount?: number;

  // Material summary
  carcassMaterial?: string;
  shutterMaterial?: string;
  shutterLaminateCode?: string;

  // Section configuration (wardrobe)
  sections?: LibraryWardrobeSection[];
  carcassThicknessMm?: number;
  gaddiEnabled?: boolean; // Edge banding enabled

  // Wardrobe carcass specific fields
  centerPostCount?: number;
  backPanelThicknessMm?: number;
  backPanelFit?: "full" | "cut";
  backPanelDeduction?: number;
  backPanelFrontDeduction?: number;
  shelfBackDeduction?: number;
  shelfFrontDeduction?: number;
  panelsEnabled?: {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
    back: boolean;
  };
  skirtingEnabled?: boolean;
  skirtingHeightMm?: number;

  // Full module config (stores complete design for exact reproduction)
  fullConfig?: Record<string, unknown>;

  // Tags for filtering
  tags: string[];

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Category and template info (v2)
  category?: LibraryCategory;    // Room-based category
  isTemplate?: boolean;          // true = template (no dimensions)
  favorite?: boolean;            // Quick access marker

  // Rate Card folder association
  folderId?: string;             // Custom folder ID from Rate Cards page
}
