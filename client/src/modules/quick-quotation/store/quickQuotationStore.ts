/**
 * Quick Quotation Module - Zustand Store
 *
 * Combined store with all state slices for the quotation editor.
 * Follows patterns from design/store/designStore.ts
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

import type {
  QuickQuoteClient,
  QuotationMeta,
  QuotationRow,
  QuickQuoteSettings,
  Shortcuts,
  HistoryEntry,
  UIState,
  DialogType,
  CalculatedTotals,
  DiscountType,
  GstRate,
  BankAccount,
  QuotationVersion,
  VersionChange,
} from '../types';

import {
  DEFAULT_SHORTCUTS,
  DEFAULT_CONTACT_INFO,
  DEFAULT_BANK_ACCOUNT,
  DEFAULT_GST_RATE,
  MAX_HISTORY_SIZE,
  generateQuoteNumber,
  getTodayDate,
  generateId,
} from '../constants';

import {
  recalculateSection,
  calculateAllTotals,
} from '../engine/calculations';

import {
  saveQuotationState,
  loadQuotationState,
  loadShortcuts,
  saveShortcuts,
  saveClient,
  loadClient,
  deleteClient,
  loadAllClients,
} from '../storage/storage';

// ============================================
// Initial State
// ============================================

const initialClient: QuickQuoteClient = {
  name: '',
  address: '',
  contact: '',
  email: '',
};

const initialQuotationMeta: QuotationMeta = {
  date: getTodayDate(),
  number: generateQuoteNumber(),
};

const initialSettings: QuickQuoteSettings = {
  gstEnabled: false,
  gstRate: DEFAULT_GST_RATE as GstRate,
  discountType: 'amount',
  discountValue: 0,
  paidAmount: 0,
  selectedBank: 0,
  bankAccounts: [DEFAULT_BANK_ACCOUNT],
  contactInfo: DEFAULT_CONTACT_INFO,
};

const initialUI: UIState = {
  activeDialog: null,
  isGeneratingPdf: false,
  additionalSectionVisible: false,
  selectedItemId: null,
};

// ============================================
// Store Interface
// ============================================

interface QuickQuotationStore {
  // === State ===
  client: QuickQuoteClient;
  quotationMeta: QuotationMeta;
  mainItems: QuotationRow[];
  additionalItems: QuotationRow[];
  settings: QuickQuoteSettings;
  shortcuts: Shortcuts;
  history: HistoryEntry[];
  historyIndex: number;
  ui: UIState;
  versions: QuotationVersion[];

  // === Computed (derived from state) ===
  getTotals: () => CalculatedTotals;

  // === Client Actions ===
  setClientField: (field: keyof QuickQuoteClient, value: string) => void;
  setClient: (client: Partial<QuickQuoteClient>) => void;

  // === Quotation Meta Actions ===
  setQuotationDate: (date: string) => void;
  setQuotationNumber: (number: string) => void;

  // === Item Actions ===
  addItem: (item: Partial<QuotationRow>, isAdditional?: boolean) => void;
  addItemAfter: (afterId: string, item?: Partial<QuotationRow>) => void;
  updateItem: (id: string, updates: Partial<QuotationRow>) => void;
  deleteItem: (id: string) => void;
  addFloor: (name: string, isAdditional?: boolean) => void;
  addRoom: (name: string, isAdditional?: boolean) => void;
  moveItem: (id: string, direction: 'up' | 'down') => void;
  setSelectedItem: (id: string | null) => void;
  clearAllItems: () => void;

  // === Settings Actions ===
  setGstEnabled: (enabled: boolean) => void;
  setGstRate: (rate: GstRate) => void;
  setDiscountType: (type: DiscountType) => void;
  setDiscountValue: (value: number) => void;
  setPaidAmount: (amount: number) => void;
  setContactInfo: (field: keyof typeof DEFAULT_CONTACT_INFO, value: string) => void;
  addBankAccount: (account: Omit<BankAccount, 'id'>) => void;
  updateBankAccount: (id: string, updates: Partial<BankAccount>) => void;
  deleteBankAccount: (id: string) => void;
  setSelectedBank: (index: number) => void;

  // === Shortcuts Actions ===
  addShortcut: (type: keyof Shortcuts, code: string, value: string | { name: string; rate?: number; amount?: number }) => void;
  deleteShortcut: (type: keyof Shortcuts, code: string) => void;
  resetShortcuts: () => void;
  expandShortcut: (input: string) => { type: 'floor' | 'room' | 'item'; value: string | { name: string; rate?: number; amount?: number } } | null;

  // === History Actions ===
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;

  // === UI Actions ===
  setActiveDialog: (dialog: DialogType) => void;
  closeDialog: () => void;
  setGeneratingPdf: (generating: boolean) => void;
  toggleAdditionalSection: () => void;

  // === Persistence Actions ===
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => void;
  saveAsClient: (quoteNumber?: string) => boolean;
  loadSavedClient: (quoteNumber: string) => boolean;
  deleteSavedClient: (quoteNumber: string) => boolean;
  getSavedClients: () => { quoteNumber: string; clientName: string; savedAt: string }[];

  // === Version Actions ===
  saveVersion: (note?: string) => void;
  loadVersion: (versionId: string) => void;
  deleteVersion: (versionId: string) => void;
  getVersions: () => QuotationVersion[];
  compareVersions: (v1Id: string, v2Id: string) => VersionChange[];

  // === Reset Actions ===
  resetQuotation: () => void;
  resetStore: () => void;
}

// ============================================
// Store Implementation
// ============================================

export const useQuickQuotationStore = create<QuickQuotationStore>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      // === Initial State ===
      client: initialClient,
      quotationMeta: initialQuotationMeta,
      mainItems: [],
      additionalItems: [],
      settings: initialSettings,
      shortcuts: loadShortcuts(),
      history: [],
      historyIndex: -1,
      ui: initialUI,
      versions: [],

      // === Computed ===
      getTotals: () => {
        const { mainItems, additionalItems, settings } = get();
        return calculateAllTotals(
          mainItems,
          additionalItems,
          settings.discountType,
          settings.discountValue,
          settings.gstEnabled,
          settings.gstRate,
          settings.paidAmount
        );
      },

      // === Client Actions ===
      setClientField: (field, value) => {
        set(state => ({
          client: { ...state.client, [field]: value },
        }));
        get().pushHistory();
      },

      setClient: (client) => {
        set(state => ({
          client: { ...state.client, ...client },
        }));
        get().pushHistory();
      },

      // === Quotation Meta Actions ===
      setQuotationDate: (date) => {
        set(state => ({
          quotationMeta: { ...state.quotationMeta, date },
        }));
      },

      setQuotationNumber: (number) => {
        set(state => ({
          quotationMeta: { ...state.quotationMeta, number },
        }));
      },

      // === Item Actions ===
      addItem: (item, isAdditional = false) => {
        const newItem: QuotationRow = {
          id: generateId('item'),
          type: 'item',
          name: item.name || '',
          height: item.height,
          width: item.width,
          sqft: item.sqft,
          rate: item.rate,
          amount: item.amount,
          qty: item.qty || 1,
          total: item.total,
        };

        set(state => {
          const key = isAdditional ? 'additionalItems' : 'mainItems';
          const items = [...state[key], newItem];
          return { [key]: recalculateSection(items) };
        });

        get().pushHistory();
      },

      addItemAfter: (afterId, item = {}) => {
        const newItem: QuotationRow = {
          id: generateId('item'),
          type: 'item',
          name: item.name || '',
          height: item.height,
          width: item.width,
          sqft: item.sqft,
          rate: item.rate,
          amount: item.amount,
          qty: item.qty || 1,
          total: item.total,
        };

        set(state => {
          // Find in main or additional
          const mainIndex = state.mainItems.findIndex(row => row.id === afterId);
          if (mainIndex >= 0) {
            const items = [...state.mainItems];
            items.splice(mainIndex + 1, 0, newItem);
            return { mainItems: recalculateSection(items) };
          }

          const addIndex = state.additionalItems.findIndex(row => row.id === afterId);
          if (addIndex >= 0) {
            const items = [...state.additionalItems];
            items.splice(addIndex + 1, 0, newItem);
            return { additionalItems: recalculateSection(items) };
          }

          return {};
        });

        get().pushHistory();
      },

      updateItem: (id, updates) => {
        set(state => {
          // Find in main or additional
          let mainItems = [...state.mainItems];
          let additionalItems = [...state.additionalItems];

          const mainIndex = mainItems.findIndex(item => item.id === id);
          if (mainIndex >= 0 && mainItems[mainIndex]) {
            mainItems[mainIndex] = { ...mainItems[mainIndex]!, ...updates };
            mainItems = recalculateSection(mainItems);
          } else {
            const addIndex = additionalItems.findIndex(item => item.id === id);
            if (addIndex >= 0 && additionalItems[addIndex]) {
              additionalItems[addIndex] = { ...additionalItems[addIndex]!, ...updates };
              additionalItems = recalculateSection(additionalItems);
            }
          }

          return { mainItems, additionalItems };
        });

        get().pushHistory();
      },

      deleteItem: (id) => {
        set(state => ({
          mainItems: recalculateSection(state.mainItems.filter(item => item.id !== id)),
          additionalItems: recalculateSection(state.additionalItems.filter(item => item.id !== id)),
        }));
        get().pushHistory();
      },

      addFloor: (name, isAdditional = false) => {
        const newFloor: QuotationRow = {
          id: generateId('floor'),
          type: 'floor',
          name,
        };

        set(state => {
          const key = isAdditional ? 'additionalItems' : 'mainItems';
          return { [key]: [...state[key], newFloor] };
        });

        get().pushHistory();
      },

      addRoom: (name, isAdditional = false) => {
        const newRoom: QuotationRow = {
          id: generateId('room'),
          type: 'room',
          name,
        };

        set(state => {
          const key = isAdditional ? 'additionalItems' : 'mainItems';
          return { [key]: [...state[key], newRoom] };
        });

        get().pushHistory();
      },

      moveItem: (id, direction) => {
        set(state => {
          const moveInArray = (arr: QuotationRow[]): QuotationRow[] => {
            const index = arr.findIndex(item => item.id === id);
            if (index < 0) return arr;

            const newIndex = direction === 'up' ? index - 1 : index + 1;
            if (newIndex < 0 || newIndex >= arr.length) return arr;

            const newArr = [...arr];
            const temp = newArr[index];
            const other = newArr[newIndex];
            if (temp && other) {
              newArr[index] = other;
              newArr[newIndex] = temp;
            }
            return recalculateSection(newArr);
          };

          return {
            mainItems: moveInArray(state.mainItems),
            additionalItems: moveInArray(state.additionalItems),
          };
        });

        get().pushHistory();
      },

      setSelectedItem: (id) => {
        set(state => ({
          ui: { ...state.ui, selectedItemId: id },
        }));
      },

      clearAllItems: () => {
        set({ mainItems: [], additionalItems: [] });
        get().pushHistory();
      },

      // === Settings Actions ===
      setGstEnabled: (enabled) => {
        set(state => ({
          settings: { ...state.settings, gstEnabled: enabled },
        }));
        get().pushHistory();
      },

      setGstRate: (rate) => {
        set(state => ({
          settings: { ...state.settings, gstRate: rate },
        }));
        get().pushHistory();
      },

      setDiscountType: (type) => {
        set(state => ({
          settings: { ...state.settings, discountType: type },
        }));
        get().pushHistory();
      },

      setDiscountValue: (value) => {
        set(state => ({
          settings: { ...state.settings, discountValue: value },
        }));
        get().pushHistory();
      },

      setPaidAmount: (amount) => {
        set(state => ({
          settings: { ...state.settings, paidAmount: amount },
        }));
        get().pushHistory();
      },

      setContactInfo: (field, value) => {
        set(state => ({
          settings: {
            ...state.settings,
            contactInfo: { ...state.settings.contactInfo, [field]: value },
          },
        }));
      },

      addBankAccount: (account) => {
        set(state => ({
          settings: {
            ...state.settings,
            bankAccounts: [
              ...state.settings.bankAccounts,
              { ...account, id: generateId('bank') },
            ],
          },
        }));
      },

      updateBankAccount: (id, updates) => {
        set(state => ({
          settings: {
            ...state.settings,
            bankAccounts: state.settings.bankAccounts.map(acc =>
              acc.id === id ? { ...acc, ...updates } : acc
            ),
          },
        }));
      },

      deleteBankAccount: (id) => {
        set(state => ({
          settings: {
            ...state.settings,
            bankAccounts: state.settings.bankAccounts.filter(acc => acc.id !== id),
            selectedBank: Math.max(0, state.settings.selectedBank - 1),
          },
        }));
      },

      setSelectedBank: (index) => {
        set(state => ({
          settings: { ...state.settings, selectedBank: index },
        }));
      },

      // === Shortcuts Actions ===
      addShortcut: (type, code, value) => {
        set(state => {
          const shortcuts = { ...state.shortcuts };
          if (type === 'items') {
            shortcuts.items = { ...shortcuts.items, [code.toLowerCase()]: value as { name: string; rate?: number; amount?: number } };
          } else {
            shortcuts[type] = { ...shortcuts[type], [code.toLowerCase()]: value as string };
          }
          saveShortcuts(shortcuts);
          return { shortcuts };
        });
      },

      deleteShortcut: (type, code) => {
        set(state => {
          const shortcuts = { ...state.shortcuts };
          const typeShortcuts = { ...shortcuts[type] };
          delete typeShortcuts[code.toLowerCase()];
          shortcuts[type] = typeShortcuts as any;
          saveShortcuts(shortcuts);
          return { shortcuts };
        });
      },

      resetShortcuts: () => {
        saveShortcuts(DEFAULT_SHORTCUTS);
        set({ shortcuts: DEFAULT_SHORTCUTS });
      },

      expandShortcut: (input) => {
        const { shortcuts } = get();
        const code = input.toLowerCase().trim();

        if (shortcuts.floors[code]) {
          return { type: 'floor', value: shortcuts.floors[code] };
        }
        if (shortcuts.rooms[code]) {
          return { type: 'room', value: shortcuts.rooms[code] };
        }
        if (shortcuts.items[code]) {
          return { type: 'item', value: shortcuts.items[code] };
        }

        return null;
      },

      // === History Actions ===
      pushHistory: () => {
        set(state => {
          const entry: HistoryEntry = {
            timestamp: Date.now(),
            client: { ...state.client },
            quotationMeta: { ...state.quotationMeta },
            mainItems: [...state.mainItems],
            additionalItems: [...state.additionalItems],
            settings: { ...state.settings },
          };

          // Trim future history
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(entry);

          // Limit history size
          if (newHistory.length > MAX_HISTORY_SIZE) {
            newHistory.shift();
          }

          return {
            history: newHistory,
            historyIndex: newHistory.length - 1,
          };
        });
      },

      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex <= 0) return;

        const entry = history[historyIndex - 1];
        if (!entry) return;

        set({
          client: entry.client,
          quotationMeta: entry.quotationMeta,
          mainItems: entry.mainItems,
          additionalItems: entry.additionalItems,
          settings: entry.settings,
          historyIndex: historyIndex - 1,
        });
      },

      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex >= history.length - 1) return;

        const entry = history[historyIndex + 1];
        if (!entry) return;

        set({
          client: entry.client,
          quotationMeta: entry.quotationMeta,
          mainItems: entry.mainItems,
          additionalItems: entry.additionalItems,
          settings: entry.settings,
          historyIndex: historyIndex + 1,
        });
      },

      canUndo: () => get().historyIndex > 0,
      canRedo: () => get().historyIndex < get().history.length - 1,

      clearHistory: () => {
        set({ history: [], historyIndex: -1 });
      },

      // === UI Actions ===
      setActiveDialog: (dialog) => {
        set(state => ({
          ui: { ...state.ui, activeDialog: dialog },
        }));
      },

      closeDialog: () => {
        set(state => ({
          ui: { ...state.ui, activeDialog: null },
        }));
      },

      setGeneratingPdf: (generating) => {
        set(state => ({
          ui: { ...state.ui, isGeneratingPdf: generating },
        }));
      },

      toggleAdditionalSection: () => {
        set(state => ({
          ui: { ...state.ui, additionalSectionVisible: !state.ui.additionalSectionVisible },
        }));
      },

      // === Persistence Actions ===
      saveToLocalStorage: () => {
        const { client, quotationMeta, mainItems, additionalItems, settings } = get();
        saveQuotationState(client, quotationMeta, mainItems, additionalItems, settings);
      },

      loadFromLocalStorage: () => {
        const loaded = loadQuotationState();
        if (!loaded) return;

        set({
          client: loaded.client,
          quotationMeta: loaded.quotationMeta,
          mainItems: loaded.mainItems,
          additionalItems: loaded.additionalItems,
          settings: { ...initialSettings, ...loaded.settings },
        });

        get().pushHistory();
      },

      saveAsClient: (quoteNumber) => {
        const { client, quotationMeta, mainItems, additionalItems, settings, getTotals } = get();
        const totals = getTotals();
        return saveClient(
          quoteNumber || quotationMeta.number,
          client,
          quotationMeta,
          mainItems,
          additionalItems,
          settings,
          totals.grandTotal
        );
      },

      loadSavedClient: (quoteNumber) => {
        const loaded = loadClient(quoteNumber);
        if (!loaded) return false;

        set({
          client: loaded.client,
          quotationMeta: loaded.quotationMeta,
          mainItems: loaded.mainItems,
          additionalItems: loaded.additionalItems,
          settings: { ...initialSettings, ...loaded.settings },
        });

        get().clearHistory();
        get().pushHistory();
        return true;
      },

      deleteSavedClient: (quoteNumber) => {
        return deleteClient(quoteNumber);
      },

      getSavedClients: () => {
        const clients = loadAllClients();
        return Object.entries(clients).map(([quoteNumber, entry]) => ({
          quoteNumber,
          clientName: entry.clientName,
          savedAt: entry.savedAt,
        }));
      },

      // === Version Actions ===
      saveVersion: (note) => {
        const { client, quotationMeta, mainItems, additionalItems, settings, versions, getTotals } = get();
        const totals = getTotals();
        const itemCount = mainItems.filter(i => i.type === 'item').length +
                         additionalItems.filter(i => i.type === 'item').length;

        // Calculate changes from previous version
        let changes: VersionChange[] = [];
        const prevVersion = versions.length > 0 ? versions[versions.length - 1] : null;

        if (prevVersion) {
          // Compare totals
          if (prevVersion.grandTotal !== totals.grandTotal) {
            changes.push({
              field: 'Grand Total',
              oldValue: prevVersion.grandTotal,
              newValue: totals.grandTotal,
            });
          }
          // Compare item count
          if (prevVersion.itemCount !== itemCount) {
            changes.push({
              field: 'Item Count',
              oldValue: prevVersion.itemCount,
              newValue: itemCount,
            });
          }
          // Compare client name
          if (prevVersion.client.name !== client.name) {
            changes.push({
              field: 'Client Name',
              oldValue: prevVersion.client.name || '(empty)',
              newValue: client.name || '(empty)',
            });
          }
          // Compare discount
          if (prevVersion.settings.discountValue !== settings.discountValue) {
            changes.push({
              field: 'Discount',
              oldValue: prevVersion.settings.discountValue,
              newValue: settings.discountValue,
            });
          }
          // Compare GST
          if (prevVersion.settings.gstEnabled !== settings.gstEnabled) {
            changes.push({
              field: 'GST Enabled',
              oldValue: prevVersion.settings.gstEnabled ? 'Yes' : 'No',
              newValue: settings.gstEnabled ? 'Yes' : 'No',
            });
          }
        }

        const newVersion: QuotationVersion = {
          id: generateId('ver'),
          version: versions.length + 1,
          date: getTodayDate(),
          timestamp: Date.now(),
          client: { ...client },
          quotationMeta: { ...quotationMeta },
          mainItems: [...mainItems],
          additionalItems: [...additionalItems],
          settings: { ...settings },
          grandTotal: totals.grandTotal,
          itemCount,
          note,
          changes,
        };

        set(state => ({
          versions: [...state.versions, newVersion],
        }));
      },

      loadVersion: (versionId) => {
        const { versions } = get();
        const version = versions.find(v => v.id === versionId);
        if (!version) return;

        set({
          client: { ...version.client },
          quotationMeta: { ...version.quotationMeta },
          mainItems: [...version.mainItems],
          additionalItems: [...version.additionalItems],
          settings: { ...version.settings },
        });

        get().clearHistory();
        get().pushHistory();
      },

      deleteVersion: (versionId) => {
        set(state => ({
          versions: state.versions.filter(v => v.id !== versionId),
        }));
      },

      getVersions: () => {
        return get().versions;
      },

      compareVersions: (v1Id, v2Id) => {
        const { versions } = get();
        const v1 = versions.find(v => v.id === v1Id);
        const v2 = versions.find(v => v.id === v2Id);
        if (!v1 || !v2) return [];

        const changes: VersionChange[] = [];

        // Compare grand totals
        if (v1.grandTotal !== v2.grandTotal) {
          changes.push({
            field: 'Grand Total',
            oldValue: v1.grandTotal,
            newValue: v2.grandTotal,
          });
        }

        // Compare item counts
        if (v1.itemCount !== v2.itemCount) {
          changes.push({
            field: 'Item Count',
            oldValue: v1.itemCount,
            newValue: v2.itemCount,
          });
        }

        // Compare client names
        if (v1.client.name !== v2.client.name) {
          changes.push({
            field: 'Client Name',
            oldValue: v1.client.name || '(empty)',
            newValue: v2.client.name || '(empty)',
          });
        }

        // Compare discounts
        if (v1.settings.discountValue !== v2.settings.discountValue) {
          changes.push({
            field: 'Discount',
            oldValue: v1.settings.discountValue,
            newValue: v2.settings.discountValue,
          });
        }

        return changes;
      },

      // === Reset Actions ===
      resetQuotation: () => {
        set({
          client: initialClient,
          quotationMeta: {
            date: getTodayDate(),
            number: generateQuoteNumber(),
          },
          mainItems: [],
          additionalItems: [],
          settings: initialSettings,
        });
        get().clearHistory();
        get().pushHistory();
      },

      resetStore: () => {
        set({
          client: initialClient,
          quotationMeta: initialQuotationMeta,
          mainItems: [],
          additionalItems: [],
          settings: initialSettings,
          shortcuts: DEFAULT_SHORTCUTS,
          history: [],
          historyIndex: -1,
          ui: initialUI,
        });
      },
    })),
    { name: 'quick-quotation-store' }
  )
);

// ============================================
// Selector Hooks (for optimized re-renders)
// ============================================

export const useClient = () => useQuickQuotationStore(state => state.client);
export const useQuotationMeta = () => useQuickQuotationStore(state => state.quotationMeta);
export const useMainItems = () => useQuickQuotationStore(state => state.mainItems);
export const useAdditionalItems = () => useQuickQuotationStore(state => state.additionalItems);
export const useSettings = () => useQuickQuotationStore(state => state.settings);
export const useShortcuts = () => useQuickQuotationStore(state => state.shortcuts);
export const useUI = () => useQuickQuotationStore(state => state.ui);
export const useVersions = () => useQuickQuotationStore(state => state.versions);
// Return the getTotals function - consumers should use useMemo to call it
export const useGetTotals = () => useQuickQuotationStore(state => state.getTotals);
// Deprecated: use useGetTotals or calculate in component with useMemo
export const useTotals = () => {
  const state = useQuickQuotationStore.getState();
  return state.getTotals();
};
