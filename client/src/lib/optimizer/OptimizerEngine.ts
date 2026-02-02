import { preparePartsForOptimizer } from "./preparePartsForOptimizer";
import { multiPassOptimize } from "./multiPassOptimize";
import { computeDisplayDims } from "./computeDisplayDims";
import { optimizeCutlistGenetic } from "../genetic-guillotine-optimizer";
// PATCH 48: Performance monitoring
import { perfStart, perfEnd } from "@/lib/perf";
// PATCH 49: Production-safe logger
import { logger } from "@/lib/system/logger";
import type {
  OptimizerEngineParams,
  OptimizerEngineResult,
  BrandResult,
} from "@shared/schema";

// PATCH 31: Optimizer Result Cache
// Prevents re-running optimizer when inputs are identical
const optimizerCache = new Map<string, OptimizerEngineResult>();

// Stable JSON stringify that sorts keys for consistent hashing
const stableStringify = (obj: unknown): string => {
  if (obj === null || obj === undefined) return String(obj);
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  return '{' + keys.map(k => `"${k}":${stableStringify((obj as Record<string, unknown>)[k])}`).join(',') + '}';
};

// Build a cache key from optimizer params (only the parts that affect output)
const buildOptimizerCacheKey = (params: OptimizerEngineParams): string => {
  const {
    cabinets,
    manualPanels,
    sheetWidth,
    sheetHeight,
    kerf,
  } = params;

  // Only include fields that affect optimizer output
  const keyData = {
    cabinets: cabinets?.map(c => ({
      id: c.id,
      height: c.height,
      width: c.width,
      depth: c.depth,
      plywoodType: c.plywoodType,
      shutters: c.shutters,
      // Include all laminate codes
      topPanelLaminateCode: c.topPanelLaminateCode,
      bottomPanelLaminateCode: c.bottomPanelLaminateCode,
      leftPanelLaminateCode: c.leftPanelLaminateCode,
      rightPanelLaminateCode: c.rightPanelLaminateCode,
      backPanelLaminateCode: c.backPanelLaminateCode,
    })) ?? [],
    manualPanels: manualPanels?.map(mp => ({
      id: mp.id,
      width: mp.width,
      height: mp.height,
      quantity: mp.quantity,
      targetSheet: mp.targetSheet,
    })) ?? [],
    sheetWidth,
    sheetHeight,
    kerf,
  };

  return stableStringify(keyData);
};

// Normalize strings for grouping (removes whitespace and case inconsistencies)
// This ensures items with the same text group together despite spacing/case differences
// Case-insensitive: "Apple Ply" and "apple ply" are treated as the same
function normalizeForGrouping(text: string): string {
  return text
    .trim()                          // Remove leading/trailing spaces
    .toLowerCase()                   // Normalize to lowercase for case-insensitive grouping
    .replace(/\s+/g, ' ');          // Collapse multiple spaces to single space
}

// PATCH 31: Main entry point with caching
export async function runOptimizerEngine(
  params: OptimizerEngineParams
): Promise<OptimizerEngineResult> {
  const cacheKey = buildOptimizerCacheKey(params);

  // Return cached result if available
  if (optimizerCache.has(cacheKey)) {
    logger.log('[OPTIMIZER] Cache hit - returning cached result');
    return optimizerCache.get(cacheKey)!;
  }

  logger.log('[OPTIMIZER] Cache miss - running optimizer');
  const result = await runOptimizerInternal(params);

  // Cache the result
  optimizerCache.set(cacheKey, result);

  // Keep cache size bounded (max 10 entries)
  if (optimizerCache.size > 10) {
    const firstKey = optimizerCache.keys().next().value;
    if (firstKey) optimizerCache.delete(firstKey);
  }

  return result;
}

