import { preparePartsForOptimizer } from "./preparePartsForOptimizer";
import { multiPassOptimize } from "./multiPassOptimize";

export async function runMaterialSummary({
  allPanels,
  sheetWidth,
  sheetHeight,
  kerf,
  deletedPreviewSheets
}: {
  allPanels: any[];
  sheetWidth: number;
  sheetHeight: number;
  kerf: number;
  deletedPreviewSheets: Set<string>;
}) {
  const summary: {
    plywood: Record<string, number>;
    laminates: Record<string, number>;
    totalPlywoodSheets: number;
  } = {
    plywood: {},
    laminates: {},
    totalPlywoodSheets: 0
  };

  const map = new Map<string, { brand: string; laminateCode: string; panels: any[] }>();

  for (const panel of allPanels) {
    const brand = (panel.plywoodType || "").trim().toLowerCase();
    const lam = (panel.laminateCode || "").trim();
    const key = `${brand}|||${lam}`;

    if (!map.has(key)) {
      map.set(key, { brand: panel.plywoodType || "", laminateCode: lam, panels: [] });
    }

    map.get(key)!.panels.push(panel);
  }

  for (const [key, group] of map.entries()) {
    const parts = preparePartsForOptimizer(group.panels);
    const valid = parts.filter((p: any) => p && p.w > 0 && p.h > 0);

    if (!valid.length) continue;

    const optimizedPanels = await multiPassOptimize(valid, sheetWidth, sheetHeight, kerf);
    const result = { panels: optimizedPanels };

    // Assign sheet IDs for filtering
    result.panels.forEach((sheet: any, idx: number) => {
      sheet._sheetId = `${key}-sheet-${idx}`;
    });

    const visibleSheets = result.panels.filter((s: any) => {
      const id = s._sheetId || s.sheetId;
      return s.placed?.length && !deletedPreviewSheets.has(id);
    });

    const count = visibleSheets.length;

    if (!summary.plywood[group.brand]) summary.plywood[group.brand] = 0;
    summary.plywood[group.brand] += count;
    summary.totalPlywoodSheets += count;

    const partsLam = group.laminateCode.split("+").map(s => s.trim()).filter(s => !!s && s !== "None" && !/^Backer$/i.test(s));

    partsLam.forEach(l => {
      if (!summary.laminates[l]) summary.laminates[l] = 0;
      summary.laminates[l] += count;
    });
  }

  return summary;
}
