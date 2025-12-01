/**
 * GADDI Dotted Line System - Simple & Clean
 * 
 * Rule:
 * - LEFT/RIGHT panels: Mark HEIGHT (nomH) - dotted line follows HEIGHT wherever it is
 * - TOP/BOTTOM panels: Mark WIDTH (nomW) - dotted line follows WIDTH wherever it is
 * - Even if panel rotates on sheet, dotted line always marks the same dimension
 */

export interface GaddiPanel {
  panelType: string;
  gaddi: boolean;
  nomW: number;  // Original width
  nomH: number;  // Original height
  w: number;     // Sheet placement width
  h: number;     // Sheet placement height
}

export interface GaddiLineConfig {
  markDimension: 'width' | 'height';
  sheetAxis: 'x' | 'y';
  inset: number;
  dashPattern: number[];
  lineWidth: number;
  color: number;
}

/**
 * Should GADDI marking be shown?
 */
export function shouldShowGaddiMarking(panel: GaddiPanel): boolean {
  return panel.gaddi === true && panel.w > 15 && panel.h > 15;
}

/**
 * Calculate which dimension GADDI marks and which axis to draw on
 * 
 * LEFT/RIGHT: Always mark HEIGHT (nomH)
 * TOP/BOTTOM: Always mark WIDTH (nomW)
 * 
 * Then detect which axis that dimension is on in the sheet placement
 */
export function calculateGaddiLineDirection(panel: GaddiPanel): GaddiLineConfig {
  const { panelType, nomW, nomH, w, h } = panel;
  const type = (panelType || '').toUpperCase();
  
  let markDimension: 'width' | 'height';
  let sheetAxis: 'x' | 'y';
  
  if (type.includes('LEFT') || type.includes('RIGHT')) {
    // LEFT/RIGHT: Always mark HEIGHT (nomH)
    markDimension = 'height';
    // Detect which axis nomH is on: if h ≈ nomH, it's on Y-axis; otherwise X-axis
    sheetAxis = Math.abs(h - nomH) < 0.5 ? 'y' : 'x';
    
  } else if (type.includes('TOP') || type.includes('BOTTOM')) {
    // TOP/BOTTOM: Always mark WIDTH (nomW)
    markDimension = 'width';
    // Detect which axis nomW is on: if w ≈ nomW, it's on X-axis; otherwise Y-axis (rotated)
    sheetAxis = Math.abs(w - nomW) < 0.5 ? 'y' : 'x';
    
  } else {
    // Default: mark HEIGHT on Y-axis
    markDimension = 'height';
    sheetAxis = 'y';
  }
  
  return {
    markDimension,
    sheetAxis,
    inset: 2,              // 2mm from edge
    dashPattern: [2, 2],   // 2mm dash, 2mm gap
    lineWidth: 0.5,        // 0.5mm line width
    color: 100             // Gray
  };
}
