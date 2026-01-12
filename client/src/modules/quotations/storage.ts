// Quotation storage module - localStorage based

import type { Quotation, PaymentEntry, QuotationStatus } from './types';
import { generateUUID } from '@/lib/uuid';

const STORAGE_KEY = 'quotations:data';
const UPDATE_EVENT = 'quotations:update';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function nowISO(): string {
  return new Date().toISOString();
}

function notifyUpdate(): void {
  if (isBrowser()) {
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  }
}

// Subscribe to updates
export function subscribeQuotationUpdates(callback: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener(UPDATE_EVENT, callback);
  return () => window.removeEventListener(UPDATE_EVENT, callback);
}

// Read all quotations
export function readQuotations(): Quotation[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Quotation[];
  } catch {
    return [];
  }
}

// Write all quotations
function writeQuotations(quotations: Quotation[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(quotations));
  notifyUpdate();
}

// Get single quotation by ID
export function getQuotationById(id: string): Quotation | null {
  const quotations = readQuotations();
  return quotations.find(q => q.id === id) || null;
}

// Generate next quotation number
export function generateQuotationNumber(): string {
  const quotations = readQuotations();
  const year = new Date().getFullYear();
  const count = quotations.filter(q => q.quotationNumber.includes(`Q-${year}`)).length + 1;
  return `Q-${year}-${String(count).padStart(3, '0')}`;
}

// Create new quotation
export function createQuotation(data: Partial<Quotation>): Quotation {
  const now = nowISO();
  const validityDate = new Date();
  validityDate.setDate(validityDate.getDate() + 15);

  const subtotal = data.subtotal || 0;
  const discountPercent = data.discountPercent || 0;
  const discountFlat = data.discountFlat || 0;
  const finalTotal = subtotal - (subtotal * discountPercent / 100) - discountFlat;
  const payments = data.payments || [];
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const quotation: Quotation = {
    id: `quot-${generateUUID()}`,
    clientName: data.clientName || '',
    clientMobile: data.clientMobile || '',
    clientLocation: data.clientLocation || '',
    quotationNumber: data.quotationNumber || generateQuotationNumber(),
    date: data.date || now.split('T')[0],
    validityDate: data.validityDate || validityDate.toISOString().split('T')[0],
    status: data.status || 'DRAFT',
    subtotal,
    discountPercent,
    discountFlat,
    finalTotal,
    payments,
    totalPaid,
    pendingAmount: finalTotal - totalPaid,
    notes: data.notes || '',
    createdAt: now,
    updatedAt: now,
  };

  const quotations = readQuotations();
  quotations.unshift(quotation);
  writeQuotations(quotations);

  return quotation;
}

// Update quotation
export function updateQuotation(id: string, updates: Partial<Quotation>): Quotation | null {
  const quotations = readQuotations();
  const index = quotations.findIndex(q => q.id === id);
  if (index < 0) return null;

  const existing = quotations[index];

  // Recalculate amounts if subtotal or discount changed
  const subtotal = updates.subtotal ?? existing.subtotal;
  const discountPercent = updates.discountPercent ?? existing.discountPercent;
  const discountFlat = updates.discountFlat ?? existing.discountFlat;
  const finalTotal = subtotal - (subtotal * discountPercent / 100) - discountFlat;
  const payments = updates.payments ?? existing.payments;
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  const updated: Quotation = {
    ...existing,
    ...updates,
    subtotal,
    discountPercent,
    discountFlat,
    finalTotal,
    payments,
    totalPaid,
    pendingAmount: finalTotal - totalPaid,
    updatedAt: nowISO(),
  };

  quotations[index] = updated;
  writeQuotations(quotations);

  return updated;
}

// Delete quotation
export function deleteQuotation(id: string): boolean {
  const quotations = readQuotations();
  const index = quotations.findIndex(q => q.id === id);
  if (index < 0) return false;

  quotations.splice(index, 1);
  writeQuotations(quotations);
  return true;
}

// Add payment to quotation
export function addPaymentToQuotation(quotationId: string, amount: number, note: string = ''): Quotation | null {
  const quotation = getQuotationById(quotationId);
  if (!quotation || amount <= 0) return null;

  const newPayment: PaymentEntry = {
    id: `pay-${Date.now()}`,
    amount,
    date: nowISO().split('T')[0],
    note,
  };

  const payments = [...quotation.payments, newPayment];
  return updateQuotation(quotationId, { payments });
}

// Remove payment from quotation
export function removePaymentFromQuotation(quotationId: string, paymentId: string): Quotation | null {
  const quotation = getQuotationById(quotationId);
  if (!quotation) return null;

  const payments = quotation.payments.filter(p => p.id !== paymentId);
  return updateQuotation(quotationId, { payments });
}

// Update quotation status
export function updateQuotationStatus(id: string, status: QuotationStatus): Quotation | null {
  return updateQuotation(id, { status });
}

// Get quotations stats
export function getQuotationsStats(): {
  total: number;
  draft: number;
  sent: number;
  approved: number;
  rejected: number;
  totalValue: number;
  totalReceived: number;
  totalPending: number;
} {
  const quotations = readQuotations();
  return {
    total: quotations.length,
    draft: quotations.filter(q => q.status === 'DRAFT').length,
    sent: quotations.filter(q => q.status === 'SENT').length,
    approved: quotations.filter(q => q.status === 'APPROVED').length,
    rejected: quotations.filter(q => q.status === 'REJECTED').length,
    totalValue: quotations.reduce((sum, q) => sum + q.finalTotal, 0),
    totalReceived: quotations.reduce((sum, q) => sum + q.totalPaid, 0),
    totalPending: quotations.reduce((sum, q) => sum + Math.max(0, q.pendingAmount), 0),
  };
}
