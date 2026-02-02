/**
 * Rate Card Slice
 *
 * State management for Rate Cards.
 * Handles CRUD operations and persistence to localStorage.
 */

import { StateCreator } from "zustand";
import type {
  RateCard,
  RateCardSliceState,
  RateCardSliceActions,
  RateCardSlice,
} from "../../types/rateCard";
import { DEFAULT_WARDROBE_CONFIG } from "../../types/pricing";
import { logger } from "../../services/logger";

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = "vq_rate_cards";
const DEFAULT_CARD_STORAGE_KEY = "vq_default_rate_card_id";

// ============================================================================
// Initial State
// ============================================================================

const initialState: RateCardSliceState = {
  cards: [],
  defaultCardId: null,
  isLoaded: false,
};

// ============================================================================
// Default Rate Cards (created on first load)
// ============================================================================

function createDefaultRateCards(): RateCard[] {
  const now = new Date().toISOString();

  return [
    {
      id: "default-standard",
      name: "Standard",
      description: "Plywood with laminate finish - recommended for most projects",
      unitType: "all",
      config: DEFAULT_WARDROBE_CONFIG,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "default-budget",
      name: "Budget",
      description: "Particle board with laminate - cost-effective option",
      unitType: "all",
      config: {
        ...DEFAULT_WARDROBE_CONFIG,
        carcass: {
          material: "particle_board",
          thickness: "18mm",
          edgeBand: "pvc_0.8mm",
          materialPrice: 350,
          thicknessPrice: 0,
          edgeBandPrice: 50,
        },
        shutter: {
          material: "laminate",
          finish: "matte",
          handleType: "knob",
          materialPrice: 350,
          finishPrice: 0,
          handlePrice: 25,
        },
      },
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "default-premium",
      name: "Premium",
      description: "Plywood with acrylic gloss finish - high-end option",
      unitType: "all",
      config: {
        ...DEFAULT_WARDROBE_CONFIG,
        carcass: {
          material: "plywood",
          thickness: "25mm",
          edgeBand: "abs_2mm",
          materialPrice: 650,
          thicknessPrice: 150,
          edgeBandPrice: 150,
        },
        shutter: {
          material: "acrylic",
          finish: "gloss",
          handleType: "concealed",
          materialPrice: 650,
          finishPrice: 100,
          handlePrice: 150,
        },
      },
      isDefault: false,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

// ============================================================================
// Slice Creator
// ============================================================================

export const createRateCardSlice: StateCreator<RateCardSlice> = (set, get) => ({
  ...initialState,

  // -------------------------------------------------------------------------
  // CRUD Operations
  // -------------------------------------------------------------------------

  addRateCard: (card: RateCard) => {
    set((state) => ({
      cards: [...state.cards, card],
    }));
    get().saveToStorage();
  },

  updateRateCard: (id: string, updates: Partial<RateCard>) => {
    set((state) => ({
      cards: state.cards.map((card) =>
        card.id === id
          ? { ...card, ...updates, updatedAt: new Date().toISOString() }
          : card
      ),
    }));
    get().saveToStorage();
  },

  removeRateCard: (id: string) => {
    const state = get();

    // If removing the default card, clear the default
    const newDefaultId = state.defaultCardId === id ? null : state.defaultCardId;

    set({
      cards: state.cards.filter((card) => card.id !== id),
      defaultCardId: newDefaultId,
    });
    get().saveToStorage();
  },

  // -------------------------------------------------------------------------
  // Default Management
  // -------------------------------------------------------------------------

  setDefaultCardId: (id: string | null) => {
    set((state) => ({
      defaultCardId: id,
      // Update isDefault flag on all cards
      cards: state.cards.map((card) => ({
        ...card,
        isDefault: card.id === id,
      })),
    }));
    get().saveToStorage();
  },

  // -------------------------------------------------------------------------
  // Bulk Operations
  // -------------------------------------------------------------------------

  setRateCards: (cards: RateCard[]) => {
    set({ cards });
    get().saveToStorage();
  },

  clearAllRateCards: () => {
    set({ cards: [], defaultCardId: null });
    get().saveToStorage();
  },

  // -------------------------------------------------------------------------
  // Persistence
  // -------------------------------------------------------------------------

  loadFromStorage: () => {
    try {
      const storedCards = localStorage.getItem(STORAGE_KEY);
      const storedDefaultId = localStorage.getItem(DEFAULT_CARD_STORAGE_KEY);

      if (storedCards) {
        const cards: RateCard[] = JSON.parse(storedCards);
        const defaultCardId = storedDefaultId || null;

        set({
          cards,
          defaultCardId,
          isLoaded: true,
        });
      } else {
        // First time - create default rate cards
        const defaultCards = createDefaultRateCards();
        const defaultCardId = defaultCards.find((c) => c.isDefault)?.id || null;

        set({
          cards: defaultCards,
          defaultCardId,
          isLoaded: true,
        });

        // Save to storage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultCards));
        if (defaultCardId) {
          localStorage.setItem(DEFAULT_CARD_STORAGE_KEY, defaultCardId);
        }
      }
    } catch (error) {
      logger.error('Rate card load failed', { error: String(error), context: 'rate-card-slice' });
      // Fallback to defaults
      const defaultCards = createDefaultRateCards();
      set({
        cards: defaultCards,
        defaultCardId: defaultCards.find((c) => c.isDefault)?.id || null,
        isLoaded: true,
      });
    }
  },

  saveToStorage: () => {
    try {
      const { cards, defaultCardId } = get();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
      if (defaultCardId) {
        localStorage.setItem(DEFAULT_CARD_STORAGE_KEY, defaultCardId);
      } else {
        localStorage.removeItem(DEFAULT_CARD_STORAGE_KEY);
      }
    } catch (error) {
      logger.error('Rate card save failed', { error: String(error), context: 'rate-card-slice' });
    }
  },
});

export default createRateCardSlice;
