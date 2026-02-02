/**
 * Compute correct X/Y display dimensions based on panel TYPE.
 * Mutates the panel object to add displayWidth, displayHeight, displayLabel.
 */
export function computeDisplayDims(panel: any) {
  const type = (panel?.type || panel?.name || '').toString().toUpperCase();

  // X = horizontal (sheet width 1210)
  // Y = vertical   (sheet height 2420)
  let displayWidth = 0;   // X
  let displayHeight = 0;  // Y

  if (type.includes('TOP') || type.includes('BOTTOM')) {
    // TOP/BOTTOM: height -> X, width -> Y  (show X×Y format)
    displayWidth = Number(panel.height ?? panel.nomH ?? panel.h ?? 0);   // X-axis (height)
    displayHeight = Number(panel.width ?? panel.nomW ?? panel.w ?? 0);   // Y-axis (width)
  } else if (type.includes('LEFT') || type.includes('RIGHT')) {
    // LEFT/RIGHT: height -> X, width -> Y  (show X×Y format)
    displayWidth = Number(panel.height ?? panel.nomH ?? panel.h ?? 0);   // X-axis (height)
    displayHeight = Number(panel.width ?? panel.nomW ?? panel.w ?? 0);   // Y-axis (width)
  } else {
    // fallback: width -> X, height -> Y
    displayWidth = Number(panel.width ?? panel.nomW ?? panel.w ?? 0);
    displayHeight = Number(panel.height ?? panel.nomH ?? panel.h ?? 0);
  }

  // Store computed dims back on panel so renderer & PDF can use them directly
  panel.displayWidth = displayWidth;
  panel.displayHeight = displayHeight;
  panel.displayLabel = `${displayWidth}×${displayHeight}`;
  return panel;
}

/**
 * Get display dimensions for preview rendering.
 * Uses the prepared optimizer-friendly w/h if present (swapped for wood grains).
 */
export function getDisplayDims(panel: any) {
  if (!panel || typeof panel !== 'object') return { displayW: 0, displayH: 0 };

  // If preparePartsForOptimizer created w/h fields, prefer them.
  const preparedW = Number(panel.w ?? panel.displayW ?? panel.nomW ?? panel.width ?? 0);
  const preparedH = Number(panel.h ?? panel.displayH ?? panel.nomH ?? panel.height ?? 0);

  // In some call-sites you may only have nomW/nomH; fallback to those.
  let displayW = preparedW;
  let displayH = preparedH;

  // If caller provided an explicit swap flag, obey it. (Some code paths set panel._swapped)
  if (panel._swapped === true) {
    [displayW, displayH] = [displayH, displayW];
  }

  // final numeric fallback
  displayW = Number(displayW || 0);
  displayH = Number(displayH || 0);

  return { displayW, displayH };
}
