/**
 * Quick Quotation Module - Calculation Engine
 *
 * Pure functions for all quotation calculations.
 * No side effects, easy to test.
 */

import type {
  QuotationRow,
  CalculatedTotals,
  PaymentStages,
  DiscountType,
  GstRate,
} from '../types';

import { PAYMENT_STAGE_PERCENTAGES } from '../constants';

// ============================================
// Item Row Calculations
// ============================================

/**
 * Calculate sqft, amount, and total for a single item row.
 * Returns updated values that should be merged into the row.
 */
export function calculateItemRow(row: QuotationRow): {
  sqft: number;
  amount: number;
  total: number;
} {
  if (row.type !== 'item') {
    return { sqft: 0, amount: 0, total: 0 };
  }

  const height = row.height || 0;
  const width = row.width || 0;
  const rate = row.rate || 0;
  const qty = row.qty || 1;
  const directAmount = row.amount || 0;

  let sqft = 0;
  let amount = 0;
  let total = 0;

  // Calculate based on dimensions if provided
  if (height > 0 && width > 0) {
    sqft = height * width;
    amount = sqft * rate;
    total = amount * qty;
  } else if (directAmount > 0) {
    // Direct amount input (no dimensions)
    amount = directAmount;
    total = amount * qty;
  } else if (rate > 0) {
    // Rate only (treated as flat amount)
    amount = rate;
    total = amount * qty;
  }

  return {
    sqft: sqft ? parseFloat(sqft.toFixed(2)) : 0,
    amount: amount ? Math.round(amount) : 0,
    total: total ? Math.round(total) : 0,
  };
}

/**
 * Recalculate all item rows and update their computed values.
 */
export function recalculateAllItems(items: QuotationRow[]): QuotationRow[] {
  return items.map(row => {
    if (row.type !== 'item') return row;

    const calculated = calculateItemRow(row);
    return {
      ...row,
      sqft: calculated.sqft,
      amount: calculated.amount,
      total: calculated.total,
    };
  });
}

// ============================================
// Section Totals (Floor/Room hierarchy)
// ============================================

/**
 * Calculate totals for each floor section.
 * A floor's total is the sum of all items under it until the next floor.
 */
export function calculateFloorTotals(items: QuotationRow[]): QuotationRow[] {
  const result = [...items];
  let currentFloorIndex = -1;
  let currentFloorTotal = 0;

  for (let i = 0; i < result.length; i++) {
    const row = result[i];
    if (!row) continue;

    if (row.type === 'floor') {
      // Update previous floor's total if exists
      if (currentFloorIndex >= 0 && result[currentFloorIndex]) {
        result[currentFloorIndex] = {
          ...result[currentFloorIndex]!,
          total: currentFloorTotal,
        };
      }
      // Start new floor
      currentFloorIndex = i;
      currentFloorTotal = 0;
    } else if (row.type === 'item') {
      currentFloorTotal += row.total || 0;
    }
  }

  // Update last floor
  if (currentFloorIndex >= 0 && result[currentFloorIndex]) {
    result[currentFloorIndex] = {
      ...result[currentFloorIndex]!,
      total: currentFloorTotal,
    };
  }

  return result;
}

/**
 * Calculate totals for each room section.
 * A room's total is the sum of all items under it until the next room or floor.
 */
export function calculateRoomTotals(items: QuotationRow[]): QuotationRow[] {
  const result = [...items];
  let currentRoomIndex = -1;
  let currentRoomTotal = 0;

  for (let i = 0; i < result.length; i++) {
    const row = result[i];
    if (!row) continue;

    if (row.type === 'floor') {
      // Floor resets room tracking
      if (currentRoomIndex >= 0 && result[currentRoomIndex]) {
        result[currentRoomIndex] = {
          ...result[currentRoomIndex]!,
          total: currentRoomTotal,
        };
      }
      currentRoomIndex = -1;
      currentRoomTotal = 0;
    } else if (row.type === 'room') {
      // Update previous room's total if exists
      if (currentRoomIndex >= 0 && result[currentRoomIndex]) {
        result[currentRoomIndex] = {
          ...result[currentRoomIndex]!,
          total: currentRoomTotal,
        };
      }
      // Start new room
      currentRoomIndex = i;
      currentRoomTotal = 0;
    } else if (row.type === 'item') {
      currentRoomTotal += row.total || 0;
    }
  }

  // Update last room
  if (currentRoomIndex >= 0 && result[currentRoomIndex]) {
    result[currentRoomIndex] = {
      ...result[currentRoomIndex]!,
      total: currentRoomTotal,
    };
  }

  return result;
}

/**
 * Calculate total of all items in a section (main or additional).
 */
