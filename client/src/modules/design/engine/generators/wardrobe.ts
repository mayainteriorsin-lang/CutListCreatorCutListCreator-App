/**
 * Wardrobe Shape Generator
 * Generates SVG shapes for wardrobe with sections (hang, shelves, drawers).
 */

import type { Shape } from "../../types";
import type { ModuleConfig, WardrobeSection } from "../shapeGenerator";
import { DEFAULT_WARDROBE_SECTIONS } from "../shapeGenerator";
import {
  makeLine, makeRect, makeDim, makeDimensions,
  drawShelvesSection, drawDrawersSection,
  PARTITION, FITTING, HANDLE, HATCH
} from "./helpers";

// ── Section Drawing Functions ─────────────────────────────────────────

function drawLongHangSection(s: Shape[], x: number, y: number, w: number, h: number) {
  const rodY = y + 50;
  s.push(makeLine(x + 8, rodY, x + w - 8, rodY, FITTING));
  s.push(makeLine(x + 8, rodY - 6, x + 8, rodY + 6, FITTING));
  s.push(makeLine(x + w - 8, rodY - 6, x + w - 8, rodY + 6, FITTING));

  const hangerCount = Math.max(2, Math.min(5, Math.floor(w / 100)));
  const hangerSpacing = (w - 40) / (hangerCount + 1);
  for (let i = 1; i <= hangerCount; i++) {
    const hx = x + 20 + hangerSpacing * i;
    s.push(makeLine(hx, rodY, hx, rodY + 8, HATCH));
    s.push(makeLine(hx - 18, rodY + 16, hx, rodY + 8, HATCH));
    s.push(makeLine(hx + 18, rodY + 16, hx, rodY + 8, HATCH));
    const clotheLen = h * 0.5 + (i % 2 === 0 ? 40 : 0);
    s.push(makeLine(hx - 16, rodY + 22, hx - 14, rodY + clotheLen, HATCH));
    s.push(makeLine(hx + 16, rodY + 22, hx + 14, rodY + clotheLen, HATCH));
    s.push(makeLine(hx - 14, rodY + clotheLen, hx + 14, rodY + clotheLen, HATCH));
  }
}

function drawShortHangSection(
  s: Shape[], x: number, y: number, w: number, h: number,
  rodPct: number, shelfCount: number
) {
  const rodAreaH = h * (rodPct / 100);
  const shelfAreaH = h - rodAreaH;
  const shelfY = y + rodAreaH;

  s.push(makeLine(x + 4, shelfY, x + w - 4, shelfY, PARTITION));

  const rodY = y + 45;
  s.push(makeLine(x + 8, rodY, x + w - 8, rodY, FITTING));
  s.push(makeLine(x + 8, rodY - 5, x + 8, rodY + 5, FITTING));
  s.push(makeLine(x + w - 8, rodY - 5, x + w - 8, rodY + 5, FITTING));

  const hangerCount = Math.max(1, Math.min(3, Math.floor(w / 120)));
  const hangerSpacing = (w - 30) / (hangerCount + 1);
  for (let i = 1; i <= hangerCount; i++) {
    const hx = x + 15 + hangerSpacing * i;
    s.push(makeLine(hx, rodY, hx, rodY + 6, HATCH));
    s.push(makeLine(hx - 14, rodY + 12, hx, rodY + 6, HATCH));
    s.push(makeLine(hx + 14, rodY + 12, hx, rodY + 6, HATCH));
    const clotheLen = rodAreaH * 0.55;
    s.push(makeLine(hx - 12, rodY + 18, hx - 10, rodY + clotheLen, HATCH));
    s.push(makeLine(hx + 12, rodY + 18, hx + 10, rodY + clotheLen, HATCH));
    s.push(makeLine(hx - 10, rodY + clotheLen, hx + 10, rodY + clotheLen, HATCH));
  }

  const count = Math.max(1, shelfCount);
  const spacing = shelfAreaH / (count + 1);
  for (let i = 1; i <= count; i++) {
    const sy = shelfY + spacing * i;
    s.push(makeLine(x + 4, sy, x + w - 4, sy, FITTING));
  }
}

function generateDefaultSections(sectionCount: number): WardrobeSection[] {
  const count = Math.max(1, sectionCount);
  if (count === 1) return [{ type: "shelves", widthMm: 0, shelfCount: 4 }];
  if (count === 2) return [
    { type: "long_hang", widthMm: 0 },
    { type: "shelves", widthMm: 0, shelfCount: 3 },
  ];
  if (count === 3) return [
    { type: "long_hang", widthMm: 0 },
    { type: "shelves", widthMm: 0, shelfCount: 3 },
    { type: "drawers", widthMm: 0, drawerCount: 3 },
  ];
  return [...DEFAULT_WARDROBE_SECTIONS].slice(0, count);
}

