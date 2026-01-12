/**
 * PATCH 12: Strict Compile-Time Contract Validation
 *
 * Zod schemas for runtime validation of API responses.
 * Types are auto-inferred from schemas for compile-time safety.
 *
 * This ensures:
 * - Backend never returns bad JSON
 * - Frontend never misreads data
 * - End-to-end contract sync
 */

import { z } from "zod";

// ============================================================
// Master Settings Schema
// ============================================================

export const MasterSettingsResponseSchema = z.object({
  id: z.number(),
  sheetWidth: z.string(),
  sheetHeight: z.string(),
  kerf: z.string(),
  masterLaminateCode: z.string().nullable(),
  masterPlywoodBrand: z.string().nullable(),
  optimizePlywoodUsage: z.string(),
  updatedAt: z.string(),
  plywoodTypes: z.array(z.string()),
  laminateCodes: z.array(z.string())
});

// ============================================================
// Plywood Godown Schema
// ============================================================

export const PlywoodItemSchema = z.object({
  id: z.number(),
  brand: z.string(),
  createdAt: z.string()
});

export const PlywoodListSchema = z.array(PlywoodItemSchema);

// ============================================================
// Laminate Godown Schema
// ============================================================

export const LaminateItemSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  innerCode: z.string().nullable(),
  supplier: z.string().nullable(),
  thickness: z.string().nullable(),
  description: z.string().nullable(),
  woodGrainsEnabled: z.string(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const LaminateListSchema = z.array(LaminateItemSchema);

// ============================================================
// Wood Grains Preferences Schema
// ============================================================

export const WoodGrainsPreferenceSchema = z.object({
  laminateCode: z.string(),
  hasWoodGrains: z.boolean()
});

export const WoodGrainsListSchema = z.array(WoodGrainsPreferenceSchema);

export const WoodGrainsMapSchema = z.record(z.string(), z.boolean());

// ============================================================
// Master Settings Memory Schema
// ============================================================

export const MasterSettingsMemorySchema = z.object({
  sheetWidth: z.string(),
  sheetHeight: z.string(),
  kerf: z.string(),
  masterLaminateCode: z.string().nullable().optional(),
  masterPlywoodBrand: z.string().nullable().optional(),
  optimizePlywoodUsage: z.string().optional(),
  updatedAt: z.string().optional(),
  plywoodTypes: z.array(z.string()),
  laminateCodes: z.array(z.string())
});

// ============================================================
// Optimizer Types Schema
// ============================================================

export const PlacedPanelSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  rotated: z.boolean().optional(),
  grainDirection: z.boolean().optional(),
  gaddi: z.boolean().optional(),
  laminateCode: z.string().optional(),
  nomW: z.number().optional(),
  nomH: z.number().optional()
});

export const SheetSchema = z.object({
  _sheetId: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
  placed: z.array(PlacedPanelSchema),
  usedArea: z.number().optional(),
  wasteArea: z.number().optional()
});

export const BrandResultSchema = z.object({
  brand: z.string(),
  laminateCode: z.string(),
  laminateDisplay: z.string(),
  isBackPanel: z.boolean().optional(),
  result: z.object({
    panels: z.array(SheetSchema)
  })
});

// ============================================================
// Type Exports (auto-inferred from schemas)
// ============================================================

export type MasterSettingsResponse = z.infer<typeof MasterSettingsResponseSchema>;
export type PlywoodItem = z.infer<typeof PlywoodItemSchema>;
export type LaminateItem = z.infer<typeof LaminateItemSchema>;
export type WoodGrainsPreference = z.infer<typeof WoodGrainsPreferenceSchema>;
export type WoodGrainsMap = z.infer<typeof WoodGrainsMapSchema>;
export type MasterSettingsMemoryResponse = z.infer<typeof MasterSettingsMemorySchema>;
export type PlacedPanel = z.infer<typeof PlacedPanelSchema>;
export type Sheet = z.infer<typeof SheetSchema>;
export type BrandResultValidated = z.infer<typeof BrandResultSchema>;

// ============================================================
// Validation Helpers
// ============================================================

/**
 * Safe parse with fallback - never throws, returns fallback on failure
 */
export function safeValidate<T>(
  schema: z.ZodType<T>,
  data: unknown,
  fallback: T
): T {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn("Validation failed:", result.error.issues);
  return fallback;
}

/**
 * Safe array parse with empty fallback
 */
export function safeValidateArray<T>(
  schema: z.ZodType<T[]>,
  data: unknown
): T[] {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn("Array validation failed:", result.error.issues);
  return [];
}
