/**
 * Visual Quotation Module
 *
 * Complete visual quotation builder for furniture/wardrobe pricing.
 *
 * This is the main entry point for the visual-quotation module.
 * Import from here for a clean API.
 *
 * @example
 * import { usePricingStore, pricingService, useStoreInitialization } from '@/modules/visual-quotation';
 */

// ============================================================================
// Stores (State Management)
// ============================================================================
export {
  // V2 Stores
  useDesignCanvasStore,
  usePricingStore,
  useQuotationMetaStore,
  useRoomStore,
  // Utility Stores
  useRateCardStore,
  selectRateCards,
  selectRateCardsLoaded,
  selectDefaultCardId,
  useCustomFolderStore,
  selectFolders,
  selectFoldersLoaded,
  selectFolderById,
  // Types
  type CustomFolder,
  type FinalPriceBreakdown,
  type PricingState,
} from "./store";

// ============================================================================
// Services (Business Logic)
// ============================================================================
export {
  // Pricing
  pricingService,
  getQuickRatePreview,
  getAllRatePreviews,
  // Room
  getAllRooms,
  getActiveRoom,
  getRoomById,
  createRoom,
  deleteRoom,
  switchToRoom,
  // Quotation
  quotationService,
  isEditable,
  // Export
  exportToPDF,
  exportToExcel,
  copyToClipboard,
  shareToWhatsApp,
  canExport,
  // Rate Cards
  getAllRateCards,
  getRateCardById,
  createRateCard,
  updateRateCard,
  deleteRateCard,
  duplicateRateCard,
  // Rate Lines
  configToLines,
  linesToConfig,
} from "./services";

// ============================================================================
// Hooks
// ============================================================================
export {
  useStoreInitialization,
  initializeStores,
  useOptimization,
  useRateCardPage,
  useRateLineEditor,
} from "./hooks";

// ============================================================================
// Constants
// ============================================================================
export {
  RATE_CARD_IDS,
  DEFAULT_RATE_CARD_SPECS,
  FLOOR_OPTIONS,
  ROOM_OPTIONS,
  UNIT_TYPE_LABELS,
  formatUnitTypeLabel,
  generateRoomName,
} from "./constants";

// ============================================================================
// Types
// ============================================================================
export type {
  RateCardKey,
  RateCardMaterialSpecs,
} from "./constants";
