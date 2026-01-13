/**
 * STANDARD OPTIMIZER
 * This module contains ONLY non-wood grain (standard) optimization strategies
 * Never mix with wood grain code
 *
 * LOCKED: Do not change wood grain rotation rules without explicit user request.
 */

import { runOptimizer } from '../cutlist/core/optimizer-bridge';
import { calculateEfficiency } from '../cutlist/core/efficiency';
import type { OptimizerPart, Sheet, StrategyResult } from '../cutlist/core/types';
import { logger } from '@/lib/system/logger';

/**
 * Standard Multi-Pass Optimization
 * Uses Genetic Algorithm with Guillotine Cuts for improved efficiency
 * TARGET: 99% material utilization for non-wood grain laminates
 *
 * STANDARD RULES:
 * - Materials can rotate freely unless rotation is locked (wood grain)
 * - No dimensional mappings applied
 * - Focus on maximum sheet utilization
 *
 * WOOD GRAIN ENFORCEMENT:
 * - When part.rotate === false, rotation is LOCKED (wood grain enabled)
 * - When part.rotate === true, rotation is ALLOWED
 * - This rule is enforced throughout the genetic algorithm
 *
 * @param parts - Parts with standard dimensional mapping
 * @param sheetWidth - Sheet width (default 1210mm)
 * @param sheetHeight - Sheet height (default 2420mm)
 * @param kerf - Blade kerf width (default 5mm)
 * @returns Best optimization result
 */
export async function optimizeStandardCutlist(
  parts: OptimizerPart[],
  sheetWidth: number = 1210,
  sheetHeight: number = 2420,
  kerf: number = 5
): Promise<Sheet[]> {
  logger.log('🧬 GENETIC ALGORITHM OPTIMIZATION (IMPROVED)');
  const startTime = performance.now();

  // Prepare tasks: run both algorithms in parallel to compare
  // Increased time budgets for better optimization results
  const tasks = [
    { name: 'Genetic-3000ms', algorithm: 'genetic' as const, time: 3000 },
    { name: 'Genetic-4000ms', algorithm: 'genetic' as const, time: 4000 },
    { name: 'MaxRects-BAF', algorithm: 'maxrects' as const, time: 1000, strategy: 'BAF' },
  ];

  logger.log(`🚀 Launching ${tasks.length} optimization strategies...`);
  logger.log(`   Wood grain locked: ${parts.filter(p => !p.rotate).length} pieces`);
  logger.log(`   Rotation allowed: ${parts.filter(p => p.rotate).length} pieces`);

  const results = await Promise.all(
    tasks.map(async (task) => {
      // Inputs: Rotate logic preserved (rotate allowed unless explicitly false)
      const taskParts = parts.map(p => ({ ...p, rotate: p.rotate !== false }));

      try {
        const result = await runOptimizer(
          taskParts,
          sheetWidth,
          sheetHeight,
          task.time,
          task.strategy || 'BAF',
          task.algorithm,
          kerf
        );
        const efficiency = calculateEfficiency(result.panels, parts);
        return {
          name: task.name,
          result: result.panels,
          efficiency,
          sheetsUsed: result.panels.length,
          error: null
        };
      } catch (err) {
        logger.error(`❌ Strategy ${task.name} failed:`, err);
        return { name: task.name, result: [], efficiency: 0, sheetsUsed: Infinity, error: err };
      }
    })
  );

  const duration = (performance.now() - startTime).toFixed(0);
  logger.log(`🏁 All strategies finished in ${duration}ms`);

  const strategies: StrategyResult[] = results
    .filter(r => !r.error)
    .map(r => ({
      name: r.name,
      result: r.result!, // valid because error filtered
      efficiency: r.efficiency,
      sheetsUsed: r.sheetsUsed
    }));

  // Pick the best strategy (highest efficiency, or fewest sheets if tie)
  strategies.sort((a, b) => {
    // Primary: Higher efficiency wins
    if (Math.abs(a.efficiency - b.efficiency) > 0.1) {
      return b.efficiency - a.efficiency;
    }
    // Secondary: Fewer sheets wins
    return a.sheetsUsed - b.sheetsUsed;
  });

  const winner = strategies[0];
  if (winner) {
    logger.log('🏆 WINNER:', winner.name);
    logger.log(`   Sheets: ${winner.sheetsUsed}, Efficiency: ${winner.efficiency.toFixed(2)}%`);
    logger.log(strategies);
  } else {
    logger.error('❌ All optimization strategies failed.');
  }

  logger.logEnd();

  return winner ? winner.result : [];
}
