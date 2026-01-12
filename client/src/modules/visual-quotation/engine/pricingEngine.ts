/**
 * Pricing Engine
 * --------------
 * Calculates sqft and totals from drawn units.
 * Shows each unit (wardrobe + loft) with individual pricing.
 */

// Per-unit pricing breakdown
export interface UnitPricing {
  unitIndex: number;
  unitType: string;
  wardrobeSqft: number;
  wardrobePrice: number;
  loftSqft: number;
  loftPrice: number;
  unitTotal: number;
}

export interface PricingResult {
  units: UnitPricing[];
  totalSqft: number;
  subtotal: number;
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
  // Separate loft dimensions (user enters separately from shutter)
  loftWidthMm?: number;
  loftHeightMm?: number;
  // Legacy: loftBox for backward compatibility
  loftBox?: { width: number; height: number };
}

export function calculatePricing(
  drawnUnits: DrawnUnitForPricing[],
  sqftRate: number = 150
): PricingResult {
  const units: UnitPricing[] = [];
  let totalSqft = 0;

  drawnUnits.forEach((u, index) => {
    // Main wardrobe/shutter area: width x height
    const wardrobeSqft = (u.widthMm * u.heightMm) / MM2_TO_SQFT;
    const wardrobePrice = wardrobeSqft * sqftRate;

    // Loft area if enabled - use separate loftWidthMm/loftHeightMm if available
    let loftSqft = 0;
    let loftPrice = 0;
    if (u.loftEnabled) {
      // Use separate loft dimensions if entered (both must be > 0)
      if (u.loftWidthMm && u.loftHeightMm && u.loftWidthMm > 0 && u.loftHeightMm > 0) {
        loftSqft = (u.loftWidthMm * u.loftHeightMm) / MM2_TO_SQFT;
        loftPrice = loftSqft * sqftRate;
      }
      // Fallback to loftBox if no separate dimensions (legacy)
      else if (u.loftBox && u.loftBox.width > 0 && u.loftBox.height > 0) {
        loftSqft = (u.loftBox.width * u.loftBox.height) / MM2_TO_SQFT;
        loftPrice = loftSqft * sqftRate;
      }
    }

    const unitTotal = wardrobePrice + loftPrice;
    totalSqft += wardrobeSqft + loftSqft;

    units.push({
      unitIndex: index + 1,
      unitType: u.unitType || "wardrobe",
      wardrobeSqft: Number(wardrobeSqft.toFixed(2)),
      wardrobePrice: Math.round(wardrobePrice),
      loftSqft: Number(loftSqft.toFixed(2)),
      loftPrice: Math.round(loftPrice),
      unitTotal: Math.round(unitTotal),
    });
  });

  const subtotal = totalSqft * sqftRate;
  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  return {
    units,
    totalSqft: Number(totalSqft.toFixed(2)),
    subtotal: Math.round(subtotal),
    gst: Math.round(gst),
    total: Math.round(total),
  };
}
