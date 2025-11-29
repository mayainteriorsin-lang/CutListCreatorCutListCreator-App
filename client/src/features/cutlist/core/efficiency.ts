/**
 * Efficiency calculation utilities
 * Shared between wood grain and standard optimization
 */

import type { Sheet, OptimizerPart } from './types';

/**
 * Calculate efficiency percentage for optimization result
 * @param sheets - Array of sheets with placed parts
 * @param originalParts - Original parts array
 * @returns Efficiency percentage (0-100)
 */
export function calculateEfficiency(
  sheets: Sheet[],
  originalParts: OptimizerPart[]
): number {
  if (!sheets || sheets.length === 0) return 0;
  
  // Calculate total area used by parts
  const totalPartArea = originalParts.reduce((sum, part) => {
    return sum + (part.w * part.h * part.qty);
  }, 0);
  
  // Calculate total sheet area
  const totalSheetArea = sheets.reduce((sum, sheet) => {
    return sum + (sheet.W * sheet.H);
  }, 0);
  
  if (totalSheetArea === 0) return 0;
  
  const efficiency = (totalPartArea / totalSheetArea) * 100;
  return efficiency;
}

/**
 * Get display dimensions for a panel
 * Uses the prepared optimizer-friendly w/h if present
 * @param panel - Panel object
 * @returns Display dimensions
 */
export function getDisplayDimensions(panel: any): { displayW: number; displayH: number } {
  if (!panel || typeof panel !== 'object') {
    return { displayW: 0, displayH: 0 };
  }
  
  // Prefer pre-calculated display dimensions
  if (panel.displayW != null && panel.displayH != null) {
    return {
      displayW: Number(panel.displayW),
      displayH: Number(panel.displayH)
    };
  }
  
  // Fall back to w/h if available
  if (panel.w != null && panel.h != null) {
    return {
      displayW: Number(panel.w),
      displayH: Number(panel.h)
    };
  }
  
  // Last resort: use nominal dimensions
  const w = Number(panel.nomW ?? panel.width ?? 0);
  const h = Number(panel.nomH ?? panel.height ?? 0);
  
  return { displayW: w, displayH: h };
}
