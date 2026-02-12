/**
 * Shape Generator Engine
 *
 * Pure functions that generate SVG shapes for furniture module front-views.
 * Module-specific generators are in ./generators/ folder.
 *
 * Moved from: components/ui/moduleShapeGenerator.ts
 */

import { PREDEFINED_TEMPLATES } from "@/modules/library/presets";
import type { Shape } from "../types";

// Import generators from extracted files
import { generateWardrobeShapes } from "./generators/wardrobe";
import { generateWardrobeCarcassShapes } from "./generators/wardrobeCarcass";
import {
  generateKitchenShapes,
  generateTvUnitShapes,
  generateDresserShapes,
  generateStudyTableShapes,
  generateShoeRackShapes,
  generateBookShelfShapes,
  generateCrockeryUnitShapes,
  generatePoojaUnitShapes,
  generateVanityShapes,
  generateBarUnitShapes,
  generateDisplayUnitShapes,
  generateOtherShapes,
} from "./generators/furniture";

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

// ── Defaults from Library Presets ─────────────────────────────────────

export const MODULE_DEFAULTS: Record<string, Partial<ModuleConfig>> = {};

for (const template of PREDEFINED_TEMPLATES) {
  if (!MODULE_DEFAULTS[template.unitType]) {
    MODULE_DEFAULTS[template.unitType] = {
      name: template.name,
      widthMm: template.widthMm,
      heightMm: template.heightMm,
      depthMm: template.depthMm,
      shutterCount: template.shutterCount ?? 2,
      sectionCount: template.sectionCount ?? 1,
      loftEnabled: template.loftEnabled ?? false,
      loftHeightMm: template.loftHeightMm ?? 400,
      carcassMaterial: template.carcassMaterial || "plywood",
      shutterMaterial: template.shutterMaterial || "laminate",
    };
  }
}

// ── Generator Dispatcher ──────────────────────────────────────────────

const GENERATORS: Record<string, (c: ModuleConfig, ox: number, oy: number) => Shape[]> = {
  wardrobe_carcass: generateWardrobeCarcassShapes,
  wardrobe: generateWardrobeShapes,
  kitchen: generateKitchenShapes,
  tv_unit: generateTvUnitShapes,
  dresser: generateDresserShapes,
  study_table: generateStudyTableShapes,
  shoe_rack: generateShoeRackShapes,
  book_shelf: generateBookShelfShapes,
  crockery_unit: generateCrockeryUnitShapes,
  pooja_unit: generatePoojaUnitShapes,
  vanity: generateVanityShapes,
  bar_unit: generateBarUnitShapes,
  display_unit: generateDisplayUnitShapes,
  other: generateOtherShapes,
};

export function generateModuleShapes(
  config: ModuleConfig,
  origin: { x: number; y: number }
): Shape[] {
  const generator = GENERATORS[config.unitType] ?? generateOtherShapes;
  return generator(config, origin.x, origin.y);
}
