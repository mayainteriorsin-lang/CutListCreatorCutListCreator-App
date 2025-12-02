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
 * When wood grain = FALSE → rotate = TRUE → MAXIMUM optimization
 * When wood grain = TRUE → rotate = FALSE → Standard optimization
 */
export function optimizeStandardCutlist(
  parts: OptimizerPart[],
  sheetWidth: number = 1210,
  sheetHeight: number = 2420
): Sheet[] {
  const rotatableCount = parts.filter(p => p.rotate === true).length;
  const allCanRotate = rotatableCount === parts.length;
  
  console.group(`📦 OPTIMIZATION - ${allCanRotate ? '🚀 MAXIMUM (all rotate)' : '🔒 STANDARD (some locked)'}`);
  console.log(`Panels: ${parts.length} total, ${rotatableCount} can rotate`);
  
  const strategies: StrategyResult[] = [];
  
  if (allCanRotate) {
    // MAXIMUM OPTIMIZATION - All panels can rotate (wood grain = false)
    console.log('🚀 MAXIMUM MODE: Extended time + all strategies');
    
    const result1 = runOptimizer(parts, sheetWidth, sheetHeight, 1500, 'BAF');
    strategies.push({ name: 'BAF', result: result1.panels, efficiency: calculateEfficiency(result1.panels, parts), sheetsUsed: result1.panels.length });
    
    const result2 = runOptimizer(parts, sheetWidth, sheetHeight, 1500, 'BSSF');
    strategies.push({ name: 'BSSF', result: result2.panels, efficiency: calculateEfficiency(result2.panels, parts), sheetsUsed: result2.panels.length });
    
    const result3 = runOptimizer(parts, sheetWidth, sheetHeight, 1500, 'BLSF');
    strategies.push({ name: 'BLSF', result: result3.panels, efficiency: calculateEfficiency(result3.panels, parts), sheetsUsed: result3.panels.length });
    
    const result4 = runOptimizer(parts, sheetWidth, sheetHeight, 1500, 'BL');
    strategies.push({ name: 'BL', result: result4.panels, efficiency: calculateEfficiency(result4.panels, parts), sheetsUsed: result4.panels.length });
    
    // Extra pass with maximum time
    const result5 = runOptimizer(parts, sheetWidth, sheetHeight, 3000, 'BAF');
    strategies.push({ name: 'BAF-MAX', result: result5.panels, efficiency: calculateEfficiency(result5.panels, parts), sheetsUsed: result5.panels.length });
    
    const result6 = runOptimizer(parts, sheetWidth, sheetHeight, 3000, 'BSSF');
    strategies.push({ name: 'BSSF-MAX', result: result6.panels, efficiency: calculateEfficiency(result6.panels, parts), sheetsUsed: result6.panels.length });
  } else {
    // STANDARD OPTIMIZATION - Some panels locked
    console.log('🔒 STANDARD MODE: Mixed rotation');
    
    const result1 = runOptimizer(parts, sheetWidth, sheetHeight, 1000, 'BAF');
    strategies.push({ name: 'BAF', result: result1.panels, efficiency: calculateEfficiency(result1.panels, parts), sheetsUsed: result1.panels.length });
    
    const result2 = runOptimizer(parts, sheetWidth, sheetHeight, 1000, 'BSSF');
    strategies.push({ name: 'BSSF', result: result2.panels, efficiency: calculateEfficiency(result2.panels, parts), sheetsUsed: result2.panels.length });
    
    const result3 = runOptimizer(parts, sheetWidth, sheetHeight, 1000, 'BLSF');
    strategies.push({ name: 'BLSF', result: result3.panels, efficiency: calculateEfficiency(result3.panels, parts), sheetsUsed: result3.panels.length });
    
    const result4 = runOptimizer(parts, sheetWidth, sheetHeight, 1000, 'BL');
    strategies.push({ name: 'BL', result: result4.panels, efficiency: calculateEfficiency(result4.panels, parts), sheetsUsed: result4.panels.length });
    
    const result5 = runOptimizer(parts, sheetWidth, sheetHeight, 2000, 'BAF');
    strategies.push({ name: 'BAF-EXT', result: result5.panels, efficiency: calculateEfficiency(result5.panels, parts), sheetsUsed: result5.panels.length });
  }
  
  strategies.forEach(s => console.log(`  ${s.name}: ${s.sheetsUsed} sheets, ${s.efficiency.toFixed(1)}%`));
  
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
