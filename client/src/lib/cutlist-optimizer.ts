/**
 * MaxRects Cutlist Optimizer
 * Core bin packing algorithm for optimized cutting layouts
 */

export interface OptPart {
  id: string;
  name: string;
  w: number;
  h: number;
  qty: number;
  rotate?: boolean;
  [key: string]: any;
}

export interface Sheet {
  w: number;
  h: number;
  kerf?: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
  rotated: boolean;
}

export interface PlacedPart extends OptPart, Rect {}

export interface OptSheet {
  parts: PlacedPart[];
  w: number;
  h: number;
  usage: number;
}

export interface OptimizationResult {
  sheets: OptSheet[];
  totalUsage: number;
  efficiency: number;
}

interface CutlistOptions {
  parts: OptPart[];
  sheet: Sheet;
  timeMs?: number;
  strategy?: string;
}

/**
 * MaxRects bin packing algorithm - optimized for cutting layouts
 */
export function optimizeCutlist(options: CutlistOptions): OptimizationResult {
  const { parts, sheet, timeMs = 300, strategy = 'BAF' } = options;
  const sheets: OptSheet[] = [];
  const kerf = (sheet.kerf || 0) / 1000; // Convert to mm factor
  
  // Sort parts by area (largest first) for better packing
  const sortedParts = [...parts].sort((a, b) => {
    const areaA = a.w * a.h * (a.qty || 1);
    const areaB = b.w * b.h * (b.qty || 1);
    return areaB - areaA;
  });

  let remainingParts = sortedParts.flatMap(p => 
    Array(p.qty || 1).fill(p).map((part, idx) => ({
      ...part,
      qty: 1,
      _instanceId: `${p.id}-${idx}`
    }))
  );

  const startTime = Date.now();

  // Pack parts into sheets
  while (remainingParts.length > 0 && (Date.now() - startTime) < timeMs) {
    const sheet1: OptSheet = {
      parts: [],
      w: sheet.w,
      h: sheet.h,
      usage: 0
    };

    // Try to pack parts into current sheet
    for (let i = remainingParts.length - 1; i >= 0; i--) {
      const part = remainingParts[i];
      const placed = packPartMaxRects(sheet1, part, sheet.kerf || 0);
      
      if (placed) {
        sheet1.parts.push(placed);
        remainingParts.splice(i, 1);
      }
    }

    if (sheet1.parts.length === 0) break; // Can't place any more parts

    // Calculate sheet usage
    const usedArea = sheet1.parts.reduce((sum, p) => sum + (p.w * p.h), 0);
    sheet1.usage = (usedArea / (sheet.w * sheet.h)) * 100;

    sheets.push(sheet1);
  }

  // Pack remaining parts if time ran out
  if (remainingParts.length > 0) {
    remainingParts.forEach(part => {
      const newSheet: OptSheet = {
        parts: [{
          ...part,
          x: 0,
          y: 0,
          rotated: false
        }],
        w: sheet.w,
        h: sheet.h,
        usage: ((part.w * part.h) / (sheet.w * sheet.h)) * 100
      };
      sheets.push(newSheet);
    });
  }

  const totalUsedArea = sheets.reduce((sum, s) => 
    sum + s.parts.reduce((ps, p) => ps + (p.w * p.h), 0), 0
  );
  const totalSheetArea = sheets.length * sheet.w * sheet.h;
  const efficiency = totalSheetArea > 0 ? (totalUsedArea / totalSheetArea) * 100 : 0;

  return {
    sheets,
    totalUsage: sheets.length,
    efficiency
  };
}

/**
 * MaxRects packing - finds best position for a part in a sheet
 */
function packPartMaxRects(sheet: OptSheet, part: OptPart, kerf: number): PlacedPart | null {
  const maxRects: Rect[] = [{ x: 0, y: 0, w: sheet.w, h: sheet.h, rotated: false }];
  let bestRect: PlacedPart | null = null;
  let bestFit = Infinity;

  // Try normal orientation
  for (const rect of maxRects) {
    if (part.w <= rect.w && part.h <= rect.h) {
      const fit = Math.abs((rect.w - part.w) * (rect.h - part.h));
      if (fit < bestFit) {
        bestFit = fit;
        bestRect = {
          ...part,
          x: rect.x,
          y: rect.y,
          w: part.w,
          h: part.h,
          rotated: false
        };
      }
    }
  }

  // Try rotated orientation if allowed
  if (part.rotate !== false && part.h <= sheet.w && part.w <= sheet.h) {
    for (const rect of maxRects) {
      if (part.h <= rect.w && part.w <= rect.h) {
        const fit = Math.abs((rect.w - part.h) * (rect.h - part.w));
        if (fit < bestFit) {
          bestFit = fit;
          bestRect = {
            ...part,
            x: rect.x,
            y: rect.y,
            w: part.h,
            h: part.w,
            rotated: true
          };
        }
      }
    }
  }

  if (bestRect) {
    // Update maxRects for remaining space
    updateMaxRects(maxRects, sheet, bestRect);
  }

  return bestRect;
}

/**
 * Update maxRects after placing a part
 */
function updateMaxRects(maxRects: Rect[], sheet: OptSheet, placed: PlacedPart): void {
  const newRects: Rect[] = [];

  for (const rect of maxRects) {
    // Check if rect overlaps with placed part
    if (rect.x < placed.x + placed.w &&
        rect.x + rect.w > placed.x &&
        rect.y < placed.y + placed.h &&
        rect.y + rect.h > placed.y) {

      // Create new rects in free spaces
      if (rect.y < placed.y) {
        newRects.push({
          x: rect.x,
          y: rect.y,
          w: rect.w,
          h: placed.y - rect.y,
          rotated: false
        });
      }

      if (rect.x < placed.x) {
        newRects.push({
          x: rect.x,
          y: placed.y,
          w: placed.x - rect.x,
          h: placed.h,
          rotated: false
        });
      }

      if (rect.x + rect.w > placed.x + placed.w) {
        newRects.push({
          x: placed.x + placed.w,
          y: placed.y,
          w: rect.x + rect.w - (placed.x + placed.w),
          h: placed.h,
          rotated: false
        });
      }

      if (rect.y + rect.h > placed.y + placed.h) {
        newRects.push({
          x: rect.x,
          y: placed.y + placed.h,
          w: rect.w,
          h: rect.y + rect.h - (placed.y + placed.h),
          rotated: false
        });
      }
    } else {
      newRects.push(rect);
    }
  }

  maxRects.splice(0, maxRects.length, ...newRects);
}
