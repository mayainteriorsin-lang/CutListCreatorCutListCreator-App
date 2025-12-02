function mulberry32(seed: number) { 
  return function() { 
    let t = seed += 0x6D2B79F5; 
    t = Math.imul(t ^ (t >>> 15), t | 1); 
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); 
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; 
  }; 
}

const EPS = 1e-4; // more realistic tolerance for mm-based layouts

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PlacedPiece {
  id: string;
  origId?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotated: boolean;
  rotateAllowed: boolean;
  gaddi?: boolean;
  laminateCode?: string;
  nomW?: number;   // nominal width (original panel size)
  nomH?: number;   // nominal height (original panel size)
}

interface Part {
  id: string;
  w: number;
  h: number;
  qty: number;
  rotate: boolean;
  gaddi?: boolean;
  laminateCode?: string;
}

const area = (r: Rect) => r.w * r.h;

const rectContains = (a: Rect, b: Rect) =>
  b.x >= a.x - EPS && b.y >= a.y - EPS &&
  b.x + b.w <= a.x + a.w + EPS &&
  b.y + b.h <= a.y + a.h + EPS;

function detectSide(id: string): "Top"|"Bottom"|"Left"|"Right"|"Back"|null {
  const s = (id || "").toLowerCase();
  if (/\btop\b/.test(s)) return "Top";
  if (/\bbottom\b/.test(s)) return "Bottom";
  if (/\bleft\b/.test(s)) return "Left";
  if (/\bright\b/.test(s)) return "Right";
  if (/\bback\b/.test(s)) return "Back";
  return null;
}

class MaxRectsBin {
  W: number;
  H: number;
  kerf: number;
  free: Rect[];
  placed: PlacedPiece[];
  usedArea: number;

  constructor(W: number, H: number, kerf: number) {
    this.W = W;
    this.H = H;
    this.kerf = kerf;
    this.free = [{ x: 0, y: 0, w: W, h: H }];
    this.placed = [];
    this.usedArea = 0;
  }

  tryPlace(piece: any, strategy: string) {
    let bestScore = { a: Infinity, s1: Infinity, s2: Infinity }, best: any = null, idxBest = -1;

    for (let i = 0; i < this.free.length; i++) {
      const fr = this.free[i];

      // NO ROTATION - Try non-rotated orientation ONLY
      if (piece.w <= fr.w && piece.h <= fr.h) {
        const aWaste = fr.w * fr.h - piece.w * piece.h;
        const s1 = Math.min(fr.w - piece.w, fr.h - piece.h);
        const s2 = Math.max(fr.w - piece.w, fr.h - piece.h);
        const key = (strategy === "BAF") ? aWaste : (strategy === "BSSF" ? s1 : s2);
        const cand = { a: key, s1, s2, rot: false, rect: { x: fr.x, y: fr.y, w: piece.w, h: piece.h }, i };
        if (s1 <= EPS && s2 <= EPS) { bestScore = cand; best = cand; idxBest = i; break; }
        if (key < bestScore.a || (key === bestScore.a && (s1 < bestScore.s1 || (s1 === bestScore.s1 && s2 < bestScore.s2)))) {
          bestScore = cand;
          best = cand;
          idxBest = i;
        }
      }
    }

    if (!best) return null;

    const placed: PlacedPiece = {
      id: piece.id,
      origId: piece.origId ?? piece.id,
      x: best.rect.x + this.kerf / 2,
      y: best.rect.y + this.kerf / 2,
      w: best.rect.w - this.kerf,
      h: best.rect.h - this.kerf,
      rotated: false,
      rotateAllowed: false,
      gaddi: !!piece.gaddi,
      laminateCode: piece.laminateCode || '',
      nomW: (piece as any).nomW || piece.w,
      nomH: (piece as any).nomH || piece.h
    };

    this.splitAll(best.rect);
    this.placed.push(placed);
    this.usedArea += best.rect.w * best.rect.h;
    return placed;
  }

