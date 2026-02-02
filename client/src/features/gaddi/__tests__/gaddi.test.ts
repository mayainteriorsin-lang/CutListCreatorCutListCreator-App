import { describe, it, expect } from 'vitest';
import {
  calculateGaddiLineDirection,
  shouldShowGaddiMarking,
  validateGaddiRule
} from '../index';

// ============================================================
// UNIT TESTS: GADDI Mark Functions
// Tests cavity/groove marking rules for panels
// Pure logic — no PDF rendering
// ============================================================

describe('calculateGaddiLineDirection', () => {
  it('returns null when gaddi disabled', () => {
    expect(calculateGaddiLineDirection(false, 'TOP', 100, 50)).toBeNull();
  });

  it('returns null for non-valid panel types', () => {
    expect(calculateGaddiLineDirection(true, 'PANEL', 100, 50)).toBeNull();
    expect(calculateGaddiLineDirection(true, 'CENTER_POST', 100, 50)).toBeNull();
    expect(calculateGaddiLineDirection(true, 'SHELF', 100, 50)).toBeNull();
  });

  it('returns horizontal for TOP panel when w >= h', () => {
    expect(calculateGaddiLineDirection(true, 'TOP', 100, 50)).toBe('horizontal');
  });

  it('returns vertical for TOP panel when w < h', () => {
    expect(calculateGaddiLineDirection(true, 'TOP', 50, 100)).toBe('vertical');
  });

  it('returns horizontal for BOTTOM panel when w >= h', () => {
    expect(calculateGaddiLineDirection(true, 'BOTTOM', 200, 100)).toBe('horizontal');
  });

  it('returns direction for LEFT/RIGHT panels', () => {
    expect(calculateGaddiLineDirection(true, 'LEFT', 100, 50)).toBe('horizontal');
    expect(calculateGaddiLineDirection(true, 'RIGHT', 50, 100)).toBe('vertical');
  });

  it('returns direction for SHUTTER panels', () => {
    expect(calculateGaddiLineDirection(true, 'SHUTTER', 100, 200)).toBe('vertical');
    expect(calculateGaddiLineDirection(true, 'SHUTTER', 200, 100)).toBe('horizontal');
  });

  it('handles equal w and h (horizontal)', () => {
    expect(calculateGaddiLineDirection(true, 'TOP', 100, 100)).toBe('horizontal');
  });

  it('is case-insensitive for panel types', () => {
    expect(calculateGaddiLineDirection(true, 'top', 100, 50)).toBe('horizontal');
    expect(calculateGaddiLineDirection(true, 'left', 50, 100)).toBe('vertical');
    expect(calculateGaddiLineDirection(true, 'Shutter', 100, 50)).toBe('horizontal');
  });
});

describe('shouldShowGaddiMarking', () => {
  it('returns true when gaddi=true', () => {
    expect(shouldShowGaddiMarking({ gaddi: true })).toBe(true);
  });

  it('returns false when gaddi=false', () => {
    expect(shouldShowGaddiMarking({ gaddi: false })).toBe(false);
  });

  it('returns false when gaddi=undefined', () => {
    expect(shouldShowGaddiMarking({})).toBe(false);
  });

  it('returns false for null/undefined panel', () => {
    expect(shouldShowGaddiMarking(null)).toBe(false);
    expect(shouldShowGaddiMarking(undefined)).toBe(false);
  });
});

describe('validateGaddiRule', () => {
  it('returns true when gaddi not enabled', () => {
    expect(validateGaddiRule({ gaddi: false })).toBe(true);
    expect(validateGaddiRule({})).toBe(true);
  });

  it('returns true for valid gaddi panel (>= 100x100)', () => {
    expect(validateGaddiRule({ gaddi: true, width: 200, height: 300 })).toBe(true);
    expect(validateGaddiRule({ gaddi: true, width: 100, height: 100 })).toBe(true);
  });

  it('returns false for gaddi panel too small', () => {
    expect(validateGaddiRule({ gaddi: true, width: 50, height: 50 })).toBe(false);
    expect(validateGaddiRule({ gaddi: true, width: 99, height: 200 })).toBe(false);
    expect(validateGaddiRule({ gaddi: true, width: 200, height: 99 })).toBe(false);
  });

  it('returns false for gaddi panel with zero dimensions', () => {
    expect(validateGaddiRule({ gaddi: true, width: 0, height: 0 })).toBe(false);
  });

  it('returns false for gaddi panel with missing dimensions', () => {
    expect(validateGaddiRule({ gaddi: true })).toBe(false);
    expect(validateGaddiRule({ gaddi: true, width: 200 })).toBe(false);
  });
});
