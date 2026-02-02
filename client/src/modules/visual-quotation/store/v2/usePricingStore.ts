import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logger } from '../../services/logger';
import type {
    WardrobeConfig,
    ProductionSettings,
    DrawnUnit,
    CarcassMaterial,
    CarcassThickness,
    EdgeBand,
    ShutterMaterial,
    ShutterFinish,
    HandleType
} from '../../types';
import {
    DEFAULT_WARDROBE_CONFIG,
    CARCASS_MATERIAL_PRICES,
    CARCASS_THICKNESS_PRICES,
    EDGE_BAND_PRICES,
    SHUTTER_MATERIAL_PRICES,
    SHUTTER_FINISH_PRICES,
    HANDLE_TYPE_PRICES,
} from '../../types';
import type { RateCardKey, RateCardMaterialSpecs } from '../../constants';

/**
 * Material Pricing State for V2 Store
 * Uses Record structures for flexible pricing
 */
export interface MaterialPricingState {
    carcassMaterial: Record<CarcassMaterial, number>;
    carcassThickness: Record<CarcassThickness, number>;
    edgeBand: Record<EdgeBand, number>;
    shutterMaterial: Record<ShutterMaterial, number>;
    shutterFinish: Record<ShutterFinish, number>;
    handleType: Record<HandleType, number>;
}

/**
 * Pricing Store (v2)
 * 
 * Manages pricing calculations and material costs only.
 * Replaces the pricing portion of visualQuotationStore.
 */

// Rate Card Specs type for all card types
export type RateCardSpecsState = Partial<Record<RateCardKey, Partial<RateCardMaterialSpecs>>>;

/**
 * Final Price Breakdown - Saved at finalization, READ-ONLY after lock
 */
export interface FinalPriceBreakdown {
    // Per-unit breakdown
    units: {
        unitId: string;
        unitLabel: string;
        shutterSqft: number;
        shutterPrice: number;
        loftSqft: number;
        loftPrice: number;
        unitTotal: number;
    }[];
    // Totals
    totalShutterSqft: number;
    totalLoftSqft: number;
    subtotal: number;
    addOnsTotal: number;
    grandTotal: number;
    // Rates used (snapshot at finalization)
    ratesUsed: {
        shutterRate: number;
        loftRate: number;
        shutterLoftShutterRate: number;
        shutterLoftLoftRate: number;
    };
    // Timestamp
    finalizedAt: string;
}

export interface PricingState {
    // Pricing Control
    pricingControl: {
        sqftRate: number;           // SHUTTER rate
        loftSqftRate: number;       // LOFT ONLY rate
        shutterLoftShutterRate: number;  // SHUTTER+LOFT shutter rate (independent)
        shutterLoftLoftRate: number;     // SHUTTER+LOFT loft rate (independent)
        addOnPricing: Record<string, number>; // Simple pricing map for V1 compatibility
    };

    // Material Pricing
    materialPricing: MaterialPricingState;

    // Wardrobe Configuration
    wardrobeConfig: WardrobeConfig;

    // Rate Card Material Specs (plywood, laminate, inner laminate thickness)
    rateCardSpecs: RateCardSpecsState;

    // ============================================================================
    // PRICING LOCK - SaaS Safe Pricing
    // ============================================================================
    // When pricingLocked = true, price is READ-ONLY
    // NO recalculation, NO rate card access, NO updates allowed
    pricingLocked: boolean;
    finalPrice: FinalPriceBreakdown | null;

    // Production Settings
    productionSettings: ProductionSettings;

    // Units (for production page compatibility)
    units: DrawnUnit[];

    // Actions
    setSqftRate: (rate: number) => void;
    setLoftSqftRate: (rate: number) => void;
    setShutterLoftShutterRate: (rate: number) => void;
    setShutterLoftLoftRate: (rate: number) => void;
    setAddOnPricing: (pricing: Record<string, number>) => void;
    setMaterialPricing: (pricing: Partial<MaterialPricingState>) => void;
    setWardrobeConfig: (config: Partial<WardrobeConfig>) => void;
    setRateCardSpecs: (specs: RateCardSpecsState) => void;
    // Pricing Lock Actions
    lockPricing: (finalPrice: FinalPriceBreakdown) => void;
    unlockPricing: () => void;
    isPricingLocked: () => boolean;
    getFinalPrice: () => FinalPriceBreakdown | null;
    // Production Settings Actions
    setProductionSettings: (settings: Partial<ProductionSettings>) => void;
    // Units Actions
    setUnits: (units: DrawnUnit[]) => void;
    reset: () => void;
}

