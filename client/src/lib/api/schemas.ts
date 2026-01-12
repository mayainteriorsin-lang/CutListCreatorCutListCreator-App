/**
 * PATCH 16: Zod Schemas for API Responses
 *
 * These schemas validate API response data structure.
 * Using permissive schemas with .passthrough() for flexibility.
 */

import { z } from "zod";

// 1) Master Settings - permissive to handle varying shapes
export const MasterSettingsSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  sheetWidth: z.string().optional(),
  sheetHeight: z.string().optional(),
  kerf: z.string().optional(),
  masterLaminateCode: z.string().nullable().optional(),
  masterPlywoodBrand: z.string().nullable().optional(),
  optimizePlywoodUsage: z.string().optional(),
  updatedAt: z.string().optional(),
  plywoodTypes: z.array(z.string()).optional(),
  laminateCodes: z.array(z.string()).optional(),
}).passthrough().default({});

// 2) Godown plywood list
export const PlywoodItemSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  brand: z.string().optional(),
  name: z.string().optional(),
  thickness: z.union([z.string(), z.number()]).optional(),
  createdAt: z.string().optional(),
}).passthrough();

export const PlywoodListSchema = z.array(PlywoodItemSchema).default([]);

// 3) Laminate code list
export const LaminateItemSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  code: z.string().optional(),
  name: z.string().optional(),
  innerCode: z.string().nullable().optional(),
  supplier: z.string().nullable().optional(),
  thickness: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  woodGrainsEnabled: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
}).passthrough();

export const LaminateCodeListSchema = z.array(LaminateItemSchema).default([]);

// 4) Wood grains preferences - array of objects
export const WoodGrainsItemSchema = z.object({
  laminateCode: z.string().optional(),
  hasWoodGrains: z.boolean().optional(),
}).passthrough();

export const WoodGrainsPrefsSchema = z.array(WoodGrainsItemSchema).default([]);

// 5) Master settings memory - same as master settings
export const MasterSettingsMemorySchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  sheetWidth: z.string().optional(),
  sheetHeight: z.string().optional(),
  kerf: z.string().optional(),
  masterLaminateCode: z.string().nullable().optional(),
  masterPlywoodBrand: z.string().nullable().optional(),
  optimizePlywoodUsage: z.string().optional(),
  updatedAt: z.string().optional(),
  plywoodTypes: z.array(z.string()).optional(),
  laminateCodes: z.array(z.string()).optional(),
}).passthrough().default({});

// Type exports for convenience
export type MasterSettings = z.infer<typeof MasterSettingsSchema>;
export type PlywoodItem = z.infer<typeof PlywoodItemSchema>;
export type PlywoodList = z.infer<typeof PlywoodListSchema>;
export type LaminateItem = z.infer<typeof LaminateItemSchema>;
export type LaminateCodeList = z.infer<typeof LaminateCodeListSchema>;
export type WoodGrainsItem = z.infer<typeof WoodGrainsItemSchema>;
export type WoodGrainsPrefs = z.infer<typeof WoodGrainsPrefsSchema>;
export type MasterSettingsMemory = z.infer<typeof MasterSettingsMemorySchema>;
