/**
 * Tests for file validation utilities
 */

import { describe, it, expect } from 'vitest';
import {
    validateImageFile,
    isValidImageType,
    sanitizeFileName,
    validateDimension,
    validateShutterCount,
    validateSectionCount,
    validateTextInput,
} from './fileValidation';

describe('validateImageFile', () => {
    it('should accept valid JPEG file', () => {
        const file = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
        Object.defineProperty(file, 'size', { value: 5 * 1024 * 1024 }); // 5MB

        const result = validateImageFile(file);

        expect(result.isValid).toBe(true);
        expect(result.error).toBeUndefined();
    });

    it('should accept valid PNG file', () => {
        const file = new File(['dummy'], 'test.png', { type: 'image/png' });
        Object.defineProperty(file, 'size', { value: 3 * 1024 * 1024 }); // 3MB

        const result = validateImageFile(file);

        expect(result.isValid).toBe(true);
    });

    it('should accept valid WEBP file', () => {
        const file = new File(['dummy'], 'test.webp', { type: 'image/webp' });
        Object.defineProperty(file, 'size', { value: 2 * 1024 * 1024 }); // 2MB

        const result = validateImageFile(file);

        expect(result.isValid).toBe(true);
    });

    it('should reject file with invalid type', () => {
        const file = new File(['dummy'], 'test.exe', { type: 'application/x-msdownload' });
        Object.defineProperty(file, 'size', { value: 1024 });

        const result = validateImageFile(file);

        expect(result.isValid).toBe(false);
        expect(result.error).toContain('Invalid file type');
    });

    it('should reject file that exceeds size limit', () => {
        const file = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
        Object.defineProperty(file, 'size', { value: 15 * 1024 * 1024 }); // 15MB

        const result = validateImageFile(file);

        expect(result.isValid).toBe(false);
        expect(result.error).toContain('File too large');
    });

    it('should reject empty file', () => {
        const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
        Object.defineProperty(file, 'size', { value: 0 });

        const result = validateImageFile(file);

        expect(result.isValid).toBe(false);
        expect(result.error).toContain('empty');
    });
});

describe('isValidImageType', () => {
    it('should return true for valid image types', () => {
        expect(isValidImageType('image/jpeg')).toBe(true);
        expect(isValidImageType('image/jpg')).toBe(true);
        expect(isValidImageType('image/png')).toBe(true);
        expect(isValidImageType('image/webp')).toBe(true);
    });

    it('should return false for invalid types', () => {
        expect(isValidImageType('application/pdf')).toBe(false);
        expect(isValidImageType('video/mp4')).toBe(false);
        expect(isValidImageType('text/plain')).toBe(false);
    });

    it('should be case-insensitive', () => {
        expect(isValidImageType('IMAGE/JPEG')).toBe(true);
        expect(isValidImageType('Image/Png')).toBe(true);
    });
});

describe('sanitizeFileName', () => {
    it('should remove dangerous characters', () => {
        const result = sanitizeFileName('test<script>alert(1)</script>.jpg');
        expect(result).not.toContain('<');
        expect(result).not.toContain('>');
    });

    it('should replace path separators', () => {
        const result = sanitizeFileName('../../../etc/passwd');
        expect(result).not.toContain('/');
        expect(result).toContain('_');
    });

    it('should handle normal filenames', () => {
        const result = sanitizeFileName('my-photo-2024.jpg');
        expect(result).toBe('my-photo-2024.jpg');
    });

    it('should trim and normalize spaces', () => {
        const result = sanitizeFileName('  my   photo  .jpg  ');
        expect(result).toBe('my photo .jpg');
    });
});

describe('validateDimension', () => {
    it('should accept valid dimensions', () => {
        expect(validateDimension(100).isValid).toBe(true);
        expect(validateDimension(1).isValid).toBe(true);
        expect(validateDimension(5000).isValid).toBe(true);
    });

    it('should reject negative dimensions', () => {
        const result = validateDimension(-10);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('at least');
    });

    it('should reject dimensions exceeding max', () => {
        const result = validateDimension(15000);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('cannot exceed');
    });

    it('should reject non-numeric values', () => {
        const result = validateDimension(NaN);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('valid number');
    });

    it('should reject infinite values', () => {
        const result = validateDimension(Infinity);
        expect(result.isValid).toBe(false);
    });
});

describe('validateShutterCount', () => {
    it('should accept valid shutter counts', () => {
        expect(validateShutterCount(1).isValid).toBe(true);
        expect(validateShutterCount(10).isValid).toBe(true);
        expect(validateShutterCount(20).isValid).toBe(true);
    });

    it('should reject counts below minimum', () => {
        const result = validateShutterCount(0);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('between 1 and 20');
    });

    it('should reject counts above maximum', () => {
        const result = validateShutterCount(25);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('between 1 and 20');
    });

    it('should reject non-integer values', () => {
        const result = validateShutterCount(5.5);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('whole number');
    });
});

describe('validateSectionCount', () => {
    it('should accept valid section counts', () => {
        expect(validateSectionCount(1).isValid).toBe(true);
        expect(validateSectionCount(5).isValid).toBe(true);
        expect(validateSectionCount(10).isValid).toBe(true);
    });

    it('should reject counts below minimum', () => {
        const result = validateSectionCount(0);
        expect(result.isValid).toBe(false);
    });

    it('should reject counts above maximum', () => {
        const result = validateSectionCount(15);
        expect(result.isValid).toBe(false);
    });

    it('should reject non-integer values', () => {
        const result = validateSectionCount(3.7);
        expect(result.isValid).toBe(false);
    });
});

describe('validateTextInput', () => {
    it('should accept valid text input', () => {
        const result = validateTextInput('Valid Name', 'Field', 1, 100);
        expect(result.isValid).toBe(true);
    });

    it('should trim whitespace', () => {
        const result = validateTextInput('  Valid  ', 'Field', 1, 100);
        expect(result.isValid).toBe(true);
    });

    it('should reject empty strings', () => {
        const result = validateTextInput('', 'Field', 1, 100);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('at least 1 character');
    });

    it('should reject strings that are too long', () => {
        const longString = 'a'.repeat(150);
        const result = validateTextInput(longString, 'Field', 1, 100);
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('cannot exceed 100 characters');
    });

    it('should reject whitespace-only strings', () => {
        const result = validateTextInput('   ', 'Field', 1, 100);
        expect(result.isValid).toBe(false);
    });

    it('should use custom field name in error messages', () => {
        const result = validateTextInput('', 'Room Name', 1, 100);
        expect(result.error).toContain('Room Name');
    });
});
