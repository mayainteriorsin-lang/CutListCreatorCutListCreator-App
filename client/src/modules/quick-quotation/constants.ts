/**
 * Quick Quotation Module - Constants & Defaults
 */

import type { Shortcuts, BankAccount, ContactInfo, PaymentStages, ItemShortcut } from './types';

// ============================================
// Storage Keys (maintain legacy compatibility)
// ============================================

export const STORAGE_KEYS = {
  QUOTATION: 'mayaQuotation',
  CLIENTS: 'mayaClients',
  FLOOR_SHORTCUTS: 'floorShortcuts',
  ROOM_SHORTCUTS: 'roomShortcuts',
  ITEM_SHORTCUTS: 'itemShortcuts',
} as const;

// ============================================
// History Settings
// ============================================

export const MAX_HISTORY_SIZE = 50;

// ============================================
// Default Shortcuts
// ============================================

export const DEFAULT_FLOOR_SHORTCUTS: Record<string, string> = {
  gf: 'GROUND FLOOR',
  ff: 'FIRST FLOOR',
  sf: 'SECOND FLOOR',
  tf: 'THIRD FLOOR',
  rf: 'ROOF FLOOR',
  bf: 'BASEMENT',
};

export const DEFAULT_ROOM_SHORTCUTS: Record<string, string> = {
  lr: 'LIVING ROOM',
  br: 'BEDROOM',
  mb: 'MASTER BEDROOM',
  kt: 'KITCHEN',
  ba: 'BATHROOM',
  dr: 'DINING ROOM',
  po: 'POOJA ROOM',
  st: 'STUDY ROOM',
  bl: 'BALCONY',
  ha: 'HALL',
  ut: 'UTILITY',
  sk: 'STORE',
};

export const DEFAULT_ITEM_SHORTCUTS: Record<string, ItemShortcut> = {
  tv: { name: 'TV Unit', amount: 80000 },
  ws: { name: 'Wardrobe Shutter', rate: 1600 },
  kb: { name: 'Kitchen bottom shutter', rate: 850 },
  ls: { name: 'Loft shutter', rate: 750 },
  pu: { name: 'Pooja Unit', amount: 1400 },
  cu: { name: 'Crockery Unit', amount: 1400 },
  fc: { name: 'False Ceiling', rate: 120 },
  pt: { name: 'Painting', rate: 22 },
  ep: { name: 'Electrical Point', rate: 450 },
};

export const DEFAULT_SHORTCUTS: Shortcuts = {
  floors: DEFAULT_FLOOR_SHORTCUTS,
  rooms: DEFAULT_ROOM_SHORTCUTS,
  items: DEFAULT_ITEM_SHORTCUTS,
};

// ============================================
// Default Settings
// ============================================

export const DEFAULT_CONTACT_INFO: ContactInfo = {
  phone: '9840808883',
  email: 'info@mayainteriors.com',
  location: 'Chennai',
};

export const DEFAULT_BANK_ACCOUNT: BankAccount = {
  id: 'default-bank-1',
  name: 'HDFC - Maya Interiors',
  bank: 'HDFC',
  accNo: '1234567890',
  ifsc: 'HDFC0001234',
  upi: 'mayainteriors@upi',
};

// ============================================
// Payment Stage Percentages
// ============================================

export const PAYMENT_STAGE_PERCENTAGES: PaymentStages = {
  booking: 5,
  production: 45,
  factory: 45,
  handover: 5,
};

// ============================================
// GST Rates
// ============================================

export const GST_RATES = [5, 12, 18, 28] as const;
export const DEFAULT_GST_RATE = 18;

// ============================================
// Quote Number Generation
// ============================================

export const QUOTE_PREFIX = 'MI';

export function generateQuoteNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 900) + 100;
  return `${QUOTE_PREFIX}-${year}-${random}`;
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0] ?? new Date().toISOString().slice(0, 10);
}

// ============================================
// Format Helpers
// ============================================

export function formatCurrency(value: number): string {
  if (value == null || isNaN(value)) return '0';
  return Math.round(value).toLocaleString('en-IN');
}

export function formatCurrencyWithSymbol(value: number): string {
  return `₹${formatCurrency(value)}`;
}

export function parseCurrencyString(value: string): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const cleaned = value.replace(/[₹,\s]/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

// ============================================
// ID Generation
// ============================================

let idCounter = 0;
export function generateId(prefix: string = 'qq'): string {
  return `${prefix}-${Date.now()}-${++idCounter}`;
}
