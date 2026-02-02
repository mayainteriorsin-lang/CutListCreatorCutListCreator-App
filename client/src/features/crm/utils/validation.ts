import type { LeadRecord } from "@/modules/crm/types";

/**
 * Validates email format
 * Empty string returns false as invalid
 */
export function validateEmail(email: string): boolean {
    if (!email) return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email.trim());
}

/**
 * Validates mobile number format
 */
export function validateMobile(mobile: string): boolean {
    if (!mobile) return false; // Mobile is required
    const digits = mobile.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
}

/**
 * Validates lead name
 */
export function validateName(name: string): boolean {
    if (!name) return false;
    const trimmed = name.trim();
    return trimmed.length >= 2 && trimmed.length <= 100;
}

/**
 * Validates location
 */
export function validateLocation(location: string): boolean {
    if (!location) return false;
    return location.trim().length <= 200;
}

/**
 * Validates note content
 */
export function validateNote(note: string): boolean {
    if (!note) return false;
    const trimmed = note.trim();
    return trimmed.length >= 1 && trimmed.length <= 1000;
}

/**
 * Validation result for lead input
 */
interface LeadValidationResult {
    isValid: boolean;
    errors: {
        name?: string;
        mobile?: string;
        email?: string;
        location?: string;
    };
}

/**
 * Comprehensive lead validation with individual parameters
 * Returns validation result with field-specific errors
 */
export function validateLeadInput(
    name: string,
    mobile: string,
    email: string,
    location: string
): LeadValidationResult {
    const errors: LeadValidationResult["errors"] = {};

    if (!validateName(name)) {
        errors.name = "Name must be between 2 and 100 characters";
    }

    if (!validateMobile(mobile)) {
        errors.mobile = "Valid mobile number is required (10-15 digits)";
    }

    // Email is optional, but if provided must be valid
    if (email && !validateEmail(email)) {
        errors.email = "Invalid email format";
    }

    // Location is optional, but if provided must be valid length
    if (location && !validateLocation(location)) {
        errors.location = "Location must be less than 200 characters";
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
    };
}

/**
 * Legacy function for validating partial lead records
 * Returns array of error messages
 */
export function validateLeadRecord(lead: Partial<LeadRecord>): string[] {
    const errors: string[] = [];

    if (!validateName(lead.name || "")) {
        errors.push("Name must be between 2 and 100 characters");
    }

    if (!validateMobile(lead.mobile || "")) {
        errors.push("Valid mobile number is required (10-15 digits)");
    }

    if (lead.email && !validateEmail(lead.email)) {
        errors.push("Invalid email format");
    }

    if (lead.location && !validateLocation(lead.location)) {
        errors.push("Location must be less than 200 characters");
    }

    return errors;
}

/**
 * Validates follow-up date
 */
export function validateFollowUpDate(date: string): boolean {
    if (!date) return false;
    const followUpDate = new Date(date);
    if (isNaN(followUpDate.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return followUpDate >= today;
}
