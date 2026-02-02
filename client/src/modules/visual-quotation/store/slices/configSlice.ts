/**
 * Config Slice
 * Owns: Pricing configuration, sqft rate, profit controls
 *
 * This slice manages:
 * - Sqft rate for pricing calculations
 * - Pricing control (margin, discount, GST, rounding)
 */

import type { StateCreator } from "zustand";
import type { ConfigSliceState, ConfigSliceActions } from "../../types/slices";
import type { PricingControl } from "../../types";

/**
 * Initial state for config slice
 */
export const initialConfigState: ConfigSliceState = {
  sqftRate: 150,
  pricingControl: {
    marginPct: 20,
    discountPct: 0,
    discountLocked: true,
    gstPct: 18,
    rounding: "NEAREST_10",
  },
};

/**
 * Config slice type (state + actions)
 */
export type ConfigSlice = ConfigSliceState & ConfigSliceActions;

/**
 * Dependencies from other slices that config slice needs
 */
export interface ConfigSliceDeps {
  getStatus: () => "DRAFT" | "APPROVED";
  addAudit: (action: string, details?: string) => void;
}

/**
 * Config slice creator with dependency injection
 */
export const createConfigSlice = (
  deps: ConfigSliceDeps
): StateCreator<ConfigSlice, [], [], ConfigSlice> => (set, get) => ({
  ...initialConfigState,

  // Sqft rate - no approval check, can be adjusted anytime
  setSqftRate: (rate: number | ((prev: number) => number)) => {
    set((s) => ({
      sqftRate: typeof rate === "function" ? rate(s.sqftRate) : rate,
    }));
  },

  // Profit controls - requires draft status
  setPricingControl: <K extends keyof PricingControl>(
    key: K,
    value: PricingControl[K]
  ) => {
    if (deps.getStatus() === "APPROVED") return;
    set((s) => ({
      pricingControl: { ...s.pricingControl, [key]: value },
    }));
    deps.addAudit("Pricing control changed", `${String(key)}=${String(value)}`);
  },
});
