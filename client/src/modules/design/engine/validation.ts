/**
 * ModuleConfig Validation
 *
 * Validates module configuration to prevent invalid states.
 * Used when creating or updating modules.
 */

import type { ModuleConfig } from "./shapeGenerator";

// ── Validation Constants ──────────────────────────────────────────────

export const VALIDATION_LIMITS = {
  // Dimension limits (mm)
  minWidth: 200,
  maxWidth: 10000,
  minHeight: 300,
  maxHeight: 5000,
  minDepth: 100,
  maxDepth: 1000,

  // Loft limits
  minLoftHeight: 100,
  maxLoftHeightRatio: 0.4, // Max 40% of total height

  // Section limits
  minSectionCount: 1,
  maxSectionCount: 10,
  minShutterCount: 0,
  maxShutterCount: 10,

  // Center post limits
  minCenterPostCount: 0,
  maxCenterPostCount: 9,

  // Thickness limits
  minCarcassThickness: 12,
  maxCarcassThickness: 25,
  minBackPanelThickness: 4,
  maxBackPanelThickness: 18,
} as const;

// ── Validation Result Types ───────────────────────────────────────────

export interface ValidationError {
  field: keyof ModuleConfig | string;
  message: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ── Validation Functions ──────────────────────────────────────────────

/**
 * Validate a single dimension value
 */
function validateDimension(
  value: number,
  field: string,
  min: number,
  max: number
): ValidationError | null {
  if (typeof value !== "number" || isNaN(value)) {
    return { field, message: `${field} must be a valid number`, value };
  }
  if (value < min) {
    return { field, message: `${field} must be at least ${min}mm`, value };
  }
  if (value > max) {
    return { field, message: `${field} must be at most ${max}mm`, value };
  }
  return null;
}

/**
 * Validate a count value (integer)
 */
function validateCount(
  value: number,
  field: string,
  min: number,
  max: number
): ValidationError | null {
  if (typeof value !== "number" || isNaN(value)) {
    return { field, message: `${field} must be a valid number`, value };
  }
  if (!Number.isInteger(value)) {
    return { field, message: `${field} must be a whole number`, value };
  }
  if (value < min) {
    return { field, message: `${field} must be at least ${min}`, value };
  }
  if (value > max) {
    return { field, message: `${field} must be at most ${max}`, value };
  }
  return null;
}

/**
 * Validate full ModuleConfig
 */
export function validateModuleConfig(config: ModuleConfig): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const limits = VALIDATION_LIMITS;

  // Required string fields
  if (!config.unitType || typeof config.unitType !== "string") {
    errors.push({ field: "unitType", message: "Unit type is required" });
  }
  if (!config.name || typeof config.name !== "string") {
    errors.push({ field: "name", message: "Name is required" });
  }

  // Dimension validations
  const widthError = validateDimension(config.widthMm, "widthMm", limits.minWidth, limits.maxWidth);
  if (widthError) errors.push(widthError);

  const heightError = validateDimension(config.heightMm, "heightMm", limits.minHeight, limits.maxHeight);
  if (heightError) errors.push(heightError);

  const depthError = validateDimension(config.depthMm, "depthMm", limits.minDepth, limits.maxDepth);
  if (depthError) errors.push(depthError);

  // Count validations
  const sectionError = validateCount(
    config.sectionCount,
    "sectionCount",
    limits.minSectionCount,
    limits.maxSectionCount
  );
  if (sectionError) errors.push(sectionError);

  const shutterError = validateCount(
    config.shutterCount,
    "shutterCount",
    limits.minShutterCount,
    limits.maxShutterCount
  );
  if (shutterError) errors.push(shutterError);

