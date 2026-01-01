/**
 * Shutter Engine
 * --------------
 * Generates front shutters based on sectionCount.
 * Handles loft shutters separately.
 */

export interface Shutter {
  id: string;
  unitId: string;
  index: number;
  widthMm: number;
  heightMm: number;
  isLoft: boolean;
  laminateCode?: string;
  swing?: "LEFT" | "RIGHT";
}

export function generateShutters(params: {
  unitId: string;
  unitWidthMm: number;
  unitHeightMm: number;
  sectionCount: number;
  loftEnabled: boolean;
  loftHeightMm: number;
}): Shutter[] {
  const {
    unitId,
    unitWidthMm,
    unitHeightMm,
    sectionCount,
    loftEnabled,
    loftHeightMm,
  } = params;

  const shutters: Shutter[] = [];
  const mainHeight = loftEnabled ? unitHeightMm - loftHeightMm : unitHeightMm;
  const perWidth = Math.floor(unitWidthMm / sectionCount);

  for (let i = 0; i < sectionCount; i++) {
    shutters.push({
      id: `${unitId}-SH-${i + 1}`,
      unitId,
      index: i,
      widthMm: perWidth,
      heightMm: mainHeight,
      isLoft: false,
      swing: i % 2 === 0 ? "LEFT" : "RIGHT",
    });
  }

  if (loftEnabled) {
    shutters.push({
      id: `${unitId}-LOFT`,
      unitId,
      index: sectionCount,
      widthMm: unitWidthMm,
      heightMm: loftHeightMm,
      isLoft: true,
    });
  }

  return shutters;
}
