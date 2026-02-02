/**
 * Design Module - Pricing Engine Unit Tests
 *
 * Layer: UNIT (Domain)
 * Scope: Pure pricing calculations
 * Priority: CRITICAL - Revenue-affecting business logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { calculateModulePricing } from '../engine/pricingEngine';
import { DEFAULT_RATE_CONFIG, getCarcassRate, getShutterRate } from '../engine/rates';
import type { ModuleConfig } from '../engine/shapeGenerator';

// Get actual default rates for test calculations
const DEFAULT_CARCASS_RATE = getCarcassRate(DEFAULT_RATE_CONFIG); // 750 per sqft
const DEFAULT_SHUTTER_RATE = getShutterRate(DEFAULT_RATE_CONFIG); // 400 per sqft

// =============================================================================
// TEST FIXTURES
// =============================================================================

const createBaseConfig = (overrides?: Partial<ModuleConfig>): ModuleConfig => ({
  unitType: 'wardrobe_carcass',
  name: 'Test Module',
  widthMm: 2400,
  heightMm: 2100,
  depthMm: 560,
  shutterCount: 3,
  sectionCount: 3,
  loftEnabled: false,
  loftHeightMm: 0,
  carcassMaterial: 'plywood',
  shutterMaterial: 'laminate',
  ...overrides,
});

// =============================================================================
// BASIC PRICING CALCULATIONS
// =============================================================================

describe('calculateModulePricing', () => {
  describe('basic area calculations', () => {
    it('calculates carcass sqft correctly', () => {
      const config = createBaseConfig({
        widthMm: 2400,
        heightMm: 2100,
        loftEnabled: false,
      });
      const result = calculateModulePricing(config);

      // Area = 2400 * 2100 = 5,040,000 mm²
      // Sqft = 5,040,000 / 92903.04 ≈ 54.25 sqft
      const expectedSqft = (2400 * 2100) / 92903.04;
      expect(result.carcassSqft).toBeCloseTo(expectedSqft, 1);
    });

    it('calculates shutter sqft equal to carcass sqft', () => {
      const config = createBaseConfig();
      const result = calculateModulePricing(config);

      // Shutter area equals main carcass area
      expect(result.shutterSqft).toBe(result.carcassSqft);
    });

    it('calculates total sqft as sum of carcass and shutter', () => {
      const config = createBaseConfig({ loftEnabled: false });
      const result = calculateModulePricing(config);

      // Without loft: totalSqft = carcassSqft + shutterSqft
      expect(result.totalSqft).toBeCloseTo(result.carcassSqft + result.shutterSqft, 1);
    });
  });

  // ===========================================================================
  // LOFT CALCULATIONS
  // ===========================================================================

  describe('loft calculations', () => {
    it('calculates loft sqft when loft is enabled', () => {
      const config = createBaseConfig({
        widthMm: 2400,
        heightMm: 2100,
        loftEnabled: true,
        loftHeightMm: 400,
      });
      const result = calculateModulePricing(config);

      // Loft area = 2400 * 400 = 960,000 mm²
      const expectedLoftSqft = (2400 * 400) / 92903.04;
      expect(result.loftSqft).toBeCloseTo(expectedLoftSqft, 1);
    });

    it('excludes loft height from main area', () => {
      const config = createBaseConfig({
        widthMm: 2400,
        heightMm: 2100,
        loftEnabled: true,
        loftHeightMm: 400,
      });
      const result = calculateModulePricing(config);

      // Main height = 2100 - 400 = 1700mm
      // Carcass area = 2400 * 1700 mm²
      const expectedCarcassSqft = (2400 * 1700) / 92903.04;
      expect(result.carcassSqft).toBeCloseTo(expectedCarcassSqft, 1);
    });

    it('returns zero loft sqft when loft disabled', () => {
      const config = createBaseConfig({
        loftEnabled: false,
        loftHeightMm: 400, // Should be ignored
      });
      const result = calculateModulePricing(config);

      expect(result.loftSqft).toBe(0);
      expect(result.loftPrice).toBe(0);
    });

    it('returns zero loft sqft when loft height is zero', () => {
      const config = createBaseConfig({
        loftEnabled: true,
        loftHeightMm: 0,
      });
      const result = calculateModulePricing(config);

      expect(result.loftSqft).toBe(0);
      expect(result.loftPrice).toBe(0);
    });

    it('includes loft sqft in total', () => {
      const config = createBaseConfig({
        loftEnabled: true,
        loftHeightMm: 400,
      });
      const result = calculateModulePricing(config);

      expect(result.totalSqft).toBeCloseTo(
        result.carcassSqft + result.shutterSqft + result.loftSqft,
        1
      );
    });
  });

  // ===========================================================================
  // PRICE CALCULATIONS
  // ===========================================================================

  describe('price calculations', () => {
    it('calculates carcass price from rate', () => {
      const config = createBaseConfig();
      const result = calculateModulePricing(config);

      // carcassPrice = carcassSqft * carcassRate
      const expectedPrice = result.carcassSqft * result.carcassRate;
      expect(result.carcassPrice).toBe(Math.round(expectedPrice));
    });

    it('calculates shutter price from rate', () => {
      const config = createBaseConfig();
      const result = calculateModulePricing(config);

      // shutterPrice = shutterSqft * shutterRate
      const expectedPrice = result.shutterSqft * result.shutterRate;
      expect(result.shutterPrice).toBe(Math.round(expectedPrice));
    });

    it('calculates loft price at combined rate', () => {
      const config = createBaseConfig({
        loftEnabled: true,
        loftHeightMm: 400,
      });
      const result = calculateModulePricing(config);

      // Loft rate = carcassRate + shutterRate
      const loftRate = result.carcassRate + result.shutterRate;
      // Note: loftSqft is pre-rounded to 2 decimal places, so recalculating may differ slightly
      expect(result.loftPrice).toBeGreaterThan(0);
      // Verify relationship is approximately correct (within rounding error)
      const expectedPrice = result.loftSqft * loftRate;
      expect(Math.abs(result.loftPrice - Math.round(expectedPrice))).toBeLessThan(20);
    });

    it('calculates subtotal as sum of all prices', () => {
      const config = createBaseConfig({
        loftEnabled: true,
        loftHeightMm: 400,
      });
      const result = calculateModulePricing(config);

      expect(result.subtotal).toBe(
        result.carcassPrice + result.shutterPrice + result.loftPrice
      );
    });
  });

  // ===========================================================================
  // GST CALCULATIONS
  // ===========================================================================

  describe('GST calculations', () => {
    it('calculates GST at 18%', () => {
      const config = createBaseConfig();
      const result = calculateModulePricing(config);

      const expectedGst = result.subtotal * 0.18;
      expect(result.gst).toBe(Math.round(expectedGst));
    });

    it('calculates total as subtotal plus GST', () => {
      const config = createBaseConfig();
      const result = calculateModulePricing(config);

      expect(result.total).toBe(result.subtotal + result.gst);
    });
  });

  // ===========================================================================
  // OUTPUT FORMAT
  // ===========================================================================

  describe('output format', () => {
    it('returns module name', () => {
      const config = createBaseConfig({ name: 'Master Bedroom Wardrobe' });
      const result = calculateModulePricing(config);

      expect(result.moduleName).toBe('Master Bedroom Wardrobe');
    });

    it('returns sqft values with 2 decimal places', () => {
      const config = createBaseConfig();
      const result = calculateModulePricing(config);

      // Check that sqft values are properly rounded
      expect(Number(result.carcassSqft.toFixed(2))).toBe(result.carcassSqft);
      expect(Number(result.shutterSqft.toFixed(2))).toBe(result.shutterSqft);
      expect(Number(result.totalSqft.toFixed(2))).toBe(result.totalSqft);
    });

    it('returns price values as rounded integers', () => {
      const config = createBaseConfig();
      const result = calculateModulePricing(config);

      // Prices should be whole numbers
      expect(result.carcassPrice).toBe(Math.round(result.carcassPrice));
      expect(result.shutterPrice).toBe(Math.round(result.shutterPrice));
      expect(result.subtotal).toBe(Math.round(result.subtotal));
      expect(result.gst).toBe(Math.round(result.gst));
      expect(result.total).toBe(Math.round(result.total));
    });

    it('includes rate information', () => {
      const config = createBaseConfig();
      const result = calculateModulePricing(config);

      expect(result.carcassRate).toBeDefined();
      expect(result.shutterRate).toBeDefined();
      expect(typeof result.carcassRate).toBe('number');
      expect(typeof result.shutterRate).toBe('number');
    });
  });

  // ===========================================================================
  // EDGE CASES
  // ===========================================================================

  describe('edge cases', () => {
    it('handles minimum dimensions', () => {
      const config = createBaseConfig({
        widthMm: 300,
        heightMm: 500,
      });
      const result = calculateModulePricing(config);

      expect(result.carcassSqft).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
    });

    it('handles large dimensions', () => {
      const config = createBaseConfig({
        widthMm: 6000,
        heightMm: 3000,
      });
      const result = calculateModulePricing(config);

      expect(result.carcassSqft).toBeGreaterThan(100);
      expect(result.total).toBeGreaterThan(0);
    });

    it('handles different unit types', () => {
      const kitchenConfig = createBaseConfig({
        unitType: 'kitchen',
        name: 'Kitchen Unit',
      });
      const result = calculateModulePricing(kitchenConfig);

      expect(result.moduleName).toBe('Kitchen Unit');
      expect(result.total).toBeGreaterThan(0);
    });

    it('handles full loft height (edge case)', () => {
      const config = createBaseConfig({
        widthMm: 2400,
        heightMm: 2100,
        loftEnabled: true,
        loftHeightMm: 2100, // Full height is loft
      });
      const result = calculateModulePricing(config);

      // Main area should be zero (height - loftHeight = 0)
      expect(result.carcassSqft).toBe(0);
      expect(result.shutterSqft).toBe(0);
      expect(result.loftSqft).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // CALCULATION ACCURACY
  // ===========================================================================

  describe('calculation accuracy', () => {
    it('maintains mathematical consistency', () => {
      const config = createBaseConfig({
        widthMm: 2400,
        heightMm: 2100,
        loftEnabled: true,
        loftHeightMm: 400,
      });
      const result = calculateModulePricing(config);

      // Verify total derivation chain
      const expectedSubtotal = result.carcassPrice + result.shutterPrice + result.loftPrice;
      const expectedGst = Math.round(expectedSubtotal * 0.18);
      const expectedTotal = expectedSubtotal + expectedGst;

      expect(result.subtotal).toBe(expectedSubtotal);
      expect(result.gst).toBe(expectedGst);
      expect(result.total).toBe(expectedTotal);
    });

    it('uses correct MM2_TO_SQFT conversion factor', () => {
      const config = createBaseConfig({
        widthMm: 1000, // 1 meter
        heightMm: 1000, // 1 meter
        loftEnabled: false,
      });
      const result = calculateModulePricing(config);

      // 1m² = 1,000,000 mm² = ~10.76 sqft
      const expectedSqft = 1000000 / 92903.04;
      expect(result.carcassSqft).toBeCloseTo(expectedSqft, 2);
    });
  });
});
