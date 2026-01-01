/**
 * Bridge to MaxRects optimizer
 * Neutral wrapper that both wood grain and standard modules use
 */

import { optimizeCutlist } from '../../../lib/cutlist-optimizer';
import type { OptimizerPart, OptimizationResult } from './types';

/**
 * Call the MaxRects optimizer with given parts and settings
 * @param parts - Parts to optimize
 * @param sheetWidth - Sheet width in mm
 * @param sheetHeight - Sheet height in mm
 * @param timeMs - Time budget in milliseconds
 * @param strategy - Packing strategy (BAF, BSSF, etc.)
 * @returns Optimization result with sheets
 */
export function runOptimizer(
  parts: OptimizerPart[],
  sheetWidth: number = 1210,
  sheetHeight: number = 2420,
  timeMs: number = 300,
  strategy: string = 'BAF'
): OptimizationResult {
  return optimizeCutlist({
    parts,
    sheet: { w: sheetWidth, h: sheetHeight, kerf: 3 },
    timeMs,
    strategy
  });
}
