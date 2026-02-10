/**
 * Shape Generator Helpers
 * Shared functions for creating SVG shapes.
 */

import type { LineShape, RectShape, DimensionShape, Shape } from "../../types";

// ── ID Generator ──────────────────────────────────────────────────────
export const uid = () => `MOD-${Math.random().toString(36).slice(2, 9)}`;

// ── Line Weight Presets (AutoCAD convention) ──────────────────────────
export const CARCASS = { color: "#e0e0e0", thickness: 3 };
export const PARTITION = { color: "#b0b0b0", thickness: 2 };
export const FITTING = { color: "#808080", thickness: 1 };
export const HANDLE = { color: "#00e5ff", thickness: 2.5 };
export const HATCH = { color: "#555", thickness: 0.5 };

// ── Shape Factories ───────────────────────────────────────────────────

export function makeLine(
  x1: number, y1: number, x2: number, y2: number,
  opts?: { color?: string; thickness?: number }
): LineShape {
  return {
    id: uid(), type: "line", x1, y1, x2, y2,
    color: opts?.color ?? "#b0b0b0",
    thickness: opts?.thickness ?? 2,
    marker: "none",
    showDimension: false,
  };
}

export function makeRect(
  x: number, y: number, w: number, h: number,
  opts?: { fill?: string; stroke?: string; strokeWidth?: number; rx?: number; id?: string }
): RectShape {
  return {
    id: opts?.id ?? uid(), type: "rect", x, y, w, h,
    fill: opts?.fill ?? "none",
    stroke: opts?.stroke ?? "#e0e0e0",
    strokeWidth: opts?.strokeWidth ?? 2,
    rx: opts?.rx ?? 0,
    opacity: 1,
  };
}

export function makeDim(
  x1: number, y1: number, x2: number, y2: number,
  label: string, dimType: "horizontal" | "vertical",
  offset?: number
): DimensionShape {
  return { id: uid(), type: "dimension", x1, y1, x2, y2, label, dimType, offset: offset ?? 30 };
}

// ── Common Drawing Functions ──────────────────────────────────────────

export function drawCarcassOutline(s: Shape[], ox: number, oy: number, w: number, h: number) {
  s.push(makeLine(ox, oy, ox + w, oy, CARCASS));
  s.push(makeLine(ox + w, oy, ox + w, oy + h, CARCASS));
  s.push(makeLine(ox + w, oy + h, ox, oy + h, CARCASS));
  s.push(makeLine(ox, oy + h, ox, oy, CARCASS));
}

export function makeDimensions(ox: number, oy: number, w: number, h: number): Shape[] {
  // Only overall width - height is rendered by InnerDimensions component
  // Offset 60px below carcass for clear spacing
  return [
    makeDim(ox, oy + h + 60, ox + w, oy + h + 60, `${Math.round(w)}`, "horizontal", 30),
  ];
}

export function drawShelvesSection(
  s: Shape[], x: number, y: number, w: number, h: number, count: number
) {
  const shelfCount = Math.max(1, count);
  const spacing = h / (shelfCount + 1);
  for (let i = 1; i <= shelfCount; i++) {
    const sy = y + spacing * i;
    s.push(makeLine(x + 4, sy, x + w - 4, sy, FITTING));
  }
}

export function drawDrawersSection(
  s: Shape[], x: number, y: number, w: number, h: number, count: number
) {
  const drawerCount = Math.max(1, count);
  const drawerH = h / drawerCount;
  const PAD = 6;

  for (let i = 0; i < drawerCount; i++) {
    const dy = y + drawerH * i;
    s.push(makeLine(x + PAD, dy + PAD, x + w - PAD, dy + PAD, FITTING));
    s.push(makeLine(x + w - PAD, dy + PAD, x + w - PAD, dy + drawerH - PAD, FITTING));
    s.push(makeLine(x + w - PAD, dy + drawerH - PAD, x + PAD, dy + drawerH - PAD, FITTING));
    s.push(makeLine(x + PAD, dy + drawerH - PAD, x + PAD, dy + PAD, FITTING));

    const hCenterY = dy + drawerH / 2;
    const handleW = Math.min(50, w * 0.25);
    const hx = x + w / 2;
    s.push(makeLine(hx - handleW / 2, hCenterY, hx + handleW / 2, hCenterY, HANDLE));
  }
}

export function drawShutterGrid(
  s: Shape[], ox: number, oy: number, totalW: number, totalH: number,
  cols: number, rows: number
) {
  if (cols <= 0 || rows <= 0) return;
  const GAP = 4;
  const FRAME = 6;

  const shutterW = (totalW - FRAME * 2 - GAP * Math.max(0, cols - 1)) / cols;
  const shutterH = (totalH - FRAME * 2 - GAP * Math.max(0, rows - 1)) / rows;
  if (shutterW <= 0 || shutterH <= 0) return;

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const sx = ox + FRAME + col * (shutterW + GAP);
      const sy = oy + FRAME + row * (shutterH + GAP);

      s.push(makeLine(sx, sy, sx + shutterW, sy, FITTING));
      s.push(makeLine(sx + shutterW, sy, sx + shutterW, sy + shutterH, FITTING));
      s.push(makeLine(sx + shutterW, sy + shutterH, sx, sy + shutterH, FITTING));
      s.push(makeLine(sx, sy + shutterH, sx, sy, FITTING));

      const handleLen = Math.min(40, shutterH * 0.2);
      const hcy = sy + shutterH / 2;
      if (col % 2 === 0) {
        const hx = sx + shutterW - 15;
        s.push(makeLine(hx, hcy - handleLen / 2, hx, hcy + handleLen / 2, HANDLE));
      } else {
        const hx = sx + 15;
        s.push(makeLine(hx, hcy - handleLen / 2, hx, hcy + handleLen / 2, HANDLE));
      }
    }
  }
}
