/**
 * Panel Generator Engine
 *
 * Converts a ModuleConfig into production cutlist panels.
 * Each panel has dimensions, quantity, type, and material info.
 *
 * Moved from: components/ui/modulePanelGenerator.ts
 */

import type { ModuleConfig } from "./shapeGenerator";

// =============================================================================
// SHEET OPTIMIZATION CONSTANTS
// =============================================================================
export const SHEET_WIDTH = 1200;  // Standard plywood sheet width (mm)
export const SHEET_HEIGHT = 2400; // Standard plywood sheet height (mm)

/**
 * Check if a panel fits within standard sheet (either orientation)
 */
export function fitsInSheet(panelW: number, panelH: number): boolean {
  return (panelW <= SHEET_WIDTH && panelH <= SHEET_HEIGHT) ||
         (panelW <= SHEET_HEIGHT && panelH <= SHEET_WIDTH);
}

// =============================================================================
// UI CUTTING LIST TYPES (simplified for display)
// =============================================================================
export interface CuttingListItem {
  name: string;
  qty: number;
  width: number;   // mm
  height: number;  // mm
  thickness: number; // mm
  material: string;
  fits: boolean;   // fits in standard sheet
}

/**
 * Generate simplified cutting list for UI display
 * Uses the same logic as generateModuleCutlistPanels but with sheet fit info
 */
export function generateCuttingList(config: ModuleConfig): CuttingListItem[] {
  const panels = generateModuleCutlistPanels(config);
  return panels.map(p => ({
    name: p.name,
    qty: p.qty,
    width: p.widthMm,
    height: p.heightMm,
    thickness: p.thicknessMm,
    material: p.material,
    fits: fitsInSheet(p.widthMm, p.heightMm),
  }));
}

// =============================================================================
// BACK PANEL POSITION CALCULATOR (for UI preview)
// =============================================================================
export interface BackPanelLayout {
  postPositions: number[];
  panelWidths: number[];
  panelFits: boolean[];
  backH: number;
  backW: number;
}

/**
 * Calculate center post positions and back panel sections
 * Used for UI preview display
 */
export function calculateBackPanelLayout(
  widthMm: number,
  heightMm: number,
  carcassT: number,
  postCount: number,
  edgeDeduction: number,
  panelsEnabled?: { top: boolean; bottom: boolean; left: boolean; right: boolean; back: boolean }
): BackPanelLayout {
  const panels = panelsEnabled ?? { top: true, bottom: true, left: true, right: true, back: true };
  const leftDeduct = panels.left ? edgeDeduction : 0;
  const rightDeduct = panels.right ? edgeDeduction : 0;
  const topDeduct = panels.top ? edgeDeduction : 0;
  const bottomDeduct = panels.bottom ? edgeDeduction : 0;

  const backW = widthMm - leftDeduct - rightDeduct;
  const backH = heightMm - topDeduct - bottomDeduct;
  const sectionCount = postCount + 1;
  const sectionW = Math.round(backW / sectionCount);

  if (postCount === 0) {
    return {
      postPositions: [],
      panelWidths: [backW],
      panelFits: [fitsInSheet(backW, backH)],
      backH,
      backW
    };
  }

  const postPositions: number[] = [];
  const panelWidths: number[] = [];
  const panelFits: boolean[] = [];

  for (let i = 1; i <= postCount; i++) {
    postPositions.push(Math.round(widthMm * i / sectionCount));
  }

  for (let i = 0; i < sectionCount; i++) {
    panelWidths.push(sectionW);
    panelFits.push(fitsInSheet(sectionW, backH));
  }

  return { postPositions, panelWidths, panelFits, backH, backW };
}

export interface ModuleCutlistPanel {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  thicknessMm: number; // panel material thickness
  qty: number;
  panelType: "carcass" | "shelf" | "partition" | "drawer_front" | "drawer_side" |
             "drawer_bottom" | "back" | "shutter" | "loft_shutter";
  material: string;
  grainDirection: boolean;
}

const uid = () => `PNL-${Math.random().toString(36).slice(2, 9)}`;

/**
 * Wardrobe Carcass Panel Generator
 * Simple formula:
 * - Left/Right sides: D x H (full depth, full height) - 18mm carcass
 * - Top/Bottom: (W - 2T) x D (sit between sides) - 18mm carcass
 * - Back: based on backPanelFit option (full/minus_width/minus_height/minus_both)
 * - Center Posts: D x (H - 2T) (fit between top & bottom) - 18mm carcass
 */
