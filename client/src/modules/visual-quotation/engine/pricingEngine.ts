/**
 * Pricing Engine
 * --------------
 * Calculates sqft and totals from drawn units using Unit Setup rates.
 * Uses carcass and shutter rates from WardrobeConfig for final pricing.
 */

import { WardrobeConfig, DrawnAddOn } from "../types";
import { DEFAULT_WARDROBE_CONFIG } from "../types/pricing";

// Per-unit pricing breakdown
export interface UnitPricing {
  unitIndex: number;
  unitType: string;
  // Carcass pricing
  carcassSqft: number;
  carcassRate: number;
  carcassPrice: number;
  // Shutter pricing
  shutterSqft: number;
  shutterRate: number;
  shutterPrice: number;
  // Loft pricing (uses carcass + shutter rates)
  loftSqft: number;
  loftPrice: number;
  // Add-ons pricing
  addOnsPrice: number;
  // Total
  unitTotal: number;
}

export interface PricingResult {
  units: UnitPricing[];
  totalCarcassSqft: number;
  totalShutterSqft: number;
  totalLoftSqft: number;
  totalSqft: number;
  carcassRate: number;
  shutterRate: number;
  subtotal: number;
  addOnsTotal: number;
  gst: number;
  total: number;
}

// Convert mm² to sqft: 1 sqft = 92903.04 mm²
const MM2_TO_SQFT = 92903.04;

export interface DrawnUnitForPricing {
  widthMm: number;
  heightMm: number;
  unitType?: string;
  loftEnabled?: boolean;
  loftOnly?: boolean; // When true, this unit is loft-only (no shutter)
  // Separate loft dimensions (user enters separately from shutter)
  loftWidthMm?: number;
  loftHeightMm?: number;
  // Legacy: loftBox for backward compatibility
  loftBox?: { width: number; height: number };
  // Wardrobe config with rates
  wardrobeConfig?: WardrobeConfig;
  // Drawn add-ons for this unit
  drawnAddOns?: DrawnAddOn[];
}

/**
 * Calculate carcass rate from config
 * Rate = material + thickness + edge band (per sqft)
 */
export function getCarcassRate(config: WardrobeConfig): number {
  return config.carcass.materialPrice + config.carcass.thicknessPrice + config.carcass.edgeBandPrice;
}

/**
 * Calculate shutter rate from config
 * Rate = material + finish + handle (per sqft)
 */
export function getShutterRate(config: WardrobeConfig): number {
  return config.shutter.materialPrice + config.shutter.finishPrice + config.shutter.handlePrice;
}

/**
 * Calculate add-ons total from drawn add-ons and pricing config
 */
function calculateAddOnsPrice(drawnAddOns: DrawnAddOn[] | undefined, config: WardrobeConfig): number {
  if (!drawnAddOns || drawnAddOns.length === 0) return 0;

  let total = 0;
  for (const addOn of drawnAddOns) {
    const pricing = config.addOnPricing.find(p => p.id === addOn.addOnType && p.enabled);
    if (pricing) {
      switch (pricing.pricingUnit) {
        case "sqft":
          total += addOn.areaSqft * pricing.pricePerUnit;
          break;
        case "rft":
          total += addOn.lengthRft * pricing.pricePerUnit;
          break;
        case "unit":
          total += addOn.unitCount * pricing.pricePerUnit;
          break;
      }
    }
  }
  return Math.round(total);
}

