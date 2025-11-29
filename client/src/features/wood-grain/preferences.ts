/**
 * WOOD GRAIN PREFERENCES
 * This module contains ONLY wood grain-specific preference utilities
 * Never mix with standard/non-wood grain code
 */

/**
 * Extract base laminate code (before the "+" sign)
 * Wood grain preferences are stored by base laminate code
 * 
 * @param laminateCode - Full laminate code (e.g., "456SF Terra Wood + off white")
 * @returns Base laminate code (e.g., "456SF Terra Wood")
 */
export function extractBaseLaminateCode(laminateCode: string): string {
  return laminateCode.split('+')[0].trim();
}

/**
 * Check if a laminate has wood grains enabled
 * 
 * @param laminateCode - Full laminate code
 * @param preferences - Wood grain preferences map
 * @returns True if wood grains are enabled for this laminate
 */
export function hasWoodGrainsEnabled(
  laminateCode: string,
  preferences: Record<string, boolean>
): boolean {
  const baseLaminateCode = extractBaseLaminateCode(laminateCode);
  return preferences[baseLaminateCode] === true;
}

/**
 * Get wood grain status for multiple laminates
 * 
 * @param laminateCodes - Array of laminate codes
 * @param preferences - Wood grain preferences map
 * @returns Map of laminate code to wood grain status
 */
export function getWoodGrainStatuses(
  laminateCodes: string[],
  preferences: Record<string, boolean>
): Record<string, boolean> {
  const statuses: Record<string, boolean> = {};
  
  laminateCodes.forEach(code => {
    statuses[code] = hasWoodGrainsEnabled(code, preferences);
  });
  
  return statuses;
}
