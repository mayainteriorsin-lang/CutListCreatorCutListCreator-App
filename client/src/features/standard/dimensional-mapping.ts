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
 * Rotation:
 * - Wood grain panels: rotation locked (no rotation)
 * - Non-wood grain panels: rotation allowed
 *
 * LOCKED: Do not change wood grain rotation rules without explicit user request.
 */

import type { Panel, OptimizerPart } from '../cutlist/core/types';
import { logger } from '@/lib/system/logger';

// Panel type counters for unique ID generation
const panelCounters: Record<string, number> = {
  TOP: 0,
  BOTTOM: 0,
  LEFT: 0,
  RIGHT: 0,
  BACK: 0,
  SHUTTER: 0,
  CENTER_POST: 0,
  SHELF: 0
};

/**
 * Detect panel type from name
 * Also extracts shutter number if present (e.g., "Cabinet - Shutter 1" -> "SHUTTER_1")
 * 
 * IMPORTANT: Check specific panel types FIRST (top, bottom, left, right, back, center post, shelf)
 * BEFORE checking for shutter, because cabinet names like "Shutter #1" would otherwise
 * cause all panels to be detected as shutters.
 */
function getPanelType(name: string): { type: string; shutterLabel?: string } {
  const lower = name.toLowerCase();

  // ✅ CHECK SPECIFIC PANEL TYPES FIRST (before shutter check)
  // This prevents "Shutter #1 - Top" from being detected as SHUTTER
  if (lower.includes('center post')) return { type: 'CENTER_POST' };
  if (lower.includes('shelf')) return { type: 'SHELF' };
  if (lower.includes(' - top') || lower.endsWith('-top')) return { type: 'TOP' };
  if (lower.includes(' - bottom') || lower.endsWith('-bottom')) return { type: 'BOTTOM' };
  if (lower.includes(' - left') || lower.endsWith('-left')) return { type: 'LEFT' };
  if (lower.includes(' - right') || lower.endsWith('-right')) return { type: 'RIGHT' };
  if (lower.includes(' - back') || lower.endsWith('-back') || lower.includes('back panel')) return { type: 'BACK' };

  // ✅ NOW check for shutter panels (e.g., "Cabinet - Shutter 1")
  const shutterMatch = name.match(/- shutter\s*(\d+)/i);
  if (shutterMatch) {
    return { type: 'SHUTTER', shutterLabel: `SHUTTER ${shutterMatch[1]}` };
  }

  // Check for standalone shutter without number
  if (lower.includes(' - shutter') || lower.endsWith('-shutter')) {
    return { type: 'SHUTTER', shutterLabel: 'SHUTTER' };
  }

  return { type: 'PANEL' };
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

    // Get panel type info (includes shutter label if applicable)
    const panelTypeInfo = getPanelType(name);
    const panelType = panelTypeInfo.type;
    const shutterLabel = panelTypeInfo.shutterLabel;

    // READ VALUES based on panel type
    // TOP/BOTTOM: nomW=cabinet.width, nomH=cabinet.depth
    // LEFT/RIGHT: nomW=cabinet.depth, nomH=cabinet.height  
    // BACK: nomW=cabinet.width, nomH=cabinet.height
    const nomW = Number(panel.nomW ?? panel.width ?? 0);
    const nomH = Number(panel.nomH ?? panel.height ?? 0);

    // Skip if invalid
    if (nomW === 0 && nomH === 0) {
      return;
    }

    // Generate unique ID - include shutter label for display purposes
    panelCounters[panelType] = (panelCounters[panelType] ?? 0) + 1;
    const uniqueId = `${panelType}_${panelCounters[panelType]}_${panel.id ?? idx}`;

    // Map to X/Y axes based on panel type
    let x = nomW;
    let y = nomH;

    if (panelType === 'TOP' || panelType === 'BOTTOM') {
      // TOP/BOTTOM: nomW=cabinet.width→Y, nomH=cabinet.depth→X
      x = nomH;  // depth to X
      y = nomW;  // width to Y
    } else if (panelType === 'LEFT' || panelType === 'RIGHT') {
      // LEFT/RIGHT: nomW=cabinet.depth→X, nomH=cabinet.height→Y
      x = nomW;  // depth to X
      y = nomH;  // height to Y
    } else if (panelType === 'BACK') {
      // BACK: nomW=cabinet.width→X, nomH=cabinet.height→Y
      x = nomW;  // width to X
      y = nomH;  // height to Y
    }

    // Extract laminate code
    const laminateCode = String(panel.laminateCode ?? '').trim();
    const frontCode = laminateCode.split('+')[0].trim();

    // Lock rotation when wood grain is enabled for this laminate.
    const woodGrainsEnabled =
      panel.grainDirection === true || woodGrainsPreferences[frontCode] === true;

    // Create part for optimizer
    const part: OptimizerPart = {
      id: uniqueId,
      name,
      w: x,  // X-axis (horizontal) - SWAPPED for placement
      h: y,  // Y-axis (vertical) - SWAPPED for placement
      nomW: nomW,  // ORIGINAL width (for gaddi/display) - NOT swapped
      nomH: nomH,  // ORIGINAL height (for gaddi/display) - NOT swapped
      qty: 1,
      rotate: !woodGrainsEnabled,
      gaddi: panel.gaddi === true,
      laminateCode,
      panelType,
      shutterLabel,  // Include shutter label for display
      woodGrainsEnabled,
      originalPanel: panel
    };

    parts.push(part);
  });

  // Log what we prepared
  logger.log('📦 PANEL AXIS MAPPING - SIMPLE');
  logger.log(`Sheet: X=1210mm (horizontal), Y=2420mm (vertical)`);
  logger.log(`Total panels: ${parts.length}`);

  return parts;
}
