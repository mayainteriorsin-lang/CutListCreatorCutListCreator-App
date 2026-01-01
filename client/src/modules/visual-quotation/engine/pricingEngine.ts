/**
 * Pricing Engine
 * --------------
 * Calculates sqft and totals.
 * Replace rates from master settings later.
 */

export interface PricingResult {
  carcassSqft: number;
  shutterSqft: number;
  subtotal: number;
  gst: number;
  total: number;
}

const RATE = {
  CARCASS_PER_SQFT: 1200,
  SHUTTER_PER_SQFT: 1800,
};

export function calculatePricing(units: {
  widthMm: number;
  heightMm: number;
  loftEnabled: boolean;
  loftHeightMm: number;
}[]): PricingResult {
  let carcassSqft = 0;
  let shutterSqft = 0;

  units.forEach((u) => {
    const mainHeight = u.loftEnabled ? u.heightMm - u.loftHeightMm : u.heightMm;
    carcassSqft += (u.widthMm * mainHeight) / 92900;
    shutterSqft += (u.widthMm * mainHeight) / 92900;

    if (u.loftEnabled) {
      shutterSqft += (u.widthMm * u.loftHeightMm) / 92900;
    }
  });

  const subtotal =
    carcassSqft * RATE.CARCASS_PER_SQFT +
    shutterSqft * RATE.SHUTTER_PER_SQFT;

  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  return {
    carcassSqft: Number(carcassSqft.toFixed(2)),
    shutterSqft: Number(shutterSqft.toFixed(2)),
    subtotal: Math.round(subtotal),
    gst: Math.round(gst),
    total: Math.round(total),
  };
}
