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
 * Prepare parts with STANDARD dimensional mapping
 * When laminate has wood grains enabled, prevent rotation
 * 
 * @param panels - Array of panels from UI
 * @param woodGrainsPreferences - Map of laminate codes with wood grain status
 * @returns Array of parts ready for standard optimization
 */
export function prepareStandardParts(panels: Panel[], woodGrainsPreferences: Record<string, boolean> = {}): OptimizerPart[] {
  const parts: OptimizerPart[] = [];
  
  // Track panel type counts for unique ID generation
  const typeCounters: Record<string, number> = {};
  
  panels.forEach((p, idx) => {
    // Extract basic properties
    const name = String(p.name ?? p.id ?? `panel-${idx}`);
    const nomW = Number(p.nomW ?? p.width ?? p.w ?? 0);
    const nomH = Number(p.nomH ?? p.height ?? p.h ?? 0);
    const laminateCode = String(p.laminateCode ?? '').trim();
    const frontCode = laminateCode.split('+')[0].trim();
    
    // Check if wood grains are enabled for this laminate
    const woodGrainsEnabled = woodGrainsPreferences[frontCode] === true;
    
    // STANDARD MODE: Use nominal dimensions as-is (no wood grain swapping)
    const w = nomW;
    const h = nomH;
    
    // Mutate original panel with display dimensions
    p.displayW = w;
    p.displayH = h;
    p.nomW = nomW;
    p.nomH = nomH;
    p.woodGrainsEnabled = woodGrainsEnabled;
    
    // 🆔 CREATE UNIQUE PANEL ID based on panel type
    // This ensures each panel (top, bottom, left, right, back) has its own unique identifier
    const nameLower = name.toLowerCase();
    let panelType = 'panel';
    if (/\btop\b/.test(nameLower)) panelType = 'TOP';
    else if (/\bbottom\b/.test(nameLower)) panelType = 'BOTTOM';
    else if (/\bleft\b/.test(nameLower)) panelType = 'LEFT';
    else if (/\bright\b/.test(nameLower)) panelType = 'RIGHT';
    else if (/\bback\b/.test(nameLower)) panelType = 'BACK';
    
    // Increment counter for this panel type
    typeCounters[panelType] = (typeCounters[panelType] ?? 0) + 1;
    
    // Create unique ID: PANELTYPE_counter_originalId
    // Example: TOP_1_panel-123, BOTTOM_2_panel-456, LEFT_1_panel-789
    const uniqueId = `${panelType}_${typeCounters[panelType]}_${p.id ?? `idx${idx}`}`;
    
    // 🆕 NEW PANEL-TYPE-SPECIFIC AXIS-LOCK RULE
    // When wood grains enabled: ALLOW rotation, but FOLLOW axis-specific rule
    // LEFT/RIGHT: height(Y) × depth(X) locked → axis constraint prevents rotation
    // TOP/BOTTOM: width(Y) × depth(X) locked → axis constraint prevents rotation
    // BACK: height(Y) × depth(X) locked → axis constraint prevents rotation
    
    let rotateAllowed = true;  // Default: allow rotation
    let axisLockReason = null;
    
    if (woodGrainsEnabled) {
      // When wood grains enabled: axis is locked, so rotation would break the rule
      // We set rotate=false because the AXIS constraint prevents rotation
      rotateAllowed = false;
      
      if (panelType === 'LEFT' || panelType === 'RIGHT') {
        axisLockReason = 'height(Y)×depth(X)';  // Height-Y, Depth-X locked
      } else if (panelType === 'TOP' || panelType === 'BOTTOM') {
        axisLockReason = 'width(Y)×depth(X)';   // Width-Y, Depth-X locked
      } else if (panelType === 'BACK') {
        axisLockReason = 'height(Y)×depth(X)';  // Height-Y, Depth-X locked
      }
    }
    
    const part: any = {
      id: uniqueId,  // 🆔 UNIQUE ID for each panel type
      name,
      nomW,
      nomH,
      w,
      h,
      qty: 1,
      rotate: rotateAllowed,  // Axis rule determines if rotation possible
      gaddi: p.gaddi === true,
      laminateCode,
      woodGrainsEnabled: woodGrainsEnabled,
      panelType: panelType,  // 📐 Panel type for axis-lock
      axisLockReason: axisLockReason,  // 📐 Specific axis constraint (e.g., "height(Y)×depth(X)")
      originalPanel: p
    };
    
    parts.push(part);
  });
  
  // Sort panels for better organization
  sortParts(parts);
  
  // Debug logging
  console.groupCollapsed('📦 PANEL UNIQUE IDs — AXIS-SPECIFIC RULES');
  console.log(`Total Panels: ${parts.length}`);
  console.log(`Type Counters:`, typeCounters);
  console.log('🆕 NEW RULE: When wood grains enabled, FOLLOW AXIS CONSTRAINT:');
  console.log('   • LEFT/RIGHT: height(Y) × depth(X) locked → effectively 🔒 NO ROTATION');
  console.log('   • TOP/BOTTOM: width(Y) × depth(X) locked → effectively 🔒 NO ROTATION');
  console.log('   • BACK: height(Y) × depth(X) locked → effectively 🔒 NO ROTATION');
  console.table(
    parts.map((pr: any) => ({
      uniqueId: pr.id,
      type: pr.panelType || 'unknown',
      dimensions: `${pr.nomW}×${pr.nomH}mm`,
      rotate: pr.rotate ? '✅ ALLOWED' : '📐 AXIS LOCKED',
      laminate: pr.laminateCode,
      axisLock: pr.axisLockReason || 'none',
      woodGrain: pr.woodGrainsEnabled ? '🌾 YES' : '❌ NO',
    }))
  );
  console.groupEnd();
  
  return parts;
}
