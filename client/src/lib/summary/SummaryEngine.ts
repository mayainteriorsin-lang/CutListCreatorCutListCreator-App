import { generatePanels } from "@/lib/panels/generatePanels";
import { preparePartsForOptimizer, multiPassOptimize } from "@/lib/optimizer";
import type { Panel, PanelGroup, CuttingListSummary } from "@shared/schema";

/**
 * SummaryEngine:
 * Produces:
 *  - cuttingListSummary (panelGroups, totalPanels, totalArea)
 *  - materialSummary (plywood + laminates by brand)
 *
 * Extracted from home.tsx - NO logic changes.
 */

export interface MaterialSummary {
  plywood: Record<string, number>;
  laminates: Record<string, number>;
  totalPlywoodSheets: number;
}

export interface CutlistSummaryResult {
  cuttingListSummary: CuttingListSummary;
}

/**
 * Normalize string for grouping (lowercase, trim)
 */
function normalizeForGrouping(str: string): string {
  return (str || "").toLowerCase().trim();
}

/**
 * Calculate cutting list summary (sync - no optimization)
 * Groups panels by laminate code and calculates totals
 */
export function buildCuttingListSummary(cabinets: any[]): CuttingListSummary {
  const allPanels = cabinets.flatMap(generatePanels);

  // Group panels by laminate code
  const panelGroups: PanelGroup[] = [];
  const groupedByLaminate = allPanels.reduce((acc, panel) => {
    const key = panel.laminateCode || "None";
    if (!acc[key]) acc[key] = [];
    acc[key].push(panel);
    return acc;
  }, {} as Record<string, Panel[]>);

  (Object.entries(groupedByLaminate) as [string, Panel[]][]).forEach(
    ([laminateCode, panels]) => {
      const totalArea = panels.reduce(
        (sum: number, panel: Panel) =>
          sum + (panel.width * panel.height) / 1000000,
        0
      ); // m²
      panelGroups.push({ laminateCode, panels, totalArea });
    }
  );

  const totalPanels = allPanels.length;
  const totalArea = allPanels.reduce(
    (sum, panel) => sum + (panel.width * panel.height) / 1000000,
    0
  );

  return { panelGroups, totalPanels, totalArea };
}

/**
 * Calculate live material summary (async - runs optimization)
 * Groups panels by brand + laminate and runs actual optimization
 */
export async function buildMaterialSummary({
  cabinets,
  sheetWidth,
  sheetHeight,
  kerf,
  woodGrainsPreferences,
  deletedPreviewSheets,
}: {
  cabinets: any[];
  sheetWidth: number;
  sheetHeight: number;
  kerf: number;
  woodGrainsPreferences: Record<string, boolean>;
  deletedPreviewSheets: Set<string>;
}): Promise<MaterialSummary> {
  if (cabinets.length === 0) {
    return {
      plywood: {} as Record<string, number>,
      laminates: {} as Record<string, number>,
      totalPlywoodSheets: 0,
    };
  }

  const allPanels = cabinets.flatMap(generatePanels);

  // Group panels based on 3-way matching:
  // ALL panels must match: Plywood Brand + Front Laminate + Inner Laminate
  const panelsByBrand = allPanels.reduce((acc, panel) => {
    const isBackPanel = panel.name.includes("- Back Panel");
    // For back panels: use backPanelPlywoodBrand, fall back to plywoodType, then default
    const brand = isBackPanel
      ? panel.backPanelPlywoodBrand || panel.plywoodType || "Apple ply 6mm BWP"
      : panel.plywoodType || "Apple Ply 16mm BWP";
    const laminateCode = panel.laminateCode || "";

    // Use FULL laminate code (includes both front + inner laminate)
    const fullLaminateCode = laminateCode.trim();

    // Create grouping key: Plywood Brand + Full Laminate Code (front + inner)
    const groupKey = `${normalizeForGrouping(brand)}|||${normalizeForGrouping(fullLaminateCode)}`;

    if (!acc[groupKey]) acc[groupKey] = { brand, laminateCode, panels: [] };
    acc[groupKey].panels.push(panel);
    return acc;
  }, {} as Record<string, { brand: string; laminateCode: string; panels: typeof allPanels }>);

  const brandGroups: Array<{
    brand: string;
    laminateCode: string;
    sheetsCount: number;
    panelsCount: number;
    groupKey: string;
  }> = [];

  // Run ACTUAL optimization (not estimates) to get real sheet counts
  for (const [groupKey, group] of Object.entries(panelsByBrand) as [
    string,
    { brand: string; laminateCode: string; panels: any[] },
  ][]) {
    // Use helper function to prepare parts with wood grain logic
    const rawParts = preparePartsForOptimizer(
      group.panels,
      woodGrainsPreferences
    );

    // Remove falsy entries and ensure id is a string (prevents optimizer crashes)
    const parts = rawParts
      .filter((p: any) => Boolean(p))
      .map((p: any, i: number) => ({
        ...p,
        id: String(p.id ?? p.name ?? `part-${i}`),
      }));

    // Use multi-pass optimization for maximum efficiency
    const actualSheets = await multiPassOptimize(
      parts,
      sheetWidth,
      sheetHeight,
      kerf
    );

    // Assign stable sheet IDs for deletion tracking
    actualSheets.forEach((sheetData: any, sheetIdx: number) => {
      const sheetId = `${groupKey}-${sheetIdx}`;
      sheetData._sheetId = sheetId;
      sheetData.placed?.forEach((p: any) => {
        p.grainDirection =
          group.panels.find((gp) => gp.name === p.name)?.grainDirection ?? false;
      });
    });

    // Count only non-deleted sheets
    const visibleSheetsCount = actualSheets.filter((sheetData: any) => {
      const sheetId = sheetData._sheetId;
      return (
        sheetData.placed &&
        sheetData.placed.length > 0 &&
        !deletedPreviewSheets.has(sheetId)
      );
    }).length;

    brandGroups.push({
      brand: group.brand,
      laminateCode: group.laminateCode,
      sheetsCount: visibleSheetsCount,
      panelsCount: group.panels.length,
      groupKey: groupKey,
    });
  }

  const summary: MaterialSummary = {
    plywood: {} as Record<string, number>,
    laminates: {} as Record<string, number>,
    totalPlywoodSheets: 0,
  };

  brandGroups.forEach((group) => {
    // Add plywood brand to the list (use sheetsCount = optimized plywood sheets)
    if (!summary.plywood[group.brand]) {
      summary.plywood[group.brand] = 0;
    }
    summary.plywood[group.brand] += group.sheetsCount;
    summary.totalPlywoodSheets += group.sheetsCount;

    // Add all laminates to the laminate list
    if (group.laminateCode) {
      const laminateParts = group.laminateCode
        .split("+")
        .map((part) => part.trim())
        .filter((part) => part && !part.match(/^Backer$/i));

      // Laminate sheets are SAME SIZE as plywood sheets
      laminateParts.forEach((laminateCode) => {
        if (!summary.laminates[laminateCode]) {
          summary.laminates[laminateCode] = 0;
        }
        summary.laminates[laminateCode] += group.sheetsCount;
      });
    }
  });

  return summary;
}

/**
 * Calculate shutter count from cabinets
 */
export function calculateShutterCount(cabinets: any[]): number {
  return cabinets.reduce(
    (total, cabinet) =>
      total + (cabinet.shuttersEnabled ? cabinet.shutterCount : 0),
    0
  );
}
