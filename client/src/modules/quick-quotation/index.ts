/**
 * Quick Quotation Module - Public API
 *
 * This module provides a complete quotation editor for interior design businesses.
 * It replaces the legacy iframe-based quick-quotation app with a native React implementation.
 *
 * Features:
 * - Client information management
 * - Floor/Room/Item hierarchy for quotation items
 * - Shortcut codes for quick entry (gf, lr, tv, etc.)
 * - GST and discount calculations
 * - Payment stage breakdown (5-45-45-5)
 * - PDF export (using jsPDF, no CDN dependency)
 * - Save/Load quotations to localStorage
 * - Bank account management with QR codes
 * - Undo/Redo history (50 states)
 * - Keyboard shortcuts (Ctrl+Z, Ctrl+S, etc.)
 * - Auto-save to localStorage
 * - Error boundary with recovery
 *
 * Data Compatibility:
 * - Maintains backward compatibility with legacy mayaClients localStorage format
 * - Works with existing quotations module integration
 */

// Components
export { QuickQuotationPage } from './components';
export { QuickQuotationErrorBoundary } from './components';

// Store
export { useQuickQuotationStore } from './store/quickQuotationStore';
export {
  useClient,
  useQuotationMeta,
  useMainItems,
  useAdditionalItems,
  useSettings,
  useShortcuts,
  useUI,
  useTotals,
} from './store/quickQuotationStore';

// Types
export type {
  QuickQuoteClient,
  QuotationRow,
  QuotationRowType,
  QuickQuoteSettings,
  BankAccount,
  Shortcuts,
  CalculatedTotals,
  PaymentStages,
  DiscountType,
  GstRate,
} from './types';

// Engine
export { calculateAllTotals, calculateItemRow, recalculateSection } from './engine/calculations';
export { generateQuotationPDF } from './engine/pdfGenerator';

// Storage
export {
  saveQuotationState,
  loadQuotationState,
  saveClient,
  loadClient,
  deleteClient,
  loadAllClients,
  loadShortcuts,
  saveShortcuts,
} from './storage/storage';

// Constants
export {
  DEFAULT_SHORTCUTS,
  DEFAULT_CONTACT_INFO,
  PAYMENT_STAGE_PERCENTAGES,
  GST_RATES,
  formatCurrency,
  formatCurrencyWithSymbol,
  generateQuoteNumber,
} from './constants';
