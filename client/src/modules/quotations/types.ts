// Quotation module types

export type QuotationStatus = 'DRAFT' | 'SENT' | 'APPROVED' | 'REJECTED';

export interface PaymentEntry {
  id: string;
  amount: number;
  date: string;
  note: string;
}

export interface Quotation {
  id: string;
  // Client info
  clientName: string;
  clientMobile: string;
  clientLocation: string;
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
  // Metadata
  createdAt: string;
  updatedAt: string;
  // Source tracking
  source?: 'native' | 'quick-quote';
}
