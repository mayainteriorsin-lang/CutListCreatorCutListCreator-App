/**
 * Visual Quotation Hooks
 *
 * Custom React hooks for the Visual Quotation module.
 */

// Store initialization
export { useStoreInitialization, initializeStores } from "./useStoreInitialization";

// Optimization
export { useOptimization, default as useOptimizationDefault } from "./useOptimization";

// Rate card page
export { useRateCardPage, default as useRateCardPageDefault } from "./useRateCardPage";
export type { UseRateCardPageReturn, RateCardPageState, RateCardPageActions } from "./useRateCardPage";

// Rate line editor
export { useRateLineEditor, default as useRateLineEditorDefault } from "./useRateLineEditor";
export type { UseRateLineEditorReturn, UseRateLineEditorOptions } from "./useRateLineEditor";
