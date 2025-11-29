/**
 * WOOD GRAIN OPTIMIZER
 * This module contains ONLY wood grain-specific optimization strategies
 * Never mix with standard/non-wood grain code
 */

import { runOptimizer } from '../cutlist/core/optimizer-bridge';
import { calculateEfficiency } from '../cutlist/core/efficiency';
import type { OptimizerPart, Sheet, StrategyResult } from '../cutlist/core/types';

/**
 * Wood Grain Multi-Pass Optimization
 * Tries 3 different strategies optimized for wood grain materials
 * 
 * WOOD GRAIN RULES:
 * - Wood grain materials (woodGrainsEnabled=true) NEVER rotate
 * - Non-wood grain materials can rotate freely for better packing
 * - Dimensional mappings are already applied by prepareWoodGrainParts
 * 
 * @param parts - Parts with wood grain dimensional mapping already applied
 * @param sheetWidth - Sheet width (default 1210mm)
 * @param sheetHeight - Sheet height (default 2420mm)
 * @returns Best optimization result
 */
export function optimizeWoodGrainCutlist(
  parts: OptimizerPart[],
  sheetWidth: number = 1210,
  sheetHeight: number = 2420
): Sheet[] {
  console.group('🌾 WOOD GRAIN MULTI-PASS OPTIMIZATION - 3 strategies');
  
  const strategies: StrategyResult[] = [];
  
  // STRATEGY 1: No Rotation (Strict Orientation)
  // All panels maintain their dimensional mapping without rotation
  console.log('📋 Pass 1: No Rotation (Strict Wood Grain Orientation)');
  const partsNoRotation = parts.map(p => ({ ...p, rotate: false }));
  const result1 = runOptimizer(partsNoRotation, sheetWidth, sheetHeight, 300, 'BAF');
  const efficiency1 = calculateEfficiency(result1.panels, parts);
  strategies.push({
    name: 'No Rotation',
    result: result1.panels,
    efficiency: efficiency1,
    sheetsUsed: result1.panels.length
  });
  console.log(`✅ Pass 1 Complete: ${result1.panels.length} sheets, ${efficiency1.toFixed(2)}% efficiency`);
  
  // STRATEGY 2: Selective Rotation (Wood Grains Locked, Non-Wood Grains Rotate)
  // CRITICAL: Wood grain materials MUST NOT rotate to preserve dimensional mappings
  console.log('📋 Pass 2: Selective Rotation (Respecting Wood Grains)');
  const partsWithRotation = parts.map(p => {
    const isWoodGrainMaterial = p.woodGrainsEnabled === true;
    
    // ✅ WOOD GRAIN ENFORCEMENT:
    // - Wood grain materials: rotate = false (locked orientation - CANNOT rotate)
    // - Non-wood grain materials: rotate = true (can flip - CAN rotate for better packing)
    const shouldAllowRotation = !isWoodGrainMaterial;
    
    return { ...p, rotate: shouldAllowRotation };
  });
  const result2 = runOptimizer(partsWithRotation, sheetWidth, sheetHeight, 300, 'BAF');
  const efficiency2 = calculateEfficiency(result2.panels, parts);
  strategies.push({
    name: 'Selective Rotation',
    result: result2.panels,
    efficiency: efficiency2,
    sheetsUsed: result2.panels.length
  });
  console.log(`✅ Pass 2 Complete: ${result2.panels.length} sheets, ${efficiency2.toFixed(2)}% efficiency`);
  
  // STRATEGY 3: Aggressive Packing for Non-Wood Grains
  // Non-wood grain materials get dimension swapping + rotation for maximum packing
  // Wood grain materials maintain strict orientation (no rotation, no swapping)
  console.log('📋 Pass 3: Aggressive Packing for Non-Wood Grains 🔥');
  const partsAggressive = parts.map(p => {
    const isWoodGrainMaterial = p.woodGrainsEnabled === true;
    
    if (!isWoodGrainMaterial) {
      // NON-WOOD GRAINS: Swap dimensions + allow rotation
      // This gives optimizer alternate starting point for better packing
      return { 
        ...p, 
        w: p.h,  // Swap!
        h: p.w,  // Swap!
        rotate: true
      };
    } else {
      // WOOD GRAINS: NO rotation, NO swapping
      // Dimensional mappings MUST be preserved
      return { ...p, rotate: false };
    }
  });
  
  const result3 = runOptimizer(partsAggressive, sheetWidth, sheetHeight, 1000, 'BAF'); // 3x time budget
  const efficiency3 = calculateEfficiency(result3.panels, parts);
  strategies.push({
    name: 'Aggressive (Non-Wood Grains)',
    result: result3.panels,
    efficiency: efficiency3,
    sheetsUsed: result3.panels.length
  });
  console.log(`✅ Pass 3 Complete: ${result3.panels.length} sheets, ${efficiency3.toFixed(2)}% efficiency`);
  
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
  console.log('🏆 WOOD GRAIN WINNER:', winner.name);
  console.log(`   Sheets: ${winner.sheetsUsed}, Efficiency: ${winner.efficiency.toFixed(2)}%`);
  console.table(strategies);
  console.groupEnd();
  
  return winner.result;
}
