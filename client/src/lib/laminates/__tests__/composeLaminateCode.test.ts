import { describe, it, expect } from 'vitest';
import { composeLaminateCode } from '../composeLaminateCode';

describe('composeLaminateCode', () => {
    /*
     * Logic from source:
     * 1. Trim inputs.
     * 2. If Front && Inner -> "Front + Inner"
     * 3. Special Case: If Front is "backer" (case-insensitive) -> "Backer + Inner"
     * 4. If Front Only -> "Front"
     * 5. If Inner Only -> "Backer + Inner"
     * 6. Neither -> ""
     */

    it('should return empty string if both empty', () => {
        expect(composeLaminateCode('', '')).toBe('');
        expect(composeLaminateCode('   ', null)).toBe('');
    });

    it('should return front code only when inner is missing', () => {
        expect(composeLaminateCode('SF123', '')).toBe('SF123');
        expect(composeLaminateCode(' SF123 ', null)).toBe('SF123');
    });

    it('should combine front and inner with separator', () => {
        expect(composeLaminateCode('SF123', 'CN456')).toBe('SF123 + CN456');
    });

    it('should default to Backer if front is missing but inner exists', () => {
        expect(composeLaminateCode('', 'CN456')).toBe('Backer + CN456');
        expect(composeLaminateCode(null, 'CN456')).toBe('Backer + CN456');
    });

    it('should handle "Backer" literal in front code correctly', () => {
        // Source: if (/^backer$/i.test(f)) -> return `Backer + ${i}`
        // Just ensures capitalization consistency?
        expect(composeLaminateCode('backer', 'CN456')).toBe('Backer + CN456');
        expect(composeLaminateCode('BACKER', 'CN456')).toBe('Backer + CN456');
    });

    it('should trim inputs', () => {
        expect(composeLaminateCode('  A  ', '  B  ')).toBe('A + B');
    });
});
