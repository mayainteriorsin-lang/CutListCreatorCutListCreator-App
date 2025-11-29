/**
 * WOOD GRAIN DIMENSIONAL MAPPING
 * This module contains ONLY wood grain-specific logic
 * Never mix with standard/non-wood grain code
 */

import type { Panel, OptimizerPart } from '../cutlist/core/types';

/**
 * Panel type identification
 */
function identifyPanelType(name: string) {
  const isTop = /(^|\W)top(\W|$)/i.test(name);
  const isBottom = /(^|\W)bottom(\W|$)/i.test(name);
  const isLeft = /(^|\W)left(\W|$)/i.test(name);
  const isRight = /(^|\W)right(\W|$)/i.test(name);
  const isBack = /(^|\W)back(\W|$)/i.test(name);
  const isShutter = /(^|\W)shutter(\W|$)/i.test(name);
  
  return { isTop, isBottom, isLeft, isRight, isBack, isShutter };
}

/**
 * Apply wood grain dimensional mapping
 * CRITICAL: This enforces the wood grain rules
 * - TOP/BOTTOM: Width→Y-axis, Depth→X-axis (swap dimensions)
 * - LEFT/RIGHT: Height→Y-axis, Depth→X-axis (no swap needed)
 * - BACK: Height→X-axis, Width→Y-axis (swap dimensions)
 * - SHUTTER: Width→Y-axis (vertical, like TOP/BOTTOM)
 * 
 * @param nomW - Nominal width
 * @param nomH - Nominal height  
 * @param panelType - Panel type (TOP, BOTTOM, LEFT, RIGHT, BACK, SHUTTER)
 * @returns Mapped dimensions { w, h }
 */
function applyWoodGrainMapping(
  nomW: number,
  nomH: number,
  panelType: { isTop: boolean; isBottom: boolean; isLeft: boolean; isRight: boolean; isBack: boolean; isShutter: boolean }
): { w: number; h: number } {
  const { isTop, isBottom, isLeft, isRight, isBack, isShutter } = panelType;
  
  if (isTop || isBottom || isShutter) {
    // TOP/BOTTOM/SHUTTER: Width→Y-axis, Depth→X-axis
    // Panel is width×depth, we want depth×width
    return {
      w: nomH,  // depth → X-axis
      h: nomW   // width → Y-axis
    };
  } else if (isLeft || isRight) {
    // LEFT/RIGHT: Height→Y-axis, Depth→X-axis
    // Panel is depth×height, already in correct orientation
    return {
      w: nomW,  // depth → X-axis
      h: nomH   // height → Y-axis
    };
  } else if (isBack) {
    // BACK: Height→X-axis, Width→Y-axis
    // Panel is width×height, we want height×width
    return {
      w: nomH,  // height → X-axis
      h: nomW   // width → Y-axis
    };
  }
  
  // Default: no swap
  return { w: nomW, h: nomH };
}

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
  if (/(^|\W)shutter(\W|$)/.test(n)) return 6;   // SHUTTER panels
  return 7;                                       // Other panels last
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
 * Prepare parts with WOOD GRAIN dimensional mapping
 * This function applies wood grain rules to all eligible panels
 * 
 * @param panels - Array of panels from UI
 * @param woodGrainsPreferences - Per-laminate wood grain preferences
 * @returns Array of parts ready for wood grain optimization
 */
export function prepareWoodGrainParts(
  panels: Panel[],
  woodGrainsPreferences: Record<string, boolean> = {}
): OptimizerPart[] {
  const parts: OptimizerPart[] = [];
  
  panels.forEach((p, idx) => {
    // Extract basic properties
    const name = String(p.name ?? p.id ?? `panel-${idx}`);
    const nomW = Number(p.nomW ?? p.width ?? p.w ?? 0);
    const nomH = Number(p.nomH ?? p.height ?? p.h ?? 0);
    const laminateCode = String(p.laminateCode ?? '').trim();
    
    // Extract base laminate code (front laminate only, before the "+")
    const baseLaminateCode = laminateCode.split('+')[0].trim();
    
    // Check if THIS specific laminate has wood grains enabled
    const hasWoodGrainsEnabled = woodGrainsPreferences[baseLaminateCode] === true;
    
    // Identify panel type
    const panelType = identifyPanelType(name);
    
    // Apply wood grain dimensional mapping if laminate has wood grains enabled
    let w = nomW;
    let h = nomH;
    
    if (hasWoodGrainsEnabled) {
      const mapped = applyWoodGrainMapping(nomW, nomH, panelType);
      w = mapped.w;
      h = mapped.h;
    }
    
    // CRITICAL: Mutate original panel with display dimensions and grain flags
    p.displayW = w;
    p.displayH = h;
    p.nomW = nomW;
    p.nomH = nomH;
    p.grainFlag = true; // Always true for wood grain mode
    p.woodGrainsEnabled = hasWoodGrainsEnabled;
    
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
      rotate: !hasWoodGrainsEnabled,  // ✅ CRITICAL FIX: false for wood grains (locked), true for non-wood grains (can flip)
      gaddi: p.gaddi === true,
      laminateCode,
      grainFlag: true,  // Always true for wood grain mode
      woodGrainsEnabled: hasWoodGrainsEnabled,
      originalPanel: p
    };
    
    parts.push(part);
  });
  
  // Sort panels for better organization
  sortParts(parts);
  
  // Debug logging
  console.groupCollapsed('🌾 prepareWoodGrainParts — summary');
  console.log(`Wood Grain Mode: ON`);
  console.table(
    parts.map(pr => ({
      id: pr.id,
      name: pr.name,
      nomW: pr.nomW,
      nomH: pr.nomH,
      w: pr.w,
      h: pr.h,
      woodGrainsEnabled: pr.woodGrainsEnabled,
      rotate: pr.rotate,
      gaddi: pr.gaddi,
      laminate: pr.laminateCode,
    }))
  );
  console.groupEnd();
  
  return parts;
}
