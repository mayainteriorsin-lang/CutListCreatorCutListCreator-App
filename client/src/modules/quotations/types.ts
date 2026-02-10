// Quotation module types

export type QuotationStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';

export type PaymentMethod = 'cash' | 'upi' | 'bank' | 'cheque' | 'card';

export interface PaymentEntry {
  id: string;
  amount: number;
  date: string;
  note: string;
  method: PaymentMethod;
  reference?: string;        // Transaction ID, Cheque number, etc.
  receiptNumber?: string;    // Auto-generated receipt number
}

// Version change tracking
export interface VersionChange {
  field: string;
  oldValue: string | number;
  newValue: string | number;
}

// Version snapshot of a quotation
export interface QuotationVersion {
  id: string;
  version: number;           // v1, v2, v3...
  date: string;              // Date when version was saved
  timestamp: number;         // Unix timestamp
  finalTotal: number;        // Grand total at this version
  subtotal: number;
  discountPercent: number;
  discountFlat: number;
  note?: string;             // Optional note about this version
  changes?: VersionChange[]; // Changes from previous version
}

export interface Quotation {
  id: string;
  // Client info
  clientName: string;
  clientMobile: string;
  clientLocation: string;
  clientEmail?: string;
  // Quotation details
  quotationNumber: string;
  date: string;
  validityDate: string;
  status: QuotationStatus;
  // Amounts
  subtotal: number;
  discountPercent: number;
  discountFlat: number;
  finalTotal: number;
  // Payments
  payments: PaymentEntry[];
  totalPaid: number;
  pendingAmount: number;
  // Notes
  notes: string;
  // Thank you message for receipts
  thankYouMessage?: string;
  // Metadata
  createdAt: string;
  updatedAt: string;
  // Source tracking
  source?: 'native' | 'quick-quote';
  // Version history
  versions?: QuotationVersion[];
}
