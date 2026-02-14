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

// Shared domain types (extracted to @/types/moduleConfig to break circular dependencies)
// Re-exported here for backwards compatibility with all internal design module consumers
export type { ModuleConfig, WardrobeSection, WardrobeSectionType } from "@/types/moduleConfig";
export { DEFAULT_WARDROBE_SECTIONS } from "@/types/moduleConfig";
import type { ModuleConfig } from "@/types/moduleConfig";

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
