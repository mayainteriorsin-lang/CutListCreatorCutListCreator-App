# Panel Count Validation System

## Overview

The optimization algorithms now include **comprehensive panel count validation** to ensure no panels are lost, duplicated, or misplaced during the optimization process.

## What Gets Validated

### 1. Panel Conservation Law
```
Total Input Panels = Total Placed Panels + Total Unplaced Panels
```

The system verifies that every panel is accounted for:
- ✅ **Placed panels**: Successfully fitted on sheets
- ✅ **Unplaced panels**: Too large or couldn't fit (with detailed reason)
- ❌ **Lost panels**: NEVER allowed (throws error)
- ❌ **Duplicated panels**: NEVER allowed (throws error)

### 2. Validation Points

Both optimization algorithms perform validation:

1. **Genetic Algorithm** ([genetic-guillotine-optimizer.ts](client/src/lib/genetic-guillotine-optimizer.ts))
2. **MaxRects Algorithm** ([cutlist-optimizer.ts](client/src/lib/cutlist-optimizer.ts))

## Validation Output

### Console Logs

Every optimization run now includes a validation summary:

```
📊 PANEL COUNT VALIDATION
Input panels: 25
Placed panels: 25 (100.0%)
Unplaced panels: 0
Total output: 25
✅ All panels accounted for - no panels lost!
```

### Success Case (All Panels Placed)
```typescript
{
  validation: {
    totalInput: 25,
    totalPlaced: 25,
    totalUnplaced: 0,
    panelsLost: 0,
    allAccountedFor: true
  }
}
```

### Partial Success (Some Panels Unplaced)
```typescript
{
  validation: {
    totalInput: 25,
    totalPlaced: 23,
    totalUnplaced: 2,
    panelsLost: 0,
    allAccountedFor: true
  }
}

// Console output:
⚠️ WARNING: 2 panels could not be placed (oversized or constraint issues)

┌─────────┬──────────────┬───────┬────────┬──────────┬───────────┐
│ (index) │      id      │ width │ height │  rotate  │  reason   │
├─────────┼──────────────┼───────┼────────┼──────────┼───────────┤
│    0    │ 'panel-25'   │ 1300  │  800   │ 'locked' │ 'Too large'│
│    1    │ 'panel-26'   │ 2500  │  600   │ 'locked' │ 'Too large'│
└─────────┴──────────────┴───────┴────────┴──────────┴───────────┘
```

### Error Case (Panels Lost - NEVER HAPPENS)
```typescript
❌ CRITICAL ERROR: 3 panels LOST during optimization!
Input parts: ['panel-1 (qty: 5)', 'panel-2 (qty: 3)', ...]
Placed IDs: ['panel-1::0', 'panel-1::1', ...]
Unplaced IDs: []

Error: Panel count mismatch: 3 panels lost
```

**This error stops execution immediately** and prevents corrupted results from being used.

## Validation Rules

### Input Calculation
```typescript
// Sum of all part quantities
const totalInputPanels = parts.reduce((sum, part) => sum + part.qty, 0);

// Example:
parts = [
  { id: 'panel1', w: 600, h: 800, qty: 3 },
  { id: 'panel2', w: 400, h: 600, qty: 2 }
]
// totalInputPanels = 3 + 2 = 5
```

### Output Calculation
```typescript
// Count all placed panels across all sheets
const totalPlacedPanels = bins.reduce((sum, bin) => sum + bin.placed.length, 0);

// Count leftover/unplaced panels
const totalUnplacedPanels = leftover.length;

// Total output must equal input
const totalOutputPanels = totalPlacedPanels + totalUnplacedPanels;
```

### Validation Check
```typescript
const panelsLost = totalInputPanels - totalOutputPanels;

if (panelsLost !== 0) {
  // CRITICAL ERROR: Algorithm bug or data corruption
  throw new Error(`Panel count mismatch: ${panelsLost} panels lost`);
}
```

## Why Panels Might Be Unplaced

Unplaced panels are **normal** in certain situations:

