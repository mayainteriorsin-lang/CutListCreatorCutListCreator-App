// ===============================================
// GADDI MARK - MATCHES PREVIEW EXACTLY
// Simple edge-aligned lines (TOP edge horizontal, LEFT edge vertical)
// ===============================================

export function drawGaddiMark(
  doc: any,
  panel: { x: number; y: number; w: number; h: number; rotationDegrees?: number },
  type: string,
  nomW: number,
  nomH: number,
  options?: {
    inset?: number;
    lineWidth?: number;
    dashPattern?: number[];
    color?: number | [number, number, number];
  }
) {
  // ----------------- SETTINGS -----------------
  const inset = options?.inset ?? 4;
  const lineWidth = options?.lineWidth ?? 1.2;
  const dashPattern = options?.dashPattern ?? [2, 2];
  const rawColor = options?.color;

  // ----------------- SAFE COLOR -----------------
  const color: [number, number, number] = Array.isArray(rawColor) && rawColor.length === 3
    ? [
        Number.isFinite(rawColor[0]) ? rawColor[0] : 0,
        Number.isFinite(rawColor[1]) ? rawColor[1] : 0,
        Number.isFinite(rawColor[2]) ? rawColor[2] : 0
      ]
    : typeof rawColor === "number" && Number.isFinite(rawColor)
    ? [rawColor, rawColor, rawColor]
    : [255, 0, 0]; // default RED gaddi mark

  // ----------------- TYPE CHECK -----------------
  const isLeftRight = /LEFT|RIGHT/i.test(type);
  const isTopBottom = /TOP|BOTTOM/i.test(type);
  const isShutter = /SHUTTER/i.test(type);

  // Must be a valid panel type for gaddi
  if (!isLeftRight && !isTopBottom && !isShutter) return;

  // Skip if panel too small
  if (panel.w < 10 || panel.h < 10) return;

  // ----------------- DETERMINE DIRECTION -----------------
  // Match preview logic: w >= h means horizontal, else vertical
  const isHorizontal = panel.w >= panel.h;

  // ----------------- CALCULATE LINE COORDINATES -----------------
  // MATCH PREVIEW EXACTLY:
  // Horizontal: line at TOP edge, from left+inset to right-inset
  // Vertical: line at LEFT edge, from top+inset to bottom-inset

  let x1: number, y1: number, x2: number, y2: number;

  if (isHorizontal) {
    // Horizontal line at TOP edge (y = panel.y + inset)
    x1 = panel.x + inset;
    y1 = panel.y + inset;
    x2 = panel.x + panel.w - inset;
    y2 = panel.y + inset;
  } else {
    // Vertical line at LEFT edge (x = panel.x + inset)
    x1 = panel.x + inset;
    y1 = panel.y + inset;
    x2 = panel.x + inset;
    y2 = panel.y + panel.h - inset;
  }

  // ----------------- DRAW LINE -----------------
  doc.setLineWidth(lineWidth);
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineDash(dashPattern);

  doc.line(x1, y1, x2, y2);

  doc.setLineDash([]);

  // ----------------- DRAW LABEL -----------------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(0, 0, 0);

  if (isHorizontal) {
    // Label below the horizontal line
    const labelX = panel.x + inset + 6;
    const labelY = panel.y + inset + 5;
    doc.text("GADDI", labelX, labelY);
  } else {
    // Label to the right of the vertical line, rotated
    const labelX = panel.x + inset + 5;
    const labelY = panel.y + inset + 6;
    doc.text("GADDI", labelX, labelY, { angle: 90 });
  }

  // Reset colors to black after drawing
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
}

// ----------------- SUPPORT METHODS -----------------

export function calculateGaddiLineDirection(
  gaddiEnabled: boolean,
  panelType: string,
  w: number,
  h: number
): "horizontal" | "vertical" | null {
  if (!gaddiEnabled) return null;

  const isLeftRight = /LEFT|RIGHT/i.test(panelType);
  const isTopBottom = /TOP|BOTTOM/i.test(panelType);
  const isShutter = /SHUTTER/i.test(panelType);

  if (!isLeftRight && !isTopBottom && !isShutter) return null;

  if (isTopBottom) return w >= h ? "horizontal" : "vertical";
  return w >= h ? "horizontal" : "vertical";
}

export function shouldShowGaddiMarking(panel: any): boolean {
  return Boolean(panel?.gaddi);
}

export function validateGaddiRule(panel: any): boolean {
  if (!panel?.gaddi) return true;
  if (!panel.width || !panel.height || panel.width <= 0 || panel.height <= 0) return false;
  if (panel.width < 100 || panel.height < 100) return false;
  return true;
}
