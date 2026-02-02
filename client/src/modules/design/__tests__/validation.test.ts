/**
 * Validation Module Tests
 *
 * Layer: UNIT (Engine)
 * Scope: ModuleConfig validation and sanitization
 * Priority: HIGH - Ensures invalid configs are caught before saving
 */

import { describe, it, expect } from "vitest";
import {
  validateModuleConfig,
  sanitizeModuleConfig,
  isValidModuleConfig,
  VALIDATION_LIMITS,
} from "../engine/validation";
import type { ModuleConfig } from "../engine/shapeGenerator";

// =============================================================================
// TEST FIXTURES
// =============================================================================

const createValidConfig = (overrides: Partial<ModuleConfig> = {}): ModuleConfig => ({
  unitType: "wardrobe_carcass",
  name: "Test Wardrobe",
  widthMm: 2400,
  heightMm: 2100,
  depthMm: 560,
  sectionCount: 3,
  shutterCount: 2,
  loftEnabled: false,
  loftHeightMm: 0,
  carcassMaterial: "plywood",
  shutterMaterial: "laminate",
  ...overrides,
});

// =============================================================================
// VALIDATION_LIMITS TESTS
// =============================================================================

describe("VALIDATION_LIMITS", () => {
  it("has expected dimension limits", () => {
    expect(VALIDATION_LIMITS.minWidth).toBe(200);
    expect(VALIDATION_LIMITS.maxWidth).toBe(10000);
    expect(VALIDATION_LIMITS.minHeight).toBe(300);
    expect(VALIDATION_LIMITS.maxHeight).toBe(5000);
    expect(VALIDATION_LIMITS.minDepth).toBe(100);
    expect(VALIDATION_LIMITS.maxDepth).toBe(1000);
  });

  it("has expected loft limits", () => {
    expect(VALIDATION_LIMITS.minLoftHeight).toBe(100);
    expect(VALIDATION_LIMITS.maxLoftHeightRatio).toBe(0.4);
  });

  it("has expected count limits", () => {
    expect(VALIDATION_LIMITS.minSectionCount).toBe(1);
    expect(VALIDATION_LIMITS.maxSectionCount).toBe(10);
    expect(VALIDATION_LIMITS.minShutterCount).toBe(0);
    expect(VALIDATION_LIMITS.maxShutterCount).toBe(10);
    expect(VALIDATION_LIMITS.minCenterPostCount).toBe(0);
    expect(VALIDATION_LIMITS.maxCenterPostCount).toBe(9);
  });

  it("has expected thickness limits", () => {
    expect(VALIDATION_LIMITS.minCarcassThickness).toBe(12);
    expect(VALIDATION_LIMITS.maxCarcassThickness).toBe(25);
    expect(VALIDATION_LIMITS.minBackPanelThickness).toBe(4);
    expect(VALIDATION_LIMITS.maxBackPanelThickness).toBe(18);
  });
});

// =============================================================================
// validateModuleConfig TESTS
// =============================================================================

