# Cabinet with Shutter Module - Analysis & Recommendations

## Current Implementation Overview

### Architecture

The cabinet with shutter system consists of several key components:

1. **Schema Definition** (`shared/schema.ts`)
2. **Shutter Engine** (`client/src/modules/visual-quotation/engine/shutterEngine.ts`)
3. **Dimensional Mapping** (`client/src/features/standard/dimensional-mapping.ts`)
4. **UI Integration** (`client/src/pages/home.tsx`)

---

## 1. Schema Structure

### Shutter Schema (`shared/schema.ts:45-51`)

```typescript
export const shutterSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  laminateCode: z.string().optional(),
  innerLaminateCode: z.string().optional(),
  laminateAutoSynced: z.boolean().optional(),
});
```

### Cabinet Shutter Fields (`shared/schema.ts:75-81`)

```typescript
shuttersEnabled: z.boolean().default(false),
shutterCount: z.number().min(0).default(0),
shutterType: z.string().default('WW001'),
shutterHeightReduction: z.number().min(0).max(20).default(0),
shutterWidthReduction: z.number().min(0).max(5).default(0),
shutters: z.array(shutterSchema).default([]),
```

### Individual Shutter Settings

```typescript
shutterLaminateCode: z.string().optional(),
shutterInnerLaminateCode: z.string().optional(),
shutterGrainDirection: z.boolean().default(false).optional(),
shutterGaddi: z.boolean().default(false).optional(),
shutterPlywoodBrand: z.string().optional(),
```

---

## 2. Shutter Engine

### File: `client/src/modules/visual-quotation/engine/shutterEngine.ts`

#### Interface Definition

```typescript
export interface Shutter {
  id: string;
  unitId: string;
  index: number;
  widthMm: number;
  heightMm: number;
  isLoft: boolean;
  laminateCode?: string;
  swing?: "LEFT" | "RIGHT";
}
```

#### Generation Logic

```typescript
export function generateShutters(params: {
  unitId: string;
  unitWidthMm: number;
  unitHeightMm: number;
  sectionCount: number;
  loftEnabled: boolean;
  loftHeightMm: number;
  customShutterWidthsMm?: number[];
}): Shutter[]
```

**Key Features**:
1. Divides cabinet width by section count to get per-shutter width
2. Supports custom widths per shutter
3. Handles loft shutters separately (full width, at top)
4. Alternates swing direction (LEFT/RIGHT) based on index

**Algorithm**:
```typescript
const perWidth = Math.floor(unitWidthMm / sectionCount);

for (let i = 0; i < sectionCount; i++) {
  const sWidth = customShutterWidthsMm?.[i] ?? perWidth;
  shutters.push({
    id: `${unitId}-SH-${i + 1}`,
    widthMm: sWidth,
    heightMm: mainHeight,
    isLoft: false,
    swing: i % 2 === 0 ? "LEFT" : "RIGHT",
  });
}
```

---

## 3. Dimensional Mapping

### Panel Type Detection (`dimensional-mapping.ts:43-68`)

**Priority Order** (CRITICAL):
1. Center Post
2. Shelf
3. Top/Bottom/Left/Right/Back panels
4. **Shutters** (checked LAST to avoid false positives)

**Shutter Detection**:
```typescript
// Pattern: "Cabinet Name - Shutter 1"
const shutterMatch = name.match(/- shutter\s*(\d+)/i);
if (shutterMatch) {
  return { type: 'SHUTTER', shutterLabel: `SHUTTER ${shutterMatch[1]}` };
}
```

### Panel Counters

```typescript
const panelCounters: Record<string, number> = {
  TOP: 0,
  BOTTOM: 0,
  LEFT: 0,
  RIGHT: 0,
  BACK: 0,
  SHUTTER: 0,  // ← Shutters tracked separately
  CENTER_POST: 0,
  SHELF: 0
};
```

---

## 4. Issues & Gaps Identified

### 🔴 Critical Issues

#### Issue 1: Missing Grain Direction for Shutters
**Location**: `shutterEngine.ts`

**Problem**:
- Shutter interface doesn't include `grainDirection` field
- Schema has `shutterGrainDirection` but engine doesn't use it
- Wood grain setting not propagated to generated shutters

**Impact**:
- Shutters with wood grain patterns may be rotated incorrectly
- Optimization doesn't respect shutter grain constraints

