/**
 * Quick Quotation Module - Auto-Save Hook
 *
 * Automatically saves quotation state to localStorage with debouncing.
 */

import { useEffect, useRef } from 'react';
import { useQuickQuotationStore } from '../store/quickQuotationStore';

const AUTO_SAVE_DELAY_MS = 1000; // 1 second debounce

export function useAutoSave() {
  const client = useQuickQuotationStore(state => state.client);
  const quotationMeta = useQuickQuotationStore(state => state.quotationMeta);
  const mainItems = useQuickQuotationStore(state => state.mainItems);
  const additionalItems = useQuickQuotationStore(state => state.additionalItems);
  const settings = useQuickQuotationStore(state => state.settings);
  const saveToLocalStorage = useQuickQuotationStore(state => state.saveToLocalStorage);

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
      saveToLocalStorage();
    }, AUTO_SAVE_DELAY_MS);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [client, quotationMeta, mainItems, additionalItems, settings, saveToLocalStorage]);
}
