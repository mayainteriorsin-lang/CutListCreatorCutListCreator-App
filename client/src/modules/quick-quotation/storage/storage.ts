/**
 * Quick Quotation Module - Storage Layer
 *
 * Handles localStorage persistence with backward compatibility
 * for existing mayaClients and mayaQuotation data.
 */

import type {
  QuickQuoteClient,
  QuotationMeta,
  QuotationRow,
  QuickQuoteSettings,
  Shortcuts,
  MayaClientEntry,
  MayaQuotationState,
  BankAccount,
  QuotationVersion,
} from '../types';

import {
  STORAGE_KEYS,
  DEFAULT_SHORTCUTS,
  DEFAULT_CONTACT_INFO,
  DEFAULT_BANK_ACCOUNT,
  DEFAULT_GST_RATE,
  formatCurrencyWithSymbol,
  generateQuoteNumber,
  getTodayDate,
} from '../constants';

// ============================================
// Browser Check
// ============================================

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

// ============================================
// Quotation State (mayaQuotation)
// ============================================

export function saveQuotationState(
  client: QuickQuoteClient,
  quotationMeta: QuotationMeta,
  mainItems: QuotationRow[],
  additionalItems: QuotationRow[],
  settings: QuickQuoteSettings
): boolean {
  if (!isBrowser()) return false;

  try {
    const state: MayaQuotationState = {
      quoteDate: quotationMeta.date,
      quoteNumber: quotationMeta.number,
      clientName: client.name,
      clientAddress: client.address,
      clientContact: client.contact,
      clientEmail: client.email,
      mainItems,
      additionalItems,
      gstEnabled: settings.gstEnabled,
      gstRate: settings.gstRate,
      discountType: settings.discountType,
      discountValue: settings.discountValue,
      bankAccounts: settings.bankAccounts,
      paidAmount: settings.paidAmount,
    };

    localStorage.setItem(STORAGE_KEYS.QUOTATION, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error('[QuickQuotation] Failed to save quotation state:', error);
    return false;
  }
}

export function loadQuotationState(): {
  client: QuickQuoteClient;
  quotationMeta: QuotationMeta;
  mainItems: QuotationRow[];
  additionalItems: QuotationRow[];
  settings: Partial<QuickQuoteSettings>;
} | null {
  if (!isBrowser()) return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUOTATION);
    if (!raw) return null;

    const state: MayaQuotationState = JSON.parse(raw);

    return {
      client: {
        name: state.clientName || '',
        address: state.clientAddress || '',
        contact: state.clientContact || '',
        email: state.clientEmail || '',
      },
      quotationMeta: {
        date: state.quoteDate || getTodayDate(),
        number: state.quoteNumber || generateQuoteNumber(),
      },
      mainItems: sanitizeQuotationRows(state.mainItems || []),
      additionalItems: sanitizeQuotationRows(state.additionalItems || []),
      settings: {
        gstEnabled: state.gstEnabled ?? false,
        gstRate: (state.gstRate ?? DEFAULT_GST_RATE) as 5 | 12 | 18 | 28,
        discountType: state.discountType ?? 'amount',
        discountValue: Number(state.discountValue) ?? 0,
        bankAccounts: state.bankAccounts || [DEFAULT_BANK_ACCOUNT],
        paidAmount: Number(state.paidAmount) ?? 0,
      },
    };
  } catch (error) {
    console.error('[QuickQuotation] Failed to load quotation state:', error);
    return null;
  }
}

export function clearQuotationState(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(STORAGE_KEYS.QUOTATION);
}

// ============================================
// Saved Clients (mayaClients)
// ============================================

export function loadAllClients(): Record<string, MayaClientEntry> {
  if (!isBrowser()) return {};

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (error) {
    console.error('[QuickQuotation] Failed to load clients:', error);
    return {};
  }
}

export function saveClient(
  quoteNumber: string,
  client: QuickQuoteClient,
  quotationMeta: QuotationMeta,
  mainItems: QuotationRow[],
  additionalItems: QuotationRow[],
  settings: QuickQuoteSettings,
  grandTotal: number
): boolean {
  if (!isBrowser()) return false;

  try {
    const clients = loadAllClients();

    // Calculate section totals
    const mainTotal = calculateSectionTotal(mainItems);
    const additionalTotal = calculateSectionTotal(additionalItems);

    const entry: MayaClientEntry = {
      clientName: client.name,
      clientAddress: client.address,
      clientContact: client.contact,
      clientEmail: client.email,
      quoteDate: quotationMeta.date,
      mainItems,
      additionalItems,
      mainTotal,
      additionalTotal,
      grandTotal: formatCurrencyWithSymbol(grandTotal),
      gstEnabled: settings.gstEnabled,
      gstRate: settings.gstRate,
      discountType: settings.discountType,
      discountValue: settings.discountValue,
      paidAmount: settings.paidAmount,
      savedAt: new Date().toISOString(),
    };

    clients[quoteNumber] = entry;
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));

    // Notify quotations page of update
    window.dispatchEvent(new CustomEvent('quotations:update'));

    return true;
  } catch (error) {
    console.error('[QuickQuotation] Failed to save client:', error);
    return false;
  }
}

