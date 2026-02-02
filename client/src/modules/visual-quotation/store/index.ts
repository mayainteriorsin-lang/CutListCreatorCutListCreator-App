/**
 * Visual Quotation Store Exports
 *
 * Centralized exports for all V2 stores.
 * Import from this file instead of individual store files.
 *
 * @example
 * import { useDesignCanvasStore, usePricingStore } from '../store';
 */

// V2 Stores (Modular Architecture)
export { useDesignCanvasStore } from "./v2/useDesignCanvasStore";
export { usePricingStore } from "./v2/usePricingStore";
export { useQuotationMetaStore } from "./v2/useQuotationMetaStore";
export { useRoomStore } from "./v2/useRoomStore";

// Other Stores
export {
  useRateCardStore,
  selectRateCards,
  selectDefaultCardId,
  selectIsLoaded,
  selectDefaultCard,
  selectCardById
} from "./rateCardStore";
export {
  useCustomFolderStore,
  selectFolders,
  selectFolderById,
  type CustomFolder
} from "./customFolderStore";
