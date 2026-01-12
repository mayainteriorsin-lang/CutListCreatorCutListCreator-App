/**
 * PATCH 21: Cabinet Form Schema
 *
 * Centralized Zod schema for cabinet form validation.
 * This is the single source of truth for form validation.
 * Used with react-hook-form's zodResolver.
 */

import { z } from "zod";

// Cabinet type options
export const cabinetTypeValues = [
  'single', 'double', 'triple', 'four', 'five',
  'six', 'seven', 'eight', 'nine', 'ten', 'custom'
] as const;

export const CabinetFormSchema = z.object({
  // Identity
  id: z.string(),
  name: z.string().min(1, "Cabinet name is required"),
  type: z.enum(cabinetTypeValues).default('single'),
  configurationMode: z.enum(['basic', 'advanced']).default('advanced').optional(),
  roomName: z.string().optional(),

  // Dimensions - with user-friendly error messages
  height: z.number()
    .min(50, "Height must be at least 50mm")
    .max(3000, "Height cannot exceed 3000mm"),
  width: z.number()
    .min(50, "Width must be at least 50mm")
    .max(3000, "Width cannot exceed 3000mm"),
  depth: z.number()
    .min(0, "Depth cannot be negative")
    .max(1000, "Depth cannot exceed 1000mm"),
  widthReduction: z.number()
    .min(0, "Width reduction cannot be negative")
    .default(36),

  // Plywood
  plywoodType: z.string().optional(),
  backPanelPlywoodBrand: z.string().optional(),
  shutterPlywoodBrand: z.string().optional(),
  A: z.string().optional(), // Unified plywood field

  // Panel laminate codes (front)
  topPanelLaminateCode: z.string().optional(),
  bottomPanelLaminateCode: z.string().optional(),
  leftPanelLaminateCode: z.string().optional(),
  rightPanelLaminateCode: z.string().optional(),
  backPanelLaminateCode: z.string().optional(),

  // Panel laminate codes (inner)
  topPanelInnerLaminateCode: z.string().optional(),
  bottomPanelInnerLaminateCode: z.string().optional(),
  leftPanelInnerLaminateCode: z.string().optional(),
  rightPanelInnerLaminateCode: z.string().optional(),
  backPanelInnerLaminateCode: z.string().optional(),
  innerLaminateCode: z.string().optional(),

  // Panel grain direction flags (front)
  topPanelGrainDirection: z.boolean().default(false),
  bottomPanelGrainDirection: z.boolean().default(false),
  leftPanelGrainDirection: z.boolean().default(false),
  rightPanelGrainDirection: z.boolean().default(false),
  backPanelGrainDirection: z.boolean().default(false),

  // Panel grain direction flags (inner)
  topPanelInnerGrainDirection: z.boolean().default(false).optional(),
  bottomPanelInnerGrainDirection: z.boolean().default(false).optional(),
  leftPanelInnerGrainDirection: z.boolean().default(false).optional(),
  rightPanelInnerGrainDirection: z.boolean().default(false).optional(),
  backPanelInnerGrainDirection: z.boolean().default(false).optional(),

  // Panel gaddi flags
  topPanelGaddi: z.boolean().default(true),
  bottomPanelGaddi: z.boolean().default(true),
  leftPanelGaddi: z.boolean().default(true),
  rightPanelGaddi: z.boolean().default(true),

  // Back panel reductions
  backPanelWidthReduction: z.number().min(0).default(20),
  backPanelHeightReduction: z.number().min(0).default(20),

  // Shutters
  shuttersEnabled: z.boolean().default(false),
  shutterCount: z.number().min(0).default(0),
  shutterType: z.string().default('WW001'),
  shutterHeightReduction: z.number().min(0).max(100).default(0),
  shutterWidthReduction: z.number().min(0).max(100).default(0),
  shutters: z.array(z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    laminateCode: z.string().optional(),
    innerLaminateCode: z.string().optional(),
    laminateAutoSynced: z.boolean().optional(),
  })).default([]),
  shutterLaminateCode: z.string().optional(),
  shutterInnerLaminateCode: z.string().optional(),
  shutterGrainDirection: z.boolean().default(false).optional(),
  shutterGaddi: z.boolean().default(false).optional(),

  // Center post
  centerPostEnabled: z.boolean().default(false),
  centerPostQuantity: z.number().min(1).max(4).default(1),
  centerPostHeight: z.number().min(0).default(50),
  centerPostDepth: z.number().min(0).default(50),
  centerPostLaminateCode: z.string().optional(),
  centerPostInnerLaminateCode: z.string().optional(),
  centerPostGrainDirection: z.boolean().default(false).optional(),

  // Shelves
  shelvesEnabled: z.boolean().default(false),
  shelvesQuantity: z.number().min(1).max(20).default(1),
  shelvesLaminateCode: z.string().optional(),
  shelvesInnerLaminateCode: z.string().optional(),
  shelvesGrainDirection: z.boolean().default(false).optional(),

  // Additional fields
  note: z.string().optional(),
  customPlywoodType: z.string().optional(),
  gaddiThickness: z.string().optional(),
  B: z.string().optional(), // Backend consolidated front laminate
  C: z.string().optional(), // Backend consolidated inner laminate
  plywoodGodown: z.string().optional(),
  laminateGodown: z.string().optional(),
});

// Export type for TypeScript
export type CabinetFormValues = z.infer<typeof CabinetFormSchema>;

// Validation helper to check if cabinet has required laminates
export function validateCabinetLaminates(data: Partial<CabinetFormValues>): string[] {
  const missingPanels: string[] = [];

  // Check front laminate codes
  if (!data.topPanelLaminateCode) {
    missingPanels.push("Top Panel front laminate");
  }
  if (!data.bottomPanelLaminateCode) {
    missingPanels.push("Bottom Panel front laminate");
  }
  if (!data.leftPanelLaminateCode) {
    missingPanels.push("Left Panel front laminate");
  }
  if (!data.rightPanelLaminateCode) {
    missingPanels.push("Right Panel front laminate");
  }

  // Check inner laminate codes
  if (!data.topPanelInnerLaminateCode) {
    missingPanels.push("Top Panel inner laminate");
  }
  if (!data.bottomPanelInnerLaminateCode) {
    missingPanels.push("Bottom Panel inner laminate");
  }
  if (!data.leftPanelInnerLaminateCode) {
    missingPanels.push("Left Panel inner laminate");
  }
  if (!data.rightPanelInnerLaminateCode) {
    missingPanels.push("Right Panel inner laminate");
  }

  return missingPanels;
}

// Validation helper for shutters
export function validateShutterLaminates(data: Partial<CabinetFormValues>): string[] {
  const missingPanels: string[] = [];

  if (data.shuttersEnabled) {
    if (!data.shutterLaminateCode) {
      missingPanels.push("Shutter front laminate");
    }
    if (!data.shutterInnerLaminateCode) {
      missingPanels.push("Shutter inner laminate");
    }
  }

  return missingPanels;
}
