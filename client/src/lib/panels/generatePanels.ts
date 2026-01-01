import { composeLaminateCode } from "@/lib/laminates/composeLaminateCode";

/**
 * Full panel generation engine extracted from home.tsx.
 * ZERO logic changed from original.
 * Every rule (nomW/nomH, gaddi, grain, shelves, shutter, BB, center post)
 * remains EXACTLY identical.
 */
export function generatePanels(cabinet: any): any[] {
  const panels: any[] = [];

  // SAFETY NORMALIZATION (same as home.tsx)
  const safe = (v: any) => (v === undefined || v === null ? "" : v);

  const {
    height,
    width,
    depth,
    shelvesEnabled,
    shelvesQuantity,
    shelvesLaminateCode,
    shelvesInnerLaminateCode,
    shelvesGrainDirection,
    shelvesGaddi,

    shuttersEnabled,
    shutters,
    shutterLaminateCode,
    shutterInnerLaminateCode,
    shutterGrainDirection,
    shutterGaddi,

    centerPostEnabled,
    centerPostQuantity,
    centerPostHeight,
    centerPostDepth,
    centerPostLaminateCode,
    centerPostInnerLaminateCode,
    centerPostGrainDirection,
    centerPostGaddi,

    plywoodType,
    backPanelPlywoodBrand,
    topPanelLaminateCode,
    topPanelInnerLaminateCode,
    bottomPanelLaminateCode,
    bottomPanelInnerLaminateCode,
    leftPanelLaminateCode,
    leftPanelInnerLaminateCode,
    rightPanelLaminateCode,
    rightPanelInnerLaminateCode,
    backPanelLaminateCode,
    backPanelInnerLaminateCode,

    topPanelGrainDirection,
    bottomPanelGrainDirection,
    leftPanelGrainDirection,
    rightPanelGrainDirection,
    backPanelGrainDirection,

    topPanelGaddi,
    bottomPanelGaddi,
    leftPanelGaddi,
    rightPanelGaddi,
    backPanelGaddi,

    configurationMode,
  } = cabinet;


  // BASIC / QUICK SHUTTER MODE
  if (configurationMode === "basic" || depth === 0) {
    const qty = shutters?.length || cabinet.shutterCount || 1;

    for (let i = 0; i < qty; i++) {
      const combined = composeLaminateCode(shutterLaminateCode, shutterInnerLaminateCode);
      const nomW = shutterGrainDirection ? width : height;
      const nomH = shutterGrainDirection ? height : width;

      panels.push({
        id: `${cabinet.id}-quick-${i}`,
        name: `Shutter`,
        width,
        height,
        laminateCode: combined,
        plywoodType: plywoodType || "Apple Ply 16mm BWP",
        quantity: 1,
        grainDirection: shutterGrainDirection,
        gaddi: shutterGaddi,
        nomW,
        nomH,
      });
    }

    return panels;
  }


  /** ------------------------------------------------------------------
   *  ADVANCED MODE – FULL CARCASS GENERATOR
   *  (Top, Bottom, Left, Right, Back, Shelves, Center Post, Shutters)
   *  EXACT port from home.tsx, unchanged.
   * ------------------------------------------------------------------ */

  // Dimension formula (taken from the original home.tsx calculatePanelDimensions)
  const dims = {
    top:    { w: width,         h: depth - 18 },
    bottom: { w: width,         h: depth - 18 },
    left:   { w: depth - 18,    h: height },
    right:  { w: depth - 18,    h: height },
    back:   { w: width,         h: height },
  };

  // Utility to add panel
  const addPanel = (panel: any) => panels.push(panel);

  // PANEL HELPERS (identical mapping)
  const makePanel = (name: string, W: number, H: number, front: any, inner: any, grain: boolean, gaddi: boolean, plywood: string) => {
    const laminateCombined = composeLaminateCode(front, inner);
    const nomW = grain ? W : H;
    const nomH = grain ? H : W;

    return {
      id: `${cabinet.id}-${name}-${Math.random().toString(36).slice(2)}`,
      name,
      width: W,
      height: H,
      laminateCode: laminateCombined,
      plywoodType: plywood,
      grainDirection: grain,
      gaddi,
      nomW,
      nomH,
      quantity: 1,
      type: name,
    };
  };


  // MAIN PANELS ---------------------------------------------------------

  addPanel(makePanel("Top",
    dims.top.w, dims.top.h, topPanelLaminateCode, topPanelInnerLaminateCode,
    topPanelGrainDirection, topPanelGaddi, plywoodType));

  addPanel(makePanel("Bottom",
    dims.bottom.w, dims.bottom.h, bottomPanelLaminateCode, bottomPanelInnerLaminateCode,
    bottomPanelGrainDirection, bottomPanelGaddi, plywoodType));

  addPanel(makePanel("Left",
    dims.left.w, dims.left.h, leftPanelLaminateCode, leftPanelInnerLaminateCode,
    leftPanelGrainDirection, leftPanelGaddi, plywoodType));

  addPanel(makePanel("Right",
    dims.right.w, dims.right.h, rightPanelLaminateCode, rightPanelInnerLaminateCode,
    rightPanelGrainDirection, rightPanelGaddi, plywoodType));

  addPanel(makePanel("Back",
    dims.back.w, dims.back.h, backPanelLaminateCode, backPanelInnerLaminateCode,
    backPanelGrainDirection, backPanelGaddi,
    backPanelPlywoodBrand || plywoodType));


  // SHELVES --------------------------------------------------------------
  if (shelvesEnabled && shelvesQuantity > 0) {
    const W = width - 36;
    const H = depth - 20;

    for (let i = 0; i < shelvesQuantity; i++) {
      addPanel(makePanel(`Shelf ${i+1}`,
        W, H,
        shelvesLaminateCode, shelvesInnerLaminateCode,
        shelvesGrainDirection, shelvesGaddi,
        plywoodType));
    }
  }


  // CENTER POSTS ---------------------------------------------------------
  if (centerPostEnabled && centerPostQuantity > 0) {
    const W = centerPostDepth;
    const H = centerPostHeight;

    for (let i = 0; i < centerPostQuantity; i++) {
      addPanel(makePanel(`Center Post ${i+1}`,
        W, H,
        centerPostLaminateCode, centerPostInnerLaminateCode,
        centerPostGrainDirection, centerPostGaddi,
        plywoodType));
    }
  }


  // SHUTTERS -------------------------------------------------------------
  if (shuttersEnabled && shutters?.length > 0) {
    shutters.forEach((sh: any, idx: number) => {
      const W = sh.width;
      const H = sh.height;

      addPanel(makePanel(`Shutter ${idx+1}`,
        W, H,
        sh.laminateCode || shutterLaminateCode,
        shutterInnerLaminateCode,
        shutterGrainDirection, shutterGaddi,
        plywoodType));
    });
  }


  return panels;
}
