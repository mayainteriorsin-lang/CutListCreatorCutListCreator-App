/**
 * Quick Quotation Module - Type Definitions
 *
 * Maintains compatibility with legacy mayaClients localStorage format
 * while providing strongly-typed interfaces for React components.
 */

// ============================================
// Client & Contact
// ============================================

export interface QuickQuoteClient {
  name: string;
  address: string;
  contact: string;
  email: string;
}

export interface ContactInfo {
  phone: string;
  email: string;
  location: string;
}

// ============================================
// Quotation Items
// ============================================

export type QuotationRowType = 'floor' | 'room' | 'item';

export interface QuotationRow {
  id: string;
  type: QuotationRowType;
  name: string;           // For floor/room: display name. For item: description

  // Item-specific fields (only used when type === 'item')
  height?: number;
  width?: number;
  sqft?: number;          // Calculated: height * width
  rate?: number;          // Rate per sqft or flat rate
  amount?: number;        // Calculated or direct input
  qty?: number;           // Quantity (default 1)
  total?: number;         // Calculated: amount * qty
  note?: string;          // Optional note for the item
  highlighted?: boolean;  // Red highlight for PDF export
}

// ============================================
// Settings & Configuration
// ============================================

export type DiscountType = 'amount' | 'percent';
export type GstRate = 5 | 12 | 18 | 28;

export interface BankAccount {
  id: string;
  name: string;           // Display name (e.g., "HDFC - Maya Interiors")
  bank: string;           // Bank name
  accNo: string;          // Account number
  ifsc: string;           // IFSC code
  upi: string;            // UPI ID
  qrCode?: string;        // Base64 QR code image (optional)
}

export interface QuickQuoteSettings {
  gstEnabled: boolean;
  gstRate: GstRate;
  discountType: DiscountType;
  discountValue: number;
  paidAmount: number;
  selectedBank: number;   // Index of selected bank account
  bankAccounts: BankAccount[];
  contactInfo: ContactInfo;
}

// ============================================
// Shortcuts / Templates
// ============================================

export interface ItemShortcut {
  name: string;
  rate?: number;
  amount?: number;
}

export interface Shortcuts {
  floors: Record<string, string>;   // e.g., { gf: "GROUND FLOOR" }
  rooms: Record<string, string>;    // e.g., { lr: "LIVING ROOM" }
  items: Record<string, ItemShortcut>;  // e.g., { tv: { name: "TV Unit", rate: 80000, amount: 80000 } }
}

// ============================================
// Quotation Meta
// ============================================

export interface QuotationMeta {
  date: string;           // ISO date (YYYY-MM-DD)
  number: string;         // Quote number (e.g., "MI-2024-001")
}

// ============================================
// History (Undo/Redo)
// ============================================

export interface HistoryEntry {
  timestamp: number;
  client: QuickQuoteClient;
  quotationMeta: QuotationMeta;
  mainItems: QuotationRow[];
  additionalItems: QuotationRow[];
  settings: QuickQuoteSettings;
}

// ============================================
// Payment Stages
// ============================================

export interface PaymentStages {
  booking: number;        // 5%
  production: number;     // 45%
  factory: number;        // 45%
  handover: number;       // 5%
}

// ============================================
// Calculated Totals
// ============================================

export interface CalculatedTotals {
  mainTotal: number;
  additionalTotal: number;
  subtotal: number;
  discountAmount: number;
  afterDiscount: number;
  gstAmount: number;
  grandTotal: number;
  balanceAmount: number;
  paymentStages: PaymentStages;
}

// ============================================
// Version History
// ============================================

export interface VersionChange {
  field: string;
  oldValue: string | number;
  newValue: string | number;
}

export interface QuotationVersion {
  id: string;
  version: number;              // v1, v2, v3...
  date: string;                 // ISO date when version was saved
  timestamp: number;            // Unix timestamp
  client: QuickQuoteClient;
  quotationMeta: QuotationMeta;
  mainItems: QuotationRow[];
  additionalItems: QuotationRow[];
  settings: QuickQuoteSettings;
  grandTotal: number;
  itemCount: number;
  note?: string;                // Optional note about this version
  changes?: VersionChange[];    // Changes from previous version
}

// ============================================
// Version Comparison
// ============================================

export type ChangeType = 'added' | 'deleted' | 'modified';

export interface ItemChange {
  type: ChangeType;
  item: QuotationRow;
  oldItem?: QuotationRow;       // For modified items
  section: 'main' | 'additional';
  location?: string;            // e.g., "Ground Floor > Kitchen"
  fieldChanges?: {              // For modified items, what fields changed
    field: string;
    oldValue: string | number | undefined;
    newValue: string | number | undefined;
  }[];
}

export interface SettingsChange {
  field: string;
  label: string;
  oldValue: string | number | boolean;
  newValue: string | number | boolean;
}

export interface VersionDiff {
  fromVersion: number;
  toVersion: number;
  fromDate: string;
  toDate: string;
  // Summary
  totalChange: number;          // grandTotal difference
  itemCountChange: number;      // item count difference
  // Detailed changes
  addedItems: ItemChange[];
  deletedItems: ItemChange[];
  modifiedItems: ItemChange[];
  settingsChanges: SettingsChange[];
}

// ============================================
// UI State
// ============================================

export type DialogType = 'clients' | 'bank' | 'shortcuts' | 'receipt' | null;

export interface UIState {
  activeDialog: DialogType;
  isGeneratingPdf: boolean;
  additionalSectionVisible: boolean;
  selectedItemId: string | null;
}

// ============================================
// Legacy Storage Format (mayaClients compatibility)
// ============================================

/** Format stored in mayaClients localStorage */
export interface MayaClientEntry {
  clientName: string;
  clientAddress: string;
  clientContact: string;
  clientEmail?: string;
  quoteDate: string;
  mainItems: QuotationRow[];
  additionalItems: QuotationRow[];
  mainTotal: number;
  additionalTotal: number;
  grandTotal: string;     // Formatted string like "₹1,50,000"
  gstEnabled: boolean;
  gstRate: number;
  discountType: DiscountType;
  discountValue: number;
  paidAmount: number;
  savedAt: string;        // ISO timestamp
  // Version history support
  versions?: QuotationVersion[];
}

/** Format stored in mayaQuotation localStorage */
export interface MayaQuotationState {
  quoteDate: string;
  quoteNumber: string;
  clientName: string;
  clientAddress: string;
  clientContact: string;
  clientEmail: string;
  mainItems: QuotationRow[];
  additionalItems: QuotationRow[];
  gstEnabled: boolean;
  gstRate: number;
  discountType: DiscountType;
  discountValue: number;
  bankAccounts: BankAccount[];
  paidAmount: number;
}

// ============================================
// Store Interface
// ============================================

export interface QuickQuotationState {
  // Data
  client: QuickQuoteClient;
  quotationMeta: QuotationMeta;
  mainItems: QuotationRow[];
  additionalItems: QuotationRow[];
  settings: QuickQuoteSettings;
  shortcuts: Shortcuts;

  // History
  history: HistoryEntry[];
  historyIndex: number;

  // UI
  ui: UIState;
}