export function loadClient(quoteNumber: string): {
  client: QuickQuoteClient;
  quotationMeta: QuotationMeta;
  mainItems: QuotationRow[];
  additionalItems: QuotationRow[];
  settings: Partial<QuickQuoteSettings>;
} | null {
  const clients = loadAllClients();
  const entry = clients[quoteNumber];

  if (!entry) return null;

  return {
    client: {
      name: entry.clientName || '',
      address: entry.clientAddress || '',
      contact: entry.clientContact || '',
      email: entry.clientEmail || '',
    },
    quotationMeta: {
      date: entry.quoteDate || getTodayDate(),
      number: quoteNumber,
    },
    mainItems: sanitizeQuotationRows(entry.mainItems || []),
    additionalItems: sanitizeQuotationRows(entry.additionalItems || []),
    settings: {
      gstEnabled: entry.gstEnabled ?? false,
      gstRate: (entry.gstRate ?? DEFAULT_GST_RATE) as 5 | 12 | 18 | 28,
      discountType: entry.discountType ?? 'amount',
      discountValue: Number(entry.discountValue) ?? 0,
      paidAmount: Number(entry.paidAmount) ?? 0,
    },
  };
}

export function deleteClient(quoteNumber: string): boolean {
  if (!isBrowser()) return false;

  try {
    const clients = loadAllClients();
    if (!(quoteNumber in clients)) return false;

    delete clients[quoteNumber];
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));

    // Notify quotations page of update
    window.dispatchEvent(new CustomEvent('quotations:update'));

    return true;
  } catch (error) {
    console.error('[QuickQuotation] Failed to delete client:', error);
    return false;
  }
}

export function getClientCount(): number {
  return Object.keys(loadAllClients()).length;
}

// ============================================
// Version History for Quick Quote Entries
// ============================================

/**
 * Save a version snapshot of a Quick Quote entry.
 * Returns the created version or null on failure.
 */
export function saveVersionToQuickQuote(quoteNumber: string, note?: string): QuotationVersion | null {
  if (!isBrowser()) return null;

  try {
    const clients = loadAllClients();
    const entry = clients[quoteNumber];
    if (!entry) return null;

    const versions = entry.versions || [];
    const lastVersion = versions[versions.length - 1];
    const newVersionNumber = lastVersion ? lastVersion.version + 1 : 1;

    // Calculate item count
    const itemCount = (entry.mainItems || []).filter(i => i.type === 'item').length +
                      (entry.additionalItems || []).filter(i => i.type === 'item').length;

    // Parse grand total (stored as formatted string like "Rs.1,50,000")
    const grandTotal = parseFloat((entry.grandTotal || '0').replace(/[^\d.-]/g, '')) || 0;

    // Create version snapshot
    const version: QuotationVersion = {
      id: `v${newVersionNumber}-${Date.now()}`,
      version: newVersionNumber,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      client: {
        name: entry.clientName || '',
        address: entry.clientAddress || '',
        contact: entry.clientContact || '',
        email: entry.clientEmail || '',
      },
      quotationMeta: {
        date: entry.quoteDate || '',
        number: quoteNumber,
      },
      mainItems: entry.mainItems || [],
      additionalItems: entry.additionalItems || [],
      settings: {
        gstEnabled: entry.gstEnabled ?? false,
        gstRate: (entry.gstRate ?? 18) as 5 | 12 | 18 | 28,
        discountType: entry.discountType ?? 'amount',
        discountValue: entry.discountValue ?? 0,
        paidAmount: entry.paidAmount ?? 0,
        selectedBank: 0,
        bankAccounts: [],
        contactInfo: { phone: '', email: '', location: '' },
      },
      grandTotal,
      itemCount,
      note,
    };

    // Add version to entry
    entry.versions = [...versions, version];
    clients[quoteNumber] = entry;
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));

    // Notify quotations page of update
    window.dispatchEvent(new CustomEvent('quotations:update'));

    return version;
  } catch (error) {
    console.error('[QuickQuotation] Failed to save version:', error);
    return null;
  }
}

/**
 * Delete a specific version from a Quick Quote entry.
 */
export function deleteVersionFromQuickQuote(quoteNumber: string, versionId: string): boolean {
  if (!isBrowser()) return false;

  try {
    const clients = loadAllClients();
    const entry = clients[quoteNumber];
    if (!entry || !entry.versions) return false;

    entry.versions = entry.versions.filter(v => v.id !== versionId);
    clients[quoteNumber] = entry;
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));

    // Notify quotations page of update
    window.dispatchEvent(new CustomEvent('quotations:update'));

    return true;
  } catch (error) {
    console.error('[QuickQuotation] Failed to delete version:', error);
    return false;
  }
}

