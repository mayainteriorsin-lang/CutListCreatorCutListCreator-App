/**
 * Quotations Module - State & Persistence Ownership (PHASE 4)
 *
 * OWNERSHIP MODEL:
 * - State Owner: This module (storage.ts) - localStorage is sole persistence
 * - Write Owner: Exported functions (createQuotation, updateQuotation, etc.)
 * - Persistence Adapter: Direct localStorage (no API integration yet)
 * - Fallback Behavior: N/A - localStorage is primary and only store
 *
 * SOURCE-OF-TRUTH POLICY:
 * - localStorage 'quotations:data' is the single source of truth
 * - No server sync currently - purely local storage
 * - Quick Quote entries (mayaClients) are read-only merged for display
 *
 * WRITE PATH (single canonical entrypoint):
 * - createQuotation() -> writeQuotations() -> localStorage
 * - updateQuotation() -> writeQuotations() -> localStorage
 * - deleteQuotation() -> writeQuotations() OR deleteQuickQuoteEntry()
 *
 * READ PATH:
 * - readQuotations() merges native + Quick Quote entries
 * - Native quotations from 'quotations:data'
 * - Quick Quote entries from 'mayaClients' (legacy, read-only merge)
 *
 * FUTURE: When API integration is added, this module should follow
 * the pattern used by CRM (localStorage-first with API sync).
 */

import type { Quotation, PaymentEntry, QuotationStatus, QuotationVersion, VersionChange } from './types';
import { generateUUID } from '@/lib/uuid';

// Maximum versions per quotation
const MAX_VERSIONS_PER_QUOTATION = 50;

const STORAGE_KEY = 'quotations:data';
const QUICK_QUOTE_KEY = 'mayaClients';  // Legacy Quick Quote - read-only merge
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

// ====== Quick Quote Bridge ======

// Parse ₹-prefixed string like "₹1,50,000" to number
function parseRupeeString(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  const cleaned = value.replace(/[₹,\s]/g, '');
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : 0;
}

// Read Quick Quote entries from mayaClients localStorage and convert to Quotation format
function readQuickQuoteEntries(): Quotation[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(QUICK_QUOTE_KEY);
    if (!raw) return [];
    const clients = JSON.parse(raw);
    if (typeof clients !== 'object' || clients === null || Array.isArray(clients)) return [];

    const entries: Quotation[] = [];

    for (const [quoteNumber, data] of Object.entries(clients)) {
      if (!data || typeof data !== 'object') continue;
      const d = data as Record<string, unknown>;

      const mainTotal = Number(d.mainTotal) || 0;
      const additionalTotal = Number(d.additionalTotal) || 0;
      const subtotal = mainTotal + additionalTotal;

      // Parse discount
      let discountPercent = 0;
      let discountFlat = 0;
      const discountValue = Number(d.discountValue) || 0;
      if (d.discountType === 'percent') {
        discountPercent = discountValue;
      } else {
        discountFlat = discountValue;
      }

      // Calculate final total (with GST if enabled)
      const afterDiscount = subtotal - (discountPercent > 0 ? subtotal * discountPercent / 100 : discountFlat);
      const gstEnabled = d.gstEnabled === true;
      const gstRate = Number(d.gstRate) || 18;
      const gst = gstEnabled ? afterDiscount * gstRate / 100 : 0;
      const finalTotal = Math.round(afterDiscount + gst);

      // Payment
      const paidAmount = Number(d.paidAmount) || 0;
      const payments: PaymentEntry[] = paidAmount > 0
        ? [{ id: `qq-pay-${quoteNumber}`, amount: paidAmount, date: String(d.quoteDate || ''), note: 'Quick Quote payment' }]
        : [];
      const totalPaid = paidAmount;

      // Build notes from GST info
      const notes = gstEnabled ? `GST ${gstRate}% applied` : '';

      // Parse date and generate validity
      const dateStr = String(d.quoteDate || new Date().toISOString().split('T')[0]);
      const savedAt = String(d.savedAt || nowISO());

      const validityDate = (() => {
        try {
          const dt = new Date(dateStr || savedAt);
          dt.setDate(dt.getDate() + 15);
          return dt.toISOString().split('T')[0];
        } catch {
          const dt = new Date();
          dt.setDate(dt.getDate() + 15);
          return dt.toISOString().split('T')[0];
        }
      })();

      entries.push({
        id: `qq-${quoteNumber}`,
        clientName: String(d.clientName || ''),
        clientMobile: String(d.clientContact || ''),
        clientLocation: String(d.clientAddress || ''),
        quotationNumber: quoteNumber,
        date: dateStr,
        validityDate,
        status: 'DRAFT',
        subtotal,
        discountPercent,
        discountFlat,
        finalTotal,
        payments,
        totalPaid,
        pendingAmount: finalTotal - totalPaid,
        notes,
        createdAt: savedAt,
        updatedAt: savedAt,
        source: 'quick-quote',
      });
    }

    return entries;
  } catch {
    return [];
  }
}