  split(index: number, used: Rect) {
    const base = this.free[index]; 
    this.free.splice(index, 1);
    const add: Rect[] = [];
    
    if (used.x > base.x + EPS) {
      add.push({ x: base.x, y: base.y, w: used.x - base.x, h: base.h });
    }
    if (used.x + used.w < base.x + base.w - EPS) {
      add.push({
        x: used.x + used.w, 
        y: base.y, 
        w: (base.x + base.w) - (used.x + used.w), 
        h: base.h
      });
    }
    if (used.y > base.y + EPS) {
      add.push({ x: base.x, y: base.y, w: base.w, h: used.y - base.y });
    }
    if (used.y + used.h < base.y + base.h - EPS) {
      add.push({
        x: base.x, 
        y: used.y + used.h, 
        w: base.w, 
        h: (base.y + base.h) - (used.y + used.h)
      });
    }

    this.free.push(...add.filter(r => r.w > EPS && r.h > EPS));
    this.prune(); 
    this.mergeNeighbors();
    this.free = this.free.filter(r => r.w > EPS && r.h > EPS);
  }

  private splitAll(used: Rect) {
    const out: Rect[] = [];

    for (let i = 0; i < this.free.length; i++) {
      const fr = this.free[i];

      // If no intersection, keep rect as-is
      const noOverlap =
        fr.x >= used.x + used.w - EPS ||
        fr.x + fr.w <= used.x + EPS ||
        fr.y >= used.y + used.h - EPS ||
        fr.y + fr.h <= used.y + EPS;

      if (noOverlap) {
        out.push(fr);
        continue;
      }

      // There is overlap: split fr into up to 4 non-overlapping rects around 'used'

      // Left slice
      if (fr.x < used.x) {
        out.push({ x: fr.x, y: fr.y, w: used.x - fr.x, h: fr.h });
      }

      // Right slice
      if (fr.x + fr.w > used.x + used.w) {
        out.push({
          x: used.x + used.w,
          y: fr.y,
          w: (fr.x + fr.w) - (used.x + used.w),
          h: fr.h
        });
      }

      // Compute X-axis overlap span for top/bottom slices
      const ix0 = Math.max(fr.x, used.x);
      const ix1 = Math.min(fr.x + fr.w, used.x + used.w);
      const iw  = ix1 - ix0;

      // Top slice
      if (fr.y < used.y && iw > EPS) {
        out.push({ x: ix0, y: fr.y, w: iw, h: used.y - fr.y });
      }

      // Bottom slice
      if (fr.y + fr.h > used.y + used.h && iw > EPS) {
        out.push({
          x: ix0,
          y: used.y + used.h,
          w: iw,
          h: (fr.y + fr.h) - (used.y + used.h)
        });
      }
    }

    // Keep only valid areas, then prune/merge
    this.free = out.filter(r => r.w > EPS && r.h > EPS);
    this.prune();
    this.mergeNeighbors();
  }

  prune() {
    for (let i = 0; i < this.free.length; i++) {
      for (let j = i + 1; j < this.free.length; j++) {
        const A = this.free[i], B = this.free[j];
        if (rectContains(A, B)) { this.free.splice(j, 1); j--; continue; }
        if (rectContains(B, A)) { this.free.splice(i, 1); i--; break; }
      }
    }
  }

  mergeNeighbors() {
    let merged = true;
    while (merged) {
      merged = false;
      outer: for (let i = 0; i < this.free.length; i++) {
        for (let j = i + 1; j < this.free.length; j++) {
          const a = this.free[i], b = this.free[j];

          // X-axis merge (side by side)
          if (Math.abs(a.y - b.y) <= EPS &&
              Math.abs(a.h - b.h) <= EPS &&
              (Math.abs(a.x + a.w - b.x) <= EPS || Math.abs(b.x + b.w - a.x) <= EPS)) {
            const nx = Math.min(a.x, b.x), ny = a.y, nw = a.w + b.w, nh = Math.max(a.h, b.h);
            this.free.splice(j, 1); this.free.splice(i, 1); this.free.push({ x: nx, y: ny, w: nw, h: nh });
            merged = true; break outer;
          }

          // Y-axis merge (top to bottom)
          if (Math.abs(a.x - b.x) <= EPS &&
              Math.abs(a.w - b.w) <= EPS &&
              (Math.abs(a.y + a.h - b.y) <= EPS || Math.abs(b.y + b.h - a.y) <= EPS)) {
            const nx = a.x, ny = Math.min(a.y, b.y), nw = Math.max(a.w, b.w), nh = a.h + b.h;
            this.free.splice(j, 1); this.free.splice(i, 1); this.free.push({ x: nx, y: ny, w: nw, h: nh });
            merged = true; break outer;
          }
        }
      }
    }
  }
}

