/**
 * RateLine Service
 *
 * Transforms WardrobeConfig to/from line-based grid format.
 * Pure orchestration - no UI logic.
 */

import type { WardrobeConfig } from "../types/pricing";
import type { ServiceResult } from "./types";
import type {
  RateLine,
  RateLineType,
  RateLineUpdate,
  RateLineTotals,
} from "../types/rateLine";
import {
  RATE_LINE_LABELS,
} from "../types/rateLine";
import {
  CARCASS_MATERIAL_PRICES,
  CARCASS_THICKNESS_PRICES,
  EDGE_BAND_PRICES,
  SHUTTER_MATERIAL_PRICES,
  SHUTTER_FINISH_PRICES,
  HANDLE_TYPE_PRICES,
  CarcassMaterial,
  CarcassThickness,
  EdgeBand,
  ShutterMaterial,
  ShutterFinish,
  HandleType,
} from "../types/pricing";
import { getMaterialPhotoUrl, getLoftPhotoUrl } from "../constants";
import { getCarcassRate, getShutterRate } from "../engine/pricingEngine";

// ============================================================================
// Config to Lines Transformation
// ============================================================================

/**
 * Convert WardrobeConfig to RateLine[] for grid display
 */
export function configToLines(config: WardrobeConfig): RateLine[] {
  const carcassRate = getCarcassRate(config);
  const shutterRate = getShutterRate(config);
  const loftRate = carcassRate + shutterRate;



  const lines: RateLine[] = [
    {
      type: "shutter",
      label: RATE_LINE_LABELS.shutter,
      material: config.shutter.material,
      thickness: "-",
      finish: config.shutter.finish,
      edge: config.shutter.handleType,
      rate: shutterRate,
      isCalculated: false,
      isEnabled: true,
      photoUrl: getMaterialPhotoUrl(config.shutter.material) || null,
    },
    {
      type: "carcass",
      label: RATE_LINE_LABELS.carcass,
      material: config.carcass.material,
      thickness: config.carcass.thickness,
      finish: "-",
      edge: config.carcass.edgeBand,
      rate: carcassRate,
      isCalculated: false,
      isEnabled: true,
      photoUrl: getMaterialPhotoUrl(config.carcass.material) || null,
    },
    {
      type: "loft",
      label: RATE_LINE_LABELS.loft,
      material: "(Combined)",
      thickness: "-",
      finish: "-",
      edge: "-",
      rate: loftRate,
      isCalculated: true,
      isEnabled: true,
      photoUrl: getLoftPhotoUrl() || null,
    },
    {
      type: "inner_laminate",
      label: RATE_LINE_LABELS.inner_laminate,
      material: "laminate",
      thickness: "-",
      finish: "matte",
      edge: "-",
      rate: 150, // Default inner laminate rate
      isCalculated: false,
      isEnabled: false,
      photoUrl: getMaterialPhotoUrl("laminate") || null,
    },
  ];

  return lines;
}

// ============================================================================
// Lines to Config Transformation
// ============================================================================

/**
 * Convert RateLine[] back to WardrobeConfig for storage
 */
export function linesToConfig(lines: RateLine[], baseConfig: WardrobeConfig): WardrobeConfig {
  const shutterLine = lines.find((l) => l.type === "shutter");
  const carcassLine = lines.find((l) => l.type === "carcass");

  if (!shutterLine || !carcassLine) {
    return baseConfig;
  }

  // Build updated config
  const updatedConfig: WardrobeConfig = {
    ...baseConfig,
    carcass: {
      ...baseConfig.carcass,
      material: carcassLine.material as CarcassMaterial,
      thickness: carcassLine.thickness as CarcassThickness,
      edgeBand: carcassLine.edge as EdgeBand,
      materialPrice: CARCASS_MATERIAL_PRICES[carcassLine.material as CarcassMaterial] || baseConfig.carcass.materialPrice,
      thicknessPrice: CARCASS_THICKNESS_PRICES[carcassLine.thickness as CarcassThickness] || baseConfig.carcass.thicknessPrice,
      edgeBandPrice: EDGE_BAND_PRICES[carcassLine.edge as EdgeBand] || baseConfig.carcass.edgeBandPrice,
    },
    shutter: {
      ...baseConfig.shutter,
      material: shutterLine.material as ShutterMaterial,
      finish: shutterLine.finish as ShutterFinish,
      handleType: shutterLine.edge as HandleType,
      materialPrice: SHUTTER_MATERIAL_PRICES[shutterLine.material as ShutterMaterial] || baseConfig.shutter.materialPrice,
      finishPrice: SHUTTER_FINISH_PRICES[shutterLine.finish as ShutterFinish] || baseConfig.shutter.finishPrice,
      handlePrice: HANDLE_TYPE_PRICES[shutterLine.edge as HandleType] || baseConfig.shutter.handlePrice,
    },
  };

  return updatedConfig;
}

