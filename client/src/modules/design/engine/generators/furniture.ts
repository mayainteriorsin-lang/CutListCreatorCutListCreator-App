/**
 * Furniture Shape Generators
 * Generators for kitchen, TV unit, dresser, and other furniture modules.
 */

import type { Shape } from "../../types";
import type { ModuleConfig } from "../shapeGenerator";
import {
  makeLine, makeDimensions, drawCarcassOutline,
  drawShelvesSection, drawDrawersSection, drawShutterGrid,
  CARCASS, PARTITION, FITTING, HANDLE, HATCH
} from "./helpers";

export function generateKitchenShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
  const s: Shape[] = [];
  const { widthMm: W, heightMm: H, shutterCount } = c;

  drawCarcassOutline(s, ox, oy, W, H);

  const baseH = 870;
  const wallH = 720;
  const skirting = 100;
  const gap = H - baseH - wallH;

  if (wallH > 0 && gap >= 0) {
    s.push(makeLine(ox, oy + wallH, ox + W, oy + wallH, PARTITION));
    const wallDoors = Math.max(1, Math.ceil(shutterCount / 2));
    drawShutterGrid(s, ox, oy, W, wallH, wallDoors, 1);
  }

  const baseY = oy + H - baseH;
  s.push(makeLine(ox, baseY, ox + W, baseY, PARTITION));
  s.push(makeLine(ox - 20, baseY, ox + W + 20, baseY, { color: "#e0e0e0", thickness: 4 }));

  const skirtY = oy + H - skirting;
  s.push(makeLine(ox, skirtY, ox + W, skirtY, FITTING));

  const baseDoors = Math.max(1, Math.floor(shutterCount / 2));
  const baseDrawH = baseH - skirting;
  const drawerH = Math.min(200, baseDrawH * 0.25);
  s.push(makeLine(ox + 6, baseY + drawerH, ox + W - 6, baseY + drawerH, FITTING));
  const dhx1 = ox + W / 2 - 30;
  const dhy = baseY + drawerH / 2;
  s.push(makeLine(dhx1, dhy, dhx1 + 60, dhy, HANDLE));
  drawShutterGrid(s, ox, baseY + drawerH, W, baseDrawH - drawerH, baseDoors, 1);

  s.push(...makeDimensions(ox, oy, W, H));
  return s;
}

export function generateTvUnitShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
  const s: Shape[] = [];
  const { widthMm: W, heightMm: H, sectionCount } = c;

  drawCarcassOutline(s, ox, oy, W, H);

  const leftW = W * 0.25;
  const rightW = W * 0.25;
  const centerW = W - leftW - rightW;

  s.push(makeLine(ox + leftW, oy, ox + leftW, oy + H, PARTITION));
  s.push(makeLine(ox + leftW + centerW, oy, ox + leftW + centerW, oy + H, PARTITION));

  const shelfCount = Math.max(1, sectionCount);
  drawShelvesSection(s, ox + leftW, oy, centerW, H, shelfCount);
  drawShutterGrid(s, ox, oy, leftW, H, 1, 1);
  drawShutterGrid(s, ox + leftW + centerW, oy, rightW, H, 1, 1);

  s.push(...makeDimensions(ox, oy, W, H));
  return s;
}

export function generateDresserShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
  const s: Shape[] = [];
  const { widthMm: W, heightMm: H } = c;

  const mirrorH = Math.min(400, H * 0.5);
  const bodyH = H - mirrorH;
  const bodyY = oy + mirrorH;

  const mirrorPad = W * 0.15;
  const mirrorW = W - mirrorPad * 2;
  drawCarcassOutline(s, ox + mirrorPad, oy, mirrorW, mirrorH);
  s.push(makeLine(ox + mirrorPad + 10, oy + 10, ox + mirrorPad + mirrorW - 10, oy + mirrorH - 10, HATCH));
  s.push(makeLine(ox + mirrorPad + mirrorW - 10, oy + 10, ox + mirrorPad + 10, oy + mirrorH - 10, HATCH));

  drawCarcassOutline(s, ox, bodyY, W, bodyH);
  drawDrawersSection(s, ox, bodyY, W, bodyH, 3);

  s.push(...makeDimensions(ox, oy, W, H));
  return s;
}

export function generateStudyTableShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
  const s: Shape[] = [];
  const { widthMm: W, heightMm: H } = c;

  s.push(makeLine(ox - 10, oy, ox + W + 10, oy, CARCASS));
  drawCarcassOutline(s, ox, oy, 18, H);
  drawCarcassOutline(s, ox + W - 18, oy, 18, H);
  s.push(makeLine(ox + 18, oy + H - 18, ox + W - 18, oy + H - 18, FITTING));

  const drawerX = ox + W * 0.5;
  const drawerW = W * 0.5 - 18;
  const drawerH = H * 0.35;
  drawDrawersSection(s, drawerX, oy, drawerW, drawerH, 2);
  s.push(makeLine(ox + 18, oy + 50, ox + W * 0.45, oy + 50, HATCH));

  s.push(...makeDimensions(ox, oy, W, H));
  return s;
}

