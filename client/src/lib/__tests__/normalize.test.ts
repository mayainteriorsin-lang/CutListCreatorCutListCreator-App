import { describe, it, expect } from 'vitest';
import { normString, normNumber, normBoolean, normArray, normObject, safeJson } from '../normalize';

describe('normalize utilities', () => {
    describe('normString', () => {
        it('should return trimmed string', () => {
            expect(normString('  hello  ')).toBe('hello');
        });
        it('should convert numbers to string', () => {
            expect(normString(123)).toBe('123');
        });
        it('should return empty string for null/undefined', () => {
            expect(normString(null)).toBe('');
            expect(normString(undefined)).toBe('');
        });
    });

    describe('normNumber', () => {
        it('should return number', () => {
            expect(normNumber(123)).toBe(123);
        });
        it('should parse string numbers', () => {
            expect(normNumber('456')).toBe(456);
            expect(normNumber('456.78')).toBe(456.78);
        });
        it('should return 0 for invalid inputs', () => {
            expect(normNumber('abc')).toBe(0);
            expect(normNumber(null)).toBe(0);
            expect(normNumber(undefined)).toBe(0);
            expect(normNumber({})).toBe(0);
        });
    });

    describe('normBoolean', () => {
        it('should handle boolean inputs', () => {
            expect(normBoolean(true)).toBe(true);
            expect(normBoolean(false)).toBe(false);
        });
        it('should handle string "true" (case insensitive)', () => {
            expect(normBoolean('true')).toBe(true);
            expect(normBoolean('TRUE')).toBe(true);
        });
        it('should handle string "1"', () => {
            expect(normBoolean('1')).toBe(true);
        });
        it('should fallback to JS Boolean() behavior for others', () => {
            expect(normBoolean(1)).toBe(true);
            expect(normBoolean(0)).toBe(false);
            expect(normBoolean(null)).toBe(false);
            expect(normBoolean('random')).toBe(false); // 'random' is not 'true' or '1'
        });
    });

    describe('normArray', () => {
        it('should return array if input is array', () => {
            expect(normArray([1, 2])).toEqual([1, 2]);
        });
        it('should return empty array for non-arrays', () => {
            expect(normArray(null)).toEqual([]);
            expect(normArray({})).toEqual([]);
            expect(normArray('string')).toEqual([]);
        });
    });

    describe('normObject', () => {
        it('should return object if input is object (and not null)', () => {
            const obj = { a: 1 };
            expect(normObject(obj)).toBe(obj);
        });
        it('should return empty object for null', () => {
            expect(normObject(null)).toEqual({});
        });
        it('should return empty object for primitives', () => {
            expect(normObject(123)).toEqual({});
            expect(normObject('string')).toEqual({});
        });
    });

    describe('safeJson', () => {
        const createResponse = (text: string) => ({
            text: async () => text
        } as Response);

        it('should parse valid JSON', async () => {
            const res = createResponse('{"a":1}');
            expect(await safeJson(res)).toEqual({ a: 1 });
        });

        it('should return empty object for empty string', async () => {
            const res = createResponse('');
            expect(await safeJson(res)).toEqual({});
        });

        it('should return empty object for broken JSON', async () => {
            const res = createResponse('{ broken: json }');
            expect(await safeJson(res)).toEqual({});
        });

        it('should return empty object if text() throws', async () => {
            const res = {
                text: async () => { throw new Error('network error'); }
            } as unknown as Response;
            expect(await safeJson(res)).toEqual({});
        });
    });
});