**Example**:
```typescript
// Current: No grain direction
interface Shutter {
  swing?: "LEFT" | "RIGHT";  // Has swing direction
  // ❌ Missing: grainDirection?: boolean;
}

// Schema has it:
shutterGrainDirection: z.boolean().default(false).optional(),

// But engine doesn't use it!
```

---

#### Issue 2: Swing Direction Logic May Conflict with Grain

**Location**: `shutterEngine.ts:51`

**Problem**:
```typescript
swing: i % 2 === 0 ? "LEFT" : "RIGHT",
```

This alternates swing direction automatically, but:
- Doesn't consider wood grain orientation
- May force shutters into orientations that violate grain rules
- No way to manually override swing direction

**Scenario**:
```
Shutter 1: swing=LEFT, grain=VERTICAL → Correct
Shutter 2: swing=RIGHT, grain=VERTICAL → May need rotation
```

If grain is locked, swing direction should be constrained.

---

#### Issue 3: Gaddi Not Propagated to Shutter Engine

**Location**: `shutterEngine.ts`

**Problem**:
- Schema has `shutterGaddi` field
- Shutter interface doesn't include `gaddi` property
- Gaddi marking won't appear on shutter panels

**Missing**:
```typescript
interface Shutter {
  // ❌ Missing:
  gaddi?: boolean;
  laminateCode?: string;  // Has this
  // But not gaddi
}
```

---

#### Issue 4: Width Calculation Uses `Math.floor`

**Location**: `shutterEngine.ts:40`

```typescript
const perWidth = Math.floor(unitWidthMm / sectionCount);
```

**Problem**:
- Truncates decimal values
- Can accumulate significant rounding errors with multiple shutters
- May cause gaps or overlaps in visual representation

**Example**:
```
Cabinet width: 1000mm
Section count: 3
perWidth = Math.floor(1000 / 3) = Math.floor(333.333...) = 333mm
Total shutter width: 333 × 3 = 999mm
Gap: 1mm missing!
```

**Better Approach**:
```typescript
// Distribute remainder across shutters
const baseWidth = Math.floor(unitWidthMm / sectionCount);
const remainder = unitWidthMm % sectionCount;

for (let i = 0; i < sectionCount; i++) {
  const sWidth = baseWidth + (i < remainder ? 1 : 0);
  // Now: 334 + 333 + 333 = 1000mm (perfect!)
}
```

---

#### Issue 5: No Plywood Brand in Shutter Interface

**Location**: `shutterEngine.ts`

**Problem**:
- Schema has `shutterPlywoodBrand`
- Shutter interface doesn't include plywood brand
- Can't track different plywood for shutters vs cabinet panels

---

### ⚠️ Medium Priority Issues

#### Issue 6: Loft Shutter Positioning

**Current**: Loft is always added AFTER main shutters
```typescript
if (loftEnabled) {
  shutters.push({
    index: sectionCount,  // After main shutters
    isLoft: true,
  });
}
```

**Question**: Should loft always be at top, or configurable?
- Some designs may want loft at bottom
- Current implementation assumes top-only

---

#### Issue 7: No Validation for Custom Widths

**Current**:
```typescript
const sWidth = customShutterWidthsMm?.[i] ?? perWidth;
```

**Missing Validation**:
- Total custom widths may exceed cabinet width
- Custom widths may be negative or zero
- Array length may not match section count