// PATCH 31 + 32: Internal optimizer logic (exported for worker use)
export async function runOptimizerInternal({
  cabinets,
  manualPanels,
  sheetWidth,
  sheetHeight,
  kerf,
  woodGrainsPreferences,
  generatePanels,
}: OptimizerEngineParams): Promise<OptimizerEngineResult> {
  // PATCH 48: Track optimizer performance
  perfStart("optimizer:total", { cabinets: cabinets?.length ?? 0 });

  try {
    if (!cabinets || cabinets.length === 0) {
      perfEnd("optimizer:total");
      return { brandResults: [], error: null };
    }

    const allPanels = cabinets.flatMap(generatePanels);

    const currentSheetWidth = sheetWidth;
    const currentSheetHeight = sheetHeight;
    const currentKerf = kerf;

    const getLaminateDisplay = (laminateCode: string): string => {
      if (!laminateCode) return 'None';
      return laminateCode;
    };

    // Group panels using 3-way matching
    const panelsByBrand = allPanels.reduce((acc, panel) => {
      const isBackPanel = panel.name.includes('- Back Panel');
      const brand = isBackPanel
        ? (panel.backPanelPlywoodBrand || panel.plywoodType || 'Apple ply 6mm BWP')
        : (panel.plywoodType || 'Apple Ply 16mm BWP');
      const laminateCode = panel.laminateCode || '';
      const fullLaminateCode = laminateCode.trim();
      const groupKey = `${normalizeForGrouping(brand)}|||${normalizeForGrouping(fullLaminateCode)}`;
      if (!acc[groupKey]) acc[groupKey] = { brand, laminateCode, panels: [] };
      acc[groupKey].panels.push(panel);
      return acc;
    }, {} as Record<string, { brand: string; laminateCode: string; panels: typeof allPanels }>);

    const brandResults: BrandResult[] = [];

    for (const [groupKey, group] of Object.entries(panelsByBrand) as [string, { brand: string; laminateCode: string; panels: any[] }][]) {
      const rawParts = preparePartsForOptimizer(group.panels);
      const parts = rawParts
        .filter((p: any) => Boolean(p))
        .map((p: any, i: number) => ({ ...p, id: String(p.id ?? p.name ?? `part-${i}`) }));

      // Use multi-pass optimization for maximum efficiency
      const optimizedPanels = await multiPassOptimize(parts, currentSheetWidth, currentSheetHeight, currentKerf);
      const result = { panels: optimizedPanels };
      const laminateDisplay = getLaminateDisplay(group.laminateCode);

      // Assign stable sheet IDs
      if (result?.panels) {
        result.panels.forEach((sheet: any, sheetIdx: number) => {
          sheet._sheetId = `${groupKey}-${sheetIdx}`;
          // Restore grain and compute display dims for every placed panel
          sheet.placed?.forEach((p: any) => {
            const found = group.panels.find(gp => String(gp.id) === String(p.id) || String(gp.id) === String(p.origId));
            if (found) {
              p.grainDirection = found.grainDirection ?? null;
              p.type = (found as any).name || p.name;
              p.depth = (found as any).width ?? p.width ?? 450;
            }
            computeDisplayDims(p);
          });
        });
      }

      // ✅ GADDI Rule Checker - Display GADDI panel info before preview
      if (result?.panels) {
        const gaddiPanels: any[] = [];
        result.panels.forEach((sheet: any, sheetIdx: number) => {
          sheet.placed?.forEach((panel: any) => {
            if (panel.gaddi === true) {
              const panelType = panel.id.toUpperCase().includes('TOP') ? 'TOP' :
                panel.id.toUpperCase().includes('BOTTOM') ? 'BOTTOM' :
                  panel.id.toUpperCase().includes('LEFT') ? 'LEFT' :
                    panel.id.toUpperCase().includes('RIGHT') ? 'RIGHT' :
                      panel.id.toUpperCase().includes('BACK') ? 'BACK' : 'SHELF';

              const nomW = panel.nomW ?? panel.w;
              const nomH = panel.nomH ?? panel.h;
              const isRotated = Math.abs(panel.w - nomH) < 0.5 && Math.abs(panel.h - nomW) < 0.5;

              let markedEdge: string;
              let edgeValue: number;
              let lineDirection: string;

              if (panelType === 'TOP' || panelType === 'BOTTOM') {
                markedEdge = 'WIDTH';
                edgeValue = nomW;
                lineDirection = 'marks WIDTH dimension ← ALWAYS';
              } else if (panelType === 'LEFT' || panelType === 'RIGHT') {
                markedEdge = 'HEIGHT';
                edgeValue = nomH;
                lineDirection = 'marks HEIGHT dimension ← ALWAYS';
              } else {
                markedEdge = 'N/A';
                edgeValue = 0;
                lineDirection = 'marks HEIGHT dimension';
              }

              gaddiPanels.push({
                id: panel.id,
                type: panelType,
                markedEdge: `${markedEdge}=${edgeValue}mm`,
                gaddiLine: lineDirection,
                rotated: isRotated,
                nomW,
                nomH,
                w: panel.w,
                h: panel.h
              });
            }
          });
        });
      }

      const hasBackPanel = group.panels.some(p => p.name.includes('- Back Panel'));
      brandResults.push({
        brand: group.brand,
        laminateCode: group.laminateCode,
        laminateDisplay,
        result,
        isBackPanel: hasBackPanel
      });
    }

    // Process manual panels
    const placedManualPanelIds = new Set<string>();
    manualPanels.forEach(mp => {
      if (!mp.targetSheet || !mp.targetSheet.sheetId) return;
      const targetSheetId = mp.targetSheet.sheetId;

      let targetBrandResult: any = null;
      let targetSheetIndex = -1;
      for (const brandResult of brandResults) {
        if (brandResult.result?.panels) {
          const sheetIndex = brandResult.result.panels.findIndex((s: any) => s._sheetId === targetSheetId);
          if (sheetIndex !== -1) {
            targetBrandResult = brandResult;
            targetSheetIndex = sheetIndex;
            break;
          }
        }
      }
      if (!targetBrandResult || targetSheetIndex === -1) return;

      const targetSheet = targetBrandResult.result.panels[targetSheetIndex];
      const existingPanels = targetSheet.placed.map((p: any) => ({
        id: p.id, w: p.w, h: p.h, nomW: p.nomW ?? p.w, nomH: p.nomH ?? p.h,
        qty: 1, rotate: p.grainDirection ? false : true, gaddi: p.gaddi === true,
        grainDirection: p.grainDirection === true, laminateCode: p.laminateCode || ''
      }));

      const manualParts = Array(mp.quantity).fill(null).map(() => ({
        id: `${mp.name} (Manual)`, w: mp.width, h: mp.height, nomW: mp.width, nomH: mp.height,
        qty: 1, rotate: mp.grainDirection ? false : true, gaddi: mp.gaddi === true,
        grainDirection: mp.grainDirection === true, laminateCode: mp.laminateCode || ''
      }));

      const combinedParts = [...existingPanels, ...manualParts];

      // FIX: Use Genetic Algorithm for manual panels to maintain guillotine constraints
      // Increased time marginally to allow convergence
      const combinedResult = optimizeCutlistGenetic({
        parts: combinedParts,
        sheet: { w: currentSheetWidth, h: currentSheetHeight, kerf: currentKerf },
        timeMs: 1000,
        populationSize: 50 // Smaller population for speed
      });

      if (combinedResult?.panels && combinedResult.panels.length === 1) {
        combinedResult.panels[0]._sheetId = targetSheetId;
        targetBrandResult.result.panels[targetSheetIndex] = combinedResult.panels[0];
        if (mp.id) placedManualPanelIds.add(mp.id);
      }
    });

    // PATCH 48: End performance tracking
    perfEnd("optimizer:total");
    return { brandResults, error: null };
  } catch (error) {
    perfEnd("optimizer:total");
    return { brandResults: [], error: error as Error };
  }
}