function generateWardrobeCarcassPanels(config: ModuleConfig): ModuleCutlistPanel[] {
  const panels: ModuleCutlistPanel[] = [];
  const T = config.carcassThicknessMm ?? 18;
  const BT = config.backPanelThicknessMm ?? 10; // Back panel thickness
  const { widthMm: W, heightMm: H, depthMm: D } = config;
  const material = config.carcassMaterial;
  const postCount = config.centerPostCount ?? 0;

  // Panel enable/disable state (default all enabled)
  const panelsEnabled = config.panelsEnabled ?? { top: true, bottom: true, left: true, right: true, back: true };

  // Left Side: D x H (18mm) - only if enabled
  if (panelsEnabled.left) {
    panels.push({
      id: uid(), name: "Left Side", widthMm: D, heightMm: H, thicknessMm: T,
      qty: 1, panelType: "carcass", material, grainDirection: true,
    });
  }

  // Right Side: D x H (18mm) - only if enabled
  if (panelsEnabled.right) {
    panels.push({
      id: uid(), name: "Right Side", widthMm: D, heightMm: H, thicknessMm: T,
      qty: 1, panelType: "carcass", material, grainDirection: true,
    });
  }

  // Top: (W - 2T) x D (18mm) - only if enabled
  if (panelsEnabled.top) {
    panels.push({
      id: uid(), name: "Top", widthMm: W - T * 2, heightMm: D, thicknessMm: T,
      qty: 1, panelType: "carcass", material, grainDirection: true,
    });
  }

  // Bottom: (W - 2T) x D (18mm) - only if enabled
  if (panelsEnabled.bottom) {
    panels.push({
      id: uid(), name: "Bottom", widthMm: W - T * 2, heightMm: D, thicknessMm: T,
      qty: 1, panelType: "carcass", material, grainDirection: true,
    });
  }

  // Back Panel: apply per-edge deduction based on which panels are enabled
  // Only deduct from edges that have panels
  const edgeDeduction = config.backPanelDeduction ?? 20; // Default 20mm for center post back panels
  const leftDeduct = panelsEnabled.left ? edgeDeduction : 0;
  const rightDeduct = panelsEnabled.right ? edgeDeduction : 0;
  const topDeduct = panelsEnabled.top ? edgeDeduction : 0;
  const bottomDeduct = panelsEnabled.bottom ? edgeDeduction : 0;

  const backW = W - leftDeduct - rightDeduct;
  const backH = H - topDeduct - bottomDeduct;
  const sectionCount = postCount + 1;
  const sectionW = Math.round(backW / sectionCount); // e.g., (2400-36) / 3 = 788

  // Back panels - only if enabled
  if (panelsEnabled.back) {
    if (postCount > 0) {
      // Group back panels with same dimensions - qty = sectionCount
      panels.push({
        id: uid(),
        name: "Back Panel",
        widthMm: sectionW,
        heightMm: backH,
        thicknessMm: BT,
        qty: sectionCount,
        panelType: "back",
        material: `${material} ${BT}mm`,
        grainDirection: true,
      });
    } else {
      // No center posts - single back panel
      panels.push({
        id: uid(), name: "Back Panel", widthMm: backW, heightMm: backH, thicknessMm: BT,
        qty: 1, panelType: "back", material: `${material} ${BT}mm`, grainDirection: true,
      });
    }
  }

  // Center Posts: D x (H - 2T) (18mm)
  if (postCount > 0) {
    panels.push({
      id: uid(), name: "Center Post", widthMm: D, heightMm: H - T * 2, thicknessMm: T,
      qty: postCount, panelType: "partition", material, grainDirection: true,
    });
  }

  // Shelves: shelfW x (D - shelfBack - shelfFront) - based on sections config
  const shelfBack = config.shelfBackDeduction ?? 20;
  const shelfFront = config.shelfFrontDeduction ?? 10;
  const shelfDepth = D - shelfBack - shelfFront;
  const innerW = W - T * 2;
  const totalPostThickness = postCount * T;
  const shelfW = (innerW - totalPostThickness) / sectionCount;

  if (config.sections && config.sections.length > 0) {
    let totalShelves = 0;
    for (let i = 0; i < config.sections.length && i < sectionCount; i++) {
      const section = config.sections[i];
      totalShelves += section.shelfCount ?? 0;
    }

    if (totalShelves > 0) {
      panels.push({
        id: uid(), name: "Shelf", widthMm: Math.round(shelfW), heightMm: shelfDepth,
        thicknessMm: T, qty: totalShelves, panelType: "shelf", material, grainDirection: true,
      });
    }
  }

  // Skirting: W x skirtingHeight (18mm) - only if enabled (at end of list)
  if (config.skirtingEnabled) {
    const skirtingH = config.skirtingHeightMm ?? 115;
    panels.push({
      id: uid(), name: "Skirting", widthMm: W, heightMm: skirtingH, thicknessMm: T,
      qty: 1, panelType: "carcass", material, grainDirection: true,
    });
  }

  return panels;
}

