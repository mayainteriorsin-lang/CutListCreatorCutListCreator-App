/**
 * Core types for panel optimization and cutting layout
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
  woodGrainsEnabled?: boolean;
  displayW?: number;
  displayH?: number;
  [key: string]: any; // Allow additional properties
}

/**
 * Part object prepared for optimizer with axis-lock constraints
 */
export interface OptimizerPart {
  id: string;
  name: string;
  nomW: number;      // nominal width (X-axis)
  nomH: number;      // nominal height (Y-axis)
  w: number;         // actual width for placement
  h: number;         // actual height for placement
  qty: number;       // quantity (always 1 after expansion)
  rotate: boolean;   // can optimizer rotate this part?
  gaddi: boolean;    // GADDI marking flag
  laminateCode: string;
  woodGrainsEnabled?: boolean; // Per-laminate wood grain setting
  panelType?: string;         // Panel type (TOP, BOTTOM, LEFT, RIGHT, BACK, SHUTTER)
  shutterLabel?: string;      // Shutter display label (e.g., "SHUTTER 1")
  axisLockReason?: string;    // Axis constraint when grains enabled
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
 * Placed part on a sheet (cutting result)
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