/**
 * Get all versions for a Quick Quote entry.
 */
export function getQuickQuoteVersions(quoteNumber: string): QuotationVersion[] {
  const clients = loadAllClients();
  const entry = clients[quoteNumber];
  return entry?.versions || [];
}

// ============================================
// Shortcuts
// ============================================

export function loadShortcuts(): Shortcuts {
  if (!isBrowser()) return DEFAULT_SHORTCUTS;

  try {
    const floors = localStorage.getItem(STORAGE_KEYS.FLOOR_SHORTCUTS);
    const rooms = localStorage.getItem(STORAGE_KEYS.ROOM_SHORTCUTS);
    const items = localStorage.getItem(STORAGE_KEYS.ITEM_SHORTCUTS);

    return {
      floors: floors ? JSON.parse(floors) : DEFAULT_SHORTCUTS.floors,
      rooms: rooms ? JSON.parse(rooms) : DEFAULT_SHORTCUTS.rooms,
      items: items ? JSON.parse(items) : DEFAULT_SHORTCUTS.items,
    };
  } catch (error) {
    console.error('[QuickQuotation] Failed to load shortcuts:', error);
    return DEFAULT_SHORTCUTS;
  }
}

export function saveShortcuts(shortcuts: Shortcuts): boolean {
  if (!isBrowser()) return false;

  try {
    localStorage.setItem(STORAGE_KEYS.FLOOR_SHORTCUTS, JSON.stringify(shortcuts.floors));
    localStorage.setItem(STORAGE_KEYS.ROOM_SHORTCUTS, JSON.stringify(shortcuts.rooms));
    localStorage.setItem(STORAGE_KEYS.ITEM_SHORTCUTS, JSON.stringify(shortcuts.items));
    return true;
  } catch (error) {
    console.error('[QuickQuotation] Failed to save shortcuts:', error);
    return false;
  }
}

export function resetShortcuts(): void {
  if (!isBrowser()) return;
  saveShortcuts(DEFAULT_SHORTCUTS);
}

// ============================================
// Helper: Sanitize Quotation Rows
// ============================================

/**
 * Sanitize numeric fields in quotation rows.
 * Legacy data may store numbers as strings.
 */
function sanitizeQuotationRows(items: QuotationRow[]): QuotationRow[] {
  return items.map(item => ({
    ...item,
    height: item.height ? Number(item.height) : undefined,
    width: item.width ? Number(item.width) : undefined,
    sqft: item.sqft ? Number(item.sqft) : undefined,
    rate: item.rate ? Number(item.rate) : undefined,
    amount: item.amount ? Number(item.amount) : undefined,
    qty: item.qty ? Number(item.qty) : 1,
    total: item.total ? Number(item.total) : undefined,
  }));
}

// ============================================
// Helper: Calculate Section Total
// ============================================

function calculateSectionTotal(items: QuotationRow[]): number {
  return items.reduce((sum, item) => {
    if (item.type === 'item' && item.total) {
      return sum + Number(item.total);
    }
    return sum;
  }, 0);
}

// ============================================
// Clear All Data
// ============================================

export function clearAllData(): void {
  if (!isBrowser()) return;

  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
}

// ============================================
// Export/Import
// ============================================

export function exportAllData(): string {
  if (!isBrowser()) return '{}';

  const data: Record<string, unknown> = {};

  Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        data[name] = JSON.parse(value);
      } catch {
        data[name] = value;
      }
    }
  });

  return JSON.stringify(data, null, 2);
}

export function importAllData(jsonString: string): boolean {
  if (!isBrowser()) return false;

  try {
    const data = JSON.parse(jsonString);

    if (data.QUOTATION) {
      localStorage.setItem(STORAGE_KEYS.QUOTATION, JSON.stringify(data.QUOTATION));
    }
    if (data.CLIENTS) {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(data.CLIENTS));
    }
    if (data.FLOOR_SHORTCUTS) {
      localStorage.setItem(STORAGE_KEYS.FLOOR_SHORTCUTS, JSON.stringify(data.FLOOR_SHORTCUTS));
    }
    if (data.ROOM_SHORTCUTS) {
      localStorage.setItem(STORAGE_KEYS.ROOM_SHORTCUTS, JSON.stringify(data.ROOM_SHORTCUTS));
    }
    if (data.ITEM_SHORTCUTS) {
      localStorage.setItem(STORAGE_KEYS.ITEM_SHORTCUTS, JSON.stringify(data.ITEM_SHORTCUTS));
    }

    return true;
  } catch (error) {
    console.error('[QuickQuotation] Failed to import data:', error);
    return false;
  }
}
