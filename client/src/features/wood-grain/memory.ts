// client/src/features/wood-grain/memory.ts
// Single-file, copy-paste. Implements storage + toggle handler + optimizer helpers.

// Storage key for the whole preferences object
const STORAGE_KEY = "woodGrainsPreferences";

type PrefMap = Record<string, boolean>; // laminateCode -> true (locked) | false (unlocked)

export type Strategy = "NO_ROTATION" | "SELECTIVE" | "AGGRESSIVE";

/* -------------------------
   Storage helpers
   ------------------------- */
export function loadAllPrefs(): PrefMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PrefMap;
  } catch (e) {
    console.error("Failed to parse wood grain prefs:", e);
    return {};
  }
}

export function saveAllPrefs(prefs: PrefMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error("Failed to save wood grain prefs:", e);
  }
}

export function getPref(laminateCode: string): boolean {
  if (!laminateCode) return false;
  const prefs = loadAllPrefs();
  return Boolean(prefs[laminateCode]);
}

export function setPref(laminateCode: string, enabled: boolean) {
  if (!laminateCode) return;
  const prefs = loadAllPrefs();
  prefs[laminateCode] = Boolean(enabled);
  saveAllPrefs(prefs);
}

export function removePref(laminateCode: string) {
  if (!laminateCode) return;
  const prefs = loadAllPrefs();
  if (laminateCode in prefs) {
    delete prefs[laminateCode];
    saveAllPrefs(prefs);
  }
}

/* -------------------------
   UI toggle handler
   - update localStorage
   - update UI via callback
   ------------------------- */
export function onToggleWoodGrain(
  laminateCode: string,
  newValue: boolean,
  updateUI: (lamCode: string, newVal: boolean) => void
) {
  setPref(laminateCode, newValue);      // persist
  try { updateUI(laminateCode, newValue); } catch (e) { console.error(e); }
}

/* -------------------------
   Apply preferences to parts BEFORE optimizer
   Parts shape expected to include:
     { id, w, h, qty, rotate (boolean), rotateAllowed (boolean), laminateCode?, ... }
   This function returns a NEW array (immutable-friendly).
   ------------------------- */
export function applyWoodGrainToParts(parts: any[]): any[] {
  if (!Array.isArray(parts)) return parts;
  const prefs = loadAllPrefs();

  return parts.map(p => {
    // determine laminate code (robust) - extract FRONT laminate code only (before +)
    let code = p.laminateCode ?? String(p.laminate || p.code || "");
    // Extract front laminate code if composed (e.g., "456sf + off white" -> "456sf")
    if (code && code.includes('+')) {
      code = code.split('+')[0].trim();
    }
    const locked = Boolean(prefs[code]); // true => wood grain ON => locked

    // preserve original nominal sizes (use nomW/nomH if present, else w/h)
    const nomW = Number(p.nomW ?? p.w ?? 0);
    const nomH = Number(p.nomH ?? p.h ?? 0);

    // When locked -> mark grainDirection true and explicitly disable rotation.
    // When unlocked -> ensure grainDirection false so packer may rotate.
    const grainDirection = locked === true;

    // rotateAllowed/rotate reflect whether rotation is permitted by grain pref
    const rotateAllowed = !locked && Boolean(p.rotate);
    const rotate = rotateAllowed; // main rotate flag used by packer

    return {
      ...p,
      nomW,
      nomH,
      grainDirection,
      rotate,
      rotateAllowed
    };
  });
}

/* -------------------------
   Strategy enforcement helper
   Use this to apply global strategy AFTER applyWoodGrainToParts if you want
   to enforce NO_ROTATION / SELECTIVE / AGGRESSIVE behavior.
   - parts: array produced by applyWoodGrainToParts()
   - strategy: one of the Strategy types
   Returns new parts array.
   ------------------------- */
export function applyWoodGrainStrategy(parts: any[], strategy: Strategy = "SELECTIVE"): any[] {
  if (!Array.isArray(parts)) return parts;

  if (strategy === "AGGRESSIVE") {
    // ignore grain prefs — allow all rotation
    return parts.map(p => ({ ...p, rotate: true, rotateAllowed: true }));
  }

  if (strategy === "NO_ROTATION") {
    // no piece rotates at all
    return parts.map(p => ({ ...p, rotate: false, rotateAllowed: false }));
  }

  // SELECTIVE = respect locked parts (those with rotateAlready false from applyWoodGrainToParts),
  // but allow rotation for others
  // We'll treat pieces that were set rotateAllowed === false as locked, keep them false.
  return parts.map(p => {
    const locked = p.rotateAllowed === false; // from applyWoodGrainToParts
    return {
      ...p,
      rotate: locked ? false : true,
      rotateAllowed: locked ? false : true
    };
  });
}

/* -------------------------
   Quick combined helper to run before calling optimizer:
   - applies prefs
   - enforces chosen strategy
   Returns modifiedParts ready to pass to optimizeCutlist
   ------------------------- */
export function preparePartsForOptimizer(parts: any[], strategy: Strategy = "SELECTIVE"): any[] {
  const withPrefs = applyWoodGrainToParts(parts);
  return applyWoodGrainStrategy(withPrefs, strategy);
}

/* -------------------------
   Small debug helper (optional)
   ------------------------- */
export function debugPrefsLog() {
  console.log("Wood grain prefs:", loadAllPrefs());
}
