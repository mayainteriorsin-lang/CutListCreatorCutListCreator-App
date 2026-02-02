/**
 * Shutter Engine
 * --------------
 * Generates front shutters based on sectionCount.
 * Handles loft shutters separately.
 *
 * WOOD GRAIN CRITICAL: grainDirection must be propagated to ensure
 * optimization algorithm respects rotation constraints.
 */
import { logger } from "../services/logger";

export interface Shutter {
  id: string;
  unitId: string;
  index: number;
  widthMm: number;
  heightMm: number;
  isLoft: boolean;

  // Material properties
  laminateCode?: string;
  innerLaminateCode?: string;
  plywoodBrand?: string;

  // Constraints (CRITICAL for optimization)
  grainDirection?: boolean;  // Wood grain - prevents rotation when true
  gaddi?: boolean;           // Gaddi marking flag

  // Display properties
  swing?: "LEFT" | "RIGHT";
}

export function generateShutters(params: {
  unitId: string;
  unitWidthMm: number;
  unitHeightMm: number;
  sectionCount: number;
  loftEnabled: boolean;
  loftHeightMm: number;
  customShutterWidthsMm?: number[];

  // Material properties
  laminateCode?: string;
  innerLaminateCode?: string;
  plywoodBrand?: string;

  // Constraints (CRITICAL for optimization)
  grainDirection?: boolean;  // Wood grain - prevents rotation
  gaddi?: boolean;           // Gaddi marking

  // Reductions (from schema)
  heightReduction?: number;  // Reduce each shutter height (mm)
  widthReduction?: number;   // Reduce total width (mm)
}): Shutter[] {
  const {
    unitId,
    unitWidthMm,
    unitHeightMm,
    sectionCount,
    loftEnabled,
    loftHeightMm,
    customShutterWidthsMm,
    laminateCode,
    innerLaminateCode,
    plywoodBrand,
    grainDirection = false,
    gaddi = false,
    heightReduction = 0,
    widthReduction = 0,
  } = params;

  // Validate custom widths if provided
  if (customShutterWidthsMm) {
    if (customShutterWidthsMm.length !== sectionCount) {
      logger.warn(
        `Custom shutter widths count (${customShutterWidthsMm.length}) doesn't match section count (${sectionCount})`,
        { context: 'shutter-engine' }
      );
    }

    const totalCustomWidth = customShutterWidthsMm.reduce((sum, w) => sum + w, 0);
    if (totalCustomWidth > unitWidthMm) {
      logger.warn(
        `Total custom shutter widths (${totalCustomWidth}mm) exceed cabinet width (${unitWidthMm}mm)`,
        { context: 'shutter-engine' }
      );
    }

    if (customShutterWidthsMm.some(w => w <= 0)) {
      logger.warn('All custom shutter widths must be positive', { context: 'shutter-engine' });
    }
  }

  const shutters: Shutter[] = [];

  // Apply height reduction
  const mainHeight = loftEnabled
    ? unitHeightMm - loftHeightMm - heightReduction
    : unitHeightMm - heightReduction;

  // Apply width reduction and distribute evenly
  const effectiveWidth = unitWidthMm - widthReduction;
  const baseWidth = Math.floor(effectiveWidth / sectionCount);
  const remainder = effectiveWidth % sectionCount;

  for (let i = 0; i < sectionCount; i++) {
    // Use custom width if provided, otherwise distribute evenly with remainder
    const sWidth = customShutterWidthsMm?.[i]
      ?? (baseWidth + (i < remainder ? 1 : 0));

    shutters.push({
      id: `${unitId}-SH-${i + 1}`,
      unitId,
      index: i,
      widthMm: sWidth,
      heightMm: mainHeight,
      isLoft: false,

      // Material properties
      laminateCode,
      innerLaminateCode,
      plywoodBrand,

      // Constraints (CRITICAL for optimization)
      grainDirection,
      gaddi,

      // Display
      swing: i % 2 === 0 ? "LEFT" : "RIGHT",
    });
  }

  if (loftEnabled) {
    shutters.push({
      id: `${unitId}-LOFT`,
      unitId,
      index: sectionCount,
      widthMm: unitWidthMm - widthReduction,  // Apply width reduction to loft too
      heightMm: loftHeightMm,
      isLoft: true,

      // Material properties
      laminateCode,
      innerLaminateCode,
      plywoodBrand,

      // Constraints (CRITICAL for optimization)
      grainDirection,
      gaddi,
    });
  }

  return shutters;
}