function mapPanel(W: number, H: number, kerf: number) {
  return (b: MaxRectsBin) => ({
    W,
    H,
    placed: b.placed,
    free: b.free,
    usedAreaScore: b.usedArea
  });
}

function packOnce(pieces: any[], W: number, H: number, kerf: number, strategy: string) {
  // Defensive: remove falsy entries and ensure each piece has a safe id and numeric dims
  pieces = (pieces || [])
    .filter(Boolean) // drop undefined / null
    .map((p, i) => {
      const safe = p || {};
      return {
        id: String(safe.id ?? safe.name ?? `part-${i}`),
        w: Number(safe.w ?? safe.nomW ?? 0),
        h: Number(safe.h ?? safe.nomH ?? 0),
        rotate: !!safe.rotate,
        gaddi: !!safe.gaddi,
        laminateCode: safe.laminateCode || '',
        nomW: Number(safe.nomW ?? safe.w ?? 0),
        nomH: Number(safe.nomH ?? safe.h ?? 0),
        ...safe
      };
    });

  const panels: MaxRectsBin[] = [];
  const newBin = () => { 
    const b = new MaxRectsBin(W, H, kerf); 
    panels.push(b); 
    return b; 
  };
  
  // Start with at least one sheet
  if (panels.length === 0) newBin();
  
  const leftovers: any[] = [];

  for (const p of pieces) {
    const tryP = {
      id: p.id,
      w: p.w + kerf,
      h: p.h + kerf,
      rotate: p.rotate,
      rotateAllowed: p.rotate,  // 📐 Axis-lock determines rotation
      gaddi: p.gaddi,
      laminateCode: p.laminateCode,
      nomW: p.nomW,
      nomH: p.nomH,
      panelType: (p as any).panelType,  // 📐 Panel type
      axisLockReason: (p as any).axisLockReason  // 📐 Axis constraint
    };
    
    let placed = null;
    
    // ✅ Try every existing sheet first before creating a new one
    for (let b = 0; b < panels.length && !placed; b++) {
      placed = panels[b].tryPlace(tryP, strategy);
    }
    
    // If doesn't fit on any existing sheet, open a new one and try
    if (!placed) {
      const newSheet = newBin();
      placed = newSheet.tryPlace(tryP, strategy);
      if (!placed) { 
        leftovers.push(p); // Really doesn't fit at all
      }
    }
  }
  return { panels: panels.map(mapPanel(W, H, kerf)), leftover: leftovers };
}

