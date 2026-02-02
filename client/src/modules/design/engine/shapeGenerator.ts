/**
 * Shape Generator Engine
 *
 * Pure functions that generate SVG shapes for furniture module front-views.
 * Wardrobe uses AutoCAD-style line drawing with interior section details.
 * Each module type has a dedicated sub-generator producing Shape arrays.
 *
 * Moved from: components/ui/moduleShapeGenerator.ts
 */

import { PREDEFINED_TEMPLATES } from "@/modules/library/presets";

// ── Types imported from central types (single source of truth) ────────
import type { Id, LineShape, RectShape, DimensionShape, Shape } from "../types";

// ── Wardrobe Section Types ───────────────────────────────────────────

export type WardrobeSectionType =
  | "long_hang"     // Full-height hanging rod
  | "short_hang"    // Short hanging rod with shelves below
  | "shelves"       // Horizontal shelves
  | "drawers"       // Stacked drawers with handles
  | "open";         // Empty open section

export interface WardrobeSection {
  type: WardrobeSectionType;
  widthMm: number;        // 0 = auto-calculated (equal split)
  shelfCount?: number;    // For "shelves" and "short_hang"
  drawerCount?: number;   // For "drawers"
  rodHeightPct?: number;  // For "short_hang" - % of section height for rod area (default 60)
  shelfPositions?: number[]; // Custom Y positions (as percentage 0-100 of section height)
}

export const DEFAULT_WARDROBE_SECTIONS: WardrobeSection[] = [
  { type: "long_hang", widthMm: 0 },
  { type: "shelves", widthMm: 0, shelfCount: 4 },
  { type: "drawers", widthMm: 0, drawerCount: 3 },
  { type: "shelves", widthMm: 0, shelfCount: 3 },
  { type: "short_hang", widthMm: 0, rodHeightPct: 60, shelfCount: 2 },
];

// ── Module Config ─────────────────────────────────────────────────────

export interface ModuleConfig {
  unitType: string;
  name: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  shutterCount: number;
  sectionCount: number;
  loftEnabled: boolean;
  loftHeightMm: number;
  carcassMaterial: string;
  shutterMaterial: string;
  sections?: WardrobeSection[];
  carcassThicknessMm?: number; // default 18
  centerPostCount?: number; // for wardrobe_carcass: number of vertical partitions
  backPanelThicknessMm?: number; // default 8mm for back panel
  backPanelFit?: "full" | "cut"; // full = W x H, cut = deduct from both
  backPanelDeduction?: number; // back panel back deduction in mm (default 20)
  backPanelFrontDeduction?: number; // back panel front deduction in mm (default 0)
  // Shelf deductions
  shelfBackDeduction?: number; // shelf back deduction in mm (default 20)
  shelfFrontDeduction?: number; // shelf front deduction in mm (default 10)
  // Panel enable/disable for wardrobe_carcass - allows deleting individual panels
  panelsEnabled?: {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
    back: boolean;
  };
  // Skirting options
  skirtingEnabled?: boolean; // Enable bottom skirting
  skirtingHeightMm?: number; // Skirting height in mm (default 115)
  // Edge banding
  gaddiEnabled?: boolean; // Enable gaddi (edge banding)
}

// ── Defaults from Library Presets ─────────────────────────────────────

export const MODULE_DEFAULTS: Record<string, Partial<ModuleConfig>> = {};

for (const template of PREDEFINED_TEMPLATES) {
  if (!MODULE_DEFAULTS[template.unitType]) {
    MODULE_DEFAULTS[template.unitType] = {
      name: template.name,
      widthMm: template.widthMm,
      heightMm: template.heightMm,
      depthMm: template.depthMm,
      shutterCount: template.shutterCount ?? 2,
      sectionCount: template.sectionCount ?? 1,
      loftEnabled: template.loftEnabled ?? false,
      loftHeightMm: template.loftHeightMm ?? 400,
      carcassMaterial: template.carcassMaterial || "plywood",
      shutterMaterial: template.shutterMaterial || "laminate",
    };
  }
}

// ── ID Generator ──────────────────────────────────────────────────────

const uid = () => `MOD-${Math.random().toString(36).slice(2, 9)}`;

// ── Line Weight Presets (AutoCAD convention) ──────────────────────────