### 1. Oversized Panels (Most Common)
```typescript
// Sheet: 1210mm × 2420mm
// Panel: 1300mm × 800mm with wood grain locked (no rotation)
// Result: Cannot fit → goes to unplaced list

{
  id: 'oversized-panel',
  width: 1300,
  height: 800,
  rotate: 'locked',
  reason: 'Too large'
}
```

### 2. Rotation Constraints
```typescript
// Sheet: 1210mm × 2420mm
// Panel: 2000mm × 600mm with wood grain locked
// Would fit if rotated, but rotation is disabled
// Result: Cannot fit → unplaced

{
  id: 'tall-panel',
  width: 2000,
  height: 600,
  rotate: 'locked',  // Wood grain prevents rotation
  reason: 'Too large'
}
```

### 3. Extreme Inefficiency (Rare)
```typescript
// In very rare cases with complex constraints,
// the algorithm might not find a solution
// This is logged and reported
```

## Integration with Existing Code

### Return Value Structure

The optimization result now includes a `validation` field:

```typescript
interface OptimizationResult {
  panels: Sheet[];
  totals: {
    sheets: number;
    totalArea: number;
    usedArea: number;
    waste: number;
    wastePct: number;
    efficiencyPct: number;
  };
  unplaced: Part[];
  validation?: {
    totalInput: number;
    totalPlaced: number;
    totalUnplaced: number;
    panelsLost: number;
    allAccountedFor: boolean;
  };
}
```

### Backward Compatibility

The `validation` field is **optional** to maintain backward compatibility:

```typescript
// Old code still works (ignores validation)
const result = await runOptimizer(parts, 1210, 2420);
const sheets = result.panels;  // Still works

// New code can check validation
const result = await runOptimizer(parts, 1210, 2420);
if (result.validation?.allAccountedFor) {
  console.log('✅ All panels placed successfully');
} else {
  console.warn(`⚠️ ${result.validation?.totalUnplaced} panels could not be placed`);
}
```

## Console Output Examples

### Example 1: Perfect Optimization
```
🧬 GENETIC ALGORITHM WITH GUILLOTINE CUTS
Population: 80, Time: 2000ms
Wood grain enforcement: 5 locked, 20 rotatable

Split rule MinArea: 3 sheets, 91.23% efficiency (142 generations)
Split rule MaxArea: 3 sheets, 90.87% efficiency (138 generations)
Split rule ShorterAxis: 3 sheets, 89.45% efficiency (145 generations)
Split rule LongerAxis: 3 sheets, 90.12% efficiency (141 generations)

🏆 Winner: MinArea

📊 PANEL COUNT VALIDATION
Input panels: 25
Placed panels: 25 (100.0%)
Unplaced panels: 0
Total output: 25
✅ All panels accounted for - no panels lost!
```

### Example 2: With Unplaced Panels
```
🧬 GENETIC ALGORITHM WITH GUILLOTINE CUTS
Population: 80, Time: 2000ms
Wood grain enforcement: 8 locked, 17 rotatable

Split rule MinArea: 4 sheets, 88.56% efficiency (139 generations)
...
🏆 Winner: MinArea

📊 PANEL COUNT VALIDATION
Input panels: 25
Placed panels: 23 (92.0%)
Unplaced panels: 2
Total output: 25
✅ All panels accounted for - no panels lost!

⚠️ WARNING: 2 panels could not be placed (oversized or constraint issues)

┌─────────┬──────────────────┬───────┬────────┬──────────┬───────────┐
│ (index) │        id        │ width │ height │  rotate  │  reason   │
├─────────┼──────────────────┼───────┼────────┼──────────┼───────────┤
│    0    │ 'back-panel-1'   │ 1300  │  800   │ 'locked' │ 'Too large'│
│    1    │ 'custom-panel-5' │ 2500  │  600   │ 'locked' │ 'Too large'│
└─────────┴──────────────────┴───────┴────────┴──────────┴───────────┘
```

