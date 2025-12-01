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
 * IMPLEMENTATION OF RULES:
 * - LEFT/RIGHT: Mark nomH (HEIGHT)
 *   - Check: if w ≈ nomH? YES→X-axis(horizontal line), NO→Y-axis(vertical line)
 * 
 * - TOP/BOTTOM: Mark nomW (WIDTH)  
 *   - Check: if w ≈ nomW? YES→X-axis(horizontal line), NO→Y-axis(vertical line)
 */
export function calculateGaddiLineDirection(panel: GaddiPanel): GaddiLineConfig {
  const { panelType, nomW, nomH, w, h } = panel;
  const type = (panelType || '').toUpperCase();
  
  let markDimension: 'width' | 'height';
  let sheetAxis: 'x' | 'y';
  
  if (type.includes('LEFT') || type.includes('RIGHT')) {
    // ✓ LEFT/RIGHT: Mark HEIGHT (nomH)
    markDimension = 'height';
    // Check if nomH is on X-axis (w ≈ nomH?) or Y-axis
    if (Math.abs(w - nomH) < 0.5) {
      sheetAxis = 'x'; // nomH on X-axis → HORIZONTAL line
    } else {
      sheetAxis = 'y'; // nomH on Y-axis → VERTICAL line
    }
    console.log(`🔴 ${type}: nomH=${nomH}, w=${w}, h=${h} → axis=${sheetAxis}`);
    
  } else if (type.includes('TOP') || type.includes('BOTTOM')) {
    // ✓ TOP/BOTTOM: Mark WIDTH (nomW)
    markDimension = 'width';
    // Check if nomW is on X-axis (w ≈ nomW?) or Y-axis
    if (Math.abs(w - nomW) < 0.5) {
      sheetAxis = 'x'; // nomW on X-axis → HORIZONTAL line
    } else {
      sheetAxis = 'y'; // nomW on Y-axis → VERTICAL line
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
