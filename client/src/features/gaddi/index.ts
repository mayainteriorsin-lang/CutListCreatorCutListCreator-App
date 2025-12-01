/**
 * GADDI DOTTED LINE SYSTEM
 * 
 * MARKING RULE:
 * - TOP/BOTTOM panels → Mark nomW only
 * - LEFT/RIGHT panels → Mark nomW and nomH (both values)
 */

export interface GaddiPanel {
  panelType: string;
  gaddi: boolean;
  nomW: number;
  nomH: number;
  w: number;
  h: number;
}

export interface GaddiLineConfig {
  markDimension: 'width' | 'height';
  sheetAxis: 'x' | 'y';
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
  
  let markDimension: 'width' | 'height';
  let sheetAxis: 'x' | 'y';
  
  if (type.includes('LEFT') || type.includes('RIGHT')) {
    // LEFT/RIGHT: Use nomH values only
    markDimension = 'height';
    sheetAxis = 'y';
    console.log(`🔴 ${type}: nomH=${nomH}`);
    
  } else if (type.includes('TOP') || type.includes('BOTTOM')) {
    // TOP/BOTTOM: Use nomW values only
    markDimension = 'width';
    sheetAxis = 'x';
    console.log(`🔵 ${type}: nomW=${nomW}`);
    
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
