/**
 * useOptimization - Hook to run sheet optimization for production panels
 * Reuses the existing multiPassOptimize from cabinets optimizer
 */

import { useState, useCallback } from 'react';
import { multiPassOptimize } from '@/lib/optimizer/multiPassOptimize';
import type { ProductionPanelItem } from '../engine/productionEngine';
import type { BrandResult } from '@shared/schema';
import { logger } from '../services/logger';

// Default sheet dimensions (standard plywood size)
const DEFAULT_SHEET_WIDTH = 1210;
const DEFAULT_SHEET_HEIGHT = 2420;
const DEFAULT_KERF = 5;

interface OptimizationResult {
  brandResults: BrandResult[];
  totalSheets: number;
  efficiency: number;
  error?: string;
  skippedCount?: number;
}

interface MaterialInfo {
  plywoodBrand?: string;
  frontLaminate?: string;
  innerLaminate?: string;
}

interface PanelSettings {
  grainSettings?: Record<string, boolean>;
  gaddiSettings?: Record<string, boolean>;
}

interface UseOptimizationReturn {
  isOptimizing: boolean;
  optimizationResult: OptimizationResult | null;
  runOptimization: (panels: ProductionPanelItem[], materialInfo?: MaterialInfo, panelSettings?: PanelSettings) => Promise<void>;
  clearResult: () => void;
  sheetWidth: number;
  sheetHeight: number;
  kerf: number;
}

/**
 * Convert ProductionPanelItem to optimizer-compatible format
 * Also validates and filters panels that are too large for the sheet
 */
function convertToOptimizerParts(
  panels: ProductionPanelItem[],
  sheetWidth: number,
  sheetHeight: number,
  panelSettings?: PanelSettings
) {
  const validParts: any[] = [];
  const oversizedPanels: string[] = [];

  const grainSettings = panelSettings?.grainSettings || {};
  const gaddiSettings = panelSettings?.gaddiSettings || {};

  panels.forEach((panel, idx) => {
    const w = panel.widthMm;
    const h = panel.heightMm;

    // Check if panel fits on sheet (either orientation)
    const fitsNormal = w <= sheetWidth && h <= sheetHeight;
    const fitsRotated = w <= sheetHeight && h <= sheetWidth;

    if (!fitsNormal && !fitsRotated) {
      oversizedPanels.push(`${panel.panelLabel} (${w}x${h}mm)`);
      return; // Skip oversized panels
    }

    // Get grain setting from panelSettings (default true = grain enabled = no rotation)
    const isGrainEnabled = grainSettings[panel.id] ?? true;
    // Get gaddi setting from panelSettings (default false = no gaddi)
    const isGaddiEnabled = gaddiSettings[panel.id] ?? false;

    validParts.push({
      id: panel.id || `panel-${idx}`,
      name: `${panel.unitLabel} - ${panel.panelLabel}`,
      w,
      h,
      nomW: w,
      nomH: h,
      qty: 1,
      rotate: !isGrainEnabled, // Lock rotation when grain is enabled
      gaddi: isGaddiEnabled, // Pass gaddi flag from toggle
      laminateCode: panel.laminateCode || '',
      panelType: panel.panelType,
      grainDirection: isGrainEnabled,
    });
  });

  if (oversizedPanels.length > 0) {
    logger.warn('Skipped oversized panels', { count: oversizedPanels.length, panels: oversizedPanels, context: 'optimization' });
  }

  return validParts;
}

/**
 * Calculate total efficiency from optimization result
 */
function calculateTotalEfficiency(sheets: any[], sheetWidth: number, sheetHeight: number): number {
  if (!sheets || sheets.length === 0) return 0;

  const totalSheetArea = sheets.length * sheetWidth * sheetHeight;
  let totalUsedArea = 0;

  sheets.forEach(sheet => {
    const placed = sheet.placed || [];
    totalUsedArea += placed.reduce((sum: number, p: any) => sum + (p.w || 0) * (p.h || 0), 0);
  });

  return Math.round((totalUsedArea / totalSheetArea) * 100);
}

export function useOptimization(): UseOptimizationReturn {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);

  // Sheet settings (could be made configurable via props/store in future)
  const sheetWidth = DEFAULT_SHEET_WIDTH;
  const sheetHeight = DEFAULT_SHEET_HEIGHT;
  const kerf = DEFAULT_KERF;

  const runOptimization = useCallback(async (panels: ProductionPanelItem[], materialInfo?: MaterialInfo, panelSettings?: PanelSettings) => {
    if (panels.length === 0) {
      logger.warn('No panels to optimize', { context: 'optimization' });
      return;
    }

    setIsOptimizing(true);

    try {
      // Convert production panels to optimizer format (with size validation and panel settings)
      const parts = convertToOptimizerParts(panels, sheetWidth, sheetHeight, panelSettings);

      logger.debug('Starting optimization', { panelCount: parts.length, dimensions: parts.map(p => `${p.w}x${p.h}`), context: 'optimization' });

      const skippedCount = panels.length - parts.length;

      if (parts.length === 0) {
        logger.error('No valid panels - all oversized', { totalPanels: panels.length, sheetSize: `${sheetWidth}x${sheetHeight}`, context: 'optimization' });
        setOptimizationResult({
          brandResults: [],
          totalSheets: 0,
          efficiency: 0,
          error: `All ${panels.length} panels are larger than sheet size (${sheetWidth}x${sheetHeight}mm). Please check your dimensions.`,
          skippedCount: panels.length,
        });
        setIsOptimizing(false);
        return;
      }

      // Run the existing optimizer
      const optimizedSheets = await multiPassOptimize(parts, sheetWidth, sheetHeight, kerf);

      logger.info('Optimization complete', { sheetCount: optimizedSheets.length, context: 'optimization' });

      // Build laminate display string (Front + Inner format)
      const frontLam = materialInfo?.frontLaminate || panels[0]?.laminateCode || '';
      const innerLam = materialInfo?.innerLaminate || '';
      const laminateDisplay = innerLam ? `${frontLam} + ${innerLam}` : frontLam || 'Standard';

      // Build brand result format for SheetPreview component
      const brandResult: BrandResult = {
        brand: materialInfo?.plywoodBrand || 'Plywood',
        laminateCode: frontLam,
        laminateDisplay,
        result: { panels: optimizedSheets },
        isBackPanel: false,
      };

      const efficiency = calculateTotalEfficiency(optimizedSheets, sheetWidth, sheetHeight);

      setOptimizationResult({
        brandResults: [brandResult],
        totalSheets: optimizedSheets.length,
        efficiency,
        skippedCount: skippedCount > 0 ? skippedCount : undefined,
      });
    } catch (error) {
      logger.error('Optimization failed', { error: String(error), context: 'optimization' });
      setOptimizationResult(null);
    } finally {
      setIsOptimizing(false);
    }
  }, [sheetWidth, sheetHeight, kerf]);

  const clearResult = useCallback(() => {
    setOptimizationResult(null);
  }, []);

  return {
    isOptimizing,
    optimizationResult,
    runOptimization,
    clearResult,
    sheetWidth,
    sheetHeight,
    kerf,
  };
}

export default useOptimization;
