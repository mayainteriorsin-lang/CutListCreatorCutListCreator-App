/**
 * Visual Quotation Store v2
 * 
 * Focused stores for better state management and performance.
 * These stores replace the monolithic visualQuotationStore.
 * 
 * Migration Strategy:
 * 1. Use useLegacyBridge() to sync old store with new stores
 * 2. Gradually migrate components to use new stores
 * 3. Old store remains for backward compatibility
 */

// Focused Stores
export { useQuotationMetaStore } from './useQuotationMetaStore';
export type { QuotationMetaState } from './useQuotationMetaStore';

export { useDesignCanvasStore } from './useDesignCanvasStore';
export type { DesignCanvasState } from './useDesignCanvasStore';

export { usePricingStore } from './usePricingStore';
export type { PricingState } from './usePricingStore';

export { useRoomStore } from './useRoomStore';
export type { RoomState } from './useRoomStore';

// Legacy Bridge
export { useLegacyBridge, useShouldUseLegacyBridge } from './useLegacyBridge';
