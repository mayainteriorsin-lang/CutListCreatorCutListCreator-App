/**
 * Core types shared between wood grain and standard optimization
 * This module contains NO wood grain or standard-specific logic
 */

/**
 * Panel object as received from the UI
 */
export interface Panel {
  id?: string;
  name?: string;
  width?: number;
  height?: number;
  nomW?: number;
  nomH?: number;
  w?: number;
  h?: number;
  laminateCode?: string;
  gaddi?: boolean;
  grainDirection?: boolean;
  grainFlag?: boolean;
  woodGrainsEnabled?: boolean;
  displayW?: number;
  displayH?: number;
  [key: string]: any; // Allow additional properties
}

/**
 * Part object prepared for optimizer
 */
export interface OptimizerPart {
  id: string;
  name: string;
  nomW: number;      // nominal width
  nomH: number;      // nominal height
  w: number;         // actual width for placement
  h: number;         // actual height for placement
  qty: number;       // quantity (always 1 after expansion)
  rotate: boolean;   // can optimizer rotate this part?
  gaddi: boolean;    // GADDI marking flag
  laminateCode: string;
  grainFlag?: boolean;        // Master wood grains toggle state
  woodGrainsEnabled?: boolean; // Per-laminate wood grain setting
  originalPanel: Panel;       // Reference to original panel
}

/**
 * Optimization result from MaxRects
 */
export interface OptimizationResult {
  panels: Sheet[];
}

/**
 * Sheet with placed parts
 */
export interface Sheet {
  W: number;
  H: number;
  placed: PlacedPart[];
}

/**
 * Placed part on a sheet
 */
export interface PlacedPart {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotated: boolean;
  rotateAllowed: boolean;
  gaddi: boolean;
  grainDirection: boolean;
  laminateCode: string;
  nomW: number;
  nomH: number;
  [key: string]: any;
}

/**
 * Strategy result from optimization pass
 */
export interface StrategyResult {
  name: string;
  result: Sheet[];
  efficiency: number;
  sheetsUsed: number;
}