export function calculateSectionTotal(items: QuotationRow[]): number {
  return items.reduce((sum, row) => {
    if (row.type === 'item') {
      return sum + (row.total || 0);
    }
    return sum;
  }, 0);
}

// ============================================
// Full Recalculation Pipeline
// ============================================

/**
 * Full recalculation of items with floor and room totals.
 */
export function recalculateSection(items: QuotationRow[]): QuotationRow[] {
  let result = recalculateAllItems(items);
  result = calculateFloorTotals(result);
  result = calculateRoomTotals(result);
  return result;
}

// ============================================
// Grand Total Calculations
// ============================================

/**
 * Calculate discount amount based on type and value.
 */
export function calculateDiscount(
  subtotal: number,
  discountType: DiscountType,
  discountValue: number
): number {
  if (discountValue <= 0) return 0;

  if (discountType === 'percent') {
    return (subtotal * discountValue) / 100;
  }

  return discountValue;
}

/**
 * Calculate GST amount.
 */
export function calculateGst(
  afterDiscount: number,
  gstEnabled: boolean,
  gstRate: GstRate
): number {
  if (!gstEnabled || gstRate <= 0) return 0;
  return (afterDiscount * gstRate) / 100;
}

/**
 * Calculate payment stage amounts based on grand total.
 */
export function calculatePaymentStages(grandTotal: number): PaymentStages {
  return {
    booking: Math.round(grandTotal * (PAYMENT_STAGE_PERCENTAGES.booking / 100)),
    production: Math.round(grandTotal * (PAYMENT_STAGE_PERCENTAGES.production / 100)),
    factory: Math.round(grandTotal * (PAYMENT_STAGE_PERCENTAGES.factory / 100)),
    handover: Math.round(grandTotal * (PAYMENT_STAGE_PERCENTAGES.handover / 100)),
  };
}

/**
 * Calculate all totals for the quotation.
 */
export function calculateAllTotals(
  mainItems: QuotationRow[],
  additionalItems: QuotationRow[],
  discountType: DiscountType,
  discountValue: number,
  gstEnabled: boolean,
  gstRate: GstRate,
  paidAmount: number
): CalculatedTotals {
  const mainTotal = calculateSectionTotal(mainItems);
  const additionalTotal = calculateSectionTotal(additionalItems);
  const subtotal = mainTotal + additionalTotal;

  const discountAmount = calculateDiscount(subtotal, discountType, discountValue);
  const afterDiscount = subtotal - discountAmount;

  const gstAmount = calculateGst(afterDiscount, gstEnabled, gstRate);
  const grandTotal = Math.round(afterDiscount + gstAmount);

  const balanceAmount = Math.max(0, grandTotal - paidAmount);
  const paymentStages = calculatePaymentStages(grandTotal);

  return {
    mainTotal,
    additionalTotal,
    subtotal,
    discountAmount: Math.round(discountAmount),
    afterDiscount: Math.round(afterDiscount),
    gstAmount: Math.round(gstAmount),
    grandTotal,
    balanceAmount,
    paymentStages,
  };
}

// ============================================
// Validation
// ============================================

/**
 * Find incomplete item rows (missing required fields).
 */
export function findIncompleteItems(items: QuotationRow[]): {
  index: number;
  row: QuotationRow;
  issues: string[];
}[] {
  const incomplete: { index: number; row: QuotationRow; issues: string[] }[] = [];

  items.forEach((row, index) => {
    if (row.type !== 'item') return;

    const issues: string[] = [];

    if (!row.name || row.name.trim() === '') {
      issues.push('Missing description');
    }

    // Check if row has valid pricing
    const hasAmount = row.amount && row.amount > 0;
    const hasRateWithDimensions =
      row.rate && row.rate > 0 && row.height && row.height > 0 && row.width && row.width > 0;

    if (!hasAmount && !hasRateWithDimensions && (!row.rate || row.rate <= 0)) {
      issues.push('Missing rate or amount');
    }

    if (issues.length > 0) {
      incomplete.push({ index, row, issues });
    }
  });

  return incomplete;
}

/**
 * Check if quotation is valid for saving/export.
 */
export function validateQuotation(
  clientName: string,
  mainItems: QuotationRow[],
  additionalItems: QuotationRow[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!clientName || clientName.trim() === '') {
    errors.push('Client name is required');
  }

  const mainIncomplete = findIncompleteItems(mainItems);
  const additionalIncomplete = findIncompleteItems(additionalItems);

  if (mainIncomplete.length > 0) {
    errors.push(`${mainIncomplete.length} incomplete item(s) in Main Work`);
  }

  if (additionalIncomplete.length > 0) {
    errors.push(`${additionalIncomplete.length} incomplete item(s) in Additional Work`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
