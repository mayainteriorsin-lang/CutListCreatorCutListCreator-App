/**
 * Shared Unit Type Constants
 *
 * Domain-level constants used across multiple modules (design, library, visual-quotation).
 * Extracted from visual-quotation/constants.ts to eliminate cross-module dependencies.
 *
 * OWNERSHIP: Shared domain constant - not owned by any single module.
 * CONSUMERS: design, library, visual-quotation, pages
 */

export const UNIT_TYPE_LABELS: Record<string, string> = {
  wardrobe_carcass: "Wardrobe (Shutter)",
  wardrobe: "Wardrobe",
  kitchen: "Kitchen",
  tv_unit: "TV Unit",
  dresser: "Dresser",
  study_table: "Study Table",
  shoe_rack: "Shoe Rack",
  book_shelf: "Book Shelf",
  crockery_unit: "Crockery Unit",
  pooja_unit: "Pooja Unit",
  vanity: "Vanity",
  bar_unit: "Bar Unit",
  display_unit: "Display Unit",
  other: "Other",
};

/** Format a unit type value into a human-readable label */
export function formatUnitTypeLabel(value: string): string {
  if (UNIT_TYPE_LABELS[value]) return UNIT_TYPE_LABELS[value];
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
