/**
 * GADDI DOTTED LINE SYSTEM
 * 
 * DIMENSION MAPPING (Example: Height=300→nomH, Width=200→nomW, Depth=100→nomD):
 * - TOP/BOTTOM panels → Mark nomW only (200)
 * - LEFT/RIGHT panels → Mark nomH only (300)
 */

export interface GaddiPanel {
  panelType: string;
  gaddi: boolean;
  nomW: number;  // Width (e.g., 200)
  nomH: number;  // Height (e.g., 300)
  w: number;     // Sheet position width
  h: number;     // Sheet position height
}

export interface GaddiLineConfig {
  markValue: number;
  lineDirection: string;
  inset: number;
  dashPattern: number[];
  lineWidth: number;
  color: number;
}

export function shouldShowGaddiMarking(panel: GaddiPanel): boolean {
  return panel.gaddi === true && panel.w > 15 && panel.h > 15;
}

export function calculateGaddiLineDirection(panel: GaddiPanel): GaddiLineConfig {
  const { panelType, nomW, nomH } = panel;
  const type = (panelType || '').toUpperCase();
  
  let markValue: number;
  let lineDirection: string;
  
  if (type.includes('LEFT') || type.includes('RIGHT')) {
    // LEFT/RIGHT: Mark nomH only (300)
    markValue = nomH;
    lineDirection = 'y';
    console.log(`🔴 ${type}: Mark nomH=${nomH}`);
    
  } else if (type.includes('TOP') || type.includes('BOTTOM')) {
    // TOP/BOTTOM: Mark nomW only (200)
    markValue = nomW;
    lineDirection = 'x';
    console.log(`🔵 ${type}: Mark nomW=${nomW}`);
    
  } else {
    markValue = nomH;
    lineDirection = 'y';
  }
  
  return {
    markValue,
    lineDirection,
    inset: 2,
    dashPattern: [2, 2],
    lineWidth: 0.5,
    color: 100
  };
}