export function optimizeCutlist({
  sheet,
  parts,
  timeMs = 1000,
  strategy = "BAF",
  rngSeed
}: {
  sheet: { w: number; h: number; kerf: number };
  parts: Part[];
  timeMs?: number;
  strategy?: string;
  rngSeed?: number;
}) {
  const W = sheet.w;
  const H = sheet.h;
  const kerf = sheet.kerf;

  // Check for oversized parts
  const oversized = parts.filter(p => {
    const w = Number(p.w);
    const h = Number(p.h);
    const fitsNormal = w <= W && h <= H;
    const fitsRotated = p.rotate && h <= W && w <= H;
    return !fitsNormal && !fitsRotated;
  });
  if (oversized.length > 0) {
    console.warn('⚠️ Some parts are larger than sheet in current orientation:', oversized.slice(0, 10));
  }

  // Expand each part into instances with axis-lock constraints
  const expanded: any[] = [];
  const expandLog: any[] = [];
  
  parts.forEach(p => { 
    for (let i = 0; i < p.qty; i++) {
      const instanceId = `${p.id}::${i}`;
      const panelType = (p as any).panelType || 'panel';
      
      const piece = { 
        id: instanceId,
        origId: p.id,
        w: p.w, 
        h: p.h, 
        rotate: false,  // NO ROTATION - always false
        rotateAllowed: false,  // NO ROTATION - always false
        gaddi: !!p.gaddi,
        laminateCode: p.laminateCode || '',
        nomW: (p as any).nomW || p.w,
        nomH: (p as any).nomH || p.h,
        panelType: panelType
      };
      
      expanded.push(piece);
      
      expandLog.push({
        instanceId,
        panelType,
        dimensions: `${piece.w}×${piece.h}mm`,
        rotation: '🔒 DISABLED'
      });
    }
  });
  
  // 📊 LOG ALL EXPANDED INSTANCES - ROTATION DISABLED
  console.groupCollapsed(`🆔 OPTIMIZER EXPANDED INSTANCES (Total: ${expanded.length}) — ROTATION DISABLED`);
  console.log('🔒 ROTATION DISABLED - All pieces placed in original orientation only');
  console.table(expandLog);
  console.groupEnd();

  const base = expanded.slice().sort((a, b) => {
    const d = area(b) - area(a); 
    if (d) return d;
    const ra = Math.max(a.w, a.h) / Math.min(a.w, a.h);
    const rb = Math.max(b.w, b.h) / Math.min(b.w, b.h);
    return rb - ra;
  });

  const rnd = (rngSeed !== undefined) ? mulberry32(rngSeed) : Math.random;
  let best: any = null;
  const end = Date.now() + Math.max(80, timeMs);

  while (Date.now() < end) {
    const order = base.slice();

    const swaps = Math.max(5, Math.floor(order.length * 0.2));
    for (let k = 0; k < swaps; k++) { 
      const i = Math.floor(rnd() * order.length);
      const j = Math.floor(rnd() * order.length); 
      [order[i], order[j]] = [order[j], order[i]]; 
    }
    if (rnd() < 0.5) {
      order.sort((a, b) => {
        const skinnyA = Math.max(a.w, a.h) / Math.min(a.w, a.h);
        const skinnyB = Math.max(b.w, b.h) / Math.min(b.w, b.h);
        return skinnyB - skinnyA;
      });
    }

    const { panels, leftover } = packOnce(order, W, H, kerf, strategy);
    const totalArea = panels.length * W * H;
    const usedInflated = panels.reduce((s, p) => s + p.usedAreaScore, 0);

    const penaltyUnplaced = leftover.reduce((s: number, p: any) => s + area(p), 0) * 1e6;
    const score = (totalArea - usedInflated) + penaltyUnplaced + panels.length * 0.01;

    if (!best || score < best.score) {
      best = JSON.parse(JSON.stringify({ panels, score, leftover }));
    }
  }

  const totalArea = best.panels.length * W * H;
  const usedInflated = best.panels.reduce((s: number, p: any) => s + p.usedAreaScore, 0);
  const waste = Math.max(0, totalArea - usedInflated);
  const efficiencyPct = totalArea ? (usedInflated / totalArea * 100) : 0;
  const wastePct = 100 - efficiencyPct;

  // 🔒 CRITICAL OVERLAP VALIDATION - NO OVERLAPS ALLOWED
  // Checks exactly what's placed, with relaxed tolerance and no kerf double-inflation
  function validateNoOverlaps(panels: any[], sheetW: number, sheetH: number) {
    for (let sheetIdx = 0; sheetIdx < panels.length; sheetIdx++) {
      const panel = panels[sheetIdx];
      const placed = panel.placed;

      for (let i = 0; i < placed.length; i++) {
        const a = placed[i];

        // Bounds check
        if (a.x < -EPS || a.y < -EPS ||
            a.x + a.w > sheetW + EPS ||
            a.y + a.h > sheetH + EPS) {
          throw new Error(
            `Panel exceeds sheet boundaries (Sheet ${sheetIdx + 1}, ${a.id})`
          );
        }

        // Overlap check
        for (let j = i + 1; j < placed.length; j++) {
          const b = placed[j];
          const overlapX = !(a.x + a.w + EPS <= b.x || b.x + b.w + EPS <= a.x);
          const overlapY = !(a.y + a.h + EPS <= b.y || b.y + b.h + EPS <= a.y);
          if (overlapX && overlapY) {
            throw new Error(
              `Panel overlap: "${a.id}" and "${b.id}" (Sheet ${sheetIdx + 1})`
            );
          }
        }
      }
    }
  }

  // Run validation before returning results
  try {
    validateNoOverlaps(best.panels, W, H);
  } catch (error) {
    console.error("❌ Overlap validation FAILED:", error);
    throw error; // Propagate error to stop PDF generation
  }

  return {
    panels: best.panels.map((p: any) => ({
      W: p.W, 
      H: p.H,
      placed: p.placed,
      free: p.free
    })),
    totals: {
      sheets: best.panels.length,
      totalArea,
      usedArea: usedInflated,
      waste,
      wastePct,
      efficiencyPct
    },
    unplaced: best.leftover
  };
}