export function generateModuleCutlistPanels(config: ModuleConfig): ModuleCutlistPanel[] {
  // Use specialized generator for wardrobe_carcass
  if (config.unitType === "wardrobe_carcass") {
    return generateWardrobeCarcassPanels(config);
  }
  const panels: ModuleCutlistPanel[] = [];
  const T = config.carcassThicknessMm ?? 18;
  const BT = config.backPanelThicknessMm ?? 10;
  const { widthMm: W, heightMm: H, depthMm: D } = config;
  const material = config.carcassMaterial;

  // ── Carcass panels ──
  panels.push({
    id: uid(), name: "Top", widthMm: W, heightMm: D - T, thicknessMm: T,
    qty: 1, panelType: "carcass", material, grainDirection: true,
  });
  panels.push({
    id: uid(), name: "Bottom", widthMm: W, heightMm: D - T, thicknessMm: T,
    qty: 1, panelType: "carcass", material, grainDirection: true,
  });
  panels.push({
    id: uid(), name: "Left Side", widthMm: D - T, heightMm: H, thicknessMm: T,
    qty: 1, panelType: "carcass", material, grainDirection: true,
  });
  panels.push({
    id: uid(), name: "Right Side", widthMm: D - T, heightMm: H, thicknessMm: T,
    qty: 1, panelType: "carcass", material, grainDirection: true,
  });
  panels.push({
    id: uid(), name: "Back Panel", widthMm: W, heightMm: H, thicknessMm: BT,
    qty: 1, panelType: "back", material, grainDirection: true,
  });

  // ── Loft ──
  // Shelf deductions from config (default: back 20mm, front 10mm)
  const shelfBack = config.shelfBackDeduction ?? 20;
  const shelfFront = config.shelfFrontDeduction ?? 10;
  if (config.loftEnabled && config.loftHeightMm > 0) {
    panels.push({
      id: uid(), name: "Loft Shelf", widthMm: W - T * 2, heightMm: D - shelfBack - shelfFront, thicknessMm: T,
      qty: 1, panelType: "shelf", material, grainDirection: true,
    });
    const loftDoors = Math.min(config.shutterCount || 3, 4);
    const loftShutterW = Math.round((W - T * 2) / Math.max(1, loftDoors));
    panels.push({
      id: uid(), name: "Loft Shutter", widthMm: loftShutterW, heightMm: config.loftHeightMm - T, thicknessMm: T,
      qty: loftDoors, panelType: "loft_shutter", material: config.shutterMaterial, grainDirection: true,
    });
  }

  // ── Internal partitions & section-specific panels ──
  const sections = config.sections || [];
  const mainH = config.loftEnabled ? H - config.loftHeightMm : H;
  const innerW = W - T * 2;
  const sectionW = sections.length > 0 ? innerW / sections.length : innerW;

  // Vertical partitions between sections
  const partitionCount = Math.max(0, sections.length - 1);
  if (partitionCount > 0) {
    panels.push({
      id: uid(), name: "Partition", widthMm: D - T, heightMm: mainH - T * 2, thicknessMm: T,
      qty: partitionCount, panelType: "partition", material, grainDirection: true,
    });
  }

  // Section-specific panels
  sections.forEach((section, idx) => {
    const secW = section.widthMm > 0 ? section.widthMm : sectionW;
    const secH = mainH - T * 2;
    const label = `S${idx + 1}`;

    // Use config shelf deductions (defined above)
    const shelfDepth = D - shelfBack - shelfFront;

    switch (section.type) {
      case "shelves":
      case "open": {
        const count = section.shelfCount ?? 4;
        if (count > 0) {
          panels.push({
            id: uid(), name: `${label} Shelf`,
            widthMm: Math.round(secW - T), heightMm: shelfDepth, thicknessMm: T,
            qty: count, panelType: "shelf", material, grainDirection: true,
          });
        }
        break;
      }
      case "short_hang": {
        const shelfCount = section.shelfCount ?? 2;
        if (shelfCount > 0) {
          panels.push({
            id: uid(), name: `${label} Shelf`,
            widthMm: Math.round(secW - T), heightMm: shelfDepth, thicknessMm: T,
            qty: shelfCount, panelType: "shelf", material, grainDirection: true,
          });
        }
        break;
      }
      case "drawers": {
        const dCount = section.drawerCount ?? 3;
        const drawerH = Math.round(secH / dCount);
        panels.push({
          id: uid(), name: `${label} Drawer Front`,
          widthMm: Math.round(secW - 6), heightMm: drawerH - 6, thicknessMm: T,
          qty: dCount, panelType: "drawer_front", material: config.shutterMaterial, grainDirection: true,
        });
        panels.push({
          id: uid(), name: `${label} Drawer Side`,
          widthMm: D - T - 50, heightMm: drawerH - 40, thicknessMm: T,
          qty: dCount * 2, panelType: "drawer_side", material, grainDirection: true,
        });
        panels.push({
          id: uid(), name: `${label} Drawer Bottom`,
          widthMm: Math.round(secW - 20), heightMm: D - T - 50, thicknessMm: BT,
          qty: dCount, panelType: "drawer_bottom", material, grainDirection: true,
        });
        break;
      }
      case "long_hang":
        // No panels needed — rod is hardware
        break;
    }
  });

  // ── Main shutters ──
  const shutterCount = config.shutterCount;
  if (shutterCount > 0) {
    const shutterW = Math.round((W - T * 2) / shutterCount);
    panels.push({
      id: uid(), name: "Shutter",
      widthMm: shutterW, heightMm: mainH - T, thicknessMm: T,
      qty: shutterCount, panelType: "shutter", material: config.shutterMaterial, grainDirection: true,
    });
  }

  return panels;
}
