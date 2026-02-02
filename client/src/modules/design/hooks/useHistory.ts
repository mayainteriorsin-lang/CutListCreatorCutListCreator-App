/**
 * useHistory Hook
 *
 * Undo/redo logic extracted from DesignCenter.
 * Wraps the history slice from the design store.
 *
 * Provides:
 * - history (array of history entries)
 * - historyIndex (current position in history)
 * - clipboard (copied shapes)
 * - pushHistory
 * - undo
 * - redo
 * - canUndo
 * - canRedo
 * - copyToClipboard
 * - pasteFromClipboard
 */

import { useCallback } from "react";
import { useDesignStore } from "../store/designStore";
import type { Shape } from "../types";

/**
 * Hook for history (undo/redo) operations
 * @returns History state and actions
 */
export function useHistory() {
  // State
  const history = useDesignStore((state) => state.history);
  const historyIndex = useDesignStore((state) => state.historyIndex);
  const clipboard = useDesignStore((state) => state.clipboard);
  const shapes = useDesignStore((state) => state.shapes);

  // Actions from store
  const pushHistory = useDesignStore((state) => state.pushHistory);
  const undo = useDesignStore((state) => state.undo);
  const redo = useDesignStore((state) => state.redo);
  const storeCanUndo = useDesignStore((state) => state.canUndo);
  const storeCanRedo = useDesignStore((state) => state.canRedo);
  const copyToClipboard = useDesignStore((state) => state.copyToClipboard);
  const pasteFromClipboard = useDesignStore((state) => state.pasteFromClipboard);
  const setClipboard = useDesignStore((state) => state.setClipboard);
  const clearHistory = useDesignStore((state) => state.clearHistory);

  /**
   * Check if undo is available
   * @returns True if can undo
   */
  const canUndo = useCallback((): boolean => {
    return storeCanUndo();
  }, [storeCanUndo]);

  /**
   * Check if redo is available
   * @returns True if can redo
   */
  const canRedo = useCallback((): boolean => {
    return storeCanRedo();
  }, [storeCanRedo]);

  /**
   * Check if clipboard has content
   * @returns True if clipboard is not empty
   */
  const hasClipboard = useCallback((): boolean => {
    return clipboard !== null && clipboard.length > 0;
  }, [clipboard]);

  /**
   * Get the number of history entries
   * @returns Number of history entries
   */
  const historyLength = history.length;

  /**
   * Get current history entry description
   * @returns Description of current state, or null
   */
  const currentDescription = useCallback((): string | null => {
    if (historyIndex >= 0 && historyIndex < history.length) {
      return history[historyIndex].description;
    }
    return null;
  }, [history, historyIndex]);

  /**
   * Push current shapes to history with description
   * Convenience wrapper that uses current shapes
   * @param description - Description of the action
   */
  const saveToHistory = useCallback(
    (description: string) => {
      pushHistory(shapes, description);
    },
    [pushHistory, shapes]
  );

  /**
   * Cut selected shapes (copy + delete)
   */
  const cut = useCallback(() => {
    copyToClipboard();
    // The deletion should be handled by the caller after cut
    // This maintains separation of concerns
  }, [copyToClipboard]);

  return {
    // State
    history,
    historyIndex,
    historyLength,
    clipboard,

    // Actions
    pushHistory,
    saveToHistory,
    undo,
    redo,
    copyToClipboard,
    pasteFromClipboard,
    setClipboard,
    clearHistory,
    cut,

    // Utility functions
    canUndo,
    canRedo,
    hasClipboard,
    currentDescription,
  };
}

export default useHistory;