export function generateShoeRackShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
  const s: Shape[] = [];
  const { widthMm: W, heightMm: H, shutterCount, sectionCount } = c;

  drawCarcassOutline(s, ox, oy, W, H);

  const shelfCount = Math.max(3, sectionCount + 2);
  const spacing = H / (shelfCount + 1);
  const FRAME = 18;
  const tiltDrop = 40;

  for (let i = 1; i <= shelfCount; i++) {
    const backY = oy + spacing * i;
    const frontY = backY + tiltDrop;
    s.push(makeLine(ox + FRAME, frontY, ox + W - FRAME, backY, FITTING));
  }

  if (shutterCount > 0) {
    const shutterH = spacing;
    drawShutterGrid(s, ox, oy + H - shutterH, W, shutterH, shutterCount, 1);
  }

  s.push(...makeDimensions(ox, oy, W, H));
  return s;
}

export function generateBookShelfShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
  const s: Shape[] = [];
  const { widthMm: W, heightMm: H, sectionCount } = c;

  drawCarcassOutline(s, ox, oy, W, H);

  const shelfCount = Math.max(4, sectionCount + 3);
  drawShelvesSection(s, ox, oy, W, H, shelfCount);

  if (sectionCount > 1) {
    const cols = Math.min(sectionCount, 3);
    for (let i = 1; i < cols; i++) {
      const dx = ox + (W / cols) * i;
      s.push(makeLine(dx, oy, dx, oy + H, PARTITION));
    }
  }

  s.push(...makeDimensions(ox, oy, W, H));
  return s;
}

export function generateCrockeryUnitShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
  const s: Shape[] = [];
  const { widthMm: W, heightMm: H, shutterCount } = c;

  drawCarcassOutline(s, ox, oy, W, H);

  const upperH = H * 0.6;
  const lowerH = H - upperH;

  s.push(makeLine(ox, oy + upperH, ox + W, oy + upperH, PARTITION));

  const glassShelfCount = 3;
  const glassSpacing = upperH / (glassShelfCount + 1);
  for (let i = 1; i <= glassShelfCount; i++) {
    const sy = oy + glassSpacing * i;
    s.push(makeLine(ox + 10, sy, ox + W - 10, sy, HATCH));
  }

  const glassDoors = Math.max(1, Math.ceil(shutterCount / 2));
  const glassDoorW = (W - 12) / glassDoors;
  for (let i = 0; i < glassDoors; i++) {
    const gx = ox + 6 + i * glassDoorW;
    s.push(makeLine(gx, oy + 6, gx, oy + upperH - 6, HATCH));
  }

  const drawerH = Math.min(150, lowerH * 0.3);
  const lowerY = oy + upperH;
  s.push(makeLine(ox + 6, lowerY + drawerH, ox + W - 6, lowerY + drawerH, FITTING));
  s.push(makeLine(ox + W / 2 - 25, lowerY + drawerH / 2, ox + W / 2 + 25, lowerY + drawerH / 2, HANDLE));
  const baseDoors = Math.max(1, Math.floor(shutterCount / 2));
  drawShutterGrid(s, ox, lowerY + drawerH, W, lowerH - drawerH, baseDoors, 1);

  s.push(...makeDimensions(ox, oy, W, H));
  return s;
}

export function generatePoojaUnitShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
  const s: Shape[] = [];
  const { widthMm: W, heightMm: H, shutterCount } = c;

  drawCarcassOutline(s, ox, oy, W, H);

  const archH = 120;
  const archPad = 30;
  const archPeakX = ox + W / 2;
  const archPeakY = oy + 20;
  const archBaseY = oy + archH;
  s.push(makeLine(archPeakX, archPeakY, ox + archPad, archBaseY, { color: "#92400e", thickness: 2 }));
  s.push(makeLine(archPeakX, archPeakY, ox + W - archPad, archBaseY, { color: "#92400e", thickness: 2 }));
  s.push(makeLine(ox + archPad, archBaseY, ox + W - archPad, archBaseY, { color: "#92400e" }));
  s.push(makeLine(archPeakX - 8, archPeakY + 20, archPeakX, archPeakY + 35, { color: "#92400e" }));
  s.push(makeLine(archPeakX + 8, archPeakY + 20, archPeakX, archPeakY + 35, { color: "#92400e" }));

  const shelfZoneTop = archBaseY + 10;
  const shutterH = H * 0.3;
  const shutterY = oy + H - shutterH;
  const shelfZoneH = shutterY - shelfZoneTop;
  drawShelvesSection(s, ox, shelfZoneTop, W, shelfZoneH, 2);

  s.push(makeLine(ox, shutterY, ox + W, shutterY, PARTITION));
  drawShutterGrid(s, ox, shutterY, W, shutterH, Math.max(1, shutterCount), 1);

  s.push(...makeDimensions(ox, oy, W, H));
  return s;
}

