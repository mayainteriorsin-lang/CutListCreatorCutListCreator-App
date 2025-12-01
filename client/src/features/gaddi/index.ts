/**
 * GADDI DOTTED LINE SYSTEM - CLEAR RULES
 * 
 * PLYWOOD SHEET AXES:
 * - X-axis = 1210mm (HORIZONTAL) 
 * - Y-axis = 2420mm (VERTICAL)
 * 
 * GADDI MARKING RULES:
 * 1. LEFT/RIGHT panels → Mark HEIGHT (nomH)
 *    - If nomH is on X-axis (appears as width) → HORIZONTAL dotted line
 *    - If nomH is on Y-axis (appears as height) → VERTICAL dotted line
 * 
 * 2. TOP/BOTTOM panels → Mark WIDTH (nomW)
 *    - If nomW is on X-axis (appears as width) → HORIZONTAL dotted line
 *    - If nomW is on Y-axis (appears as height) → VERTICAL dotted line
 * 
 * 3. Even if panels ROTATE on sheet → same marking rule applies
 *    (dimension to mark never changes, only WHERE it appears changes)
 */

export interface GaddiPanel {
  panelType: string;
  gaddi: boolean;
  nomW: number;  // Original width
  nomH: number;  // Original height
  nomD?: number; // Original depth (for LEFT/RIGHT panels)
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
 * Calculate GADDI dotted line direction
 * 
 * RULES WITH DEPTH:
 * - LEFT/RIGHT: Mark HEIGHT (nomH) only
 *   - Check: if h ≈ nomH? YES→Y-axis(vertical line), else→X-axis(horizontal line)
 * 
 * - TOP/BOTTOM: Mark WIDTH (nomW) only
 *   - Check: if w ≈ nomW? YES→X-axis(horizontal line), else→Y-axis(vertical line)
 */
export function calculateGaddiLineDirection(panel: GaddiPanel): GaddiLineConfig {
  const { panelType, nomW, nomH, nomD, w, h } = panel;
  const type = (panelType || '').toUpperCase();
  
  let markDimension: 'width' | 'height';
  let sheetAxis: 'x' | 'y';
  
  if (type.includes('LEFT') || type.includes('RIGHT')) {
    // ✓ LEFT/RIGHT: Mark HEIGHT (nomH) only
    markDimension = 'height';
    // For LEFT/RIGHT, height is typically on Y-axis
    if (Math.abs(h - nomH) < 0.5) {
      sheetAxis = 'y'; // nomH on Y-axis (height) → VERTICAL line
    } else if (Math.abs(w - nomH) < 0.5) {
      sheetAxis = 'x'; // nomH on X-axis (rotated) → HORIZONTAL line
    } else {
      sheetAxis = 'y'; // Default to Y
    }
    console.log(`🔴 ${type}: nomH=${nomH}, nomD=${nomD}, w=${w}, h=${h} → axis=${sheetAxis}`);
    
  } else if (type.includes('TOP') || type.includes('BOTTOM')) {
    // ✓ TOP/BOTTOM: Mark WIDTH (nomW) only
    markDimension = 'width';
    // For TOP/BOTTOM, width is typically on X-axis
    if (Math.abs(w - nomW) < 0.5) {
      sheetAxis = 'x'; // nomW on X-axis (width) → HORIZONTAL line
    } else if (Math.abs(h - nomW) < 0.5) {
      sheetAxis = 'y'; // nomW on Y-axis (rotated) → VERTICAL line
    } else {
      sheetAxis = 'x'; // Default to X
    }
    console.log(`🔵 ${type}: nomW=${nomW}, w=${w}, h=${h} → axis=${sheetAxis}`);
    
  } else {
    markDimension = 'height';
    sheetAxis = 'y';
  }
  
  return {
    markDimension,
    sheetAxis,
    inset: 2,
    dashPattern: [2, 2],
    lineWidth: 0.5,
    color: 100
  };
}
