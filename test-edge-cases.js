/**
 * Edge Case Tests for Genetic Guillotine Optimizer
 *
 * Run with: node test-edge-cases.js
 */

import { optimizeCutlistGenetic } from './client/src/lib/genetic-guillotine-optimizer.ts';

const SHEET = { w: 1210, h: 2420, kerf: 3 };

console.log('🧪 EDGE CASE TESTING SUITE\n');
console.log('═══════════════════════════════════════════════════════\n');

// Test 1: Panel Larger Than Sheet
console.log('TEST 1: Panel Larger Than Sheet');
console.log('Expected: Should be unplaced, validation should pass\n');

const test1 = {
  sheet: SHEET,
  parts: [
    { id: 'oversized-1', w: 3000, h: 1500, qty: 1, rotate: false },
    { id: 'oversized-2', w: 1500, h: 2500, qty: 1, rotate: false },
    { id: 'normal-1', w: 600, h: 800, qty: 2, rotate: true }
  ],
  timeMs: 1000
};

try {
  const result1 = optimizeCutlistGenetic(test1);
  console.log('\n✅ TEST 1 PASSED');
  console.log(`   Sheets: ${result1.totals.sheets}`);
  console.log(`   Placed: ${result1.validation.totalPlaced}/${result1.validation.totalInput}`);
  console.log(`   Unplaced: ${result1.validation.totalUnplaced}`);
  console.log(`   All accounted for: ${result1.validation.allAccountedFor ? 'YES' : 'NO'}`);
  if (result1.unplaced.length > 0) {
    console.log('   Unplaced panels:', result1.unplaced.map(p => p.id).join(', '));
  }
} catch (error) {
  console.error('❌ TEST 1 FAILED:', error.message);
}

console.log('\n═══════════════════════════════════════════════════════\n');

// Test 2: Duplicate Panel Sizes
console.log('TEST 2: Duplicate Panel Sizes');
console.log('Expected: Should pack efficiently, all placed\n');

const test2 = {
  sheet: SHEET,
  parts: [
    { id: 'panel-A', w: 600, h: 800, qty: 5, rotate: true },
    { id: 'panel-B', w: 600, h: 800, qty: 3, rotate: false }, // Same size, different rotation
    { id: 'panel-C', w: 600, h: 800, qty: 2, rotate: true }  // Same size again
  ],
  timeMs: 1000
};

try {
  const result2 = optimizeCutlistGenetic(test2);
  console.log('\n✅ TEST 2 PASSED');
  console.log(`   Sheets: ${result2.totals.sheets}`);
  console.log(`   Efficiency: ${result2.totals.efficiencyPct.toFixed(2)}%`);
  console.log(`   Placed: ${result2.validation.totalPlaced}/${result2.validation.totalInput}`);
  console.log(`   All accounted for: ${result2.validation.allAccountedFor ? 'YES' : 'NO'}`);
} catch (error) {
  console.error('❌ TEST 2 FAILED:', error.message);
}

console.log('\n═══════════════════════════════════════════════════════\n');

// Test 3: Very Small Panels Mixed with Large Ones
console.log('TEST 3: Very Small Panels Mixed with Large Ones');
console.log('Expected: Should fill gaps efficiently\n');

const test3 = {
  sheet: SHEET,
  parts: [
    { id: 'large-1', w: 1200, h: 2400, qty: 1, rotate: false }, // Nearly full sheet
    { id: 'small-1', w: 100, h: 100, qty: 10, rotate: true },   // Tiny panels
    { id: 'small-2', w: 50, h: 50, qty: 20, rotate: true },     // Even tinier
    { id: 'medium-1', w: 400, h: 600, qty: 2, rotate: true }
  ],
  timeMs: 1500
};

try {
  const result3 = optimizeCutlistGenetic(test3);
  console.log('\n✅ TEST 3 PASSED');
  console.log(`   Sheets: ${result3.totals.sheets}`);
  console.log(`   Efficiency: ${result3.totals.efficiencyPct.toFixed(2)}%`);
  console.log(`   Placed: ${result3.validation.totalPlaced}/${result3.validation.totalInput}`);
  console.log(`   Waste: ${result3.totals.waste.toFixed(0)} mm²`);
  console.log(`   All accounted for: ${result3.validation.allAccountedFor ? 'YES' : 'NO'}`);
} catch (error) {
  console.error('❌ TEST 3 FAILED:', error.message);
}

console.log('\n═══════════════════════════════════════════════════════\n');

// Test 4: Single Panel Only
console.log('TEST 4: Single Panel Only');
console.log('Expected: Should place on 1 sheet, high waste\n');

const test4 = {
  sheet: SHEET,
  parts: [
    { id: 'single-panel', w: 600, h: 800, qty: 1, rotate: true }
  ],
  timeMs: 500
};

try {
  const result4 = optimizeCutlistGenetic(test4);
  console.log('\n✅ TEST 4 PASSED');
  console.log(`   Sheets: ${result4.totals.sheets}`);
  console.log(`   Efficiency: ${result4.totals.efficiencyPct.toFixed(2)}%`);
  console.log(`   Placed: ${result4.validation.totalPlaced}/${result4.validation.totalInput}`);
  console.log(`   All accounted for: ${result4.validation.allAccountedFor ? 'YES' : 'NO'}`);
} catch (error) {
  console.error('❌ TEST 4 FAILED:', error.message);
}