  // Loft validation
  if (config.loftEnabled) {
    if (config.loftHeightMm <= 0) {
      errors.push({
        field: "loftHeightMm",
        message: "Loft height must be greater than 0 when loft is enabled",
        value: config.loftHeightMm,
      });
    } else if (config.loftHeightMm < limits.minLoftHeight) {
      errors.push({
        field: "loftHeightMm",
        message: `Loft height must be at least ${limits.minLoftHeight}mm`,
        value: config.loftHeightMm,
      });
    } else if (config.loftHeightMm > config.heightMm * limits.maxLoftHeightRatio) {
      warnings.push({
        field: "loftHeightMm",
        message: `Loft height exceeds ${limits.maxLoftHeightRatio * 100}% of total height`,
        value: config.loftHeightMm,
      });
    }
  }

  // Center post validation (for wardrobe_carcass)
  if (config.centerPostCount !== undefined) {
    const postError = validateCount(
      config.centerPostCount,
      "centerPostCount",
      limits.minCenterPostCount,
      limits.maxCenterPostCount
    );
    if (postError) errors.push(postError);

    // Note: For wardrobe_carcass, center posts CREATE sections (posts + 1 = sections)
    // So we don't compare against sectionCount which is used for shutters/doors
  }

  // Thickness validations
  if (config.carcassThicknessMm !== undefined) {
    const thicknessError = validateDimension(
      config.carcassThicknessMm,
      "carcassThicknessMm",
      limits.minCarcassThickness,
      limits.maxCarcassThickness
    );
    if (thicknessError) errors.push(thicknessError);
  }

  if (config.backPanelThicknessMm !== undefined) {
    const backError = validateDimension(
      config.backPanelThicknessMm,
      "backPanelThicknessMm",
      limits.minBackPanelThickness,
      limits.maxBackPanelThickness
    );
    if (backError) errors.push(backError);
  }

  // Material validations (warn if empty)
  if (!config.carcassMaterial) {
    warnings.push({
      field: "carcassMaterial",
      message: "Carcass material not specified, using default",
    });
  }
  if (!config.shutterMaterial) {
    warnings.push({
      field: "shutterMaterial",
      message: "Shutter material not specified, using default",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitize ModuleConfig - clamp values to valid ranges
 * Returns a new config with values clamped to valid ranges
 */
export function sanitizeModuleConfig(config: ModuleConfig): ModuleConfig {
  const limits = VALIDATION_LIMITS;

  return {
    ...config,
    // Clamp dimensions
    widthMm: Math.max(limits.minWidth, Math.min(limits.maxWidth, config.widthMm)),
    heightMm: Math.max(limits.minHeight, Math.min(limits.maxHeight, config.heightMm)),
    depthMm: Math.max(limits.minDepth, Math.min(limits.maxDepth, config.depthMm)),

    // Clamp counts
    sectionCount: Math.max(
      limits.minSectionCount,
      Math.min(limits.maxSectionCount, Math.round(config.sectionCount))
    ),
    shutterCount: Math.max(
      limits.minShutterCount,
      Math.min(limits.maxShutterCount, Math.round(config.shutterCount))
    ),

    // Clamp loft height if enabled
    loftHeightMm: config.loftEnabled
      ? Math.max(limits.minLoftHeight, Math.min(config.heightMm * limits.maxLoftHeightRatio, config.loftHeightMm))
      : config.loftHeightMm,

    // Clamp center post count if defined
    centerPostCount:
      config.centerPostCount !== undefined
        ? Math.max(
            limits.minCenterPostCount,
            Math.min(limits.maxCenterPostCount, Math.round(config.centerPostCount))
          )
        : config.centerPostCount,

    // Clamp thickness if defined
    carcassThicknessMm:
      config.carcassThicknessMm !== undefined
        ? Math.max(limits.minCarcassThickness, Math.min(limits.maxCarcassThickness, config.carcassThicknessMm))
        : config.carcassThicknessMm,

    backPanelThicknessMm:
      config.backPanelThicknessMm !== undefined
        ? Math.max(limits.minBackPanelThickness, Math.min(limits.maxBackPanelThickness, config.backPanelThicknessMm))
        : config.backPanelThicknessMm,
  };
}

/**
 * Quick validation check - returns true if config is valid
 */
export function isValidModuleConfig(config: ModuleConfig): boolean {
  return validateModuleConfig(config).valid;
}