**Recommendation**:
```typescript
if (customShutterWidthsMm) {
  // Validate total width
  const totalCustomWidth = customShutterWidthsMm.reduce((sum, w) => sum + w, 0);
  if (totalCustomWidth > unitWidthMm) {
    console.warn(`Custom shutter widths (${totalCustomWidth}mm) exceed cabinet width (${unitWidthMm}mm)`);
  }

  // Validate count
  if (customShutterWidthsMm.length !== sectionCount) {
    console.warn(`Custom widths count (${customShutterWidthsMm.length}) doesn't match sections (${sectionCount})`);
  }
}
```

---

#### Issue 8: Shutter Height Reduction Not Clearly Documented

**Schema**:
```typescript
shutterHeightReduction: z.number().min(0).max(20).default(0),
shutterWidthReduction: z.number().min(0).max(5).default(0),
```

**Questions**:
- Is this reduction applied to EACH shutter or total?
- Is it mm or percentage?
- When is it applied (before or after loft split)?

**Current Implementation**:
```typescript
const mainHeight = loftEnabled ? unitHeightMm - loftHeightMm : unitHeightMm;
// ❌ Doesn't use shutterHeightReduction!
```

The schema has the field but it's **not used** in generation!

---

### 💡 Enhancement Opportunities

#### Enhancement 1: Support for Different Shutter Types

**Current**: Only one shutter type per cabinet
```typescript
shutterType: z.string().default('WW001'),
```

**Enhancement**: Support multiple types in one cabinet
```typescript
shutters: z.array(z.object({
  width: z.number(),
  height: z.number(),
  type: z.string(),  // Different type per shutter
  laminateCode: z.string().optional(),
}))
```

---

#### Enhancement 2: Visual Shutter Spacing

**Missing**: Gap between shutters for realistic rendering
```typescript
interface ShutterGenerationParams {
  gapBetweenShuttersMm?: number;  // Default: 2-3mm
}

// Adjust width calculation:
const totalGapWidth = gapBetweenShuttersMm * (sectionCount - 1);
const availableWidth = unitWidthMm - totalGapWidth;
const perWidth = Math.floor(availableWidth / sectionCount);
```

---

#### Enhancement 3: Shutter Frame/Border

**Missing**: Support for shutter frames
```typescript
interface Shutter {
  frameWidthMm?: number;
  frameLaminateCode?: string;
  // For shutters with decorative borders
}
```

---

## 5. Recommendations

### Priority 1: Fix Critical Issues

#### 1.1 Add Grain Direction to Shutter Interface

**File**: `shutterEngine.ts`

```typescript
export interface Shutter {
  id: string;
  unitId: string;
  index: number;
  widthMm: number;
  heightMm: number;
  isLoft: boolean;
  laminateCode?: string;
  innerLaminateCode?: string;  // Add
  grainDirection?: boolean;     // Add ← CRITICAL
  gaddi?: boolean;              // Add
  plywoodBrand?: string;        // Add
  swing?: "LEFT" | "RIGHT";
}
```

#### 1.2 Update Generation Function

```typescript
export function generateShutters(params: {
  unitId: string;
  unitWidthMm: number;
  unitHeightMm: number;
  sectionCount: number;
  loftEnabled: boolean;
  loftHeightMm: number;
  customShutterWidthsMm?: number[];
  // Add these:
  grainDirection?: boolean;
  gaddi?: boolean;
  laminateCode?: string;
  innerLaminateCode?: string;
  plywoodBrand?: string;
}): Shutter[]
```

#### 1.3 Fix Width Distribution

```typescript
// Instead of Math.floor:
const baseWidth = Math.floor(unitWidthMm / sectionCount);
const remainder = unitWidthMm % sectionCount;

for (let i = 0; i < sectionCount; i++) {
  const sWidth = customShutterWidthsMm?.[i]
    ?? (baseWidth + (i < remainder ? 1 : 0));

  shutters.push({
    id: `${unitId}-SH-${i + 1}`,
    widthMm: sWidth,
    heightMm: mainHeight,
    grainDirection: params.grainDirection ?? false,  // Propagate
    gaddi: params.gaddi ?? false,                    // Propagate
    plywoodBrand: params.plywoodBrand,               // Propagate
    laminateCode: params.laminateCode,               // Propagate
    innerLaminateCode: params.innerLaminateCode,     // Propagate
    swing: i % 2 === 0 ? "LEFT" : "RIGHT",
  });
}
```

---

### Priority 2: Add Validation

#### 2.1 Validate Custom Widths

```typescript
function validateCustomWidths(
  customWidths: number[] | undefined,
  sectionCount: number,
  maxWidth: number
): void {
  if (!customWidths) return;

  if (customWidths.length !== sectionCount) {
    throw new Error(
      `Custom widths count (${customWidths.length}) must match section count (${sectionCount})`
    );
  }

  const total = customWidths.reduce((sum, w) => sum + w, 0);
  if (total > maxWidth) {
    throw new Error(
      `Total custom widths (${total}mm) exceed cabinet width (${maxWidth}mm)`
    );
  }

  if (customWidths.some(w => w <= 0)) {
    throw new Error('All custom widths must be positive numbers');
  }
}
```

#### 2.2 Use Height/Width Reduction

```typescript
// Apply reductions from schema
const mainHeight = loftEnabled
  ? unitHeightMm - loftHeightMm - (params.heightReduction ?? 0)
  : unitHeightMm - (params.heightReduction ?? 0);