// Delete a Quick Quote entry from mayaClients localStorage
export function deleteQuickQuoteEntry(quoteNumber: string): boolean {
  if (!isBrowser()) return false;
  try {
    const raw = localStorage.getItem(QUICK_QUOTE_KEY);
    if (!raw) return false;
    const clients = JSON.parse(raw);
    if (typeof clients !== 'object' || clients === null) return false;
    if (!(quoteNumber in clients)) return false;
    delete clients[quoteNumber];
    localStorage.setItem(QUICK_QUOTE_KEY, JSON.stringify(clients));
    notifyUpdate();
    return true;
  } catch {
    return false;
  }
}

// ====== Core Storage Functions ======

// Read native quotations only
function readNativeQuotations(): Quotation[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Quotation[];
  } catch {
    return [];
  }
}

// Read all quotations (native + Quick Quote merged)
export function readQuotations(): Quotation[] {
  const native = readNativeQuotations();
  const quickQuote = readQuickQuoteEntries();

  if (quickQuote.length === 0) return native;

  // Deduplicate: if a native quotation has the same quotationNumber as a Quick Quote entry, keep native
  const nativeNumbers = new Set(native.map(q => q.quotationNumber));
  const uniqueQQ = quickQuote.filter(qq => !nativeNumbers.has(qq.quotationNumber));

  // Merge and sort by createdAt descending
  const merged = [...native, ...uniqueQQ];
  merged.sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  return merged;
}

// Write all quotations (only writes native entries)
function writeQuotations(quotations: Quotation[]): void {
  if (!isBrowser()) return;
  // Only persist native quotations (not Quick Quote entries)
  const native = quotations.filter(q => q.source !== 'quick-quote');
  localStorage.setItem(STORAGE_KEY, JSON.stringify(native));
  notifyUpdate();
}

// Get single quotation by ID
export function getQuotationById(id: string): Quotation | null {
  const quotations = readQuotations();
  return quotations.find(q => q.id === id) || null;
}

// Generate next quotation number
export function generateQuotationNumber(): string {
  const quotations = readNativeQuotations();
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
    source: 'native',
  };

  const quotations = readNativeQuotations();
  quotations.unshift(quotation);
  writeQuotations(quotations);

  return quotation;
}

