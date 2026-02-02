/**
 * RateLine Types
 *
 * Types for the line-based rate card editor.
 * Each line represents one rate type (Shutter, Carcass, Loft, Inner Laminate).
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Rate line types - one row per type in the grid
 */
export type RateLineType = "shutter" | "carcass" | "loft" | "inner_laminate";

/**
 * Single rate line for grid display
 */
export interface RateLine {
  type: RateLineType;
  label: string;
  material: string;
  thickness: string;
  finish: string;
  edge: string;
  rate: number;
  isCalculated: boolean; // true for Loft (auto-calculated)
  isEnabled: boolean;
  photoUrl: string | null;
}

/**
 * Grid state containing all lines
 */
export interface RateLineGridState {
  lines: RateLine[];
  totals: RateLineTotals;
  isDirty: boolean;
}

/**
 * Calculated totals from lines
 */
export interface RateLineTotals {
  shutterRate: number;
  carcassRate: number;
  loftRate: number;
  innerLaminateRate: number;
  combinedRate: number;
}

// ============================================================================
// Update Types
// ============================================================================

/**
 * Partial update for a single line
 */
export interface RateLineUpdate {
  material?: string;
  thickness?: string;
  finish?: string;
  edge?: string;
  rate?: number;
  isEnabled?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Line type labels for display
 */
export const RATE_LINE_LABELS: Record<RateLineType, string> = {
  shutter: "Shutter",
  carcass: "Carcass",
  loft: "Loft",
  inner_laminate: "Inner Laminate",
};

/**
 * Line type order for grid display
 */
export const RATE_LINE_ORDER: RateLineType[] = [
  "shutter",
  "carcass",
  "loft",
  "inner_laminate",
];

/**
 * Lines that are auto-calculated (not directly editable rate)
 */
export const CALCULATED_LINES: RateLineType[] = ["loft"];

/**
 * Default line configuration
 */
export const DEFAULT_RATE_LINES: RateLine[] = [
  {
    type: "shutter",
    label: "Shutter",
    material: "plywood",
    thickness: "18mm",
    finish: "laminate",
    edge: "-",
    rate: 0,
    isCalculated: false,
    isEnabled: true,
    photoUrl: null,
  },
  {
    type: "carcass",
    label: "Carcass",
    material: "plywood",
    thickness: "18mm",
    finish: "-",
    edge: "pvc_2mm",
    rate: 0,
    isCalculated: false,
    isEnabled: true,
    photoUrl: null,
  },
  {
    type: "loft",
    label: "Loft",
    material: "(Combined)",
    thickness: "-",
    finish: "-",
    edge: "-",
    rate: 0,
    isCalculated: true,
    isEnabled: true,
    photoUrl: null,
  },
  {
    type: "inner_laminate",
    label: "Inner Laminate",
    material: "laminate",
    thickness: "-",
    finish: "matte",
    edge: "-",
    rate: 150,
    isCalculated: false,
    isEnabled: false,
    photoUrl: null,
  },
];