export function generateVanityShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
  const s: Shape[] = [];
  const { widthMm: W, heightMm: H, shutterCount } = c;

  const mirrorH = H * 0.45;
  const counterH = 50;
  const baseH = H - mirrorH - counterH;
  const baseY = oy + mirrorH + counterH;

  drawCarcassOutline(s, ox, oy, W, mirrorH);
  s.push(makeLine(ox + 15, oy + 15, ox + W - 15, oy + mirrorH - 15, HATCH));
  s.push(makeLine(ox + W - 15, oy + 15, ox + 15, oy + mirrorH - 15, HATCH));
  s.push(makeLine(ox - 10, oy + mirrorH, ox + W + 10, oy + mirrorH, CARCASS));

  const basinW = W * 0.4;
  const basinX = ox + (W - basinW) / 2;
  drawCarcassOutline(s, basinX, oy + mirrorH + 5, basinW, counterH - 10);

  drawCarcassOutline(s, ox, baseY, W, baseH);
  drawShutterGrid(s, ox, baseY, W, baseH, Math.max(1, shutterCount), 1);

  s.push(...makeDimensions(ox, oy, W, H));
  return s;
}

export function generateBarUnitShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
  const s: Shape[] = [];
  const { widthMm: W, heightMm: H, shutterCount } = c;

  drawCarcassOutline(s, ox, oy, W, H);
  s.push(makeLine(ox - 15, oy, ox + W + 15, oy, CARCASS));

  const upperH = H * 0.4;
  const lowerH = H - upperH;
  s.push(makeLine(ox, oy + upperH, ox + W, oy + upperH, PARTITION));

  const hangerCount = Math.floor(W / 60);
  const hangerSpacing = W / (hangerCount + 1);
  for (let i = 1; i <= hangerCount; i++) {
    const hx = ox + hangerSpacing * i;
    s.push(makeLine(hx, oy + 10, hx, oy + 50, HATCH));
  }

  const vCount = Math.floor(W / 80);
  const vSpacing = W / (vCount + 1);
  const vTopY = oy + upperH * 0.4;
  const vBotY = oy + upperH - 10;
  for (let i = 1; i <= vCount; i++) {
    const vx = ox + vSpacing * i;
    s.push(makeLine(vx - 15, vTopY, vx, vBotY, FITTING));
    s.push(makeLine(vx + 15, vTopY, vx, vBotY, FITTING));
  }

  drawShutterGrid(s, ox, oy + upperH, W, lowerH, Math.max(1, shutterCount), 1);

  s.push(...makeDimensions(ox, oy, W, H));
  return s;
}

export function generateDisplayUnitShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
  const s: Shape[] = [];
  const { widthMm: W, heightMm: H, shutterCount, sectionCount } = c;

  drawCarcassOutline(s, ox, oy, W, H);

  const sideW = W * 0.3;
  const centerW = W - sideW * 2;

  s.push(makeLine(ox + sideW, oy, ox + sideW, oy + H, PARTITION));
  s.push(makeLine(ox + sideW + centerW, oy, ox + sideW + centerW, oy + H, PARTITION));

  const centerShelfCount = Math.max(3, sectionCount + 1);
  const centerSpacing = H / (centerShelfCount + 1);
  for (let i = 1; i <= centerShelfCount; i++) {
    const sy = oy + centerSpacing * i;
    s.push(makeLine(ox + sideW + 8, sy, ox + sideW + centerW - 8, sy, HATCH));
  }

  drawShutterGrid(s, ox, oy, sideW, H, 1, Math.max(1, Math.ceil(shutterCount / 2)));
  drawShutterGrid(s, ox + sideW + centerW, oy, sideW, H, 1, Math.max(1, Math.ceil(shutterCount / 2)));

  s.push(...makeDimensions(ox, oy, W, H));
  return s;
}

export function generateOtherShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
  const s: Shape[] = [];
  const { widthMm: W, heightMm: H, shutterCount, sectionCount } = c;

  drawCarcassOutline(s, ox, oy, W, H);
  drawShelvesSection(s, ox, oy, W, H, Math.max(1, sectionCount));

  if (shutterCount > 0) {
    const shutterH = H / (sectionCount + 1);
    drawShutterGrid(s, ox, oy + H - shutterH, W, shutterH, shutterCount, 1);
  }

  s.push(...makeDimensions(ox, oy, W, H));
  return s;
}