// ============================================================================
// Line Updates
// ============================================================================

/**
 * Update a single line and recalculate dependent rates
 */
export function updateLine(
  lines: RateLine[],
  lineType: RateLineType,
  updates: RateLineUpdate
): RateLine[] {
  // Clone lines
  const newLines = lines.map((line) => ({ ...line }));

  // Find and update the target line
  const targetIndex = newLines.findIndex((l) => l.type === lineType);
  if (targetIndex === -1) {
    return lines;
  }

  const targetLine = newLines[targetIndex];

  // Apply updates
  if (updates.material !== undefined) {
    targetLine.material = updates.material;
    targetLine.photoUrl = getMaterialPhotoUrl(updates.material) || null;
  }
  if (updates.thickness !== undefined) {
    targetLine.thickness = updates.thickness;
  }
  if (updates.finish !== undefined) {
    targetLine.finish = updates.finish;
  }
  if (updates.edge !== undefined) {
    targetLine.edge = updates.edge;
  }
  if (updates.rate !== undefined && !targetLine.isCalculated) {
    targetLine.rate = updates.rate;
  }
  if (updates.isEnabled !== undefined) {
    targetLine.isEnabled = updates.isEnabled;
  }

  // Recalculate rate for non-calculated lines
  if (lineType === "shutter" && !targetLine.isCalculated) {
    targetLine.rate = calculateShutterRate(targetLine);
  }
  if (lineType === "carcass" && !targetLine.isCalculated) {
    targetLine.rate = calculateCarcassRate(targetLine);
  }

  // Always recalculate loft (it depends on shutter + carcass)
  const shutterLine = newLines.find((l) => l.type === "shutter");
  const carcassLine = newLines.find((l) => l.type === "carcass");
  const loftLine = newLines.find((l) => l.type === "loft");

  if (loftLine && shutterLine && carcassLine) {
    loftLine.rate = shutterLine.rate + carcassLine.rate;
  }

  return newLines;
}

/**
 * Calculate shutter rate from line data
 */
function calculateShutterRate(line: RateLine): number {
  const materialPrice = SHUTTER_MATERIAL_PRICES[line.material as keyof typeof SHUTTER_MATERIAL_PRICES] || 0;
  const finishPrice = SHUTTER_FINISH_PRICES[line.finish as keyof typeof SHUTTER_FINISH_PRICES] || 0;
  const handlePrice = HANDLE_TYPE_PRICES[line.edge as keyof typeof HANDLE_TYPE_PRICES] || 0;
  return materialPrice + finishPrice + handlePrice;
}

/**
 * Calculate carcass rate from line data
 */
function calculateCarcassRate(line: RateLine): number {
  const materialPrice = CARCASS_MATERIAL_PRICES[line.material as keyof typeof CARCASS_MATERIAL_PRICES] || 0;
  const thicknessPrice = CARCASS_THICKNESS_PRICES[line.thickness as keyof typeof CARCASS_THICKNESS_PRICES] || 0;
  const edgeBandPrice = EDGE_BAND_PRICES[line.edge as keyof typeof EDGE_BAND_PRICES] || 0;
  return materialPrice + thicknessPrice + edgeBandPrice;
}

// ============================================================================
// Totals Calculation
// ============================================================================

/**
 * Calculate totals from lines
 */
export function calculateLineTotals(lines: RateLine[]): RateLineTotals {
  const shutterLine = lines.find((l) => l.type === "shutter");
  const carcassLine = lines.find((l) => l.type === "carcass");
  const loftLine = lines.find((l) => l.type === "loft");
  const innerLaminateLine = lines.find((l) => l.type === "inner_laminate");

  const shutterRate = shutterLine?.rate || 0;
  const carcassRate = carcassLine?.rate || 0;
  const loftRate = loftLine?.rate || (shutterRate + carcassRate);
  const innerLaminateRate = innerLaminateLine?.isEnabled ? (innerLaminateLine.rate || 0) : 0;

  return {
    shutterRate,
    carcassRate,
    loftRate,
    innerLaminateRate,
    combinedRate: loftRate + innerLaminateRate,
  };
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate line configuration
 */
export function validateLines(lines: RateLine[]): ServiceResult<void> {
  // Check required lines exist
  const requiredTypes: RateLineType[] = ["shutter", "carcass", "loft"];
  for (const type of requiredTypes) {
    if (!lines.find((l) => l.type === type)) {
      return { success: false, error: `Missing required line: ${type}` };
    }
  }

  // Check for negative rates
  for (const line of lines) {
    if (line.rate < 0) {
      return { success: false, error: `Negative rate not allowed for ${line.label}` };
    }
  }

  return { success: true };
}

// ============================================================================
// Service Export
// ============================================================================

export const rateLineService = {
  configToLines,
  linesToConfig,
  updateLine,
  calculateLineTotals,
  validateLines,
};

export default rateLineService;
