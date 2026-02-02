/**
 * Pricing Engine Unit Tests
 * Tests sqft calculations, rate application, GST, and edge cases.
 */

import { describe, it, expect } from "vitest";
import {
  calculatePricing,
  getCarcassRate,
  getShutterRate,
  type DrawnUnitForPricing,
} from "./pricingEngine";
import { DEFAULT_WARDROBE_CONFIG, type WardrobeConfig } from "../types";

// 1 sqft = 92903.04 mm²
const MM2_TO_SQFT = 92903.04;

describe("pricingEngine", () => {
  describe("getCarcassRate", () => {
    it("should sum material, thickness, and edgeBand prices", () => {
      const config: WardrobeConfig = {
        ...DEFAULT_WARDROBE_CONFIG,
        carcass: {
          ...DEFAULT_WARDROBE_CONFIG.carcass,
          materialPrice: 100,
          thicknessPrice: 50,
          edgeBandPrice: 25,
        },
      };
      expect(getCarcassRate(config)).toBe(175);
    });

    it("should return 0 when all prices are 0", () => {
      const config: WardrobeConfig = {
        ...DEFAULT_WARDROBE_CONFIG,
        carcass: {
          ...DEFAULT_WARDROBE_CONFIG.carcass,
          materialPrice: 0,
          thicknessPrice: 0,
          edgeBandPrice: 0,
        },
      };
      expect(getCarcassRate(config)).toBe(0);
    });
  });

  describe("getShutterRate", () => {
    it("should sum material, finish, and handle prices", () => {
      const config: WardrobeConfig = {
        ...DEFAULT_WARDROBE_CONFIG,
        shutter: {
          ...DEFAULT_WARDROBE_CONFIG.shutter,
          materialPrice: 200,
          finishPrice: 75,
          handlePrice: 30,
        },
      };
      expect(getShutterRate(config)).toBe(305);
    });
  });

  describe("calculatePricing", () => {
    it("should return zeros for empty units array", () => {
      const result = calculatePricing([]);

      expect(result.units).toEqual([]);
      expect(result.totalSqft).toBe(0);
      expect(result.subtotal).toBe(0);
      expect(result.gst).toBe(0);
      expect(result.total).toBe(0);
    });

    it("should calculate correct sqft for a single unit", () => {
      // 1000mm x 1000mm = 1,000,000 mm² ≈ 10.76 sqft
      const unit: DrawnUnitForPricing = {
        widthMm: 1000,
        heightMm: 1000,
        unitType: "wardrobe",
      };

      const result = calculatePricing([unit]);
      const expectedSqft = Number(((1000 * 1000) / MM2_TO_SQFT).toFixed(2));

      expect(result.units.length).toBe(1);
      expect(result.units[0]!.carcassSqft).toBe(expectedSqft);
      expect(result.units[0]!.shutterSqft).toBe(expectedSqft);
    });

    it("should apply unit-specific wardrobeConfig rates", () => {
      const customConfig: WardrobeConfig = {
        ...DEFAULT_WARDROBE_CONFIG,
        carcass: {
          ...DEFAULT_WARDROBE_CONFIG.carcass,
          materialPrice: 100,
          thicknessPrice: 0,
          edgeBandPrice: 0,
        },
        shutter: {
          ...DEFAULT_WARDROBE_CONFIG.shutter,
          materialPrice: 200,
          finishPrice: 0,
          handlePrice: 0,
        },
      };

      const unit: DrawnUnitForPricing = {
        widthMm: 1000,
        heightMm: 1000,
        unitType: "wardrobe",
        wardrobeConfig: customConfig,
      };

      const result = calculatePricing([unit]);
      const sqft = Number(((1000 * 1000) / MM2_TO_SQFT).toFixed(2));

      // Carcass: sqft * 100
      expect(result.units[0]!.carcassRate).toBe(100);
      // Allow 1 unit variance due to floating point rounding
      expect(Math.abs(result.units[0]!.carcassPrice - Math.round(sqft * 100))).toBeLessThanOrEqual(1);

      // Shutter: sqft * 200
      expect(result.units[0]!.shutterRate).toBe(200);
      // Allow 1 unit variance due to floating point rounding
      expect(Math.abs(result.units[0]!.shutterPrice - Math.round(sqft * 200))).toBeLessThanOrEqual(1);
    });

    it("should calculate loft pricing with loftEnabled", () => {
      const config: WardrobeConfig = {
        ...DEFAULT_WARDROBE_CONFIG,
        carcass: {
          ...DEFAULT_WARDROBE_CONFIG.carcass,
          materialPrice: 100,
          thicknessPrice: 0,
          edgeBandPrice: 0,
        },
        shutter: {
          ...DEFAULT_WARDROBE_CONFIG.shutter,
          materialPrice: 100,
          finishPrice: 0,
          handlePrice: 0,
        },
      };

      const unit: DrawnUnitForPricing = {
        widthMm: 1000,
        heightMm: 1000,
        loftEnabled: true,
        loftWidthMm: 1000,
        loftHeightMm: 500,
        wardrobeConfig: config,
      };

      const result = calculatePricing([unit]);
      const loftSqft = Number(((1000 * 500) / MM2_TO_SQFT).toFixed(2));
      // Loft rate = carcass + shutter = 200
      const expectedLoftPrice = Math.round(loftSqft * 200);

      expect(result.units[0]!.loftSqft).toBe(loftSqft);
      expect(result.units[0]!.loftPrice).toBe(expectedLoftPrice);
    });

    it("should calculate loft-only units correctly", () => {
      const config: WardrobeConfig = {
        ...DEFAULT_WARDROBE_CONFIG,
        carcass: {
          ...DEFAULT_WARDROBE_CONFIG.carcass,
          materialPrice: 100,
          thicknessPrice: 0,
          edgeBandPrice: 0,
        },
        shutter: {
          ...DEFAULT_WARDROBE_CONFIG.shutter,
          materialPrice: 100,
          finishPrice: 0,
          handlePrice: 0,
        },
      };

      const unit: DrawnUnitForPricing = {
        widthMm: 1000,
        heightMm: 1000,
        loftOnly: true,
        loftEnabled: true,
        loftWidthMm: 2000,
        loftHeightMm: 400,
        wardrobeConfig: config,
      };

      const result = calculatePricing([unit]);

      // For loft-only, carcass and shutter should be 0
      expect(result.units[0]!.carcassSqft).toBe(0);
      expect(result.units[0]!.shutterSqft).toBe(0);

      // Loft should have values
      const expectedLoftSqft = Number(((2000 * 400) / MM2_TO_SQFT).toFixed(2));
      expect(result.units[0]!.loftSqft).toBe(expectedLoftSqft);
    });

    it("should calculate 18% GST on subtotal", () => {
      const config: WardrobeConfig = {
        ...DEFAULT_WARDROBE_CONFIG,
        carcass: {
          ...DEFAULT_WARDROBE_CONFIG.carcass,
          materialPrice: 100,
          thicknessPrice: 0,
          edgeBandPrice: 0,
        },
        shutter: {
          ...DEFAULT_WARDROBE_CONFIG.shutter,
          materialPrice: 0,
          finishPrice: 0,
          handlePrice: 0,
        },
      };

      // Create unit with exactly 1 sqft area (for easy calculation)
      // 1 sqft = 92903.04 mm², so sqrt = ~304.8mm
      const sideMm = Math.sqrt(MM2_TO_SQFT);
      const unit: DrawnUnitForPricing = {
        widthMm: sideMm,
        heightMm: sideMm,
        wardrobeConfig: config,
      };

      const result = calculatePricing([unit]);

      // Subtotal should be ~100 (1 sqft * 100 rate)
      const expectedSubtotal = 100;
      const expectedGst = Math.round(expectedSubtotal * 0.18);
      const expectedTotal = expectedSubtotal + expectedGst;

      expect(result.subtotal).toBe(expectedSubtotal);
      expect(result.gst).toBe(expectedGst);
      expect(result.total).toBe(expectedTotal);
    });

    it("should sum totals across multiple units", () => {
      const config: WardrobeConfig = {
        ...DEFAULT_WARDROBE_CONFIG,
        carcass: {
          ...DEFAULT_WARDROBE_CONFIG.carcass,
          materialPrice: 50,
          thicknessPrice: 0,
          edgeBandPrice: 0,
        },
        shutter: {
          ...DEFAULT_WARDROBE_CONFIG.shutter,
          materialPrice: 50,
          finishPrice: 0,
          handlePrice: 0,
        },
      };

      const units: DrawnUnitForPricing[] = [
        { widthMm: 1000, heightMm: 1000, wardrobeConfig: config },
        { widthMm: 1000, heightMm: 1000, wardrobeConfig: config },
      ];

      const result = calculatePricing(units);

      // Each unit has same dimensions, so totals should be 2x single unit
      const singleSqft = Number(((1000 * 1000) / MM2_TO_SQFT).toFixed(2));
      // Allow small variance due to floating point rounding
      expect(Math.abs(result.totalCarcassSqft - (singleSqft * 2))).toBeLessThan(0.02);
      expect(Math.abs(result.totalShutterSqft - (singleSqft * 2))).toBeLessThan(0.02);
    });

    it("should handle zero dimensions gracefully", () => {
      const unit: DrawnUnitForPricing = {
        widthMm: 0,
        heightMm: 0,
      };

      const result = calculatePricing([unit]);

      expect(result.units[0]!.carcassSqft).toBe(0);
      expect(result.units[0]!.shutterSqft).toBe(0);
      expect(result.units[0]!.unitTotal).toBe(0);
    });

    it("should not calculate loft when loftEnabled is false", () => {
      const unit: DrawnUnitForPricing = {
        widthMm: 1000,
        heightMm: 1000,
        loftEnabled: false,
        loftWidthMm: 1000,
        loftHeightMm: 500,
      };

      const result = calculatePricing([unit]);

      expect(result.units[0]!.loftSqft).toBe(0);
      expect(result.units[0]!.loftPrice).toBe(0);
    });

    it("should fall back to legacy loftBox when loft dimensions not provided", () => {
      const config: WardrobeConfig = {
        ...DEFAULT_WARDROBE_CONFIG,
        carcass: {
          ...DEFAULT_WARDROBE_CONFIG.carcass,
          materialPrice: 100,
          thicknessPrice: 0,
          edgeBandPrice: 0,
        },
        shutter: {
          ...DEFAULT_WARDROBE_CONFIG.shutter,
          materialPrice: 100,
          finishPrice: 0,
          handlePrice: 0,
        },
      };

      const unit: DrawnUnitForPricing = {
        widthMm: 1000,
        heightMm: 1000,
        loftEnabled: true,
        loftWidthMm: 0, // No separate loft dimensions
        loftHeightMm: 0,
        loftBox: { width: 500, height: 200 }, // Legacy box in px
        wardrobeConfig: config,
      };

      const result = calculatePricing([unit]);

      // Should use loftBox dimensions
      const expectedLoftSqft = Number(((500 * 200) / MM2_TO_SQFT).toFixed(2));
      expect(result.units[0]!.loftSqft).toBe(expectedLoftSqft);
    });
  });
});
