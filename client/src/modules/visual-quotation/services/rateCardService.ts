/**
 * Rate Card Service
 *
 * Business logic for Rate Card CRUD operations.
 * Orchestrates between UI and the rate card slice.
 */

import { useRateCardStore } from "../store/rateCardStore";
import { getCarcassRate, getShutterRate } from "../engine/pricingEngine";
import type {
  RateCard,
  RateCardPreview,
  CreateRateCardParams,
  UpdateRateCardParams,
  RateCardFilterOptions,
  RateCardUnitType,
} from "../types/rateCard";
import type { WardrobeConfig } from "../types/pricing";
import type { ServiceResult } from "./types";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique ID for rate cards
 */
function generateId(): string {
  return `rc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate rate card name
 */
function validateName(name: string, existingCards: RateCard[], excludeId?: string): string | null {
  if (!name || name.trim().length === 0) {
    return "Name is required";
  }
  if (name.trim().length < 2) {
    return "Name must be at least 2 characters";
  }
  if (name.trim().length > 50) {
    return "Name must be less than 50 characters";
  }

  // Check for duplicate names
  const duplicate = existingCards.find(
    (c) => c.name.toLowerCase() === name.trim().toLowerCase() && c.id !== excludeId
  );
  if (duplicate) {
    return "A rate card with this name already exists";
  }

  return null;
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Get all rate cards
 */
export function getAllRateCards(): RateCard[] {
  const state = useRateCardStore.getState();
  if (!state.isLoaded) {
    state.loadFromStorage();
  }
  return state.cards;
}

/**
 * Get rate card by ID
 */
export function getRateCardById(id: string): RateCard | null {
  const cards = getAllRateCards();
  return cards.find((c) => c.id === id) || null;
}

/**
 * Create a new rate card
 */
export function createRateCard(params: CreateRateCardParams): ServiceResult<RateCard> {
  const state = useRateCardStore.getState();
  const cards = state.cards;

  // Validate name
  const nameError = validateName(params.name, cards);
  if (nameError) {
    return { success: false, error: nameError };
  }

  const now = new Date().toISOString();
  const newCard: RateCard = {
    id: generateId(),
    name: params.name.trim(),
    description: params.description?.trim(),
    unitType: params.unitType,
    config: params.config,
    isDefault: params.setAsDefault || false,
    createdAt: now,
    updatedAt: now,
    folderId: params.folderId,
  };

  // If setting as default, update the store
  if (params.setAsDefault) {
    state.setDefaultCardId(newCard.id);
  }

  state.addRateCard(newCard);

  return { success: true, data: newCard };
}

/**
 * Update an existing rate card
 */
export function updateRateCard(id: string, updates: UpdateRateCardParams): ServiceResult<RateCard> {
  const state = useRateCardStore.getState();
  const existingCard = state.cards.find((c) => c.id === id);

  if (!existingCard) {
    return { success: false, error: "Rate card not found" };
  }

  // Validate name if being updated
  if (updates.name !== undefined) {
    const nameError = validateName(updates.name, state.cards, id);
    if (nameError) {
      return { success: false, error: nameError };
    }
  }

  // Build update object
  const cardUpdates: Partial<RateCard> = {};

  if (updates.name !== undefined) {
    cardUpdates.name = updates.name.trim();
  }
  if (updates.description !== undefined) {
    cardUpdates.description = updates.description?.trim();
  }
  if (updates.unitType !== undefined) {
    cardUpdates.unitType = updates.unitType;
  }
  if (updates.config !== undefined) {
    cardUpdates.config = {
      ...existingCard.config,
      ...updates.config,
    };
  }

  // Handle default status
  if (updates.isDefault === true) {
    state.setDefaultCardId(id);
  } else if (updates.isDefault === false && existingCard.isDefault) {
    state.setDefaultCardId(null);
  }

  state.updateRateCard(id, cardUpdates);

  // Get fresh state after update
  const updatedState = useRateCardStore.getState();
  const updatedCard = updatedState.cards.find((c) => c.id === id);
  return { success: true, data: updatedCard! };
}

/**
 * Delete a rate card
 */
export function deleteRateCard(id: string): ServiceResult<void> {
  const state = useRateCardStore.getState();
  const card = state.cards.find((c) => c.id === id);

  if (!card) {
    return { success: false, error: "Rate card not found" };
  }

  // Don't allow deleting the last card
  if (state.cards.length === 1) {
    return { success: false, error: "Cannot delete the last rate card" };
  }

  state.removeRateCard(id);
  return { success: true };
}

/**
 * Duplicate a rate card
 */
export function duplicateRateCard(id: string, newName?: string): ServiceResult<RateCard> {
  const state = useRateCardStore.getState();
  const sourceCard = state.cards.find((c) => c.id === id);

  if (!sourceCard) {
    return { success: false, error: "Rate card not found" };
  }

  // Generate new name if not provided
  let name = newName || `${sourceCard.name} (Copy)`;
  let suffix = 2;
  while (state.cards.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    name = `${sourceCard.name} (Copy ${suffix})`;
    suffix++;
  }

  return createRateCard({
    name,
    description: sourceCard.description,
    unitType: sourceCard.unitType,
    config: { ...sourceCard.config },
    setAsDefault: false,
  });
}

// ============================================================================
// Default Management
// ============================================================================

/**
 * Get the default rate card
 */
export function getDefaultRateCard(): RateCard | null {
  const state = useRateCardStore.getState();
  if (!state.defaultCardId) return null;
  return state.cards.find((c) => c.id === state.defaultCardId) || null;
}

/**
 * Set a rate card as default
 */
export function setDefaultRateCard(id: string): ServiceResult<void> {
  const state = useRateCardStore.getState();
  const card = state.cards.find((c) => c.id === id);

  if (!card) {
    return { success: false, error: "Rate card not found" };
  }

  state.setDefaultCardId(id);
  return { success: true };
}

/**
 * Clear default rate card
 */
export function clearDefaultRateCard(): ServiceResult<void> {
  const state = useRateCardStore.getState();
  state.setDefaultCardId(null);
  return { success: true };
}

// ============================================================================
// Search & Filter
// ============================================================================

/**
 * Search rate cards by name or description
 */
export function searchRateCards(query: string): RateCard[] {
  const cards = getAllRateCards();
  const lowerQuery = query.toLowerCase().trim();

  if (!lowerQuery) return cards;

  return cards.filter(
    (c) =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.description?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Filter rate cards by unit type
 */
export function filterByUnitType(unitType: RateCardUnitType | null): RateCard[] {
  const cards = getAllRateCards();

  if (!unitType) return cards;

  return cards.filter((c) => c.unitType === unitType || c.unitType === "all");
}

/**
 * Get filtered and sorted rate cards
 */
export function getFilteredRateCards(options: RateCardFilterOptions): RateCard[] {
  let cards = getAllRateCards();

  // Filter by search query
  if (options.searchQuery) {
    const lowerQuery = options.searchQuery.toLowerCase().trim();
    cards = cards.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        c.description?.toLowerCase().includes(lowerQuery)
    );
  }

  // Filter by unit type
  if (options.unitType) {
    cards = cards.filter((c) => c.unitType === options.unitType || c.unitType === "all");
  }

  // Sort
  const sortBy = options.sortBy || "updatedAt";
  const sortOrder = options.sortOrder || "desc";

  cards.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "name":
        comparison = a.name.localeCompare(b.name);
        break;
      case "createdAt":
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "updatedAt":
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
      case "rate":
        const rateA = getCarcassRate(a.config) + getShutterRate(a.config);
        const rateB = getCarcassRate(b.config) + getShutterRate(b.config);
        comparison = rateA - rateB;
        break;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  return cards;
}

// ============================================================================
// Rate Calculations
// ============================================================================

/**
 * Get rate preview for a rate card
 */
export function getRateCardPreview(card: RateCard): RateCardPreview {
  const carcassRate = getCarcassRate(card.config);
  const shutterRate = getShutterRate(card.config);
  const loftRate = carcassRate + shutterRate;

  return {
    cardId: card.id,
    cardName: card.name,
    carcassRate,
    shutterRate,
    loftRate,
    combinedRate: loftRate,
    enabledAddOns: card.config.addOnPricing.filter((a) => a.enabled),
  };
}

/**
 * Get rate preview from WardrobeConfig
 */
export function getConfigRatePreview(config: WardrobeConfig): Omit<RateCardPreview, "cardId" | "cardName"> {
  const carcassRate = getCarcassRate(config);
  const shutterRate = getShutterRate(config);
  const loftRate = carcassRate + shutterRate;

  return {
    carcassRate,
    shutterRate,
    loftRate,
    combinedRate: loftRate,
    enabledAddOns: config.addOnPricing.filter((a) => a.enabled),
  };
}

// ============================================================================
// Import/Export
// ============================================================================

/**
 * Export a rate card to JSON string
 */
export function exportRateCard(id: string): ServiceResult<string> {
  const card = getRateCardById(id);

  if (!card) {
    return { success: false, error: "Rate card not found" };
  }

  // Remove IDs and timestamps for export
  const exportData = {
    name: card.name,
    description: card.description,
    unitType: card.unitType,
    config: card.config,
  };

  return { success: true, data: JSON.stringify(exportData, null, 2) };
}

/**
 * Import a rate card from JSON string
 */
export function importRateCard(json: string): ServiceResult<RateCard> {
  try {
    const data = JSON.parse(json);

    // Validate required fields
    if (!data.name || !data.config) {
      return { success: false, error: "Invalid rate card data" };
    }

    return createRateCard({
      name: data.name,
      description: data.description,
      unitType: data.unitType || "all",
      config: data.config,
    });
  } catch {
    return { success: false, error: "Invalid JSON format" };
  }
}

/**
 * Export all rate cards
 */
export function exportAllRateCards(): string {
  const cards = getAllRateCards();
  return JSON.stringify(cards, null, 2);
}

// ============================================================================
// Service Object Export
// ============================================================================

export const rateCardService = {
  // CRUD
  getAllRateCards,
  getRateCardById,
  createRateCard,
  updateRateCard,
  deleteRateCard,
  duplicateRateCard,

  // Default management
  getDefaultRateCard,
  setDefaultRateCard,
  clearDefaultRateCard,

  // Search & Filter
  searchRateCards,
  filterByUnitType,
  getFilteredRateCards,

  // Rate calculations
  getRateCardPreview,
  getConfigRatePreview,

  // Import/Export
  exportRateCard,
  importRateCard,
  exportAllRateCards,
};

export default rateCardService;
