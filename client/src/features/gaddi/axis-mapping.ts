/**
 * ═══════════════════════════════════════════════════════════════════════
 * 🔒 LOCKED CODE - DO NOT MODIFY
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * GADDI Axis Mapping Module
 * 
 * CRITICAL PRODUCTION CODE - Fixed after extensive debugging (Nov 23, 2025)
 * 
 * CORRECT MANUFACTURING RULE (2025-11-23 - FINAL):
 * ================================================
 * For TOP/BOTTOM panels:
 *   - GADDI marks the WIDTH dimension of the cabinet
 *   - Line direction does NOT change even if optimizer rotates panel on sheet
 * 
 * For LEFT/RIGHT panels:
 *   - GADDI marks the HEIGHT dimension of the cabinet
 *   - Line direction does NOT change even if optimizer rotates panel on sheet
 * 
 * This module determines the correct GADDI line direction based on:
 * 1. Panel type only (TOP/BOTTOM → marks WIDTH, LEFT/RIGHT → marks HEIGHT)
 * 2. Panel rotation state is correctly detected using nomW/nomH (NOT displayW/displayH)
 * 3. Manufacturing requirements override optimization orientation
 * 
 * ⚠️ CRITICAL BUG FIXES APPLIED:
 *    - Case sensitivity: toUpperCase() normalization for panel types
 *    - Rotation detection: Uses nomW/nomH from optimizer (NOT displayW/displayH)
 *    - Dual return: Returns both markDimension AND sheetAxis for correct rendering
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
  
  // Check if panel is rotated (90 degrees)
  // If rotated: nomW becomes h, nomH becomes w
  const isRotated = Math.abs(w - nomH) < 0.5 && Math.abs(h - nomW) < 0.5;
  
  // Determine which dimension GADDI marks AND which axis to draw on
  let markDimension: 'width' | 'height';
  let sheetAxis: 'x' | 'y';
  
  if (normalizedType === 'TOP' || normalizedType === 'BOTTOM') {
    // TOP/BOTTOM: GADDI marks WIDTH dimension
    // - Manufacturing rule: GADDI marks the WIDTH dimension of cabinet
    // - Dimension does NOT change even if optimizer rotates panel on sheet
    markDimension = 'width';
    // Sheet axis: if rotated, WIDTH is on Y-axis; otherwise on X-axis
    sheetAxis = isRotated ? 'y' : 'x';
    
  } else if (normalizedType === 'LEFT' || normalizedType === 'RIGHT') {
    // LEFT/RIGHT: GADDI marks HEIGHT dimension
    // - Manufacturing rule: GADDI marks the HEIGHT dimension of cabinet
    // - Dimension does NOT change even if optimizer rotates panel on sheet
    markDimension = 'height';
    // Sheet axis: if rotated, HEIGHT is on X-axis; otherwise on Y-axis
    sheetAxis = isRotated ? 'x' : 'y';
    
  } else {
    // Other panel types (BACK, CENTER_POST, SHELF, SHUTTER)
    // Default to height dimension on Y-axis
    markDimension = 'height';
    sheetAxis = 'y';
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
