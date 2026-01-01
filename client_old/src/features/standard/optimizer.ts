/**
 * STANDARD OPTIMIZER
 * This module contains ONLY non-wood grain (standard) optimization strategies
 * Never mix with wood grain code
 */

import { runOptimizer } from '../cutlist/core/optimizer-bridge';
import { calculateEfficiency } from '../cutlist/core/efficiency';
import type { OptimizerPart, Sheet, StrategyResult } from '../cutlist/core/types';

/**
 * Standard Multi-Pass Optimization
 * Tries 5 different strategies optimized for standard (non-wood grain) materials
 * TARGET: 99% material utilization for non-wood grain laminates
 * 
 * STANDARD RULES:
 * - All materials can rotate freely
 * - No dimensional mappings applied
 * - Focus on maximum sheet utilization
 * 
 * @param parts - Parts with standard dimensional mapping
 * @param sheetWidth - Sheet width (default 1210mm)
 * @param sheetHeight - Sheet height (default 2420mm)
 * @returns Best optimization result
 */
export function optimizeStandardCutlist(
  parts: OptimizerPart[],
  sheetWidth: number = 1210,
  sheetHeight: number = 2420
): Sheet[] {
  console.group('📦 STANDARD MULTI-PASS OPTIMIZATION - 5 strategies (TARGET: 99%)');
  
  const strategies: StrategyResult[] = [];
  
  // STRATEGY 1: Best Area Fit (BAF) - Long Time
  console.log('📋 Pass 1: Best Area Fit (1000ms)');
  const partsBAF = parts.map(p => ({ ...p, rotate: true }));
  const result1 = runOptimizer(partsBAF, sheetWidth, sheetHeight, 1000, 'BAF');
  const efficiency1 = calculateEfficiency(result1.panels, parts);
  strategies.push({
    name: 'BAF-1000ms',
    result: result1.panels,
    efficiency: efficiency1,
    sheetsUsed: result1.panels.length
  });
  console.log(`✅ Pass 1 Complete: ${result1.panels.length} sheets, ${efficiency1.toFixed(2)}% efficiency`);
  
  // STRATEGY 2: Best Short Side Fit (BSSF) - Optimizes for similar widths
  console.log('📋 Pass 2: Best Short Side Fit (1000ms)');
  const partsBSSF = parts.map(p => ({ ...p, rotate: true }));
  const result2 = runOptimizer(partsBSSF, sheetWidth, sheetHeight, 1000, 'BSSF');
  const efficiency2 = calculateEfficiency(result2.panels, parts);
  strategies.push({
    name: 'BSSF-1000ms',
    result: result2.panels,
    efficiency: efficiency2,
    sheetsUsed: result2.panels.length
  });
  console.log(`✅ Pass 2 Complete: ${result2.panels.length} sheets, ${efficiency2.toFixed(2)}% efficiency`);
  
  // STRATEGY 3: Best Long Side Fit (BLSF) - Optimizes for similar heights
  console.log('📋 Pass 3: Best Long Side Fit (1000ms)');
  const partsBLSF = parts.map(p => ({ ...p, rotate: true }));
  const result3 = runOptimizer(partsBLSF, sheetWidth, sheetHeight, 1000, 'BLSF');
  const efficiency3 = calculateEfficiency(result3.panels, parts);
  strategies.push({
    name: 'BLSF-1000ms',
    result: result3.panels,
    efficiency: efficiency3,
    sheetsUsed: result3.panels.length
  });
  console.log(`✅ Pass 3 Complete: ${result3.panels.length} sheets, ${efficiency3.toFixed(2)}% efficiency`);
  
  // STRATEGY 4: Bottom Left (BL) - Simple but effective for regular shapes
  console.log('📋 Pass 4: Bottom Left (1000ms)');
  const partsBL = parts.map(p => ({ ...p, rotate: true }));
  const result4 = runOptimizer(partsBL, sheetWidth, sheetHeight, 1000, 'BL');
  const efficiency4 = calculateEfficiency(result4.panels, parts);
  strategies.push({
    name: 'BL-1000ms',
    result: result4.panels,
    efficiency: efficiency4,
    sheetsUsed: result4.panels.length
  });
  console.log(`✅ Pass 4 Complete: ${result4.panels.length} sheets, ${efficiency4.toFixed(2)}% efficiency`);
  
  // STRATEGY 5: Best Area Fit (BAF) - Extended Time for Final Optimization
  console.log('📋 Pass 5: Best Area Fit Extended (2000ms) 🔥');
  const partsBAFExtended = parts.map(p => ({ ...p, rotate: true }));
  const result5 = runOptimizer(partsBAFExtended, sheetWidth, sheetHeight, 2000, 'BAF');
  const efficiency5 = calculateEfficiency(result5.panels, parts);
  strategies.push({
    name: 'BAF-2000ms',
    result: result5.panels,
    efficiency: efficiency5,
    sheetsUsed: result5.panels.length
  });
  console.log(`✅ Pass 5 Complete: ${result5.panels.length} sheets, ${efficiency5.toFixed(2)}% efficiency`);
  
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
  console.log('🏆 STANDARD WINNER:', winner.name);
  console.log(`   Sheets: ${winner.sheetsUsed}, Efficiency: ${winner.efficiency.toFixed(2)}%`);
  console.table(strategies);
  console.groupEnd();
  
  return winner.result;
}
