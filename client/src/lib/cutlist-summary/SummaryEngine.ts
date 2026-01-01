export function buildCutlistSummaries({
  brandResults,
  deletedPreviewSheets,
  deletedPreviewPanels,
  cabinets,
}: any) {
  const materialSummary = brandResults.reduce((acc: any, br: any) => {
    const sheets = br.result?.panels || [];
    const nonDeleted = sheets.filter((s: any, idx: number) => {
      const id = s._sheetId || `fallback-${brandResults.indexOf(br)}-${idx}`;
      return !deletedPreviewSheets.has(id);
    });

    const sheetCount = nonDeleted.length;
    if (sheetCount === 0) return acc;

    const key = `${br.brand}|||${br.laminateDisplay}`;
    if (!acc[key]) {
      acc[key] = {
        brand: br.brand,
        laminateDisplay: br.laminateDisplay,
        count: 0,
      };
    }

    acc[key].count += sheetCount;
    return acc;
  }, {});

  const laminateSummary = brandResults.reduce((acc: any, br: any) => {
    const sheets = br.result?.panels || [];
    const count = sheets.filter((s: any, idx: number) => {
      const id = s._sheetId || `fallback-${brandResults.indexOf(br)}-${idx}`;
      return !deletedPreviewSheets.has(id);
    }).length;

    if (count === 0) return acc;

    const parts = br.laminateDisplay
      .split("+")
      .map((p: string) => p.trim())
      .filter((p: string) => p && p !== "None" && !p.toLowerCase().includes("backer"));

    parts.forEach((lam: string) => {
      if (!acc[lam]) acc[lam] = 0;
      acc[lam] += count;
    });

    return acc;
  }, {});

  const totalPanels = brandResults.reduce(
    (total: number, br: any, brandIdx: number) => {
      const sheets = br.result?.panels || [];
      const brandTotal = sheets.reduce(
        (sheetTotal: number, s: any, sheetIdx: number) => {
          const sheetId = s._sheetId || `fallback-${brandIdx}-${sheetIdx}`;
          if (deletedPreviewSheets.has(sheetId)) return sheetTotal;

          const placed = s.placed || [];
          const nonDeletedPanels = placed.filter(
            (p: any) => !deletedPreviewPanels.has(`${sheetId}-${p.id}`)
          );

          return sheetTotal + nonDeletedPanels.length;
        },
        0
      );
      return total + brandTotal;
    },
    0
  );

  const totalPages = brandResults.reduce(
    (total: number, br: any, brandIdx: number) => {
      const sheets = br.result?.panels || [];
      const count = sheets.filter((sheet: any, idx: number) => {
        const id = sheet._sheetId || `fallback-${brandIdx}-${idx}`;
        return sheet.placed && sheet.placed.length > 0 && !deletedPreviewSheets.has(id);
      }).length;
      return total + count;
    },
    0
  );

  const roomNames = Array.from(
    new Set(cabinets.map((c: any) => c.roomName).filter(Boolean))
  );

  return {
    materialSummary,
    laminateSummary,
    totalPanels,
    totalPages,
    roomNames,
  };
}
