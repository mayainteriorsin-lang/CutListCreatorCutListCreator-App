/**
 * ═══════════════════════════════════════════════════════════════════════
 * 🔒 LOCKED CODE - DO NOT MODIFY
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * GADDI Feature Types
 * 
 * CRITICAL PRODUCTION CODE - Fixed after extensive debugging (Nov 23, 2025)
 * 
 * GADDI Panel Marking System:
 * - Marks panels that require GADDI (edge banding groove) processing
 * - Shows visual indicators (label + dotted line) in PDF exports
 * - Dotted line follows specific axis based on panel type
 * 
 * ⚠️ WARNING: This code has been carefully debugged and tested.
 *    Any modifications may break GADDI panel marking in preview and PDF export.
 * 
 * ═══════════════════════════════════════════════════════════════════════
 */

export type PanelType = 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT' | 'BACK' | 'CENTER_POST' | 'SHELF' | 'SHUTTER';

export interface GaddiPanel {
  /** Panel type (TOP, BOTTOM, LEFT, RIGHT, etc.) */
  panelType: PanelType;
  
  /** Whether this panel has GADDI marking enabled */
  gaddi: boolean;
  
  /** Nominal width (before rotation) */
  nomW: number;
  
  /** Nominal height (before rotation) */
  nomH: number;
  
  /** Actual width (after rotation) */
  w: number;
  
  /** Actual height (after rotation) */
  h: number;
}

export interface GaddiLineConfig {
  /** Which cabinet dimension GADDI marks: width or height */
  markDimension: 'width' | 'height';
  
  /** Which physical axis on sheet to draw the line: x or y */
  sheetAxis: 'x' | 'y';
  
  /** Inset distance from panel edge (mm) */
  inset: number;
  
  /** Line dash pattern [dash, gap] */
  dashPattern: [number, number];
  
  /** Line width (mm) */
  lineWidth: number;
  
  /** Line color (RGB gray value 0-255) */
  color: number;
}
