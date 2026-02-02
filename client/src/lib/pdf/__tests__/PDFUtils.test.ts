import { describe, it, expect } from 'vitest';
import { asciiSafe, toFiniteNumber, getTodayDate } from '../PDFUtils';

// ============================================================
// UNIT TESTS: PDF Utilities
// Pure functions for safe PDF text/number handling
// ============================================================

describe('asciiSafe', () => {
  it('returns empty string for null/undefined', () => {
    expect(asciiSafe(null)).toBe('');
    expect(asciiSafe(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(asciiSafe('')).toBe('');
  });

  it('preserves plain ASCII text', () => {
    expect(asciiSafe('Hello World')).toBe('Hello World');
  });

  it('replaces multiplication sign with x', () => {
    expect(asciiSafe('450×564')).toBe('450x564');
  });

  it('strips non-ASCII characters', () => {
    expect(asciiSafe('₹50,000')).toBe('50,000');
  });

  it('strips emoji and unicode', () => {
    const result = asciiSafe('Cabinet 🏠 Design');
    expect(result).toBe('Cabinet  Design');
  });

  it('trims whitespace', () => {
    expect(asciiSafe('  hello  ')).toBe('hello');
  });

  it('handles numbers as strings', () => {
    expect(asciiSafe('1234.56')).toBe('1234.56');
  });

  it('preserves common punctuation', () => {
    expect(asciiSafe('Cabinet - Top (16mm)')).toBe('Cabinet - Top (16mm)');
  });
});

describe('toFiniteNumber', () => {
  it('returns the number for valid numbers', () => {
    expect(toFiniteNumber(42)).toBe(42);
    expect(toFiniteNumber(3.14)).toBe(3.14);
    expect(toFiniteNumber(0)).toBe(0);
  });

  it('parses numeric strings', () => {
    expect(toFiniteNumber('100')).toBe(100);
    expect(toFiniteNumber('3.14')).toBe(3.14);
  });

  it('returns fallback for NaN', () => {
    expect(toFiniteNumber(NaN)).toBe(0);
    expect(toFiniteNumber(NaN, 99)).toBe(99);
  });

  it('returns fallback for Infinity', () => {
    expect(toFiniteNumber(Infinity)).toBe(0);
    expect(toFiniteNumber(-Infinity, 10)).toBe(10);
  });

  it('returns fallback for non-numeric strings', () => {
    expect(toFiniteNumber('abc')).toBe(0);
    expect(toFiniteNumber('abc', 42)).toBe(42);
  });

  it('returns fallback for null/undefined', () => {
    expect(toFiniteNumber(null)).toBe(0);
    expect(toFiniteNumber(undefined)).toBe(0);
  });

  it('handles negative numbers', () => {
    expect(toFiniteNumber(-5)).toBe(-5);
    expect(toFiniteNumber('-10')).toBe(-10);
  });
});

describe('getTodayDate', () => {
  it('returns ISO date format YYYY-MM-DD', () => {
    const result = getTodayDate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns today\'s date', () => {
    const expected = new Date().toISOString().split('T')[0];
    expect(getTodayDate()).toBe(expected);
  });
});
