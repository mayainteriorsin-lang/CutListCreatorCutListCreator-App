/**
 * Visual Quotation Services
 *
 * Service layer that orchestrates slices + engines.
 * UI/hooks should call services, not slices directly.
 *
 * Services:
 * - pricingService: Pricing calculations and rate management
 * - roomService: Room CRUD and state management
 * - quotationService: Quotation lifecycle and versioning
 * - exportService: PDF, Excel, clipboard, WhatsApp exports
 * - rateCardService: Rate Card CRUD and management
 */

// Types
export type {
  ServiceResult,
  AsyncServiceResult,
  QuotationSnapshot,
  QuotationSummary,
  RoomData,
  RoomCreateParams,
  RoomSaveResult,
  PricingSummary,
  UnitPricingUpdate,
  ExportFormat,
  ExportParams,
  ExportResult,
  DrawingParams,
  UnitUpdateParams,
} from "./types";

// Pricing Service
export {
  pricingService,
  PricingService,
  getQuickRatePreview,
  getAllRatePreviews,
} from "./pricingService";

// Room Service
export {
  default as roomService,
  getAllRooms,
  getActiveRoom,
  getRoomById,
  getRoomCount,
  getRoomUnits,
  isMultiRoomMode,
  createRoom,
  deleteRoom,
  updateRoom,
  switchToRoom,
  saveCurrentRoom,
} from "./roomService";

// Quotation Service (singleton class)
export { quotationService, QuotationService, isEditable } from "./quotationService";

// Export Service
export {
  default as exportService,
  exportToPDF,
  exportToExcel,
  copyToClipboard,
  shareToWhatsApp,
  exportQuotation,
  generateShareLink,
  canExport,
  getAvailableFormats,
} from "./exportService";

// Rate Card Service
export {
  default as rateCardService,
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
  getConfigRatePreview,
  exportRateCard,
  importRateCard,
  exportAllRateCards,
} from "./rateCardService";

// Rate Line Service (config ↔ grid transformation)
export {
  default as rateLineService,
  configToLines,
  linesToConfig,
  updateLine,
  calculateLineTotals,
  validateLines,
} from "./rateLineService";
