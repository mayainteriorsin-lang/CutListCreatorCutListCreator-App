// drawGaddiMark - draw dotted gaddi line that follows nomW/nomH rule even if panel rotated
// - doc: jsPDF-like doc (has line, setLineWidth, setDrawColor, setLineDash)
// - panel: { x, y, w, h, rotationDegrees }  // rotationDegrees: 0,90,180,270 (clockwise)
// - type: string containing "TOP"|"BOTTOM"|"LEFT"|"RIGHT"
// - nomW, nomH: numbers (units must match panel.w/h units or you must scale)
// - options: optional { inset: number, lineWidth: number, dashPattern: number[], color: number|[r,g,b] }
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
  // --- defaults
  const inset = options?.inset ?? 6; // distance from panel border
  const lineWidth = options?.lineWidth ?? 0.8;
  const dashPattern = options?.dashPattern ?? [1, 2];
  const color = options?.color ?? 150; // gray

  // --- 1) Decide which nominal value to use (this is your rule)
  // TOP/BOTTOM -> use nomW (width); LEFT/RIGHT -> use nomH (height)
  const isLeftRight = /LEFT|RIGHT/i.test(type);
  const isTopBottom = /TOP|BOTTOM/i.test(type);

  if (!isLeftRight && !isTopBottom) {
    // unknown type -> nothing to draw
    return;
  }

  const markValue = isLeftRight ? nomH : nomW; // the numeric value to mark (your rule)

  // --- 2) Convert markValue into drawing length (assuming same units).
  // If you use different units (mm vs points), apply a scale here.
  // For now we assume 1 unit of nomW/nomH = 1 unit of panel.w/h.
  let length = Math.abs(markValue);

  // Clamp length so it won't exceed panel size (safety)
  if (isTopBottom) {
    // when marking width, it should not be longer than panel.w
    length = Math.min(length, panel.w - 2 * inset);
  } else {
    // when marking height, not longer than panel.h
    length = Math.min(length, panel.h - 2 * inset);
  }
  if (length <= 0) return;

  // --- 3) Build local (panel-space) start and end points (before rotation)
  // Panel local coords origin at panel.x, panel.y (top-left)
  // We'll draw line from (sx, sy) to (ex, ey) in local coords, then rotate around center.
  let sx = 0, sy = 0, ex = 0, ey = 0;

  if (isTopBottom) {
    // TOP or BOTTOM: Check panel placement to decide line direction
    // If panel.w > panel.h: width is on X-axis → horizontal line
    // If panel.h > panel.w: width is on Y-axis → vertical line
    const widthOnXAxis = panel.w >= panel.h;
    
    if (widthOnXAxis) {
      // Width on X-axis: draw horizontal line at top/bottom
      const nearTop = /TOP/i.test(type);
      const yLocal = nearTop ? inset : (panel.h - inset);
      const startX = (panel.w - length) / 2;
      sx = startX; sy = yLocal;
      ex = startX + length; ey = yLocal;
    } else {
      // Width on Y-axis: draw vertical line at left/right
      const nearLeft = /TOP/i.test(type) ? true : false; // arbitrary, just pick a side
      const xLocal = nearLeft ? inset : (panel.w - inset);
      const startY = (panel.h - length) / 2;
      sx = xLocal; sy = startY;
      ex = xLocal; ey = startY + length;
    }
  } else {
    // LEFT or RIGHT: Check panel placement to decide line direction
    // If panel.w >= panel.h: height is on X-axis → horizontal line
    // If panel.h > panel.w: height is on Y-axis → vertical line
    const heightOnXAxis = panel.w >= panel.h;
    
    if (heightOnXAxis) {
      // Height on X-axis: draw horizontal line at left/right
      const nearLeft = /LEFT/i.test(type);
      const yLocal = nearLeft ? inset : (panel.h - inset);
      const startX = (panel.w - length) / 2;
      sx = startX; sy = yLocal;
      ex = startX + length; ey = yLocal;
    } else {
      // Height on Y-axis: draw vertical line at top/bottom
      const nearLeft = /LEFT/i.test(type);
      const xLocal = nearLeft ? inset : (panel.w - inset);
      const startY = (panel.h - length) / 2;
      sx = xLocal; sy = startY;
      ex = xLocal; ey = startY + length;
    }
  }

  // --- 4) Map local points to global (rotated) coordinates
  // rotate around panel center
  const cx = panel.x + panel.w / 2;
  const cy = panel.y + panel.h / 2;
  const rot = ((panel.rotationDegrees ?? 0) % 360 + 360) % 360; // 0..359

  function localToGlobal(pxLocal: number, pyLocal: number) {
    // local coords origin = panel.x, panel.y (top-left)
    const lx = panel.x + pxLocal;
    const ly = panel.y + pyLocal;

    // translate to center
    const tx = lx - cx;
    const ty = ly - cy;

    // rotation (clockwise rot degrees)
    const theta = (rot * Math.PI) / 180;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    // rotated point relative to center
    const rx = tx * cosT + ty * sinT;
    const ry = -tx * sinT + ty * cosT; // note: using PDF/Canvas coordinate assumption
    // back to global coords
    return { x: cx + rx, y: cy + ry };
  }

  const p0 = localToGlobal(sx, sy);
  const p1 = localToGlobal(ex, ey);

  // --- 5) Save previous state (best-effort), set drawing style
  const prevLineWidth = (doc.getLineWidth ? doc.getLineWidth() : undefined);
  const prevDrawColor = (doc.getDrawColor ? doc.getDrawColor() : undefined);
  let prevDash: any = null;
  try { prevDash = (doc as any)._currentDash ?? null; } catch { prevDash = null; }

  try {
    if ((doc as any).setLineWidth) doc.setLineWidth(lineWidth);
    if ((doc as any).setDrawColor) doc.setDrawColor(color);
    if ((doc as any).setLineDash) (doc as any).setLineDash(dashPattern);

    // draw dotted line
    doc.line(p0.x, p0.y, p1.x, p1.y);

    // Draw "GADDI" text label along the line
    // Reset line dash for text (jsPDF can mess up text with dashes active)
    if ((doc as any).setLineDash) (doc as any).setLineDash([]);
    
    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;
    
    // Determine if line is horizontal or vertical
    const isHorizontal = Math.abs(p1.x - p0.x) > Math.abs(p1.y - p0.y);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(0, 0, 0); // Black color
    
    if (isHorizontal) {
      // Horizontal line (X-axis): text on the LEFT
      const leftX = Math.min(p0.x, p1.x) + 2;
      doc.text("GADDI", leftX, midY + 1.5, { align: "left" });
    } else {
      // Vertical line (Y-axis): text at BOTTOM, rotated
      const bottomY = Math.max(p0.y, p1.y) - 2;
      doc.text("GADDI", midX + 1.5, bottomY, { align: "left", angle: 90 });
    }
    
    // Reset text color
    doc.setTextColor(0);
  } finally {
    // restore
    if (prevLineWidth != null && (doc as any).setLineWidth) (doc as any).setLineWidth(prevLineWidth);
    if (prevDrawColor != null && (doc as any).setDrawColor) (doc as any).setDrawColor(prevDrawColor);
    if ((doc as any).setLineDash) {
      if (prevDash && Array.isArray(prevDash)) (doc as any).setLineDash(prevDash);
      else (doc as any).setLineDash([]);
    } else {
      try { (doc as any).setLineDash([]); } catch (_) { /* ignore */ }
    }
  }
}
