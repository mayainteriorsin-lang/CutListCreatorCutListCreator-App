/**
 * Rate Card Types
 *
 * Types for the Rate Card Management system.
 * A Rate Card is a saved pricing configuration that can be applied to units.
 */

import type { WardrobeConfig, AddOnPricing } from "./pricing";

// ============================================================================
// Core Rate Card Types
// ============================================================================

/**
 * Unit type categories for rate cards
 */
export type RateCardUnitType =
  | "wardrobe"
  | "kitchen"
  | "tv_unit"
  | "dresser"
  | "study_table"
  | "shoe_rack"
  | "book_shelf"
  | "crockery_unit"
  | "pooja_unit"
  | "vanity"
  | "bar_unit"
  | "display_unit"
  | "all"; // Universal rate card

/**
 * Rate Card - A saved pricing configuration
 */
export interface RateCard {
  id: string;
  name: string;
  description?: string;
  unitType: RateCardUnitType;
  config: WardrobeConfig;
  isDefault: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string

  // Future: Multi-tenant support
  tenantId?: string;
  createdBy?: string;
  sharedWith?: string[];

  // Custom folder association (from Rate Cards page folders)
  folderId?: string;
}

/**
 * Rate Card preview with calculated rates
 */
export interface RateCardPreview {
  cardId: string;
  cardName: string;
  carcassRate: number;
  shutterRate: number;
  loftRate: number; // carcass + shutter
  combinedRate: number; // carcass + shutter (same as loft)
  enabledAddOns: AddOnPricing[];
}

// ============================================================================
// CRUD Operation Types
// ============================================================================

/**
 * Parameters for creating a new rate card
 */
export interface CreateRateCardParams {
  name: string;
  description?: string;
  unitType: RateCardUnitType;
  config: WardrobeConfig;
  setAsDefault?: boolean;
  folderId?: string; // Custom folder association
}

/**
 * Parameters for updating a rate card
 */
export interface UpdateRateCardParams {
  name?: string;
  description?: string;
  unitType?: RateCardUnitType;
  config?: Partial<WardrobeConfig>;
  isDefault?: boolean;
}

/**
 * Rate card search/filter options
 */
export interface RateCardFilterOptions {
  searchQuery?: string;
  unitType?: RateCardUnitType | null;
  sortBy?: "name" | "updatedAt" | "createdAt" | "rate";
  sortOrder?: "asc" | "desc";
}

// ============================================================================
// Slice State Types
// ============================================================================

/**
 * Rate Card slice state
 */
export interface RateCardSliceState {
  cards: RateCard[];
  defaultCardId: string | null;
  isLoaded: boolean;
}

/**
 * Rate Card slice actions
 */
export interface RateCardSliceActions {
  // CRUD
  addRateCard: (card: RateCard) => void;
  updateRateCard: (id: string, updates: Partial<RateCard>) => void;
  removeRateCard: (id: string) => void;

  // Default management
  setDefaultCardId: (id: string | null) => void;

  // Bulk operations
  setRateCards: (cards: RateCard[]) => void;
  clearAllRateCards: () => void;

  // Persistence
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

/**
 * Combined Rate Card slice
 */
export type RateCardSlice = RateCardSliceState & RateCardSliceActions;

// ============================================================================
// Default Rate Card Templates
// ============================================================================

/**
 * Template names for quick creation
 */
export type RateCardTemplate = "budget" | "standard" | "premium" | "custom";

/**
 * Template configuration
 */
export interface RateCardTemplateConfig {
  id: RateCardTemplate;
  name: string;
  description: string;
  estimatedRate: string; // e.g., "₹550-650/sqft"
}

// ============================================================================
// Constants
// ============================================================================

export const RATE_CARD_TEMPLATES: RateCardTemplateConfig[] = [
  {
    id: "budget",
    name: "Budget",
    description: "Particle board with laminate finish",
    estimatedRate: "₹550-650/sqft",
  },
  {
    id: "standard",
    name: "Standard",
    description: "Plywood with laminate finish",
    estimatedRate: "₹750-900/sqft",
  },
  {
    id: "premium",
    name: "Premium",
    description: "Plywood with acrylic/veneer finish",
    estimatedRate: "₹1,100-1,400/sqft",
  },
  {
    id: "custom",
    name: "Custom",
    description: "Start from scratch",
    estimatedRate: "Varies",
  },
];

export const RATE_CARD_UNIT_TYPE_LABELS: Record<RateCardUnitType, string> = {
  wardrobe: "Wardrobe",
  kitchen: "Kitchen",
  tv_unit: "TV Unit",
  dresser: "Dresser",
  study_table: "Study Table",
  shoe_rack: "Shoe Rack",
  book_shelf: "Book Shelf",
  crockery_unit: "Crockery Unit",
  pooja_unit: "Pooja Unit",
  vanity: "Vanity",
  bar_unit: "Bar Unit",
  display_unit: "Display Unit",
  all: "All Units",
};
