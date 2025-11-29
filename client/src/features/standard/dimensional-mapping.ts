/**
 * STANDARD DIMENSIONAL MAPPING
 * This module contains ONLY non-wood grain (standard) logic
 * Never mix with wood grain code
 */

import type { Panel, OptimizerPart } from '../cutlist/core/types';

/**
 * Get panel type order for sorting
 */
function getPanelTypeOrder(name: string): number {
  const n = name.toLowerCase();
  if (/(^|\W)back(\W|$)/.test(n)) return 1;      // BACK panels first (usually smaller)
  if (/(^|\W)left(\W|$)/.test(n)) return 2;      // LEFT panels
  if (/(^|\W)right(\W|$)/.test(n)) return 3;     // RIGHT panels
  if (/(^|\W)top(\W|$)/.test(n)) return 4;       // TOP panels
  if (/(^|\W)bottom(\W|$)/.test(n)) return 5;    // BOTTOM panels
  return 6;                                       // Other panels last
}

/**
 * Sort parts for cleaner, more organized layouts
 */
function sortParts(parts: OptimizerPart[]): void {
  parts.sort((a, b) => {
    // First sort by panel type (grouping similar panels)
    const typeOrderA = getPanelTypeOrder(a.name);
    const typeOrderB = getPanelTypeOrder(b.name);
    if (typeOrderA !== typeOrderB) return typeOrderA - typeOrderB;
    
    // Within same type, sort by area (larger first for better packing)
    const areaA = a.w * a.h;
    const areaB = b.w * b.h;
    return areaB - areaA;
  });
}

/**
 * Prepare parts with STANDARD (non-wood grain) dimensional mapping
 * NO wood grain logic - panels use their nominal dimensions as-is
 * All rotation is allowed for optimal packing
 * 
 * @param panels - Array of panels from UI
 * @returns Array of parts ready for standard optimization
 */
export function prepareStandardParts(panels: Panel[]): OptimizerPart[] {
  const parts: OptimizerPart[] = [];
  
  panels.forEach((p, idx) => {
    // Extract basic properties
    const name = String(p.name ?? p.id ?? `panel-${idx}`);
    const nomW = Number(p.nomW ?? p.width ?? p.w ?? 0);
    const nomH = Number(p.nomH ?? p.height ?? p.h ?? 0);
    const laminateCode = String(p.laminateCode ?? '').trim();
    
    // STANDARD MODE: Use nominal dimensions as-is (no wood grain swapping)
    const w = nomW;
    const h = nomH;
    
    // Mutate original panel with display dimensions
    p.displayW = w;
    p.displayH = h;
    p.nomW = nomW;
    p.nomH = nomH;
    p.grainFlag = false; // Always false for standard mode
    p.woodGrainsEnabled = false; // No wood grains in standard mode
    
    // Create optimizer part
    const safeId = String(p.id ?? name ?? `part-${idx}`);
    const part: OptimizerPart = {
      id: safeId,
      name,
      nomW,
      nomH,
      w,
      h,
      qty: 1,
      rotate: true,  // All panels can rotate in standard mode
      gaddi: p.gaddi === true,
      laminateCode,
      grainFlag: false,  // Always false for standard mode
      woodGrainsEnabled: false,  // No wood grains in standard mode
      originalPanel: p
    };
    
    parts.push(part);
  });
  
  // Sort panels for better organization
  sortParts(parts);
  
  // Debug logging
  console.groupCollapsed('📦 prepareStandardParts — summary');
  console.log(`Standard Mode: ON (No Wood Grains)`);
  console.table(
    parts.map(pr => ({
      id: pr.id,
      name: pr.name,
      nomW: pr.nomW,
      nomH: pr.nomH,
      w: pr.w,
      h: pr.h,
      rotate: pr.rotate,
      gaddi: pr.gaddi,
      laminate: pr.laminateCode,
    }))
  );
  console.groupEnd();
  
  return parts;
}