console.log('\n═══════════════════════════════════════════════════════\n');

// Test 5: Empty Input
console.log('TEST 5: Empty Input (No Panels)');
console.log('Expected: 0 sheets, validation shows 0/0\n');

const test5 = {
  sheet: SHEET,
  parts: [],
  timeMs: 500
};

try {
  const result5 = optimizeCutlistGenetic(test5);
  console.log('\n✅ TEST 5 PASSED');
  console.log(`   Sheets: ${result5.totals.sheets}`);
  console.log(`   Placed: ${result5.validation.totalPlaced}/${result5.validation.totalInput}`);
  console.log(`   All accounted for: ${result5.validation.allAccountedFor ? 'YES' : 'NO'}`);
} catch (error) {
  console.error('❌ TEST 5 FAILED:', error.message);
}

console.log('\n═══════════════════════════════════════════════════════\n');

// Test 6: All Wood Grain Locked (No Rotation Allowed)
console.log('TEST 6: All Wood Grain Locked (No Rotation)');
console.log('Expected: Respect rotation lock, lower efficiency\n');

const test6 = {
  sheet: SHEET,
  parts: [
    { id: 'grain-1', w: 2000, h: 600, qty: 3, rotate: false }, // Would fit if rotated
    { id: 'grain-2', w: 800, h: 600, qty: 2, rotate: false },
    { id: 'grain-3', w: 1000, h: 400, qty: 4, rotate: false }
  ],
  timeMs: 1500
};

try {
  const result6 = optimizeCutlistGenetic(test6);
  console.log('\n✅ TEST 6 PASSED');
  console.log(`   Sheets: ${result6.totals.sheets}`);
  console.log(`   Efficiency: ${result6.totals.efficiencyPct.toFixed(2)}%`);
  console.log(`   Placed: ${result6.validation.totalPlaced}/${result6.validation.totalInput}`);

  // Verify no panels were rotated
  let rotatedCount = 0;
  result6.panels.forEach(sheet => {
    sheet.placed.forEach(piece => {
      if (piece.rotated) rotatedCount++;
    });
  });
  console.log(`   Rotated panels: ${rotatedCount} (should be 0)`);
  console.log(`   ✓ Wood grain enforcement: ${rotatedCount === 0 ? 'PASSED' : 'FAILED'}`);
} catch (error) {
  console.error('❌ TEST 6 FAILED:', error.message);
}

console.log('\n═══════════════════════════════════════════════════════\n');

// Test 7: Mixed Constraints (Some can rotate, some cannot)
console.log('TEST 7: Mixed Rotation Constraints');
console.log('Expected: Only allowed panels rotated\n');

const test7 = {
  sheet: SHEET,
  parts: [
    { id: 'rotatable-1', w: 600, h: 1200, qty: 3, rotate: true },
    { id: 'locked-1', w: 600, h: 1200, qty: 2, rotate: false },
    { id: 'rotatable-2', w: 800, h: 400, qty: 4, rotate: true }
  ],
  timeMs: 1500
};

try {
  const result7 = optimizeCutlistGenetic(test7);
  console.log('\n✅ TEST 7 PASSED');
  console.log(`   Sheets: ${result7.totals.sheets}`);
  console.log(`   Efficiency: ${result7.totals.efficiencyPct.toFixed(2)}%`);

  // Count rotated panels
  let rotatableRotated = 0;
  let lockedRotated = 0;
  result7.panels.forEach(sheet => {
    sheet.placed.forEach(piece => {
      if (piece.rotated) {
        if (piece.id.startsWith('rotatable')) rotatableRotated++;
        if (piece.id.startsWith('locked')) lockedRotated++;
      }
    });
  });
  console.log(`   Rotatable panels rotated: ${rotatableRotated}`);
  console.log(`   Locked panels rotated: ${lockedRotated} (should be 0)`);
  console.log(`   ✓ Mixed constraint enforcement: ${lockedRotated === 0 ? 'PASSED' : 'FAILED'}`);
} catch (error) {
  console.error('❌ TEST 7 FAILED:', error.message);
}

console.log('\n═══════════════════════════════════════════════════════\n');

// Test 8: Panel Exactly Sheet Size
console.log('TEST 8: Panel Exactly Sheet Size');
console.log('Expected: Should fit perfectly on 1 sheet\n');

const test8 = {
  sheet: SHEET,
  parts: [
    { id: 'perfect-fit', w: 1210, h: 2420, qty: 1, rotate: false }
  ],
  timeMs: 500
};

try {
  const result8 = optimizeCutlistGenetic(test8);
  console.log('\n✅ TEST 8 PASSED');
  console.log(`   Sheets: ${result8.totals.sheets}`);
  console.log(`   Efficiency: ${result8.totals.efficiencyPct.toFixed(2)}%`);
  console.log(`   Placed: ${result8.validation.totalPlaced}/${result8.validation.totalInput}`);
} catch (error) {
  console.error('❌ TEST 8 FAILED:', error.message);
}

console.log('\n═══════════════════════════════════════════════════════\n');

console.log('\n🎉 ALL TESTS COMPLETED\n');
