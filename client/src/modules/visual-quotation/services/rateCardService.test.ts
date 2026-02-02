/**
 * Rate Card Service Tests
 *
 * Tests for the Rate Card CRUD operations and service layer.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useRateCardStore } from "../store/rateCardStore";
import {
  getAllRateCards,
  getRateCardById,
  createRateCard,
  updateRateCard,
  deleteRateCard,
  duplicateRateCard,
  getDefaultRateCard,
  setDefaultRateCard,
  clearDefaultRateCard,
  searchRateCards,
  filterByUnitType,
  getFilteredRateCards,
  getRateCardPreview,
  exportRateCard,
  importRateCard,
  exportAllRateCards,
} from "./rateCardService";
import { DEFAULT_WARDROBE_CONFIG } from "../types/pricing";

// Reset store before each test
beforeEach(() => {
  useRateCardStore.getState().clearAllRateCards();
  useRateCardStore.getState().setDefaultCardId(null);
});

// ============================================================================
// CRUD Tests
// ============================================================================

describe("rateCardService CRUD", () => {
  describe("createRateCard", () => {
    it("should create a new rate card with valid params", () => {
      const result = createRateCard({
        name: "Test Card",
        description: "Test description",
        unitType: "wardrobe",
        config: DEFAULT_WARDROBE_CONFIG,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.name).toBe("Test Card");
      expect(result.data!.description).toBe("Test description");
      expect(result.data!.unitType).toBe("wardrobe");
    });

    it("should fail with empty name", () => {
      const result = createRateCard({
        name: "",
        unitType: "wardrobe",
        config: DEFAULT_WARDROBE_CONFIG,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Name is required");
    });

    it("should fail with short name", () => {
      const result = createRateCard({
        name: "A",
        unitType: "wardrobe",
        config: DEFAULT_WARDROBE_CONFIG,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Name must be at least 2 characters");
    });

    it("should fail with duplicate name", () => {
      createRateCard({
        name: "Unique Name",
        unitType: "wardrobe",
        config: DEFAULT_WARDROBE_CONFIG,
      });

      const result = createRateCard({
        name: "Unique Name",
        unitType: "kitchen",
        config: DEFAULT_WARDROBE_CONFIG,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("A rate card with this name already exists");
    });

    it("should set as default when requested", () => {
      const result = createRateCard({
        name: "Default Card",
        unitType: "all",
        config: DEFAULT_WARDROBE_CONFIG,
        setAsDefault: true,
      });

      expect(result.success).toBe(true);
      const defaultCard = getDefaultRateCard();
      expect(defaultCard?.id).toBe(result.data!.id);
    });
  });

  describe("getRateCardById", () => {
    it("should return card by ID", () => {
      const created = createRateCard({
        name: "Find Me",
        unitType: "wardrobe",
        config: DEFAULT_WARDROBE_CONFIG,
      });

      const found = getRateCardById(created.data!.id);

      expect(found).toBeDefined();
      expect(found!.name).toBe("Find Me");
    });

    it("should return null for non-existent ID", () => {
      const found = getRateCardById("non-existent-id");
      expect(found).toBeNull();
    });
  });

  describe("updateRateCard", () => {
    it("should update card name", () => {
      const created = createRateCard({
        name: "Original Name",
        unitType: "wardrobe",
        config: DEFAULT_WARDROBE_CONFIG,
      });

      const result = updateRateCard(created.data!.id, {
        name: "Updated Name",
      });

      expect(result.success).toBe(true);
      expect(result.data!.name).toBe("Updated Name");
    });

    it("should update card description", () => {
      const created = createRateCard({
        name: "Test Card",
        unitType: "wardrobe",
        config: DEFAULT_WARDROBE_CONFIG,
      });

      const result = updateRateCard(created.data!.id, {
        description: "New description",
      });

      expect(result.success).toBe(true);
      expect(result.data!.description).toBe("New description");
    });

    it("should fail for non-existent card", () => {
      const result = updateRateCard("non-existent-id", {
        name: "New Name",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Rate card not found");
    });

    it("should fail with duplicate name", () => {
      createRateCard({
        name: "First Card",
        unitType: "wardrobe",
        config: DEFAULT_WARDROBE_CONFIG,
      });

      const second = createRateCard({
        name: "Second Card",
        unitType: "wardrobe",
        config: DEFAULT_WARDROBE_CONFIG,
      });

      const result = updateRateCard(second.data!.id, {
        name: "First Card",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("A rate card with this name already exists");
    });
  });

  describe("deleteRateCard", () => {
    it("should delete existing card", () => {
      const first = createRateCard({
        name: "To Delete",
        unitType: "wardrobe",
        config: DEFAULT_WARDROBE_CONFIG,
      });

      // Create second card so deletion is allowed
      createRateCard({
        name: "Keep This",
        unitType: "wardrobe",
        config: DEFAULT_WARDROBE_CONFIG,
      });

      const result = deleteRateCard(first.data!.id);

      expect(result.success).toBe(true);
      expect(getRateCardById(first.data!.id)).toBeNull();
    });

    it("should fail to delete non-existent card", () => {
      const result = deleteRateCard("non-existent-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Rate card not found");
    });

    it("should fail to delete last card", () => {
      const only = createRateCard({
        name: "Only Card",
        unitType: "wardrobe",
        config: DEFAULT_WARDROBE_CONFIG,
      });

      const result = deleteRateCard(only.data!.id);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Cannot delete the last rate card");
    });
  });

  describe("duplicateRateCard", () => {
    it("should duplicate card with new name", () => {
      const original = createRateCard({
        name: "Original",
        description: "Original description",
        unitType: "wardrobe",
        config: DEFAULT_WARDROBE_CONFIG,
      });

      const result = duplicateRateCard(original.data!.id);

      expect(result.success).toBe(true);
      expect(result.data!.name).toBe("Original (Copy)");
      expect(result.data!.description).toBe("Original description");
      expect(result.data!.id).not.toBe(original.data!.id);
    });

    it("should handle multiple duplications", () => {
      const original = createRateCard({
        name: "Original",
        unitType: "wardrobe",
        config: DEFAULT_WARDROBE_CONFIG,
      });

      duplicateRateCard(original.data!.id);
      const second = duplicateRateCard(original.data!.id);

      expect(second.success).toBe(true);
      expect(second.data!.name).toBe("Original (Copy 2)");
    });

    it("should fail for non-existent card", () => {
      const result = duplicateRateCard("non-existent-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Rate card not found");
    });
  });
});

// ============================================================================
// Default Management Tests
// ============================================================================

describe("rateCardService Default Management", () => {
  describe("setDefaultRateCard", () => {
    it("should set card as default", () => {
      const card = createRateCard({
        name: "To Be Default",
        unitType: "wardrobe",
        config: DEFAULT_WARDROBE_CONFIG,
      });

      const result = setDefaultRateCard(card.data!.id);

      expect(result.success).toBe(true);
      const defaultCard = getDefaultRateCard();
      expect(defaultCard?.id).toBe(card.data!.id);
    });

    it("should fail for non-existent card", () => {
      const result = setDefaultRateCard("non-existent-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Rate card not found");
    });
  });

  describe("clearDefaultRateCard", () => {
    it("should clear default", () => {
      const card = createRateCard({
        name: "Default Card",
        unitType: "wardrobe",
        config: DEFAULT_WARDROBE_CONFIG,
        setAsDefault: true,
      });

      expect(getDefaultRateCard()).toBeDefined();

      const result = clearDefaultRateCard();

      expect(result.success).toBe(true);
      expect(getDefaultRateCard()).toBeNull();
    });
  });
});

// ============================================================================
// Search & Filter Tests
// ============================================================================

describe("rateCardService Search & Filter", () => {
  beforeEach(() => {
    // Create test cards
    createRateCard({
      name: "Premium Wardrobe",
      description: "High-end wardrobe config",
      unitType: "wardrobe",
      config: DEFAULT_WARDROBE_CONFIG,
    });
    createRateCard({
      name: "Budget Kitchen",
      description: "Economy kitchen setup",
      unitType: "kitchen",
      config: DEFAULT_WARDROBE_CONFIG,
    });
    createRateCard({
      name: "Standard TV Unit",
      unitType: "tv_unit",
      config: DEFAULT_WARDROBE_CONFIG,
    });
  });

  describe("searchRateCards", () => {
    it("should find cards by name", () => {
      const results = searchRateCards("Premium");

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Premium Wardrobe");
    });

    it("should find cards by description", () => {
      const results = searchRateCards("economy");

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Budget Kitchen");
    });

    it("should return all cards for empty query", () => {
      const results = searchRateCards("");

      expect(results).toHaveLength(3);
    });

    it("should return empty for no match", () => {
      const results = searchRateCards("nonexistent");

      expect(results).toHaveLength(0);
    });
  });

  describe("filterByUnitType", () => {
    it("should filter by specific unit type", () => {
      const results = filterByUnitType("wardrobe");

      expect(results).toHaveLength(1);
      expect(results[0].unitType).toBe("wardrobe");
    });

    it("should return all for null filter", () => {
      const results = filterByUnitType(null);

      expect(results).toHaveLength(3);
    });
  });

  describe("getFilteredRateCards", () => {
    it("should combine search and filter", () => {
      const results = getFilteredRateCards({
        searchQuery: "budget",
        unitType: "kitchen",
      });

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe("Budget Kitchen");
    });

    it("should sort by name ascending", () => {
      const results = getFilteredRateCards({
        sortBy: "name",
        sortOrder: "asc",
      });

      expect(results[0].name).toBe("Budget Kitchen");
      expect(results[2].name).toBe("Standard TV Unit");
    });

    it("should sort by name descending", () => {
      const results = getFilteredRateCards({
        sortBy: "name",
        sortOrder: "desc",
      });

      expect(results[0].name).toBe("Standard TV Unit");
    });
  });
});

// ============================================================================
// Rate Preview Tests
// ============================================================================

describe("rateCardService Rate Preview", () => {
  it("should calculate rate preview", () => {
    const card = createRateCard({
      name: "Test Card",
      unitType: "wardrobe",
      config: DEFAULT_WARDROBE_CONFIG,
    });

    const preview = getRateCardPreview(card.data!);

    expect(preview.cardId).toBe(card.data!.id);
    expect(preview.cardName).toBe("Test Card");
    expect(preview.carcassRate).toBeGreaterThan(0);
    expect(preview.shutterRate).toBeGreaterThan(0);
    expect(preview.combinedRate).toBe(preview.carcassRate + preview.shutterRate);
  });
});

// ============================================================================
// Import/Export Tests
// ============================================================================

describe("rateCardService Import/Export", () => {
  describe("exportRateCard", () => {
    it("should export card as JSON", () => {
      const card = createRateCard({
        name: "Export Me",
        description: "To be exported",
        unitType: "wardrobe",
        config: DEFAULT_WARDROBE_CONFIG,
      });

      const result = exportRateCard(card.data!.id);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const parsed = JSON.parse(result.data!);
      expect(parsed.name).toBe("Export Me");
      expect(parsed.description).toBe("To be exported");
      expect(parsed.config).toBeDefined();
    });

    it("should fail for non-existent card", () => {
      const result = exportRateCard("non-existent-id");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Rate card not found");
    });
  });

  describe("importRateCard", () => {
    it("should import card from JSON", () => {
      const json = JSON.stringify({
        name: "Imported Card",
        description: "Imported from JSON",
        unitType: "kitchen",
        config: DEFAULT_WARDROBE_CONFIG,
      });

      const result = importRateCard(json);

      expect(result.success).toBe(true);
      expect(result.data!.name).toBe("Imported Card");
      expect(result.data!.unitType).toBe("kitchen");
    });

    it("should fail with invalid JSON", () => {
      const result = importRateCard("not valid json");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid JSON format");
    });

    it("should fail with missing required fields", () => {
      const json = JSON.stringify({
        description: "No name field",
      });

      const result = importRateCard(json);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid rate card data");
    });
  });

  describe("exportAllRateCards", () => {
    it("should export all cards", () => {
      createRateCard({
        name: "Card 1",
        unitType: "wardrobe",
        config: DEFAULT_WARDROBE_CONFIG,
      });
      createRateCard({
        name: "Card 2",
        unitType: "kitchen",
        config: DEFAULT_WARDROBE_CONFIG,
      });

      const json = exportAllRateCards();
      const parsed = JSON.parse(json);

      expect(parsed).toHaveLength(2);
    });
  });
});