const CARCASS = { color: "#e0e0e0", thickness: 3 };   // Thick: outer walls (white on dark)
const PARTITION = { color: "#b0b0b0", thickness: 2 };  // Medium: internal dividers
const FITTING = { color: "#808080", thickness: 1 };    // Thin: shelves, rods
const HANDLE = { color: "#00e5ff", thickness: 2.5 };   // Handles (cyan accent)
const HATCH = { color: "#555", thickness: 0.5 };       // Light detail lines

// ── Shape Helpers ─────────────────────────────────────────────────────

function makeLine(
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

function makeRect(
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

function makeDim(
  x1: number, y1: number, x2: number, y2: number,
  label: string, dimType: "horizontal" | "vertical",
  offset?: number
): DimensionShape {
  return { id: uid(), type: "dimension", x1, y1, x2, y2, label, dimType, offset: offset ?? 30 };
}

// ── Carcass outline (4 lines) ─────────────────────────────────────────

function drawCarcassOutline(s: Shape[], ox: number, oy: number, w: number, h: number) {
  s.push(makeLine(ox, oy, ox + w, oy, CARCASS));          // Top
  s.push(makeLine(ox + w, oy, ox + w, oy + h, CARCASS));  // Right
  s.push(makeLine(ox + w, oy + h, ox, oy + h, CARCASS));  // Bottom
  s.push(makeLine(ox, oy + h, ox, oy, CARCASS));           // Left
}

// ── Dimension annotations ─────────────────────────────────────────────

function makeDimensions(
  ox: number, oy: number, w: number, h: number
): Shape[] {
  return [
    makeDim(ox, oy + h + 40, ox + w, oy + h + 40, `${Math.round(w)}`, "horizontal", 30),
    makeDim(ox - 50, oy, ox - 50, oy + h, `${Math.round(h)}`, "vertical", -30),
  ];
}

// ── Wardrobe Section Drawers ──────────────────────────────────────────

function drawLongHangSection(
  s: Shape[], x: number, y: number, w: number, h: number
) {
  // Hanging rod (horizontal line near top)
  const rodY = y + 50;
  s.push(makeLine(x + 8, rodY, x + w - 8, rodY, FITTING));
  // Rod bracket marks
  s.push(makeLine(x + 8, rodY - 6, x + 8, rodY + 6, FITTING));
  s.push(makeLine(x + w - 8, rodY - 6, x + w - 8, rodY + 6, FITTING));

  // Clothes hangers (3-5 depending on width)
  const hangerCount = Math.max(2, Math.min(5, Math.floor(w / 100)));
  const hangerSpacing = (w - 40) / (hangerCount + 1);
  for (let i = 1; i <= hangerCount; i++) {
    const hx = x + 20 + hangerSpacing * i;
    // Hanger hook (small inverted V)
    s.push(makeLine(hx, rodY, hx, rodY + 8, HATCH));
    // Hanger shoulders
    s.push(makeLine(hx - 18, rodY + 16, hx, rodY + 8, HATCH));
    s.push(makeLine(hx + 18, rodY + 16, hx, rodY + 8, HATCH));
    // Garment silhouette (two vertical lines)
    const clotheLen = h * 0.5 + (i % 2 === 0 ? 40 : 0);
    s.push(makeLine(hx - 16, rodY + 22, hx - 14, rodY + clotheLen, HATCH));
    s.push(makeLine(hx + 16, rodY + 22, hx + 14, rodY + clotheLen, HATCH));
    // Bottom of garment
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

  // Separator line between hang and shelf areas
  s.push(makeLine(x + 4, shelfY, x + w - 4, shelfY, PARTITION));

  // Hanging rod (upper area)
  const rodY = y + 45;
  s.push(makeLine(x + 8, rodY, x + w - 8, rodY, FITTING));
  // Rod brackets
  s.push(makeLine(x + 8, rodY - 5, x + 8, rodY + 5, FITTING));
  s.push(makeLine(x + w - 8, rodY - 5, x + w - 8, rodY + 5, FITTING));

  // Shorter hangers (2-3)
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

  // Shelves (lower area)
  const count = Math.max(1, shelfCount);
  const spacing = shelfAreaH / (count + 1);
  for (let i = 1; i <= count; i++) {
    const sy = shelfY + spacing * i;
    s.push(makeLine(x + 4, sy, x + w - 4, sy, FITTING));
  }
}

function drawShelvesSection(
  s: Shape[], x: number, y: number, w: number, h: number,
  count: number
) {
  const shelfCount = Math.max(1, count);
  const spacing = h / (shelfCount + 1);
  for (let i = 1; i <= shelfCount; i++) {
    const sy = y + spacing * i;
    s.push(makeLine(x + 4, sy, x + w - 4, sy, FITTING));
  }
}

function drawDrawersSection(
  s: Shape[], x: number, y: number, w: number, h: number,
  count: number
) {
  const drawerCount = Math.max(1, count);
  const drawerH = h / drawerCount;
  const PAD = 6;

  for (let i = 0; i < drawerCount; i++) {
    const dy = y + drawerH * i;

    // Drawer box outline (4 lines)
    s.push(makeLine(x + PAD, dy + PAD, x + w - PAD, dy + PAD, FITTING));
    s.push(makeLine(x + w - PAD, dy + PAD, x + w - PAD, dy + drawerH - PAD, FITTING));
    s.push(makeLine(x + w - PAD, dy + drawerH - PAD, x + PAD, dy + drawerH - PAD, FITTING));
    s.push(makeLine(x + PAD, dy + drawerH - PAD, x + PAD, dy + PAD, FITTING));

    // Handle (centered horizontal bar)
    const hCenterY = dy + drawerH / 2;
    const handleW = Math.min(50, w * 0.25);
    const hx = x + w / 2;
    s.push(makeLine(hx - handleW / 2, hCenterY, hx + handleW / 2, hCenterY, HANDLE));
  }
}

// ── Generate default sections fallback ────────────────────────────────

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
  // 4+ sections: use the full preset
  return [...DEFAULT_WARDROBE_SECTIONS].slice(0, count);
}

// ── Wardrobe Shape Generator (AutoCAD-style with real thickness) ──────

function generateWardrobeShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
  const s: Shape[] = [];
  const { widthMm: W, heightMm: H, loftEnabled, loftHeightMm } = c;
  const T = c.carcassThicknessMm ?? 18;

  // ── Draw carcass panels with REAL thickness ──

  // Left side panel (T x H) - filled rectangle
  s.push(makeRect(ox, oy, T, H, { fill: "#d4d4d4", stroke: "#333", strokeWidth: 1 }));

  // Right side panel (T x H)
  s.push(makeRect(ox + W - T, oy, T, H, { fill: "#d4d4d4", stroke: "#333", strokeWidth: 1 }));

  // Top panel ((W-2T) x T) - sits between sides
  s.push(makeRect(ox + T, oy, W - T * 2, T, { fill: "#d4d4d4", stroke: "#333", strokeWidth: 1 }));

  // Bottom panel ((W-2T) x T)
  s.push(makeRect(ox + T, oy + H - T, W - T * 2, T, { fill: "#d4d4d4", stroke: "#333", strokeWidth: 1 }));

  // Loft section
  let mainTop = oy;
  if (loftEnabled && loftHeightMm > 0) {
    const loftY = oy + loftHeightMm;

    // Loft bottom panel (shelf)
    s.push(makeRect(ox + T, loftY - T, W - T * 2, T, { fill: "#d4d4d4", stroke: "#333", strokeWidth: 1 }));
    mainTop = loftY;

    // Loft internal dividers (evenly spaced vertical lines)
    const loftDoors = Math.min(c.shutterCount || 3, 4);
    if (loftDoors > 1) {
      const loftDoorW = (W - T * 2) / loftDoors;
      for (let i = 1; i < loftDoors; i++) {
        const lx = ox + T + loftDoorW * i;
        s.push(makeLine(lx, oy + T, lx, loftY - T, FITTING));
      }
    }

    // Loft handles (centered horizontal bars on each door)
    const loftDoorW2 = (W - T * 2) / Math.max(1, loftDoors);
    for (let i = 0; i < loftDoors; i++) {
      const doorCx = ox + T + loftDoorW2 * i + loftDoorW2 / 2;
      const doorCy = oy + T + (loftHeightMm - T * 2) / 2;
      const handleW = Math.min(40, loftDoorW2 * 0.3);
      s.push(makeLine(doorCx - handleW / 2, doorCy, doorCx + handleW / 2, doorCy, HANDLE));
    }

    // Loft height dimension
    s.push(makeDim(ox + W + 20, oy, ox + W + 20, loftY, `${loftHeightMm}`, "vertical", 30));
  }

  const mainH = (oy + H) - mainTop;

  // Sections
  const sections = (c.sections && c.sections.length > 0)
    ? c.sections
    : generateDefaultSections(c.sectionCount);

  const totalSections = sections.length;
  const innerWidth = W - T * 2;
  // Account for partition thickness in section width calculation
  const partitionCount = Math.max(0, totalSections - 1);
  const availableWidth = innerWidth - partitionCount * T;
  const autoWidth = totalSections > 0 ? availableWidth / totalSections : innerWidth;

  let currentX = ox + T;

  sections.forEach((section, idx) => {
    const secW = section.widthMm > 0 ? section.widthMm : autoWidth;
    const secTop = mainTop + T;
    const secBot = oy + H - T;
    const secH = secBot - secTop;

    // Vertical partition with REAL thickness (except after last section)
    if (idx < totalSections - 1) {
      const partX = currentX + secW;
      // Draw partition as filled rectangle
      s.push(makeRect(partX, mainTop + T, T, H - mainTop + oy - T * 2, { fill: "#c0c0c0", stroke: "#333", strokeWidth: 1 }));
    }

    // Section internal fittings
    switch (section.type) {
      case "long_hang":
        drawLongHangSection(s, currentX, secTop, secW, secH);
        break;
      case "short_hang":
        drawShortHangSection(s, currentX, secTop, secW, secH,
          section.rodHeightPct ?? 60, section.shelfCount ?? 2);
        break;
      case "shelves":
        drawShelvesSection(s, currentX, secTop, secW, secH,
          section.shelfCount ?? 4);
        break;
      case "drawers":
        drawDrawersSection(s, currentX, secTop, secW, secH,
          section.drawerCount ?? 3);
        break;
      case "open":
        // Empty — just the frame is enough
        break;
    }

    // Section width dimension at bottom
    if (totalSections > 1) {
      s.push(makeDim(currentX, oy + H + 10, currentX + secW, oy + H + 10,
        `${Math.round(secW)}`, "horizontal", 20));
    }

    // Move to next section (add partition thickness)
    currentX += secW + (idx < totalSections - 1 ? T : 0);
  });

  // Overall dimensions
  s.push(...makeDimensions(ox, oy, W, H));

  // Thickness label
  s.push(makeDim(ox - 30, oy, ox - 30, oy + T, `${T}`, "vertical", -20));

  return s;
}

// ── Other Module Sub-Generators (kept from previous impl) ─────────────

function generateKitchenShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
  const s: Shape[] = [];
  const { widthMm: W, heightMm: H, shutterCount } = c;

  drawCarcassOutline(s, ox, oy, W, H);

  const baseH = 870;
  const wallH = 720;
  const skirting = 100;
  const gap = H - baseH - wallH;

  // Wall cabinet section (top)
  if (wallH > 0 && gap >= 0) {
    s.push(makeLine(ox, oy + wallH, ox + W, oy + wallH, PARTITION));
    const wallDoors = Math.max(1, Math.ceil(shutterCount / 2));
    drawShutterGrid(s, ox, oy, W, wallH, wallDoors, 1);
  }

  // Base cabinet section
  const baseY = oy + H - baseH;
  s.push(makeLine(ox, baseY, ox + W, baseY, PARTITION));

  // Counter-top line (thick)
  s.push(makeLine(ox - 20, baseY, ox + W + 20, baseY, { color: "#e0e0e0", thickness: 4 }));

  // Skirting
  const skirtY = oy + H - skirting;
  s.push(makeLine(ox, skirtY, ox + W, skirtY, FITTING));

  // Base shutters
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

function generateTvUnitShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
  const s: Shape[] = [];
  const { widthMm: W, heightMm: H, sectionCount } = c;

  drawCarcassOutline(s, ox, oy, W, H);

  const leftW = W * 0.25;
  const rightW = W * 0.25;
  const centerW = W - leftW - rightW;

  // Vertical dividers
  s.push(makeLine(ox + leftW, oy, ox + leftW, oy + H, PARTITION));
  s.push(makeLine(ox + leftW + centerW, oy, ox + leftW + centerW, oy + H, PARTITION));

  // Center: open shelves
  const shelfCount = Math.max(1, sectionCount);
  drawShelvesSection(s, ox + leftW, oy, centerW, H, shelfCount);

  // Left & right: shutters
  drawShutterGrid(s, ox, oy, leftW, H, 1, 1);
  drawShutterGrid(s, ox + leftW + centerW, oy, rightW, H, 1, 1);

  s.push(...makeDimensions(ox, oy, W, H));
  return s;
}

function generateDresserShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
  const s: Shape[] = [];
  const { widthMm: W, heightMm: H } = c;

  const mirrorH = Math.min(400, H * 0.5);
  const bodyH = H - mirrorH;
  const bodyY = oy + mirrorH;

  // Mirror area
  const mirrorPad = W * 0.15;
  const mirrorW = W - mirrorPad * 2;
  drawCarcassOutline(s, ox + mirrorPad, oy, mirrorW, mirrorH);
  s.push(makeLine(ox + mirrorPad + 10, oy + 10, ox + mirrorPad + mirrorW - 10, oy + mirrorH - 10, HATCH));
  s.push(makeLine(ox + mirrorPad + mirrorW - 10, oy + 10, ox + mirrorPad + 10, oy + mirrorH - 10, HATCH));

  // Main body
  drawCarcassOutline(s, ox, bodyY, W, bodyH);

  const drawerCount = 3;
  drawDrawersSection(s, ox, bodyY, W, bodyH, drawerCount);

  s.push(...makeDimensions(ox, oy, W, H));
  return s;
}

function generateStudyTableShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
  const s: Shape[] = [];
  const { widthMm: W, heightMm: H } = c;

  // Table top (thick line)
  s.push(makeLine(ox - 10, oy, ox + W + 10, oy, CARCASS));

  // Left leg panel (4 lines)
  drawCarcassOutline(s, ox, oy, 18, H);

  // Right leg panel
  drawCarcassOutline(s, ox + W - 18, oy, 18, H);

  // Back panel
  s.push(makeLine(ox + 18, oy + H - 18, ox + W - 18, oy + H - 18, FITTING));

  // Drawer section (right half)
  const drawerX = ox + W * 0.5;
  const drawerW = W * 0.5 - 18;
  const drawerH = H * 0.35;
  drawDrawersSection(s, drawerX, oy, drawerW, drawerH, 2);

  // Keyboard tray line
  s.push(makeLine(ox + 18, oy + 50, ox + W * 0.45, oy + 50, HATCH));

  s.push(...makeDimensions(ox, oy, W, H));
  return s;
}

function generateShoeRackShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
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

function generateBookShelfShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
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

function generateCrockeryUnitShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
  const s: Shape[] = [];
  const { widthMm: W, heightMm: H, shutterCount } = c;

  drawCarcassOutline(s, ox, oy, W, H);

  const upperH = H * 0.6;
  const lowerH = H - upperH;

  s.push(makeLine(ox, oy + upperH, ox + W, oy + upperH, PARTITION));

  // Upper glass shelves
  const glassShelfCount = 3;
  const glassSpacing = upperH / (glassShelfCount + 1);
  for (let i = 1; i <= glassShelfCount; i++) {
    const sy = oy + glassSpacing * i;
    s.push(makeLine(ox + 10, sy, ox + W - 10, sy, HATCH));
  }

  // Glass door outlines
  const glassDoors = Math.max(1, Math.ceil(shutterCount / 2));
  const glassDoorW = (W - 12) / glassDoors;
  for (let i = 0; i < glassDoors; i++) {
    const gx = ox + 6 + i * glassDoorW;
    s.push(makeLine(gx, oy + 6, gx, oy + upperH - 6, HATCH));
  }

  // Lower section
  const drawerH = Math.min(150, lowerH * 0.3);
  const lowerY = oy + upperH;
  s.push(makeLine(ox + 6, lowerY + drawerH, ox + W - 6, lowerY + drawerH, FITTING));
  s.push(makeLine(ox + W / 2 - 25, lowerY + drawerH / 2, ox + W / 2 + 25, lowerY + drawerH / 2, HANDLE));
  const baseDoors = Math.max(1, Math.floor(shutterCount / 2));
  drawShutterGrid(s, ox, lowerY + drawerH, W, lowerH - drawerH, baseDoors, 1);

  s.push(...makeDimensions(ox, oy, W, H));
  return s;
}

function generatePoojaUnitShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
  const s: Shape[] = [];
  const { widthMm: W, heightMm: H, shutterCount } = c;

  drawCarcassOutline(s, ox, oy, W, H);

  // Bell arch
  const archH = 120;
  const archPad = 30;
  const archPeakX = ox + W / 2;
  const archPeakY = oy + 20;
  const archBaseY = oy + archH;
  s.push(makeLine(archPeakX, archPeakY, ox + archPad, archBaseY, { color: "#92400e", thickness: 2 }));
  s.push(makeLine(archPeakX, archPeakY, ox + W - archPad, archBaseY, { color: "#92400e", thickness: 2 }));
  s.push(makeLine(ox + archPad, archBaseY, ox + W - archPad, archBaseY, { color: "#92400e" }));

  // Bell symbol
  s.push(makeLine(archPeakX - 8, archPeakY + 20, archPeakX, archPeakY + 35, { color: "#92400e" }));
  s.push(makeLine(archPeakX + 8, archPeakY + 20, archPeakX, archPeakY + 35, { color: "#92400e" }));

  // Inner shelves
  const shelfZoneTop = archBaseY + 10;
  const shutterH = H * 0.3;
  const shutterY = oy + H - shutterH;
  const shelfZoneH = shutterY - shelfZoneTop;
  drawShelvesSection(s, ox, shelfZoneTop, W, shelfZoneH, 2);

  // Bottom shutters
  s.push(makeLine(ox, shutterY, ox + W, shutterY, PARTITION));
  drawShutterGrid(s, ox, shutterY, W, shutterH, Math.max(1, shutterCount), 1);

  s.push(...makeDimensions(ox, oy, W, H));
  return s;
}

function generateVanityShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
  const s: Shape[] = [];
  const { widthMm: W, heightMm: H, shutterCount } = c;

  const mirrorH = H * 0.45;
  const counterH = 50;
  const baseH = H - mirrorH - counterH;
  const baseY = oy + mirrorH + counterH;

  // Mirror area
  drawCarcassOutline(s, ox, oy, W, mirrorH);
  s.push(makeLine(ox + 15, oy + 15, ox + W - 15, oy + mirrorH - 15, HATCH));
  s.push(makeLine(ox + W - 15, oy + 15, ox + 15, oy + mirrorH - 15, HATCH));

  // Counter-top
  s.push(makeLine(ox - 10, oy + mirrorH, ox + W + 10, oy + mirrorH, CARCASS));

  // Basin cutout
  const basinW = W * 0.4;
  const basinX = ox + (W - basinW) / 2;
  drawCarcassOutline(s, basinX, oy + mirrorH + 5, basinW, counterH - 10);

  // Base cabinet
  drawCarcassOutline(s, ox, baseY, W, baseH);
  drawShutterGrid(s, ox, baseY, W, baseH, Math.max(1, shutterCount), 1);

  s.push(...makeDimensions(ox, oy, W, H));
  return s;
}

function generateBarUnitShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
  const s: Shape[] = [];
  const { widthMm: W, heightMm: H, shutterCount } = c;

  drawCarcassOutline(s, ox, oy, W, H);

  // Counter-top
  s.push(makeLine(ox - 15, oy, ox + W + 15, oy, CARCASS));

  const upperH = H * 0.4;
  const lowerH = H - upperH;
  s.push(makeLine(ox, oy + upperH, ox + W, oy + upperH, PARTITION));

  // Glass rack: short vertical hanger lines
  const hangerCount = Math.floor(W / 60);
  const hangerSpacing = W / (hangerCount + 1);
  for (let i = 1; i <= hangerCount; i++) {
    const hx = ox + hangerSpacing * i;
    s.push(makeLine(hx, oy + 10, hx, oy + 50, HATCH));
  }

  // Bottle storage: V-shapes
  const vCount = Math.floor(W / 80);
  const vSpacing = W / (vCount + 1);
  const vTopY = oy + upperH * 0.4;
  const vBotY = oy + upperH - 10;
  for (let i = 1; i <= vCount; i++) {
    const vx = ox + vSpacing * i;
    s.push(makeLine(vx - 15, vTopY, vx, vBotY, FITTING));
    s.push(makeLine(vx + 15, vTopY, vx, vBotY, FITTING));
  }

  // Lower shutters
  drawShutterGrid(s, ox, oy + upperH, W, lowerH, Math.max(1, shutterCount), 1);

  s.push(...makeDimensions(ox, oy, W, H));
  return s;
}

function generateDisplayUnitShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
  const s: Shape[] = [];
  const { widthMm: W, heightMm: H, shutterCount, sectionCount } = c;

  drawCarcassOutline(s, ox, oy, W, H);

  const sideW = W * 0.3;
  const centerW = W - sideW * 2;

  s.push(makeLine(ox + sideW, oy, ox + sideW, oy + H, PARTITION));
  s.push(makeLine(ox + sideW + centerW, oy, ox + sideW + centerW, oy + H, PARTITION));

  // Center: glass shelves
  const centerShelfCount = Math.max(3, sectionCount + 1);
  const centerSpacing = H / (centerShelfCount + 1);
  for (let i = 1; i <= centerShelfCount; i++) {
    const sy = oy + centerSpacing * i;
    s.push(makeLine(ox + sideW + 8, sy, ox + sideW + centerW - 8, sy, HATCH));
  }

  // Side shutters
  drawShutterGrid(s, ox, oy, sideW, H, 1, Math.max(1, Math.ceil(shutterCount / 2)));
  drawShutterGrid(s, ox + sideW + centerW, oy, sideW, H, 1, Math.max(1, Math.ceil(shutterCount / 2)));

  s.push(...makeDimensions(ox, oy, W, H));
  return s;
}

function generateOtherShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
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

// ── Shutter Grid (used by non-wardrobe modules) ──────────────────────

function drawShutterGrid(
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

      // Shutter outline (4 lines)
      s.push(makeLine(sx, sy, sx + shutterW, sy, FITTING));
      s.push(makeLine(sx + shutterW, sy, sx + shutterW, sy + shutterH, FITTING));
      s.push(makeLine(sx + shutterW, sy + shutterH, sx, sy + shutterH, FITTING));
      s.push(makeLine(sx, sy + shutterH, sx, sy, FITTING));

      // Handle
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

// ── Wardrobe Carcass Shape Generator (Simple with real thickness) ─────

function generateWardrobeCarcassShapes(c: ModuleConfig, ox: number, oy: number): Shape[] {
  const s: Shape[] = [];
  const { widthMm: W, heightMm: H, depthMm: D } = c;
  const T = c.carcassThicknessMm ?? 18;
  const postCount = c.centerPostCount ?? 0;

  // Skirting configuration
  const skirtingEnabled = c.skirtingEnabled ?? false;
  const skirtingH = skirtingEnabled ? (c.skirtingHeightMm ?? 115) : 0;

  // Panel enable/disable state (default all enabled, with explicit defaults for each property)
  const rawPanels = c.panelsEnabled ?? {};
  const panels = {
    top: rawPanels.top !== false,
    bottom: rawPanels.bottom !== false,
    left: rawPanels.left !== false,
    right: rawPanels.right !== false,
    back: rawPanels.back !== false,
  };

  // ── Draw carcass panels with REAL thickness and specific IDs ──

  // Left side panel (T x H) - filled rectangle
  if (panels.left) {
    s.push(makeRect(ox, oy, T, H, { fill: "#d4d4d4", stroke: "#333", strokeWidth: 1, id: "MOD-LEFT" }));
  } else {
    // Show disabled panel as dashed outline
    s.push(makeRect(ox, oy, T, H, { fill: "none", stroke: "#ccc", strokeWidth: 0.5, id: "MOD-LEFT-DISABLED" }));
  }

  // Right side panel (T x H) - ALWAYS draw to debug
  s.push(makeRect(ox + W - T, oy, T, H, { fill: "#d4d4d4", stroke: "#333", strokeWidth: 1, id: "MOD-RIGHT" }));

  // Top panel ((W-2T) x T) - sits between sides
  if (panels.top) {
    s.push(makeRect(ox + T, oy, W - T * 2, T, { fill: "#d4d4d4", stroke: "#333", strokeWidth: 1, id: "MOD-TOP" }));
  } else {
    s.push(makeRect(ox + T, oy, W - T * 2, T, { fill: "none", stroke: "#ccc", strokeWidth: 0.5, id: "MOD-TOP-DISABLED" }));
  }

  // Bottom panel ((W-2T) x T) - moves up when skirting is enabled
  const bottomY = oy + H - T - skirtingH; // Move up by skirting height
  if (panels.bottom) {
    s.push(makeRect(ox + T, bottomY, W - T * 2, T, { fill: "#d4d4d4", stroke: "#333", strokeWidth: 1, id: "MOD-BOTTOM" }));
  } else {
    s.push(makeRect(ox + T, bottomY, W - T * 2, T, { fill: "none", stroke: "#ccc", strokeWidth: 0.5, id: "MOD-BOTTOM-DISABLED" }));
  }

  // Skirting panel (W x skirtingH) - full width at bottom
  if (skirtingEnabled) {
    s.push(makeRect(ox, oy + H - skirtingH, W, skirtingH, { fill: "#b8b8b8", stroke: "#333", strokeWidth: 1, id: "MOD-SKIRTING" }));
  }

  // Back panel (shown as lighter rectangle in center area) - adjust for skirting
  if (panels.back) {
    const backInset = 5; // Visual inset to show back panel is behind
    const backH = H - T * 2 - skirtingH; // Adjust height for skirting
    s.push(makeRect(ox + T + backInset, oy + T + backInset, W - T * 2 - backInset * 2, backH - backInset * 2,
      { fill: "#f0f0f0", stroke: "#999", strokeWidth: 0.5, id: "MOD-BACK" }));
  }

  // Center posts (vertical partitions) with REAL thickness
  const innerW = W - T * 2; // space between left and right sides
  const totalPostThickness = postCount * T;
  const sectionCount = postCount + 1;
  const sectionW = (innerW - totalPostThickness) / sectionCount;
  const postH = H - T * 2 - skirtingH; // Adjust for skirting

  if (postCount > 0) {
    for (let i = 1; i <= postCount; i++) {
      const postX = ox + T + sectionW * i + T * (i - 1);
      // Draw center post as filled rectangle with specific ID
      s.push(makeRect(postX, oy + T, T, postH, { fill: "#c0c0c0", stroke: "#333", strokeWidth: 1, id: `MOD-POST-${i}` }));
    }

    // Section width dimensions
    let currentX = ox + T;
    for (let i = 0; i < sectionCount; i++) {
      s.push(makeDim(currentX, oy + H + 10, currentX + sectionW, oy + H + 10,
        `${Math.round(sectionW)}`, "horizontal", 20));
      currentX += sectionW + T;
    }
  }

  // Draw shelves in each section based on sections config (with REAL thickness)
  if (c.sections && c.sections.length > 0) {
    let currentX = ox + T;
    const secH = H - T * 2 - skirtingH; // Inner height (excluding top, bottom panels, and skirting)
    const secY = oy + T;

    for (let i = 0; i < c.sections.length && i < sectionCount; i++) {
      const section = c.sections[i];
      const secW = section.widthMm > 0 ? section.widthMm : sectionW;
      const shelfCount = section.shelfCount ?? 0;

      // Draw shelf rectangles with real thickness for this section
      if (shelfCount > 0) {
        const hasCustomPositions = section.shelfPositions && section.shelfPositions.length > 0;

        for (let j = 1; j <= shelfCount; j++) {
          let shelfY: number;

          if (hasCustomPositions && section.shelfPositions![j - 1] !== undefined) {
            // Use custom position (stored as percentage of section height)
            const pct = section.shelfPositions![j - 1];
            shelfY = secY + (pct / 100) * secH;
          } else {
            // Default: evenly spaced
            const totalShelfThickness = shelfCount * T;
            const availableHeight = secH - totalShelfThickness;
            const spacing = availableHeight / (shelfCount + 1);
            shelfY = secY + spacing * j + T * (j - 1);
          }

          // Draw shelf as filled rectangle with real thickness
          s.push(makeRect(currentX, shelfY, secW, T, {
            fill: "#d4d4d4",
            stroke: "#333",
            strokeWidth: 1,
            id: `MOD-SHELF-${i + 1}-${j}`
          }));
        }
      }

      currentX += secW + T;
    }
  }

  // Overall dimensions
  s.push(...makeDimensions(ox, oy, W, H));

  // Thickness label on left
  s.push(makeDim(ox - 30, oy, ox - 30, oy + T, `${T}mm`, "vertical", -20));

  // Depth dimension (on right side)
  s.push(makeDim(ox + W + 50, oy, ox + W + 50, oy + D, `D:${D}`, "vertical", 30));

  return s;
}

// ── Main Dispatcher ───────────────────────────────────────────────────

const GENERATORS: Record<string, (c: ModuleConfig, ox: number, oy: number) => Shape[]> = {
  wardrobe_carcass: generateWardrobeCarcassShapes,
  wardrobe: generateWardrobeShapes,
  kitchen: generateKitchenShapes,
  tv_unit: generateTvUnitShapes,
  dresser: generateDresserShapes,
  study_table: generateStudyTableShapes,
  shoe_rack: generateShoeRackShapes,
  book_shelf: generateBookShelfShapes,
  crockery_unit: generateCrockeryUnitShapes,
  pooja_unit: generatePoojaUnitShapes,
  vanity: generateVanityShapes,
  bar_unit: generateBarUnitShapes,
  display_unit: generateDisplayUnitShapes,
  other: generateOtherShapes,
};

export function generateModuleShapes(
  config: ModuleConfig,
  origin: { x: number; y: number }
): Shape[] {
  const generator = GENERATORS[config.unitType] ?? generateOtherShapes;
  return generator(config, origin.x, origin.y);
}
