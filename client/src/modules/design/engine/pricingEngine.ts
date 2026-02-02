/**
 * Pricing Engine
 *
 * Calculates rate card pricing directly from ModuleConfig.
 * Uses local rate configuration for independence from visual-quotation module.
 *
 * Moved from: components/ui/modulePricingEngine.ts
 */

import type { ModuleConfig } from "./shapeGenerator";
import {
  type RateConfig,
  DEFAULT_RATE_CONFIG,
  getCarcassRate,
  getShutterRate,
} from "./rates";

// ── Pricing Result Interface ─────────────────────────────────────────
// Moved from ModuleConfigPanel.tsx to decouple UI from engine

export interface ModulePricingResult {
  moduleName: string;
  carcassSqft: number;
  shutterSqft: number;
  loftSqft: number;
  totalSqft: number;
  carcassRate: number;
  shutterRate: number;
  carcassPrice: number;
  shutterPrice: number;
  loftPrice: number;
  subtotal: number;
  gst: number;
  total: number;
}

// ── Constants ────────────────────────────────────────────────────────

const MM2_TO_SQFT = 92903.04;

// ── Main Pricing Function ────────────────────────────────────────────

export function calculateModulePricing(
  config: ModuleConfig,
  rateConfig?: RateConfig
): ModulePricingResult {
  const wc = rateConfig || DEFAULT_RATE_CONFIG;
  const carcassRate = getCarcassRate(wc);
  const shutterRate = getShutterRate(wc);

  const { widthMm, heightMm, loftEnabled, loftHeightMm } = config;

  // Main area (width x height minus loft if applicable)
  const mainH = loftEnabled ? heightMm - loftHeightMm : heightMm;
  const mainAreaMm2 = widthMm * mainH;

  const carcassSqft = mainAreaMm2 / MM2_TO_SQFT;
  const shutterSqft = mainAreaMm2 / MM2_TO_SQFT;

  const carcassPrice = carcassSqft * carcassRate;
  const shutterPrice = shutterSqft * shutterRate;

  // Loft
  let loftSqft = 0;
  let loftPrice = 0;
  if (loftEnabled && loftHeightMm > 0) {
    const loftRate = carcassRate + shutterRate;
    loftSqft = (widthMm * loftHeightMm) / MM2_TO_SQFT;
    loftPrice = loftSqft * loftRate;
  }

  const totalSqft = carcassSqft + shutterSqft + loftSqft;

  // Round individual prices first
  const roundedCarcassPrice = Math.round(carcassPrice);
  const roundedShutterPrice = Math.round(shutterPrice);
  const roundedLoftPrice = Math.round(loftPrice);

  // Calculate subtotal from rounded prices for consistency
  const subtotal = roundedCarcassPrice + roundedShutterPrice + roundedLoftPrice;
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;

  return {
    moduleName: config.name,
    carcassSqft: Number(carcassSqft.toFixed(2)),
    shutterSqft: Number(shutterSqft.toFixed(2)),
    loftSqft: Number(loftSqft.toFixed(2)),
    totalSqft: Number(totalSqft.toFixed(2)),
    carcassRate,
    shutterRate,
    carcassPrice: roundedCarcassPrice,
    shutterPrice: roundedShutterPrice,
    loftPrice: roundedLoftPrice,
    subtotal,
    gst,
    total,
  };
}
