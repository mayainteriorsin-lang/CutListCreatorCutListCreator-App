import { describe, it, expect } from 'vitest';
import { calculateEfficiency, getDisplayDimensions } from '../efficiency';
import type { Sheet, OptimizerPart } from '../types';

// ============================================================
// UNIT TESTS: Efficiency Calculator
// Pure math — no DOM, no store, no mocks
// ============================================================

describe('calculateEfficiency', () => {
  it('returns 0 for empty sheets', () => {
    expect(calculateEfficiency([], [])).toBe(0);
  });

  it('returns 0 for null sheets', () => {
    expect(calculateEfficiency(null as any, [])).toBe(0);
  });

  it('calculates 100% when parts fill sheet exactly', () => {
    const sheets: Sheet[] = [{ W: 100, H: 100, placed: [] }];
    const parts: OptimizerPart[] = [
      { id: '1', name: 'A', w: 100, h: 100, nomW: 100, nomH: 100, qty: 1, rotate: true, gaddi: false, laminateCode: '' }
    ];
    expect(calculateEfficiency(sheets, parts)).toBe(100);
  });

  it('calculates 50% when parts fill half the sheet', () => {
    const sheets: Sheet[] = [{ W: 100, H: 100, placed: [] }];
    const parts: OptimizerPart[] = [
      { id: '1', name: 'A', w: 50, h: 100, nomW: 50, nomH: 100, qty: 1, rotate: true, gaddi: false, laminateCode: '' }
    ];
    expect(calculateEfficiency(sheets, parts)).toBe(50);
  });

  it('accounts for quantity in part area', () => {
    const sheets: Sheet[] = [{ W: 100, H: 100, placed: [] }];
    const parts: OptimizerPart[] = [
      { id: '1', name: 'A', w: 50, h: 50, nomW: 50, nomH: 50, qty: 4, rotate: true, gaddi: false, laminateCode: '' }
    ];
    // 4 * 50 * 50 = 10000, sheet = 10000 → 100%
    expect(calculateEfficiency(sheets, parts)).toBe(100);
  });

  it('sums across multiple sheets', () => {
    const sheets: Sheet[] = [
      { W: 100, H: 100, placed: [] },
      { W: 100, H: 100, placed: [] }
    ];
    const parts: OptimizerPart[] = [
      { id: '1', name: 'A', w: 100, h: 100, nomW: 100, nomH: 100, qty: 1, rotate: true, gaddi: false, laminateCode: '' }
    ];
    // 10000 / 20000 = 50%
    expect(calculateEfficiency(sheets, parts)).toBe(50);
  });

  it('returns 0 when total sheet area is 0', () => {
    const sheets: Sheet[] = [{ W: 0, H: 0, placed: [] }];
    const parts: OptimizerPart[] = [
      { id: '1', name: 'A', w: 50, h: 50, nomW: 50, nomH: 50, qty: 1, rotate: true, gaddi: false, laminateCode: '' }
    ];
    expect(calculateEfficiency(sheets, parts)).toBe(0);
  });

  it('handles real-world scenario (1210x2420 sheet)', () => {
    const sheets: Sheet[] = [{ W: 1210, H: 2420, placed: [] }];
    const parts: OptimizerPart[] = [
      { id: '1', name: 'Top', w: 450, h: 564, nomW: 564, nomH: 450, qty: 2, rotate: false, gaddi: false, laminateCode: 'L1' },
      { id: '2', name: 'Left', w: 450, h: 800, nomW: 450, nomH: 800, qty: 2, rotate: false, gaddi: false, laminateCode: 'L1' }
    ];
    const partArea = (450 * 564 * 2) + (450 * 800 * 2);
    const sheetArea = 1210 * 2420;
    const expected = (partArea / sheetArea) * 100;
    expect(calculateEfficiency(sheets, parts)).toBeCloseTo(expected, 5);
  });
});

describe('getDisplayDimensions', () => {
  it('returns 0,0 for null/undefined', () => {
    expect(getDisplayDimensions(null)).toEqual({ displayW: 0, displayH: 0 });
    expect(getDisplayDimensions(undefined)).toEqual({ displayW: 0, displayH: 0 });
  });

  it('returns 0,0 for non-object', () => {
    expect(getDisplayDimensions('string' as any)).toEqual({ displayW: 0, displayH: 0 });
    expect(getDisplayDimensions(42 as any)).toEqual({ displayW: 0, displayH: 0 });
  });

  it('prefers displayW/displayH when present', () => {
    const panel = { displayW: 100, displayH: 200, w: 300, h: 400 };
    expect(getDisplayDimensions(panel)).toEqual({ displayW: 100, displayH: 200 });
  });

  it('falls back to w/h when no display dims', () => {
    const panel = { w: 300, h: 400 };
    expect(getDisplayDimensions(panel)).toEqual({ displayW: 300, displayH: 400 });
  });

  it('falls back to nomW/nomH as last resort', () => {
    const panel = { nomW: 564, nomH: 450 };
    expect(getDisplayDimensions(panel)).toEqual({ displayW: 564, displayH: 450 });
  });

  it('falls back to width/height', () => {
    const panel = { width: 100, height: 200 };
    expect(getDisplayDimensions(panel)).toEqual({ displayW: 100, displayH: 200 });
  });

  it('converts string values to numbers', () => {
    const panel = { w: '100', h: '200' };
    expect(getDisplayDimensions(panel)).toEqual({ displayW: 100, displayH: 200 });
  });
});
