import { preparePartsForOptimizer } from "./preparePartsForOptimizer";
import { multiPassOptimize } from "./multiPassOptimize";
import { computeDisplayDims } from "./computeDisplayDims";

export async function runOptimization({
  allPanels,
  sheetWidth,
  sheetHeight,
  kerf,
  deletedPreviewSheets,
  deletedPreviewPanels,
  manualPanels
}: {
  allPanels: any[];
  sheetWidth: number;
  sheetHeight: number;
  kerf: number;
  deletedPreviewSheets: Set<string>;
  deletedPreviewPanels: Set<string>;
  manualPanels: any[];
}) {
  if (!allPanels || allPanels.length === 0) return [];

  const byBrandLaminate = new Map<string, {
    brand: string;
    laminateCode: string;
    isBackPanel?: boolean;
    panels: any[];
  }>();

  // Group panels by brand + laminateCode
  for (const panel of allPanels) {
    const brand = (panel.plywoodType || "").trim().toLowerCase();
    const lam = (panel.laminateCode || "").trim();
    const key = `${brand}|||${lam}`;

    if (!byBrandLaminate.has(key)) {
      byBrandLaminate.set(key, {
        brand: panel.plywoodType || "",
        laminateCode: lam,
        isBackPanel: (panel.name || "").toLowerCase().includes("back"),
        panels: []
      });
    }

    byBrandLaminate.get(key)!.panels.push(panel);
  }

  const brandResults: any[] = [];

  for (const [key, group] of byBrandLaminate.entries()) {
    const parts = preparePartsForOptimizer(group.panels);
    const valid = parts.filter((p: any) => p && p.w > 0 && p.h > 0);

    if (!valid.length) continue;

    const optimizedPanels = await multiPassOptimize(valid, sheetWidth, sheetHeight, kerf);
    const result = { panels: optimizedPanels };

    if (!result || !result.panels) continue;

    result.panels.forEach((sheet: any, idx: number) => {
      sheet._sheetId = `${key}-sheet-${idx}`;

      if (sheet.placed && sheet.placed.length > 0) {
        sheet.placed.forEach((p: any) => {
          const original = group.panels.find((op: any) => op.id === p.id || op.origId === p.id);
          if (original) {
            p.grainDirection = original.grainDirection;
            p.type = original.type;
            p.depth = original.depth;
          }
          computeDisplayDims(p);
        });
      }
    });

    // Handle manual panels re-optimize
    const targetManualPanels = manualPanels.filter(mp => mp.targetSheet?.key === key);

    if (targetManualPanels.length > 0) {
      for (const mp of targetManualPanels) {
        const sheet = result.panels.find((s: any) => s._sheetId === mp.targetSheet.sheetId);
        if (!sheet) continue;

        const existing = (sheet.placed || []).map((p: any) => ({
          id: p.id,
          w: p.w,
          h: p.h
        }));

        existing.push({
          id: mp.id,
          w: mp.width,
          h: mp.height
        });

        const reoptPanels = await multiPassOptimize(existing, sheetWidth, sheetHeight, kerf);

        if (reoptPanels && reoptPanels.length > 0) {
          const newSheet = reoptPanels[0];
          newSheet._sheetId = sheet._sheetId;
          result.panels = result.panels.map((sp: any) =>
            sp._sheetId === sheet._sheetId ? newSheet : sp
          );
        }
      }
    }

    brandResults.push({
      brand: group.brand,
      laminateCode: group.laminateCode,
      laminateDisplay: group.laminateCode || "None",
      isBackPanel: group.isBackPanel,
      result
    });
  }

  // Filter deleted sheets / panels
  brandResults.forEach((br: any) => {
    br.result.panels = br.result.panels.map((sheet: any) => {
      const sid = sheet._sheetId;

      if (deletedPreviewSheets.has(sid)) return { ...sheet, placed: [] };

      sheet.placed = (sheet.placed || []).filter((panel: any) => {
        const panelUniqueId = `${sid}-${panel.id}`;
        return !deletedPreviewPanels.has(panelUniqueId);
      });

      return sheet;
    });
  });

  return brandResults;
}
