/**
 * Quick Quotation Module - Auto-Save Hook
 *
 * Automatically saves quotation state to localStorage with debouncing.
 * Saves to both:
 * - mayaQuotation (working state)
 * - mayaClients (permanent list, syncs with Client Folders)
 */

import { useEffect, useRef } from 'react';
import { useQuickQuotationStore } from '../store/quickQuotationStore';

const AUTO_SAVE_DELAY_MS = 1500; // 1.5 second debounce for auto-save

export function useAutoSave() {
  const client = useQuickQuotationStore(state => state.client);
  const quotationMeta = useQuickQuotationStore(state => state.quotationMeta);
  const mainItems = useQuickQuotationStore(state => state.mainItems);
  const additionalItems = useQuickQuotationStore(state => state.additionalItems);
  const settings = useQuickQuotationStore(state => state.settings);
  const saveToLocalStorage = useQuickQuotationStore(state => state.saveToLocalStorage);
  const saveAsClient = useQuickQuotationStore(state => state.saveAsClient);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstMount = useRef(true);

  useEffect(() => {
    // Skip first mount (initial load)
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    // Clear any pending save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Schedule new save
    timeoutRef.current = setTimeout(() => {
      // Always save working state
      saveToLocalStorage();

      // Also save to permanent client list (syncs with Client Folders)
      // Only if client name exists
      if (client.name && client.name.trim()) {
        saveAsClient(quotationMeta.number);
      }
    }, AUTO_SAVE_DELAY_MS);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [client, quotationMeta, mainItems, additionalItems, settings, saveToLocalStorage, saveAsClient]);
}
