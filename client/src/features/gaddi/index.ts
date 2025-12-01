/**
 * GADDI DOTTED LINE SYSTEM - SIMPLE RULE
 * 
 * GADDI MARKING:
 * - LEFT/RIGHT panels → ALWAYS mark HEIGHT (nomH)
 * - TOP/BOTTOM panels → ALWAYS mark WIDTH (nomW)
 * 
 * NO axis detection, NO rotation logic - just mark the dimension!
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
 * SIMPLE RULE - NO AXIS DETECTION:
 * - LEFT/RIGHT: ALWAYS mark HEIGHT (nomH) → VERTICAL dotted line (Y-axis)
 * - TOP/BOTTOM: ALWAYS mark WIDTH (nomW) → HORIZONTAL dotted line (X-axis)
 */
export function calculateGaddiLineDirection(panel: GaddiPanel): GaddiLineConfig {
  const { panelType, nomW, nomH } = panel;
  const type = (panelType || '').toUpperCase();
  
  let markDimension: 'width' | 'height';
  let sheetAxis: 'x' | 'y';
  
  if (type.includes('LEFT') || type.includes('RIGHT')) {
    // LEFT/RIGHT: ALWAYS mark HEIGHT (nomH) on Y-axis (VERTICAL line)
    markDimension = 'height';
    sheetAxis = 'y';
    console.log(`🔴 ${type}: Mark HEIGHT(${nomH}) → VERTICAL`);
    
  } else if (type.includes('TOP') || type.includes('BOTTOM')) {
    // TOP/BOTTOM: ALWAYS mark WIDTH (nomW) on X-axis (HORIZONTAL line)
    markDimension = 'width';
    sheetAxis = 'x';
    console.log(`🔵 ${type}: Mark WIDTH(${nomW}) → HORIZONTAL`);
    
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