### Example 3: Critical Error (Should Never Happen)
```
🧬 GENETIC ALGORITHM WITH GUILLOTINE CUTS
...

📊 PANEL COUNT VALIDATION
Input panels: 25
Placed panels: 22
Unplaced panels: 0
Total output: 22

❌ CRITICAL ERROR: 3 panels LOST during optimization!
Input parts: [
  'panel-1 (qty: 5)',
  'panel-2 (qty: 3)',
  ...
]
Placed IDs: ['panel-1::0', 'panel-1::1', ...]
Unplaced IDs: []

Error: Panel count mismatch: 3 panels lost

⛔ Optimization stopped - please report this bug
```

## Error Handling

### What Happens When Validation Fails

1. **Console Error**: Detailed error logged to console
2. **Exception Thrown**: `Error` object with descriptive message
3. **Execution Stopped**: Prevents corrupted data from being used
4. **Debug Info**: Lists all input parts, placed IDs, and unplaced IDs

### How to Debug Validation Errors

If you see a validation error:

1. **Check console logs**: Look for the detailed panel lists
2. **Verify input**: Ensure `parts` array has correct `qty` values
3. **Check for duplicates**: Make sure panel IDs are unique
4. **Review algorithm changes**: Check if recent code changes affected panel handling
5. **Report bug**: This should never happen - file a bug report with reproduction steps

## Testing Validation

### Test Case 1: Normal Operation
```typescript
const parts = [
  { id: 'p1', w: 600, h: 800, qty: 3, rotate: true },
  { id: 'p2', w: 400, h: 600, qty: 2, rotate: false }
];

const result = await optimizeCutlistGenetic({
  sheet: { w: 1210, h: 2420, kerf: 3 },
  parts,
  timeMs: 2000
});

// Expected:
// validation.totalInput = 5
// validation.totalPlaced = 5
// validation.totalUnplaced = 0
// validation.allAccountedFor = true
```

### Test Case 2: Oversized Panel
```typescript
const parts = [
  { id: 'p1', w: 600, h: 800, qty: 2, rotate: true },
  { id: 'p2', w: 1500, h: 1000, qty: 1, rotate: false } // Too large
];

const result = await optimizeCutlistGenetic({
  sheet: { w: 1210, h: 2420, kerf: 3 },
  parts,
  timeMs: 2000
});

// Expected:
// validation.totalInput = 3
// validation.totalPlaced = 2
// validation.totalUnplaced = 1
// validation.allAccountedFor = true
// unplaced.length = 1
```

### Test Case 3: Empty Input
```typescript
const parts = [];

const result = await optimizeCutlistGenetic({
  sheet: { w: 1210, h: 2420, kerf: 3 },
  parts,
  timeMs: 2000
});

// Expected:
// validation.totalInput = 0
// validation.totalPlaced = 0
// validation.totalUnplaced = 0
// validation.allAccountedFor = true
```

## Benefits

### 1. Data Integrity
- ✅ Guarantees no panels are lost
- ✅ Detects algorithm bugs immediately
- ✅ Prevents silent failures

### 2. Debugging
- ✅ Clear error messages
- ✅ Detailed panel tracking
- ✅ Easy to identify problems

### 3. User Trust
- ✅ Transparent reporting
- ✅ Clear unplaced panel reasons
- ✅ Confidence in optimization results

### 4. Quality Assurance
- ✅ Automatic validation on every run
- ✅ No manual counting needed
- ✅ Immediate error detection

## Summary

The panel count validation system ensures **100% panel accountability** by:

1. **Counting** all input panels (sum of quantities)
2. **Tracking** all placed panels across all sheets
3. **Recording** all unplaced panels with reasons
4. **Validating** that input = output (placed + unplaced)
5. **Reporting** detailed summary with percentage placed
6. **Erroring** immediately if panels are lost or duplicated

This validation runs **automatically** on every optimization, requires **no configuration**, and provides **immediate feedback** in the console.

**Result**: You can trust that every panel is accounted for, and if anything goes wrong, you'll know immediately.