// Update quotation
export function updateQuotation(id: string, updates: Partial<Quotation>): Quotation | null {
  const quotations = readNativeQuotations();
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

// Delete quotation (handles both native and Quick Quote)
export function deleteQuotation(id: string): boolean {
  // Check if it's a Quick Quote entry
  if (id.startsWith('qq-')) {
    const quoteNumber = id.slice(3); // Remove 'qq-' prefix
    return deleteQuickQuoteEntry(quoteNumber);
  }

  // Native quotation
  const quotations = readNativeQuotations();
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

// ====== Version History Functions ======

// Detect changes between two quotation states
function detectChanges(oldQuotation: Quotation, newQuotation: Quotation): VersionChange[] {
  const changes: VersionChange[] = [];

  // Track key fields for change detection
  const fieldsToTrack: Array<{ field: keyof Quotation; label: string }> = [
    { field: 'clientName', label: 'Client Name' },
    { field: 'clientMobile', label: 'Mobile' },
    { field: 'clientLocation', label: 'Location' },
    { field: 'subtotal', label: 'Subtotal' },
    { field: 'discountPercent', label: 'Discount %' },
    { field: 'discountFlat', label: 'Discount Amount' },
    { field: 'finalTotal', label: 'Final Total' },
    { field: 'status', label: 'Status' },
  ];

  for (const { field, label } of fieldsToTrack) {
    const oldVal = oldQuotation[field];
    const newVal = newQuotation[field];
    if (oldVal !== newVal) {
      changes.push({
        field: label,
        oldValue: oldVal as string | number,
        newValue: newVal as string | number,
      });
    }
  }

  return changes;
}

// Save current quotation state as a new version
export function saveVersionToQuotation(quotationId: string, note?: string): QuotationVersion | null {
  const quotation = getQuotationById(quotationId);
  if (!quotation || quotation.source === 'quick-quote') return null;

  const versions = quotation.versions || [];
  const lastVersion = versions[versions.length - 1];
  const nextVersionNumber = lastVersion ? lastVersion.version + 1 : 1;

  // Detect changes from last version (if exists)
  let changes: VersionChange[] = [];
  if (lastVersion && quotation) {
    // Compare current quotation with last saved version data
    const currentSnapshot = {
      finalTotal: quotation.finalTotal,
      subtotal: quotation.subtotal,
      discountPercent: quotation.discountPercent,
      discountFlat: quotation.discountFlat,
      clientName: quotation.clientName,
      clientMobile: quotation.clientMobile,
      clientLocation: quotation.clientLocation,
      status: quotation.status,
    };

    // Simple comparison for version-level changes
    if (lastVersion.finalTotal !== currentSnapshot.finalTotal) {
      changes.push({
        field: 'Final Total',
        oldValue: lastVersion.finalTotal,
        newValue: currentSnapshot.finalTotal,
      });
    }
    if (lastVersion.subtotal !== currentSnapshot.subtotal) {
      changes.push({
        field: 'Subtotal',
        oldValue: lastVersion.subtotal,
        newValue: currentSnapshot.subtotal,
      });
    }
    if (lastVersion.discountPercent !== currentSnapshot.discountPercent) {
      changes.push({
        field: 'Discount %',
        oldValue: lastVersion.discountPercent,
        newValue: currentSnapshot.discountPercent,
      });
    }
    if (lastVersion.discountFlat !== currentSnapshot.discountFlat) {
      changes.push({
        field: 'Discount Amount',
        oldValue: lastVersion.discountFlat,
        newValue: currentSnapshot.discountFlat,
      });
    }
  }

  const now = nowISO();
  const newVersion: QuotationVersion = {
    id: `ver-${generateUUID()}`,
    version: nextVersionNumber,
    date: now.split('T')[0],
    timestamp: Date.now(),
    finalTotal: quotation.finalTotal,
    subtotal: quotation.subtotal,
    discountPercent: quotation.discountPercent,
    discountFlat: quotation.discountFlat,
    note,
    changes: changes.length > 0 ? changes : undefined,
  };

  // Keep only last N versions
  const updatedVersions = [...versions, newVersion];
  if (updatedVersions.length > MAX_VERSIONS_PER_QUOTATION) {
    updatedVersions.shift(); // Remove oldest
  }

  updateQuotation(quotationId, { versions: updatedVersions });
  return newVersion;
}

// Delete a specific version from quotation
export function deleteVersionFromQuotation(quotationId: string, versionId: string): boolean {
  const quotation = getQuotationById(quotationId);
  if (!quotation || quotation.source === 'quick-quote') return false;

  const versions = quotation.versions || [];
  const filteredVersions = versions.filter(v => v.id !== versionId);

  if (filteredVersions.length === versions.length) return false; // Version not found

  updateQuotation(quotationId, { versions: filteredVersions });
  return true;
}

// Get all versions for a quotation
export function getVersionsForQuotation(quotationId: string): QuotationVersion[] {
  const quotation = getQuotationById(quotationId);
  if (!quotation) return [];
  return quotation.versions || [];
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