const effectiveWidth = unitWidthMm - (params.widthReduction ?? 0);
```

---

### Priority 3: Enhance for Production

#### 3.1 Add Shutter Spacing

```typescript
interface ShutterGenerationParams {
  // ... existing
  shutterGapMm?: number;  // Gap between shutters
}

// In generation:
const totalGaps = (sectionCount - 1) * (params.shutterGapMm ?? 0);
const availableWidth = unitWidthMm - totalGaps;
```

#### 3.2 Support Individual Shutter Grain

```typescript
interface ShutterGenerationParams {
  shutterGrainDirections?: boolean[];  // Per-shutter grain
}

for (let i = 0; i < sectionCount; i++) {
  shutters.push({
    grainDirection: params.shutterGrainDirections?.[i]
      ?? params.grainDirection
      ?? false,
  });
}
```

---

## 6. Testing Recommendations

### Test Case 1: Wood Grain Shutters
```typescript
const shutters = generateShutters({
  unitWidthMm: 1200,
  sectionCount: 3,
  grainDirection: true,  // LOCKED
  // Verify: All shutters have grainDirection: true
  // Verify: Optimization doesn't rotate them
});
```

### Test Case 2: Width Distribution
```typescript
const shutters = generateShutters({
  unitWidthMm: 1000,
  sectionCount: 3,
  // Without custom widths
});
// Expected: widths = [334, 333, 333] (total: 1000mm)
```

### Test Case 3: Custom Widths
```typescript
const shutters = generateShutters({
  unitWidthMm: 1200,
  sectionCount: 4,
  customShutterWidthsMm: [300, 300, 300, 300],
  // Validation should pass
});
```

### Test Case 4: Loft with Grain
```typescript
const shutters = generateShutters({
  loftEnabled: true,
  loftHeightMm: 500,
  grainDirection: true,
  // Verify: Both main and loft shutters respect grain
});
```

---

## 7. Implementation Priority

### Phase 1: Critical Fixes (Immediate)
1. ✅ Add `grainDirection` to Shutter interface
2. ✅ Propagate grain direction in generation
3. ✅ Add `gaddi` and `plywoodBrand` to interface
4. ✅ Fix width distribution (Math.floor issue)

### Phase 2: Validation (This Week)
5. ✅ Add custom width validation
6. ✅ Apply height/width reduction from schema
7. ✅ Validate loft configuration

### Phase 3: Enhancements (Next Sprint)
8. ✅ Add shutter spacing support
9. ✅ Support individual shutter grain directions
10. ✅ Add shutter frame/border support

---

## 8. Code Change Summary

### Files to Modify

1. **`shutterEngine.ts`** (Critical)
   - Update `Shutter` interface
   - Update `generateShutters` params
   - Fix width distribution
   - Add validation

2. **`dimensional-mapping.ts`** (Verify)
   - Ensure shutter grain direction is read
   - Confirm shutter type detection works

3. **`schema.ts`** (Document)
   - Add comments explaining reduction fields
   - Clarify when fields are used

4. **`home.tsx`** (Integration)
   - Pass grain direction to shutter generation
   - Pass gaddi settings
   - Handle validation errors

---

## 9. Conclusion

The cabinet with shutter module has a solid foundation but needs critical fixes:

### Critical Issues
- ❌ Wood grain not propagated to shutters
- ❌ Gaddi not included in shutter interface
- ❌ Width distribution has rounding errors
- ❌ Height/width reduction not applied

### Impact
- **High**: Wood grain shutters may be rotated incorrectly (defeats purpose)
- **Medium**: Width calculations may be off by 1-2mm
- **Low**: Missing optional features (gaddi, plywood brand)

### Recommendation
**Implement Phase 1 fixes immediately** before next production deployment to ensure wood grain shutters are handled correctly in the optimization algorithm.

---

**Next Steps**:
1. Review this analysis with team
2. Prioritize fixes
3. Implement critical changes
4. Add tests for shutter scenarios
5. Update documentation