describe("validateModuleConfig", () => {
  describe("valid config", () => {
    it("returns valid=true for a complete valid config", () => {
      const config = createValidConfig();
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("may have warnings for missing materials", () => {
      const config = createValidConfig({ carcassMaterial: "", shutterMaterial: "" });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("required fields", () => {
    it("returns error when unitType is missing", () => {
      const config = createValidConfig({ unitType: "" as any });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "unitType")).toBe(true);
    });

    it("returns error when name is missing", () => {
      const config = createValidConfig({ name: "" });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "name")).toBe(true);
    });
  });

  describe("dimension validations", () => {
    it("returns error when width is below minimum", () => {
      const config = createValidConfig({ widthMm: 100 });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "widthMm")).toBe(true);
    });

    it("returns error when width exceeds maximum", () => {
      const config = createValidConfig({ widthMm: 15000 });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "widthMm")).toBe(true);
    });

    it("returns error when height is below minimum", () => {
      const config = createValidConfig({ heightMm: 200 });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "heightMm")).toBe(true);
    });

    it("returns error when height exceeds maximum", () => {
      const config = createValidConfig({ heightMm: 6000 });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "heightMm")).toBe(true);
    });

    it("returns error when depth is below minimum", () => {
      const config = createValidConfig({ depthMm: 50 });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "depthMm")).toBe(true);
    });

    it("returns error when depth exceeds maximum", () => {
      const config = createValidConfig({ depthMm: 1500 });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "depthMm")).toBe(true);
    });

    it("returns error when dimension is NaN", () => {
      const config = createValidConfig({ widthMm: NaN });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "widthMm")).toBe(true);
    });
  });

  describe("count validations", () => {
    it("returns error when sectionCount is below minimum", () => {
      const config = createValidConfig({ sectionCount: 0 });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "sectionCount")).toBe(true);
    });

    it("returns error when sectionCount exceeds maximum", () => {
      const config = createValidConfig({ sectionCount: 15 });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "sectionCount")).toBe(true);
    });

    it("returns error when shutterCount is negative", () => {
      const config = createValidConfig({ shutterCount: -1 });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "shutterCount")).toBe(true);
    });

    it("returns error when shutterCount exceeds maximum", () => {
      const config = createValidConfig({ shutterCount: 15 });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "shutterCount")).toBe(true);
    });

    it("returns error when count is not an integer", () => {
      const config = createValidConfig({ sectionCount: 2.5 });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes("whole number"))).toBe(true);
    });
  });

  describe("loft validations", () => {
    it("returns error when loft is enabled but height is 0", () => {
      const config = createValidConfig({ loftEnabled: true, loftHeightMm: 0 });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "loftHeightMm")).toBe(true);
    });

    it("returns error when loft height is below minimum", () => {
      const config = createValidConfig({ loftEnabled: true, loftHeightMm: 50 });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "loftHeightMm")).toBe(true);
    });

    it("returns warning when loft exceeds 40% of total height", () => {
      const config = createValidConfig({
        loftEnabled: true,
        heightMm: 2000,
        loftHeightMm: 1000, // 50% of height
      });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(true); // Warning, not error
      expect(result.warnings.some((w) => w.field === "loftHeightMm")).toBe(true);
    });

    it("accepts loft height at exactly 40% of total height", () => {
      const config = createValidConfig({
        loftEnabled: true,
        heightMm: 2000,
        loftHeightMm: 800, // 40% of height
      });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(true);
      expect(result.warnings.filter((w) => w.field === "loftHeightMm")).toHaveLength(0);
    });

    it("does not validate loft height when loft is disabled", () => {
      const config = createValidConfig({ loftEnabled: false, loftHeightMm: 0 });
      const result = validateModuleConfig(config);
      expect(result.errors.filter((e) => e.field === "loftHeightMm")).toHaveLength(0);
    });
  });

  describe("center post validations", () => {
    it("returns error when centerPostCount is negative", () => {
      const config = createValidConfig({ centerPostCount: -1 });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "centerPostCount")).toBe(true);
    });

    it("returns error when centerPostCount exceeds maximum", () => {
      const config = createValidConfig({ centerPostCount: 15 });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "centerPostCount")).toBe(true);
    });

    it("returns warning when centerPostCount exceeds sectionCount - 1", () => {
      const config = createValidConfig({ sectionCount: 3, centerPostCount: 5 });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(true); // Warning, not error
      expect(result.warnings.some((w) => w.field === "centerPostCount")).toBe(true);
    });

    it("does not validate centerPostCount when undefined", () => {
      const config = createValidConfig();
      delete (config as any).centerPostCount;
      const result = validateModuleConfig(config);
      expect(result.errors.filter((e) => e.field === "centerPostCount")).toHaveLength(0);
    });
  });

  describe("thickness validations", () => {
    it("returns error when carcass thickness is below minimum", () => {
      const config = createValidConfig({ carcassThicknessMm: 8 });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "carcassThicknessMm")).toBe(true);
    });

    it("returns error when carcass thickness exceeds maximum", () => {
      const config = createValidConfig({ carcassThicknessMm: 30 });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "carcassThicknessMm")).toBe(true);
    });

    it("returns error when back panel thickness is below minimum", () => {
      const config = createValidConfig({ backPanelThicknessMm: 2 });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "backPanelThicknessMm")).toBe(true);
    });

    it("returns error when back panel thickness exceeds maximum", () => {
      const config = createValidConfig({ backPanelThicknessMm: 25 });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "backPanelThicknessMm")).toBe(true);
    });

    it("does not validate thickness when undefined", () => {
      const config = createValidConfig();
      delete (config as any).carcassThicknessMm;
      delete (config as any).backPanelThicknessMm;
      const result = validateModuleConfig(config);
      expect(result.errors.filter((e) => e.field.includes("Thickness"))).toHaveLength(0);
    });
  });

  describe("material warnings", () => {
    it("returns warning when carcassMaterial is empty", () => {
      const config = createValidConfig({ carcassMaterial: "" });
      const result = validateModuleConfig(config);
      expect(result.warnings.some((w) => w.field === "carcassMaterial")).toBe(true);
    });

    it("returns warning when shutterMaterial is empty", () => {
      const config = createValidConfig({ shutterMaterial: "" });
      const result = validateModuleConfig(config);
      expect(result.warnings.some((w) => w.field === "shutterMaterial")).toBe(true);
    });

    it("does not warn when materials are specified", () => {
      const config = createValidConfig();
      const result = validateModuleConfig(config);
      expect(result.warnings.filter((w) => w.field === "carcassMaterial")).toHaveLength(0);
      expect(result.warnings.filter((w) => w.field === "shutterMaterial")).toHaveLength(0);
    });
  });

  describe("multiple errors", () => {
    it("returns all errors for a completely invalid config", () => {
      const config = createValidConfig({
        unitType: "" as any,
        name: "",
        widthMm: 50,
        heightMm: 100,
        depthMm: 10,
        sectionCount: 0,
      });
      const result = validateModuleConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});

// =============================================================================
// sanitizeModuleConfig TESTS
// =============================================================================

describe("sanitizeModuleConfig", () => {
  describe("dimension clamping", () => {
    it("clamps width to minimum", () => {
      const config = createValidConfig({ widthMm: 50 });
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.widthMm).toBe(VALIDATION_LIMITS.minWidth);
    });

    it("clamps width to maximum", () => {
      const config = createValidConfig({ widthMm: 15000 });
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.widthMm).toBe(VALIDATION_LIMITS.maxWidth);
    });

    it("clamps height to minimum", () => {
      const config = createValidConfig({ heightMm: 100 });
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.heightMm).toBe(VALIDATION_LIMITS.minHeight);
    });

    it("clamps height to maximum", () => {
      const config = createValidConfig({ heightMm: 8000 });
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.heightMm).toBe(VALIDATION_LIMITS.maxHeight);
    });

    it("clamps depth to minimum", () => {
      const config = createValidConfig({ depthMm: 50 });
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.depthMm).toBe(VALIDATION_LIMITS.minDepth);
    });

    it("clamps depth to maximum", () => {
      const config = createValidConfig({ depthMm: 1500 });
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.depthMm).toBe(VALIDATION_LIMITS.maxDepth);
    });

    it("preserves valid dimensions", () => {
      const config = createValidConfig({ widthMm: 2400, heightMm: 2100, depthMm: 560 });
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.widthMm).toBe(2400);
      expect(sanitized.heightMm).toBe(2100);
      expect(sanitized.depthMm).toBe(560);
    });
  });

  describe("count clamping", () => {
    it("clamps sectionCount to minimum", () => {
      const config = createValidConfig({ sectionCount: 0 });
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.sectionCount).toBe(VALIDATION_LIMITS.minSectionCount);
    });

    it("clamps sectionCount to maximum", () => {
      const config = createValidConfig({ sectionCount: 20 });
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.sectionCount).toBe(VALIDATION_LIMITS.maxSectionCount);
    });

    it("rounds sectionCount to integer", () => {
      const config = createValidConfig({ sectionCount: 2.7 });
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.sectionCount).toBe(3);
    });

    it("clamps shutterCount to minimum", () => {
      const config = createValidConfig({ shutterCount: -5 });
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.shutterCount).toBe(VALIDATION_LIMITS.minShutterCount);
    });

    it("rounds shutterCount to integer", () => {
      const config = createValidConfig({ shutterCount: 3.2 });
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.shutterCount).toBe(3);
    });
  });

  describe("loft clamping", () => {
    it("clamps loft height to minimum when enabled", () => {
      const config = createValidConfig({ loftEnabled: true, loftHeightMm: 50 });
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.loftHeightMm).toBe(VALIDATION_LIMITS.minLoftHeight);
    });

    it("clamps loft height to maxLoftHeightRatio when enabled", () => {
      const config = createValidConfig({
        loftEnabled: true,
        heightMm: 2000,
        loftHeightMm: 1500,
      });
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.loftHeightMm).toBe(2000 * VALIDATION_LIMITS.maxLoftHeightRatio);
    });

    it("preserves loft height when disabled", () => {
      const config = createValidConfig({ loftEnabled: false, loftHeightMm: 0 });
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.loftHeightMm).toBe(0);
    });
  });

  describe("center post clamping", () => {
    it("clamps centerPostCount to minimum", () => {
      const config = createValidConfig({ centerPostCount: -2 });
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.centerPostCount).toBe(VALIDATION_LIMITS.minCenterPostCount);
    });

    it("clamps centerPostCount to maximum", () => {
      const config = createValidConfig({ centerPostCount: 15 });
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.centerPostCount).toBe(VALIDATION_LIMITS.maxCenterPostCount);
    });

    it("rounds centerPostCount to integer", () => {
      const config = createValidConfig({ centerPostCount: 2.8 });
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.centerPostCount).toBe(3);
    });

    it("preserves undefined centerPostCount", () => {
      const config = createValidConfig();
      delete (config as any).centerPostCount;
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.centerPostCount).toBeUndefined();
    });
  });

  describe("thickness clamping", () => {
    it("clamps carcass thickness to minimum", () => {
      const config = createValidConfig({ carcassThicknessMm: 5 });
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.carcassThicknessMm).toBe(VALIDATION_LIMITS.minCarcassThickness);
    });

    it("clamps carcass thickness to maximum", () => {
      const config = createValidConfig({ carcassThicknessMm: 50 });
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.carcassThicknessMm).toBe(VALIDATION_LIMITS.maxCarcassThickness);
    });

    it("clamps back panel thickness to minimum", () => {
      const config = createValidConfig({ backPanelThicknessMm: 2 });
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.backPanelThicknessMm).toBe(VALIDATION_LIMITS.minBackPanelThickness);
    });

    it("clamps back panel thickness to maximum", () => {
      const config = createValidConfig({ backPanelThicknessMm: 30 });
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.backPanelThicknessMm).toBe(VALIDATION_LIMITS.maxBackPanelThickness);
    });

    it("preserves undefined thickness values", () => {
      const config = createValidConfig();
      delete (config as any).carcassThicknessMm;
      delete (config as any).backPanelThicknessMm;
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.carcassThicknessMm).toBeUndefined();
      expect(sanitized.backPanelThicknessMm).toBeUndefined();
    });
  });

  describe("preserves other fields", () => {
    it("preserves unitType, name, and materials", () => {
      const config = createValidConfig();
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.unitType).toBe(config.unitType);
      expect(sanitized.name).toBe(config.name);
      expect(sanitized.carcassMaterial).toBe(config.carcassMaterial);
      expect(sanitized.shutterMaterial).toBe(config.shutterMaterial);
    });

    it("preserves loftEnabled boolean", () => {
      const config = createValidConfig({ loftEnabled: true });
      const sanitized = sanitizeModuleConfig(config);
      expect(sanitized.loftEnabled).toBe(true);
    });
  });

  describe("sanitized config is valid", () => {
    it("produces a valid config from invalid input", () => {
      const invalidConfig = createValidConfig({
        widthMm: 50,
        heightMm: 100,
        depthMm: 10,
        sectionCount: 0,
        shutterCount: -5,
      });
      const sanitized = sanitizeModuleConfig(invalidConfig);
      const result = validateModuleConfig(sanitized);
      expect(result.valid).toBe(true);
    });
  });
});

// =============================================================================
// isValidModuleConfig TESTS
// =============================================================================

describe("isValidModuleConfig", () => {
  it("returns true for valid config", () => {
    const config = createValidConfig();
    expect(isValidModuleConfig(config)).toBe(true);
  });

  it("returns false for invalid config", () => {
    const config = createValidConfig({ widthMm: 50 });
    expect(isValidModuleConfig(config)).toBe(false);
  });

  it("returns true even with warnings", () => {
    const config = createValidConfig({ carcassMaterial: "" });
    expect(isValidModuleConfig(config)).toBe(true);
  });
});
