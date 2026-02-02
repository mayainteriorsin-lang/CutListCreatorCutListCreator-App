import { sanitizeInput } from "@/lib/sanitize";

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

/**
 * Validates an image file for security and size constraints
 */
export function validateImageFile(file: File): ValidationResult {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    // Check file type
    if (!validTypes.includes(file.type.toLowerCase())) {
        return {
            isValid: false,
            error: 'Invalid file type. Please use JPEG, PNG, or WebP images.',
        };
    }

    // Check file size
    if (file.size > maxSize) {
        return {
            isValid: false,
            error: `File too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(0)}MB.`,
        };
    }

    // Check if file size is reasonable (not empty)
    if (file.size === 0) {
        return {
            isValid: false,
            error: 'File appears to be empty.',
        };
    }

    return { isValid: true };
}

/**
 * Checks if a MIME type is a valid image type
 */
export function isValidImageType(mimeType: string): boolean {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    return validTypes.includes(mimeType.toLowerCase());
}

/**
 * Sanitizes a filename by removing potentially dangerous characters
 */
export function sanitizeFileName(fileName: string): string {
    // Remove path separators and special characters
    const sanitized = sanitizeInput(fileName);

    // Replace multiple spaces with single space
    const cleaned = sanitized.replace(/\s+/g, ' ').trim();

    // Remove or replace problematic characters
    return cleaned.replace(/[<>:"|?*\/\\]/g, '_');
}

/**
 * Validates dimension values (width, height, etc.)
 */
export function validateDimension(value: number, min = 1, max = 10000): ValidationResult {
    if (isNaN(value) || !isFinite(value)) {
        return { isValid: false, error: 'Dimension must be a valid number.' };
    }

    if (value < min) {
        return { isValid: false, error: `Dimension must be at least ${min}.` };
    }

    if (value > max) {
        return { isValid: false, error: `Dimension cannot exceed ${max}.` };
    }

    return { isValid: true };
}

/**
 * Validates shutter count
 */
export function validateShutterCount(count: number): ValidationResult {
    const min = 1;
    const max = 20;

    if (!Number.isInteger(count)) {
        return { isValid: false, error: 'Shutter count must be a whole number.' };
    }

    if (count < min || count > max) {
        return {
            isValid: false,
            error: `Shutter count must be between ${min} and ${max}.`,
        };
    }

    return { isValid: true };
}

/**
 * Validates section count
 */
export function validateSectionCount(count: number): ValidationResult {
    const min = 1;
    const max = 10;

    if (!Number.isInteger(count)) {
        return { isValid: false, error: 'Section count must be a whole number.' };
    }

    if (count < min || count > max) {
        return {
            isValid: false,
            error: `Section count must be between ${min} and ${max}.`,
        };
    }

    return { isValid: true };
}

/**
 * Validates a text input (room name, floor name, etc.)
 */
export function validateTextInput(
    value: string,
    fieldName: string,
    minLength = 1,
    maxLength = 100
): ValidationResult {
    const trimmed = value.trim();

    if (trimmed.length < minLength) {
        return {
            isValid: false,
            error: `${fieldName} must be at least ${minLength} character${minLength > 1 ? 's' : ''}.`,
        };
    }

    if (trimmed.length > maxLength) {
        return {
            isValid: false,
            error: `${fieldName} cannot exceed ${maxLength} characters.`,
        };
    }

    return { isValid: true };
}
