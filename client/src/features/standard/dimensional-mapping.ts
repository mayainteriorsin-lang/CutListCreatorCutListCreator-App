/**
 * SIMPLE PANEL AXIS MAPPING
 * 
 * Sheet: X=1210mm (horizontal), Y=2420mm (vertical)
 * 
 * TOP/BOTTOM (with grain):
 *   - Width (564mm) → Y-axis
 *   - Depth (450mm) → X-axis
 * 
 * LEFT/RIGHT (with grain):
 *   - Depth (450mm) → X-axis (horizontal)
 *   - Height (800mm) → Y-axis (vertical)
 * 
 * All panels: rotate = false (no rotation)
 */

import type { Panel, OptimizerPart } from '../cutlist/core/types';

// Panel type counters for unique ID generation
const panelCounters: Record<string, number> = {
  TOP: 0,
  BOTTOM: 0,
  LEFT: 0,
  RIGHT: 0,
  BACK: 0
};

/**
 * Detect panel type from name
 */
function getPanelType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('top')) return 'TOP';
  if (lower.includes('bottom')) return 'BOTTOM';
  if (lower.includes('left')) return 'LEFT';
  if (lower.includes('right')) return 'RIGHT';
  if (lower.includes('back')) return 'BACK';
  return 'PANEL';
}

/**
 * Map panel dimensions to X/Y axes based on panel type and grain
 * Returns { x, y } dimensions where x=horizontal(1210), y=vertical(2420)
 */
function mapAxes(panelType: string, width: number, depth: number, height: number): { x: number; y: number } {
  // TOP/BOTTOM: Width→Y, Depth→X
  if (panelType === 'TOP' || panelType === 'BOTTOM') {
    return { x: depth, y: width };  // Depth on X-axis, Width on Y-axis
  }
  
  // LEFT/RIGHT: Depth→X, Height→Y
  if (panelType === 'LEFT' || panelType === 'RIGHT') {
    return { x: depth, y: height };  // Depth on X-axis, Height on Y-axis
  }
  
  // BACK: treat as width→X, height→Y
  if (panelType === 'BACK') {
    return { x: width, y: height };
  }
  
  // Default fallback
  return { x: width, y: height };
}

/**
 * Prepare panels for optimizer - SIMPLE VERSION
 * 
 * Rules:
 * - Each panel gets unique ID: PANELTYPE_counter_originalId
 * - Dimensions mapped to X/Y axes per panel type
 * - Rotation ALWAYS false
 * - No grain logic - just straight axis mapping
 */
export function prepareStandardParts(panels: Panel[], woodGrainsPreferences: Record<string, boolean> = {}): OptimizerPart[] {
  const parts: OptimizerPart[] = [];
  
  panels.forEach((panel, idx) => {
    const name = String(panel.name ?? panel.id ?? `panel-${idx}`);
    
    // READ ACTUAL INPUT VALUES - NO HARDCODED DEFAULTS
    const width = Number(panel.width ?? panel.nomW ?? panel.w ?? 0);
    const depth = Number(panel.depth ?? 0);
    const height = Number(panel.height ?? panel.nomH ?? panel.h ?? 0);
    
    // Skip if all dimensions are 0 (invalid panel)
    if (width === 0 && depth === 0 && height === 0) {
      console.warn(`⚠️ Panel "${name}" has invalid dimensions (all 0), skipping`);
      return;
    }
    
    // Get panel type
    const panelType = getPanelType(name);
    
    // Generate unique ID
    panelCounters[panelType] = (panelCounters[panelType] ?? 0) + 1;
    const uniqueId = `${panelType}_${panelCounters[panelType]}_${panel.id ?? idx}`;
    
    // Map to X/Y axes
    const { x, y } = mapAxes(panelType, width, depth, height);
    
    // Extract laminate code
    const laminateCode = String(panel.laminateCode ?? '').trim();
    const frontCode = laminateCode.split('+')[0].trim();
    
    // Check if wood grains enabled (for reference, but doesn't affect rotation now)
    const woodGrainsEnabled = woodGrainsPreferences[frontCode] === true;
    
    // Create part for optimizer
    const part: OptimizerPart = {
      id: uniqueId,
      name,
      w: x,  // X-axis (horizontal)
      h: y,  // Y-axis (vertical)
      nomW: x,
      nomH: y,
      qty: 1,
      rotate: false,  // NO ROTATION - ALWAYS FALSE
      gaddi: panel.gaddi === true,
      laminateCode,
      panelType,
      woodGrainsEnabled,
      originalPanel: panel
    };
    
    parts.push(part);
  });
  
  // Log what we prepared
  console.group('📦 PANEL AXIS MAPPING - SIMPLE');
  console.log(`Sheet: X=1210mm (horizontal), Y=2420mm (vertical)`);
  console.log(`Total panels: ${parts.length}`);
  console.table(
    parts.map(p => ({
      id: p.id,
      type: p.panelType,
      'X-axis': `${p.w}mm`,
      'Y-axis': `${p.h}mm`,
      rotate: '🔒 FALSE'
    }))
  );
  console.groupEnd();
  
  return parts;
}
