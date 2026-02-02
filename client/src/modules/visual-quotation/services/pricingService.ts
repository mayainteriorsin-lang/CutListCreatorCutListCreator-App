import { useDesignCanvasStore } from '../store/v2/useDesignCanvasStore';
import { usePricingStore } from '../store/v2/usePricingStore';
import { calculatePricing, getCarcassRate, getShutterRate } from '../engine/pricingEngine';
import type { RateMode, QuickRatePreview } from '../types/pricing';

/**
 * Pricing Service
 *
 * Manages pricing calculations and Rate Code logic.
 * Wraps pricingEngine with state-aware context.
 *
 * IMPORTANT: Respects pricing lock. When locked, returns finalPrice
 * without recalculation.
 */
export class PricingService {

  /**
   * Calculate pricing for the current units in the store
   *
   * LOCKED BEHAVIOR: If pricingLocked = true, returns the frozen finalPrice
   * NO recalculation happens when locked.
   */
  calculateCurrentPricing() {
    // Check pricing lock first
    const pricingState = usePricingStore.getState();
    if (pricingState.pricingLocked && pricingState.finalPrice) {
      // Return locked price in compatible format
      const fp = pricingState.finalPrice;
      return {
        units: fp.units.map((u, idx) => ({
          unitIndex: idx + 1,
          unitType: u.unitLabel,
          carcassSqft: 0, // Not tracked in finalPrice
          carcassRate: 0,
          carcassPrice: 0,
          shutterSqft: u.shutterSqft,
          shutterRate: fp.ratesUsed.shutterRate,
          shutterPrice: u.shutterPrice,
          loftSqft: u.loftSqft,
          loftPrice: u.loftPrice,
          addOnsPrice: 0,
          unitTotal: u.unitTotal,
        })),
        totalCarcassSqft: 0,
        totalShutterSqft: fp.totalShutterSqft,
        totalLoftSqft: fp.totalLoftSqft,
        totalSqft: fp.totalShutterSqft + fp.totalLoftSqft,
        carcassRate: 0,
        shutterRate: fp.ratesUsed.shutterRate,
        subtotal: fp.subtotal,
        addOnsTotal: fp.addOnsTotal,
        gst: Math.round((fp.grandTotal) * 0.18 / 1.18), // Back-calculate GST
        total: fp.grandTotal,
      };
    }

    // UNLOCKED: Calculate fresh
    const units = useDesignCanvasStore.getState().drawnUnits;
    if (!units || units.length === 0) {
      return null;
    }

    return calculatePricing(units);
  }

  /**
   * Calculate pricing for a specific set of units
   */
  calculate(units: any[]) {
    return calculatePricing(units);
  }

  /**
   * Check if pricing is stale/needs update
   * (Placeholder for future optimization)
   */
  needsUpdate(): boolean {
    return true; // Always calculate on render for now
  }
}

export const pricingService = new PricingService();

/**
 * Get quick rate preview for a specific rate mode
 * Uses simple Rate Card rates from pricingControl
 *
 * LOCKED BEHAVIOR: Returns locked rates when pricingLocked = true
 */
export function getQuickRatePreview(mode: RateMode): QuickRatePreview {
  const pricingState = usePricingStore.getState();
  const { pricingControl, pricingLocked, finalPrice } = pricingState;

  // Use locked rates if pricing is locked
  let shutterRate: number;
  let loftOnlyRate: number;
  let shutterLoftShutterRate: number;
  let shutterLoftLoftRate: number;

  if (pricingLocked && finalPrice) {
    // Use frozen rates from finalPrice
    shutterRate = finalPrice.ratesUsed.shutterRate;
    loftOnlyRate = finalPrice.ratesUsed.loftRate;
    shutterLoftShutterRate = finalPrice.ratesUsed.shutterLoftShutterRate;
    shutterLoftLoftRate = finalPrice.ratesUsed.shutterLoftLoftRate;
  } else {
    // Use live rates from pricingControl
    shutterRate = pricingControl.sqftRate;
    loftOnlyRate = pricingControl.loftSqftRate;
    shutterLoftShutterRate = pricingControl.shutterLoftShutterRate ?? shutterRate;
    shutterLoftLoftRate = pricingControl.shutterLoftLoftRate ?? loftOnlyRate;
  }

  const formatRate = (rate: number | undefined) => `₹${(rate ?? 0).toLocaleString("en-IN")}`;

  switch (mode) {
    case "SHUTTER":
      return {
        mode,
        summaryText: `${formatRate(shutterRate)}/sqft`,
        breakdown: {
          shutterRate,
        },
      };
    case "SHUTTER_LOFT":
      return {
        mode,
        summaryText: `S: ${formatRate(shutterLoftShutterRate)} | L: ${formatRate(shutterLoftLoftRate)}`,
        breakdown: {
          shutterRate: shutterLoftShutterRate,
          loftRate: shutterLoftLoftRate,
        },
      };
    case "LOFT_ONLY":
      return {
        mode,
        summaryText: `${formatRate(loftOnlyRate)}/sqft`,
        breakdown: {
          loftRate: loftOnlyRate,
        },
      };
    default:
      return {
        mode,
        summaryText: `${formatRate(shutterRate)}/sqft`,
        breakdown: {
          shutterRate,
        },
      };
  }
}

/**
 * Get rate previews for all modes
 */
export function getAllRatePreviews(): QuickRatePreview[] {
  const modes: RateMode[] = ["SHUTTER", "SHUTTER_LOFT", "LOFT_ONLY"];
  return modes.map(mode => getQuickRatePreview(mode));
}
