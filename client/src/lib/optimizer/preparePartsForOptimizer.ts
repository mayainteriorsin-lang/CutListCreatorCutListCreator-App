import { prepareStandardParts } from '@/features/standard/dimensional-mapping';

/**
 * Prepare panels for optimizer with wood grain constraint.
 * @param panels - Array of panels with name, width, height, laminateCode
 * @param preferences - Wood grain preferences map
 * @returns Array of parts ready for optimizer
 */
export function preparePartsForOptimizer(panels: Array<any>, preferences: Record<string, boolean> = {}) {
  return prepareStandardParts(panels, preferences);
}