const initialState = {
    pricingControl: {
        sqftRate: 1200,
        loftSqftRate: 1000,
        shutterLoftShutterRate: 1100,  // Independent rate for SHUTTER+LOFT shutter
        shutterLoftLoftRate: 900,       // Independent rate for SHUTTER+LOFT loft
        addOnPricing: {
            drawer: 1500,
            pullOut: 2000,
            shelf: 500,
            rod: 300,
            mirror: 1000,
            ledLight: 800,
        },
    },
    materialPricing: {
        carcassMaterial: CARCASS_MATERIAL_PRICES,
        carcassThickness: CARCASS_THICKNESS_PRICES,
        edgeBand: EDGE_BAND_PRICES,
        shutterMaterial: SHUTTER_MATERIAL_PRICES,
        shutterFinish: SHUTTER_FINISH_PRICES,
        handleType: HANDLE_TYPE_PRICES,
    },
    wardrobeConfig: DEFAULT_WARDROBE_CONFIG,
    rateCardSpecs: {} as RateCardSpecsState,
    // Pricing Lock - default unlocked
    pricingLocked: false,
    finalPrice: null as FinalPriceBreakdown | null,
    // Production Settings - default values
    productionSettings: {
        roundingMm: 0,
        widthReductionMm: 0,
        heightReductionMm: 0,
        includeLoft: true,
    },
    // Units - empty by default
    units: [] as DrawnUnit[],
};

export const usePricingStore = create<PricingState>()(
    persist(
        (set, get) => ({
            ...initialState,

            setSqftRate: (rate) => set(state => ({
                pricingControl: { ...state.pricingControl, sqftRate: rate }
            })),

            setLoftSqftRate: (rate) => set(state => ({
                pricingControl: { ...state.pricingControl, loftSqftRate: rate }
            })),

            setShutterLoftShutterRate: (rate) => set(state => ({
                pricingControl: { ...state.pricingControl, shutterLoftShutterRate: rate }
            })),

            setShutterLoftLoftRate: (rate) => set(state => ({
                pricingControl: { ...state.pricingControl, shutterLoftLoftRate: rate }
            })),

            setAddOnPricing: (pricing) => set(state => ({
                pricingControl: {
                    ...state.pricingControl,
                    addOnPricing: { ...state.pricingControl.addOnPricing, ...pricing }
                }
            })),

            setMaterialPricing: (pricing) => set(state => ({
                materialPricing: { ...state.materialPricing, ...pricing }
            })),

            setWardrobeConfig: (config) => set(state => ({
                wardrobeConfig: { ...state.wardrobeConfig, ...config }
            })),

            setRateCardSpecs: (specs) => set(state => ({
                rateCardSpecs: { ...state.rateCardSpecs, ...specs }
            })),

            // ============================================================================
            // PRICING LOCK ACTIONS
            // ============================================================================

            /**
             * Lock pricing with final price breakdown
             * Called at quotation finalization - ONCE only
             */
            lockPricing: (finalPrice) => {
                set({
                    pricingLocked: true,
                    finalPrice,
                });
                logger.info('Pricing locked', { finalizedAt: finalPrice.finalizedAt, context: 'pricing-store' });
            },

            /**
             * Unlock pricing (for admin/edit mode only)
             * Should be used very carefully
             */
            unlockPricing: () => {
                set({
                    pricingLocked: false,
                    finalPrice: null,
                });
                logger.warn('Pricing unlocked', { context: 'pricing-store' });
            },

            /**
             * Check if pricing is locked
             */
            isPricingLocked: () => get().pricingLocked,

            /**
             * Get final price (returns null if not locked)
             */
            getFinalPrice: () => get().finalPrice,

            /**
             * Set production settings
             */
            setProductionSettings: (settings) => set(state => ({
                productionSettings: { ...state.productionSettings, ...settings }
            })),

            /**
             * Set units (for production page)
             */
            setUnits: (units) => set({ units }),

            reset: () => set(initialState),
        }),
        {
            name: 'pricing-storage-v2',
            version: 2, // Bumped version for new fields
        }
    )
);
