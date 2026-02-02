/**
 * Config Slice State Types
 * Owns: Pricing config, pricing control, sqft rate
 */

import type { PricingControl } from "../quotation";

/**
 * ConfigSliceState
 * Responsible for pricing configuration and controls
 */
export interface ConfigSliceState {
  /* Sqft rate for pricing */
  sqftRate: number;

  /* Profit protection */
  pricingControl: PricingControl;
}

/**
 * ConfigSliceActions
 * Actions owned by config slice
 */
export interface ConfigSliceActions {
  // Sqft rate
  setSqftRate: (rate: number | ((prev: number) => number)) => void;

  // Profit controls
  setPricingControl: <K extends keyof PricingControl>(
    key: K,
    value: PricingControl[K]
  ) => void;
}

export type ConfigSlice = ConfigSliceState & ConfigSliceActions;