export function calculatePricing(
  drawnUnits: DrawnUnitForPricing[],
  globalConfig?: WardrobeConfig
): PricingResult {
  const units: UnitPricing[] = [];
  let totalCarcassSqft = 0;
  let totalShutterSqft = 0;
  let totalLoftSqft = 0;
  let subtotal = 0;
  let addOnsTotal = 0;

  // Use global config for rate display, or default
  const displayConfig = globalConfig || DEFAULT_WARDROBE_CONFIG;
  const displayCarcassRate = getCarcassRate(displayConfig);
  const displayShutterRate = getShutterRate(displayConfig);

  drawnUnits.forEach((u, index) => {
    // Use unit's own config if available, otherwise use global config
    const config = u.wardrobeConfig || globalConfig || DEFAULT_WARDROBE_CONFIG;
    const carcassRate = getCarcassRate(config);
    const shutterRate = getShutterRate(config);

    // Check if this is a loft-only unit
    const isLoftOnly = u.loftOnly || false;

    // Main wardrobe area: width x height (applies to both carcass and shutter)
    // For loft-only units, set to 0 since there's no shutter
    const areaSqft = isLoftOnly ? 0 : (u.widthMm * u.heightMm) / MM2_TO_SQFT;

    // Carcass uses full area (0 for loft-only)
    const carcassSqft = areaSqft;
    const carcassPrice = carcassSqft * carcassRate;

    // Shutter uses full area (0 for loft-only)
    const shutterSqft = areaSqft;
    const shutterPrice = shutterSqft * shutterRate;

    // Loft area if enabled OR for loft-only units - uses combined rate (carcass + shutter)
    let loftSqft = 0;
    let loftPrice = 0;
    if (u.loftEnabled || isLoftOnly) {
      const loftRate = carcassRate + shutterRate; // Loft has both carcass and shutter

      // Use separate loft dimensions if entered (both must be > 0)
      if (u.loftWidthMm && u.loftHeightMm && u.loftWidthMm > 0 && u.loftHeightMm > 0) {
        loftSqft = (u.loftWidthMm * u.loftHeightMm) / MM2_TO_SQFT;
        loftPrice = loftSqft * loftRate;
      }
      // Fallback to loftBox if no separate dimensions (legacy)
      else if (u.loftBox && u.loftBox.width > 0 && u.loftBox.height > 0) {
        loftSqft = (u.loftBox.width * u.loftBox.height) / MM2_TO_SQFT;
        loftPrice = loftSqft * loftRate;
      }
    }

    // Calculate add-ons price for this unit
    const addOnsPrice = calculateAddOnsPrice(u.drawnAddOns, config);

    const unitTotal = carcassPrice + shutterPrice + loftPrice + addOnsPrice;

    totalCarcassSqft += carcassSqft;
    totalShutterSqft += shutterSqft;
    totalLoftSqft += loftSqft;
    subtotal += carcassPrice + shutterPrice + loftPrice;
    addOnsTotal += addOnsPrice;

    units.push({
      unitIndex: index + 1,
      unitType: u.unitType || "wardrobe",
      carcassSqft: Number(carcassSqft.toFixed(2)),
      carcassRate,
      carcassPrice: Math.round(carcassPrice),
      shutterSqft: Number(shutterSqft.toFixed(2)),
      shutterRate,
      shutterPrice: Math.round(shutterPrice),
      loftSqft: Number(loftSqft.toFixed(2)),
      loftPrice: Math.round(loftPrice),
      addOnsPrice,
      unitTotal: Math.round(unitTotal),
    });
  });

  const totalSqft = totalCarcassSqft + totalShutterSqft + totalLoftSqft;
  const grandSubtotal = subtotal + addOnsTotal;
  const gst = grandSubtotal * 0.18;
  const total = grandSubtotal + gst;

  return {
    units,
    totalCarcassSqft: Number(totalCarcassSqft.toFixed(2)),
    totalShutterSqft: Number(totalShutterSqft.toFixed(2)),
    totalLoftSqft: Number(totalLoftSqft.toFixed(2)),
    totalSqft: Number(totalSqft.toFixed(2)),
    carcassRate: displayCarcassRate,
    shutterRate: displayShutterRate,
    subtotal: Math.round(subtotal),
    addOnsTotal: Math.round(addOnsTotal),
    gst: Math.round(gst),
    total: Math.round(total),
  };
}