// ── Main Generator ────────────────────────────────────────────────────

export function generateWardrobeShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
  const s: Shape[] = [];
  const { widthMm: W, heightMm: H, loftEnabled, loftHeightMm } = c;
  const T = c.carcassThicknessMm ?? 18;

  // Carcass panels
  s.push(makeRect(ox, oy, T, H, { fill: "#d4d4d4", stroke: "#333", strokeWidth: 1 }));
  s.push(makeRect(ox + W - T, oy, T, H, { fill: "#d4d4d4", stroke: "#333", strokeWidth: 1 }));
  s.push(makeRect(ox + T, oy, W - T * 2, T, { fill: "#d4d4d4", stroke: "#333", strokeWidth: 1 }));
  s.push(makeRect(ox + T, oy + H - T, W - T * 2, T, { fill: "#d4d4d4", stroke: "#333", strokeWidth: 1 }));

  // Loft section
  let mainTop = oy;
  if (loftEnabled && loftHeightMm > 0) {
    const loftY = oy + loftHeightMm;
    s.push(makeRect(ox + T, loftY - T, W - T * 2, T, { fill: "#d4d4d4", stroke: "#333", strokeWidth: 1 }));
    mainTop = loftY;

    const loftDoors = Math.min(c.shutterCount || 3, 4);
    if (loftDoors > 1) {
      const loftDoorW = (W - T * 2) / loftDoors;
      for (let i = 1; i < loftDoors; i++) {
        const lx = ox + T + loftDoorW * i;
        s.push(makeLine(lx, oy + T, lx, loftY - T, FITTING));
      }
    }

    const loftDoorW2 = (W - T * 2) / Math.max(1, loftDoors);
    for (let i = 0; i < loftDoors; i++) {
      const doorCx = ox + T + loftDoorW2 * i + loftDoorW2 / 2;
      const doorCy = oy + T + (loftHeightMm - T * 2) / 2;
      const handleW = Math.min(40, loftDoorW2 * 0.3);
      s.push(makeLine(doorCx - handleW / 2, doorCy, doorCx + handleW / 2, doorCy, HANDLE));
    }

    s.push(makeDim(ox + W + 20, oy, ox + W + 20, loftY, `${loftHeightMm}`, "vertical", 30));
  }

  const mainH = (oy + H) - mainTop;
  const sections = (c.sections && c.sections.length > 0)
    ? c.sections
    : generateDefaultSections(c.sectionCount);

  const totalSections = sections.length;
  const innerWidth = W - T * 2;
  const partitionCount = Math.max(0, totalSections - 1);
  const availableWidth = innerWidth - partitionCount * T;
  const autoWidth = totalSections > 0 ? availableWidth / totalSections : innerWidth;

  let currentX = ox + T;

  sections.forEach((section, idx) => {
    const secW = section.widthMm > 0 ? section.widthMm : autoWidth;
    const secTop = mainTop + T;
    const secBot = oy + H - T;
    const secH = secBot - secTop;

    if (idx < totalSections - 1) {
      const partX = currentX + secW;
      s.push(makeRect(partX, mainTop + T, T, H - mainTop + oy - T * 2, { fill: "#c0c0c0", stroke: "#333", strokeWidth: 1 }));
    }

    switch (section.type) {
      case "long_hang":
        drawLongHangSection(s, currentX, secTop, secW, secH);
        break;
      case "short_hang":
        drawShortHangSection(s, currentX, secTop, secW, secH, section.rodHeightPct ?? 60, section.shelfCount ?? 2);
        break;
      case "shelves":
        drawShelvesSection(s, currentX, secTop, secW, secH, section.shelfCount ?? 4);
        break;
      case "drawers":
        drawDrawersSection(s, currentX, secTop, secW, secH, section.drawerCount ?? 3);
        break;
      case "open":
        break;
    }

    if (totalSections > 1) {
      s.push(makeDim(currentX, oy + H + 10, currentX + secW, oy + H + 10, `${Math.round(secW)}`, "horizontal", 20));
    }

    currentX += secW + (idx < totalSections - 1 ? T : 0);
  });

  s.push(...makeDimensions(ox, oy, W, H));
  s.push(makeDim(ox - 30, oy, ox - 30, oy + T, `${T}`, "vertical", -20));

  return s;
}
