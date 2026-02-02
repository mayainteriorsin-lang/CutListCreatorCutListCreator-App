/**
 * useRateLineEditor Hook
 *
 * Manages state for the line-based rate card editor.
 * Orchestrates service calls and provides clean interface for UI.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import type { RateLine, RateLineType, RateLineUpdate, RateLineTotals } from "../types/rateLine";
import type { WardrobeConfig } from "../types/pricing";
import type { ServiceResult } from "../services/types";
import {
  configToLines,
  linesToConfig,
  updateLine as serviceUpdateLine,
  calculateLineTotals,
  validateLines,
} from "../services/rateLineService";

// ============================================================================
// Types
// ============================================================================

export interface UseRateLineEditorReturn {
  // State
  lines: RateLine[];
  isLoading: boolean;
  isDirty: boolean;
  error: string | null;

  // Computed
  totals: RateLineTotals;

  // Actions
  updateLine: (lineType: RateLineType, updates: RateLineUpdate) => void;
  getConfig: () => WardrobeConfig;
  validate: () => ServiceResult<void>;
  reset: () => void;
  markClean: () => void;

  // Row editing state
  editingRow: RateLineType | null;
  setEditingRow: (type: RateLineType | null) => void;
}

export interface UseRateLineEditorOptions {
  config: WardrobeConfig;
  onChange?: (config: WardrobeConfig) => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useRateLineEditor(options: UseRateLineEditorOptions): UseRateLineEditorReturn {
  const { config, onChange } = options;

  // Initialize lines from config
  const initialLines = useMemo(() => configToLines(config), []);

  // State
  const [lines, setLines] = useState<RateLine[]>(initialLines);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<RateLineType | null>(null);

  // Sync lines when config changes externally
  useEffect(() => {
    if (!isDirty) {
      setLines(configToLines(config));
    }
  }, [config, isDirty]);

  // Calculate totals
  const totals = useMemo(() => calculateLineTotals(lines), [lines]);

  // ========================================================================
  // Actions
  // ========================================================================

  /**
   * Update a single line
   */
  const updateLine = useCallback((lineType: RateLineType, updates: RateLineUpdate) => {
    setLines((prev) => {
      const newLines = serviceUpdateLine(prev, lineType, updates);
      return newLines;
    });
    setIsDirty(true);
    setError(null);

    // Notify parent of change
    if (onChange) {
      setLines((currentLines) => {
        const newConfig = linesToConfig(currentLines, config);
        onChange(newConfig);
        return currentLines;
      });
    }
  }, [config, onChange]);

  /**
   * Get current config from lines
   */
  const getConfig = useCallback((): WardrobeConfig => {
    return linesToConfig(lines, config);
  }, [lines, config]);

  /**
   * Validate current lines
   */
  const validate = useCallback((): ServiceResult<void> => {
    const result = validateLines(lines);
    if (!result.success) {
      setError(result.error || "Validation failed");
    } else {
      setError(null);
    }
    return result;
  }, [lines]);

  /**
   * Reset to original config
   */
  const reset = useCallback(() => {
    setLines(configToLines(config));
    setIsDirty(false);
    setError(null);
    setEditingRow(null);
  }, [config]);

  /**
   * Mark as clean (after save)
   */
  const markClean = useCallback(() => {
    setIsDirty(false);
  }, []);

  // ========================================================================
  // Return
  // ========================================================================

  return {
    // State
    lines,
    isLoading: false,
    isDirty,
    error,

    // Computed
    totals,

    // Actions
    updateLine,
    getConfig,
    validate,
    reset,
    markClean,

    // Row editing
    editingRow,
    setEditingRow,
  };
}

export default useRateLineEditor;
