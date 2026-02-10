/**
 * Quick Quotation Module - Keyboard Shortcuts Hook
 *
 * Handles global keyboard shortcuts for undo/redo and save.
 */

import { useEffect, useCallback } from 'react';
import { useQuickQuotationStore } from '../store/quickQuotationStore';

export function useKeyboardShortcuts() {
  const undo = useQuickQuotationStore(state => state.undo);
  const redo = useQuickQuotationStore(state => state.redo);
  const canUndo = useQuickQuotationStore(state => state.canUndo);
  const canRedo = useQuickQuotationStore(state => state.canRedo);
  const saveToLocalStorage = useQuickQuotationStore(state => state.saveToLocalStorage);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Skip if in input or textarea (let them handle their own shortcuts)
    const target = event.target as HTMLElement;
    const tagName = target?.tagName?.toUpperCase();
    const isEditable = tagName === 'INPUT' || tagName === 'TEXTAREA' || target?.isContentEditable;

    // Only allow Ctrl+S to work even in inputs
    const isCtrlS = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's';

    if (isEditable && !isCtrlS) {
      return;
    }

    // Handle shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'z':
          event.preventDefault();
          if (event.shiftKey) {
            // Ctrl+Shift+Z = Redo
            if (canRedo()) {
              redo();
            }
          } else {
            // Ctrl+Z = Undo
            if (canUndo()) {
              undo();
            }
          }
          break;

        case 'y':
          // Ctrl+Y = Redo
          event.preventDefault();
          if (canRedo()) {
            redo();
          }
          break;

        case 's':
          // Ctrl+S = Save
          event.preventDefault();
          saveToLocalStorage();
          break;
      }
    }
  }, [undo, redo, canUndo, canRedo, saveToLocalStorage]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
