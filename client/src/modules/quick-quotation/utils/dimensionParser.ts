/**
 * Dimension Parser Utility
 *
 * Smart parser for height/width inputs that accepts multiple formats:
 * - Feet + Inches: 7'2, 7ft2in, 7 ft 2 in, 7'2"
 * - Inches only: 86", 86in, 86 inches
 * - Plain number: 7.5 (uses current unit mode)
 *
 * Returns value in feet for sqft calculation.
 */

export type DimensionFormat = 'feet_inches' | 'inches' | 'decimal' | 'invalid';

export interface ParsedDimension {
  /** Value in feet (for calculation) */
  value: number;
  /** Original input string */
  input: string;
  /** Detected format */
  format: DimensionFormat;
  /** Display hint (e.g., "= 7ft 2in" or "= 7.17 ft") */
  hint: string;
  /** Whether parsing was successful */
  isValid: boolean;
  /** Feet component (if feet_inches format) */
  feet?: number;
  /** Inches component (if feet_inches format) */
  inches?: number;
}

// Regex patterns for different formats
const FEET_INCHES_PATTERN = /^(\d+(?:\.\d+)?)\s*['′ft]?\s*(\d+(?:\.\d+)?)\s*["″in]?$/i;
const FEET_ONLY_PATTERN = /^(\d+(?:\.\d+)?)\s*['′ft]$/i;
const INCHES_ONLY_PATTERN = /^(\d+(?:\.\d+)?)\s*["″in](?:ches)?$/i;
const DECIMAL_PATTERN = /^(\d+(?:\.\d+)?)$/;

/**
 * Parse dimension input string and convert to feet
 */
export function parseDimension(input: string): ParsedDimension {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      value: 0,
      input: trimmed,
      format: 'invalid',
      hint: '',
      isValid: false,
    };
  }

  // Try feet + inches format: 7'2, 7ft 2in, 7' 2", etc.
  const feetInchesMatch = trimmed.match(FEET_INCHES_PATTERN);
  if (feetInchesMatch) {
    const feet = parseFloat(feetInchesMatch[1]);
    const inches = parseFloat(feetInchesMatch[2]);
    const totalFeet = feet + inches / 12;

    return {
      value: totalFeet,
      input: trimmed,
      format: 'feet_inches',
      hint: `= ${formatFeetInches(feet, inches)}`,
      isValid: true,
      feet,
      inches,
    };
  }

  // Try feet only format: 7', 7ft
  const feetOnlyMatch = trimmed.match(FEET_ONLY_PATTERN);
  if (feetOnlyMatch) {
    const feet = parseFloat(feetOnlyMatch[1]);

    return {
      value: feet,
      input: trimmed,
      format: 'feet_inches',
      hint: `= ${feet} ft`,
      isValid: true,
      feet,
      inches: 0,
    };
  }

  // Try inches only format: 86", 86in
  const inchesMatch = trimmed.match(INCHES_ONLY_PATTERN);
  if (inchesMatch) {
    const inches = parseFloat(inchesMatch[1]);
    const feet = inches / 12;

    return {
      value: feet,
      input: trimmed,
      format: 'inches',
      hint: `= ${feet.toFixed(2)} ft (${formatFeetInches(Math.floor(feet), Math.round((feet % 1) * 12))})`,
      isValid: true,
      inches,
    };
  }

  // Try plain decimal number
  const decimalMatch = trimmed.match(DECIMAL_PATTERN);
  if (decimalMatch) {
    const value = parseFloat(decimalMatch[1]);

    return {
      value,
      input: trimmed,
      format: 'decimal',
      hint: '', // No hint needed for plain numbers
      isValid: true,
    };
  }

  // Invalid format
  return {
    value: 0,
    input: trimmed,
    format: 'invalid',
    hint: 'Invalid format',
    isValid: false,
  };
}

/**
 * Format feet and inches as readable string
 */
export function formatFeetInches(feet: number, inches: number): string {
  if (inches === 0) {
    return `${feet} ft`;
  }
  return `${feet}′${inches}″`;
}

/**
 * Convert feet to display string with feet and inches
 */
export function feetToFeetInches(totalFeet: number): string {
  const feet = Math.floor(totalFeet);
  const inches = Math.round((totalFeet - feet) * 12);

  // Handle case where rounding gives 12 inches
  if (inches === 12) {
    return `${feet + 1}′0″`;
  }

  return formatFeetInches(feet, inches);
}

/**
 * Format dimension value for display in input
 * Shows just the number (not the format hint)
 */
export function formatDimensionValue(value: number | undefined): string {
  if (value === undefined || value === 0) return '';

  // If it's a clean number (no decimals), show as is
  if (Number.isInteger(value)) {
    return value.toString();
  }

  // Otherwise show with 2 decimal places, trimming trailing zeros
  return parseFloat(value.toFixed(2)).toString();
}

/**
 * Get input placeholder based on examples
 */
export function getDimensionPlaceholder(): string {
  return "7'2 or 86\"";
}

/**
 * Validate and normalize a dimension input
 * Returns the numeric value in feet, or undefined if invalid
 */
export function validateDimension(input: string): number | undefined {
  const parsed = parseDimension(input);
  return parsed.isValid ? parsed.value : undefined;
}
