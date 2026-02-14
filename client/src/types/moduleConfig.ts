/**
 * Shared Module Configuration Types
 *
 * Domain-level types used across multiple modules (design, library, visual-quotation).
 * Extracted from design/engine/shapeGenerator.ts to eliminate circular dependencies.
 *
 * OWNERSHIP: Shared domain types - not owned by any single module.
 * CONSUMERS: design, library, visual-quotation
 */

// ── Wardrobe Section Types ───────────────────────────────────────────

export type WardrobeSectionType =
  | "long_hang"
  | "short_hang"
  | "shelves"
  | "drawers"
  | "open";

export interface WardrobeSection {
  type: WardrobeSectionType;
  widthMm: number;
  shelfCount?: number;
  drawerCount?: number;
  rodHeightPct?: number;
  shelfPositions?: number[];
  /** Number of partial posts below a specific shelf (0 = no posts) */
  postsBelow?: number;
}

export const DEFAULT_WARDROBE_SECTIONS: WardrobeSection[] = [
  { type: "long_hang", widthMm: 0 },
  { type: "shelves", widthMm: 0, shelfCount: 4 },
  { type: "drawers", widthMm: 0, drawerCount: 3 },
  { type: "shelves", widthMm: 0, shelfCount: 3 },
  { type: "short_hang", widthMm: 0, rodHeightPct: 60, shelfCount: 2 },
];

// ── Module Config ─────────────────────────────────────────────────────

export interface ModuleConfig {
  unitType: string;
  name: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  shutterCount: number;
  sectionCount: number;
  loftEnabled: boolean;
  loftHeightMm: number;
  carcassMaterial: string;
  shutterMaterial: string;
  sections?: WardrobeSection[];
  carcassThicknessMm?: number;
  centerPostCount?: number;
  centerPostPositions?: number[];
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
  gaddiEnabled?: boolean;
  /** Per-panel gaddi overrides (keyed by panel id) */
  panelGaddi?: Record<string, boolean>;
  /** Shutter panels enabled for cutting list */
  shutterEnabled?: boolean;
}
