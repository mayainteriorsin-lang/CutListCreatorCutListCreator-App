/**
 * Rate Card Store
 *
 * Standalone Zustand store for Rate Card management.
 * Separate from the main visual quotation store for clean separation.
 */

import { create } from "zustand";
import { createRateCardSlice } from "./slices/rateCardSlice";
import type { RateCardSlice } from "../types/rateCard";

// ============================================================================
// Store Creation
// ============================================================================

export const useRateCardStore = create<RateCardSlice>()((...args) => ({
  ...createRateCardSlice(...args),
}));

// ============================================================================
// Selectors (for performance optimization)
// ============================================================================

/**
 * Select all rate cards
 */
export const selectRateCards = (state: RateCardSlice) => state.cards;

/**
 * Select default rate card ID
 */
export const selectDefaultCardId = (state: RateCardSlice) => state.defaultCardId;

/**
 * Select whether cards are loaded
 */
export const selectIsLoaded = (state: RateCardSlice) => state.isLoaded;

/**
 * Select default rate card
 */
export const selectDefaultCard = (state: RateCardSlice) =>
  state.cards.find((c) => c.id === state.defaultCardId) || null;

/**
 * Select rate card by ID
 */
export const selectCardById = (id: string) => (state: RateCardSlice) =>
  state.cards.find((c) => c.id === id) || null;

/**
 * Select rate cards by unit type
 */
export const selectCardsByUnitType = (unitType: string) => (state: RateCardSlice) =>
  state.cards.filter((c) => c.unitType === unitType || c.unitType === "all");

// ============================================================================
// Initialize store on import (load from localStorage)
// ============================================================================

// Auto-load from storage when the store is first accessed
if (typeof window !== "undefined") {
  // Defer loading to avoid SSR issues
  setTimeout(() => {
    const state = useRateCardStore.getState();
    if (!state.isLoaded) {
      state.loadFromStorage();
    }
  }, 0);
}

export default useRateCardStore;
