/**
 * ═══════════════════════════════════════════════════════════════════════
 * GADDI Axis Mapping Module
 * 
 * MANUFACTURING RULE (Updated Dec 1, 2025):
 * =========================================
 * MARK THE VALUE, NOT THE AXIS
 * 
 * For TOP/BOTTOM panels:
 *   - Mark the WIDTH VALUE (nomW)
 *   - Dotted line follows WIDTH wherever it appears on sheet
 * 
 * For LEFT/RIGHT panels:
 *   - Mark the HEIGHT VALUE (nomH)
 *   - Dotted line follows HEIGHT wherever it appears on sheet
 * 
 * For BACK panels:
 *   - Mark the HEIGHT VALUE (nomH)
 *   - Dotted line follows HEIGHT wherever it appears on sheet
 * 
 * ✅ CLEAN & NEAT: Detect which axis each value is on by comparing
 *    panel placement (w, h) with nominal dimensions (nomW, nomH)
 * 
 * ═══════════════════════════════════════════════════════════════════════
 */

import type { GaddiPanel, GaddiLineConfig } from './types';

/**
 * Calculate GADDI line direction for a panel
 * 
 * @param panel - Panel with GADDI marking
 * @returns Line configuration with direction
 */
export function calculateGaddiLineDirection(panel: GaddiPanel): GaddiLineConfig {
  const { panelType, nomW, nomH, w, h } = panel;
  
  // Normalize panel type to uppercase for consistent comparisons
  const normalizedType = (panelType || '').toUpperCase();
  
  // ✅ MARK THE VALUE, NOT THE AXIS:
  // Find which dimension to mark based on panel type
  // Then find which axis that dimension is on
  
  let markDimension: 'width' | 'height';
  let sheetAxis: 'x' | 'y';
  
  if (normalizedType === 'TOP' || normalizedType === 'BOTTOM') {
    // TOP/BOTTOM: Mark WIDTH VALUE (nomW)
    // Determine which axis nomW is on in the sheet placement
    markDimension = 'width';
    sheetAxis = Math.abs(w - nomW) < 0.5 ? 'x' : 'y';
    
  } else if (normalizedType === 'LEFT' || normalizedType === 'RIGHT') {
    // LEFT/RIGHT: Mark HEIGHT VALUE (nomH)
    // Determine which axis nomH is on in the sheet placement
    markDimension = 'height';
    sheetAxis = Math.abs(h - nomH) < 0.5 ? 'y' : 'x';
    
  } else {
    // Other panel types (BACK, CENTER_POST, SHELF, SHUTTER)
    // Mark HEIGHT VALUE (nomH)
    markDimension = 'height';
    sheetAxis = Math.abs(h - nomH) < 0.5 ? 'y' : 'x';
  }
  
  return {
    markDimension,
    sheetAxis,
    inset: 2,              // 2mm from edge
    dashPattern: [2, 2],   // 2mm dash, 2mm gap
    lineWidth: 0.5,        // 0.5mm line width
    color: 100             // Dark gray (RGB: 100, 100, 100)
  };
}

/**
 * Check if a panel should have GADDI marking
 * 
 * @param panel - Panel to check
 * @param minWidth - Minimum width for GADDI marking (default: 10mm)
 * @param minHeight - Minimum height for GADDI marking (default: 10mm)
 * @returns True if panel should show GADDI marking
 */
export function shouldShowGaddiMarking(
  panel: GaddiPanel,
  minWidth: number = 10,
  minHeight: number = 10
): boolean {
  return panel.gaddi === true && panel.w > minWidth && panel.h > minHeight;
}

/**
 * Validate GADDI rule compliance for a panel
 * 
 * Checks if GADDI marking follows the final manufacturing rule:
 * - TOP/BOTTOM panels: GADDI marks WIDTH dimension - ALWAYS
 * - LEFT/RIGHT panels: GADDI marks HEIGHT dimension - ALWAYS
 * - Panel rotation on sheet does NOT change GADDI line direction
 * 
 * @param panel - Panel to validate
 * @returns Validation result with status and message
 */
export function validateGaddiRule(panel: GaddiPanel): {
  isValid: boolean;
  expectedDirection: 'width' | 'height';
  markedEdge: string;
  message: string;
  details: {
    panelType: string;
    nomW: number;
    nomH: number;
    w: number;
    h: number;
    isRotated: boolean;
  };
} {
  if (!panel.gaddi) {
    return {
      isValid: true,
      expectedDirection: 'width',
      markedEdge: 'N/A',
      message: 'Panel does not have GADDI enabled',
      details: {
        panelType: panel.panelType,
        nomW: panel.nomW,
        nomH: panel.nomH,
        w: panel.w,
        h: panel.h,
        isRotated: false
      }
    };
  }

  const isRotated = Math.abs(panel.w - panel.nomH) < 0.5 && Math.abs(panel.h - panel.nomW) < 0.5;
  
  // Normalize panel type to uppercase for consistent comparisons
  const normalizedType = (panel.panelType || '').toUpperCase();
  
  let expectedDirection: 'width' | 'height';
  let markedEdge: string;
  let edgeValue: number;
  
  if (normalizedType === 'TOP' || normalizedType === 'BOTTOM') {
    // TOP/BOTTOM: marks WIDTH dimension - ALWAYS
    markedEdge = 'WIDTH';
    edgeValue = panel.nomW;
    expectedDirection = 'width';
    
  } else if (normalizedType === 'LEFT' || normalizedType === 'RIGHT') {
    // LEFT/RIGHT: marks HEIGHT dimension - ALWAYS
    markedEdge = 'HEIGHT';
    edgeValue = panel.nomH;
    expectedDirection = 'height';
    
  } else {
    // Other types - default to HEIGHT dimension
    return {
      isValid: true,
      expectedDirection: 'height',
      markedEdge: 'N/A',
      message: `${panel.panelType} panel - no strict GADDI rule`,
      details: {
        panelType: panel.panelType,
        nomW: panel.nomW,
        nomH: panel.nomH,
        w: panel.w,
        h: panel.h,
        isRotated
      }
    };
  }
  
  // Get the actual direction that will be rendered
  const lineConfig = calculateGaddiLineDirection(panel);
  const actualDirection = lineConfig.markDimension;
  const isValid = actualDirection === expectedDirection;
  
  const rotationNote = isRotated ? ' (panel rotated on sheet)' : '';
  
  return {
    isValid,
    expectedDirection,
    markedEdge,
    message: isValid
      ? `✓ GADDI marks ${markedEdge}=${edgeValue}mm${rotationNote}`
      : `✗ GADDI ERROR: Should mark ${markedEdge} edge`,
    details: {
      panelType: panel.panelType,
      nomW: panel.nomW,
      nomH: panel.nomH,
      w: panel.w,
      h: panel.h,
      isRotated
    }
  };
}
