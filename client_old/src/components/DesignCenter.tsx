// DesignCenter.tsx START
import React, { useEffect, useRef, useState } from "react";

/**
 * Minimal safe DesignCenter React component (TSX)
 * - Lightweight canvas-based 2D prototype
 * - Safe for insertion into your existing project
 *
 * Path: client/client/src/components/ui/DesignCenter.tsx
 */

type ComponentItem = {
  id: string;
  type: "shelf" | "drawer" | "rod" | "divider" | "loft";
  x: number; // mm
  y: number; // mm
  w: number; // mm
  h: number; // mm
  locked?: boolean;
};

const uid = (prefix = "id") => prefix + "_" + Math.random().toString(36).slice(2, 9);

export default function DesignCenter(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // model state (simple)
  const [wardrobeW, setWardrobeW] = useState<number>(1800);
  const [wardrobeH, setWardrobeH] = useState<number>(2100);
  const [thickness, setThickness] = useState<number>(18);
  const [shuttersOn, setShuttersOn] = useState<boolean>(true);
  const [shutterCount, setShutterCount] = useState<number>(2);
  const [innerDims, setInnerDims] = useState<boolean>(false);
  const [gridPreset, setGridPreset] = useState<number>(10);
  const [gridOpacity, setGridOpacity] = useState<number>(0.3);
  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);

  // resize + draw on changes
  useEffect(() => {
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wardrobeW, wardrobeH, thickness, shuttersOn, shutterCount, innerDims, gridPreset, gridOpacity, components, zoom]);

  function addComponent(type: ComponentItem["type"]) {
    const id = uid(type);
    const comp: ComponentItem = {
      id,
      type,
      x: Math.round(wardrobeW * 0.05),
      y: Math.round(wardrobeH * 0.15 + components.length * 80),
      w: Math.round(wardrobeW * 0.4),
      h: Math.round(wardrobeH * 0.08),
    };
    setComponents((s) => [...s, comp]);
    setSelectedId(id);
  }

  function saveProject() {
    const data = {
      wardrobeW,
      wardrobeH,
      thickness,
      shuttersOn,
      shutterCount,
      components,
    };
    localStorage.setItem("design_center_project", JSON.stringify(data));
    alert("Saved to localStorage");
  }
  function loadProject() {
    const raw = localStorage.getItem("design_center_project");
    if (!raw) { alert("No saved project"); return; }
    try {
      const p = JSON.parse(raw);
      if (p.wardrobeW) setWardrobeW(p.wardrobeW);
      if (p.wardrobeH) setWardrobeH(p.wardrobeH);
      if (p.thickness) setThickness(p.thickness);
      if (typeof p.shuttersOn === "boolean") setShuttersOn(p.shuttersOn);
      if (p.shutterCount) setShutterCount(p.shutterCount);
      if (p.components) setComponents(p.components);
      alert("Loaded project");
    } catch (e) { console.error(e); alert("Load failed"); }
  }

  function exportPNG() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a"); a.href = url; a.download = "design-center.png"; a.click();
  }

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // size
    const parent = canvas.parentElement;
    const maxW = parent ? parent.clientWidth - 20 : 900;
    const maxH = parent ? parent.clientHeight - 20 : 700;
    canvas.width = Math.min(maxW, 1200);
    canvas.height = Math.min(maxH, 900);

    // padding + scale
    const pad = 40;
    const availW = canvas.width - pad * 2;
    const availH = canvas.height - pad * 2;
    const scaleX = (availW / wardrobeW) * zoom;
    const scaleY = (availH / wardrobeH) * zoom;
    const scale = Math.min(scaleX, scaleY) * 0.95;
    const w = wardrobeW * scale;
    const h = wardrobeH * scale;
    const originX = (canvas.width - w) / 2;
    const originY = (canvas.height - h) / 2;

    // clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // grid
    drawGrid(ctx, w, h, originX, originY, gridPreset, gridOpacity);

    // frame
    ctx.strokeStyle = "#111"; ctx.lineWidth = 2;
    ctx.strokeRect(originX, originY, w, h);

    // components
    for (const c of components) {
      const xPx = originX + (c.x / wardrobeW) * w;
      const yPx = originY + (c.y / wardrobeH) * h;
      const wPx = (c.w / wardrobeW) * w;
      const hPx = (c.h / wardrobeH) * h;
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.04)";
      ctx.fillRect(xPx, yPx, wPx, hPx);
      ctx.strokeStyle = c.locked ? "#b00" : "#111";
      ctx.strokeRect(xPx, yPx, wPx, hPx);
      ctx.fillStyle = "#333"; ctx.font = "11px Arial"; ctx.fillText(c.type, xPx + 6, yPx + 14);
      ctx.restore();
    }

    // shutters
    const sw = w / Math.max(1, shutterCount);
    let acc = originX;
    ctx.lineWidth = 1.6; ctx.strokeStyle = "#111";
    for (let i = 0; i < shutterCount; i++) { ctx.strokeRect(acc + 1, originY + 1, sw - 2, h - 2); acc += sw; }

    // outer dims
    drawOuterDimensions(ctx, originX, originY, w, h);

    // inner dims optional
    if (innerDims) drawInnerDimensions(ctx, originX, originY, w, h, shutterCount);

    // thickness label
    ctx.fillStyle = "#666"; ctx.font = "12px Arial";
    ctx.fillText(`Thickness: ${thickness} mm`, originX + 6, originY + h + 18);

    // selected highlight
    if (selectedId) {
      const s = components.find((x) => x.id === selectedId);
      if (s) {
        const xPx = originX + (s.x / wardrobeW) * w;
        const yPx = originY + (s.y / wardrobeH) * h;
        const wPx = (s.w / wardrobeW) * w;
        const hPx = (s.h / wardrobeH) * h;
        ctx.save();
        ctx.strokeStyle = "#2b7be4"; ctx.lineWidth = 2; ctx.strokeRect(xPx - 2, yPx - 2, wPx + 4, hPx + 4);
        ctx.restore();
      }
    }
  }

  function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, originX: number, originY: number, cells: number, opacity: number) {
    ctx.save(); ctx.globalAlpha = opacity; ctx.strokeStyle = "#e6e6e6"; ctx.lineWidth = 1;
    const cellPx = w / Math.max(1, cells);
    const startX = originX - cellPx * 2; const endX = originX + w + cellPx * 2;
    for (let x = startX; x <= endX + 1; x += cellPx) { ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, ctx.canvas.height); ctx.stroke(); }
    const cellPy = h / Math.max(1, cells); const startY = originY - cellPy * 2; const endY = originY + h + cellPy * 2;
    for (let y = startY; y <= endY + 1; y += cellPy) { ctx.beginPath(); ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(ctx.canvas.width, Math.round(y) + 0.5); ctx.stroke(); }
    ctx.restore();
  }

  function drawOuterDimensions(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.save(); ctx.strokeStyle = "#1e90ff"; ctx.fillStyle = "#1e90ff"; ctx.font = "13px Arial";
    drawDimLine(ctx, x, y - 18, x + w, y - 18, `${Math.round(wardrobeW)} mm`);
    drawDimLine(ctx, x - 18, y, x - 18, y + h, `${Math.round(wardrobeH)} mm`, true);
    ctx.restore();
  }

  function drawInnerDimensions(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, count: number) {
    ctx.save(); ctx.strokeStyle = "#2b7be4"; ctx.fillStyle = "#2b7be4"; ctx.font = "12px Arial";
    const per = Math.round(wardrobeW / Math.max(1, count)); let acc = x;
    for (let i = 0; i < count; i++) { const x1 = acc + 8; const x2 = acc + w / count - 8; drawDimLine(ctx, x1, y + h + 18, x2, y + h + 18, `${per} mm`); acc += w / count; }
    ctx.restore();
  }

  function drawDimLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, label: string, vertical = false) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.save(); ctx.fillStyle = ctx.strokeStyle; const angle = Math.atan2(y2 - y1, x2 - x1);
    drawArrowhead(ctx, x1, y1, angle); drawArrowhead(ctx, x2, y2, angle + Math.PI);
    ctx.font = "12px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2; ctx.fillText(label, mx, my - (vertical ? -8 : -6));
    ctx.restore();
  }
  function drawArrowhead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
    ctx.beginPath(); const size = 5; ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(angle + 0.3) * size, y + Math.sin(angle + 0.3) * size); ctx.lineTo(x + Math.cos(angle - 0.3) * size, y + Math.sin(angle - 0.3) * size); ctx.closePath(); ctx.fill();
  }

  // selection on canvas
  function onCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current; if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    // compute frame same as draw()
    const pad = 40; const availW = canvas.width - pad * 2; const availH = canvas.height - pad * 2;
    const scaleX = (availW / wardrobeW) * zoom; const scaleY = (availH / wardrobeH) * zoom; const scale = Math.min(scaleX, scaleY) * 0.95;
    const w = wardrobeW * scale; const h = wardrobeH * scale; const originX = (canvas.width - w) / 2; const originY = (canvas.height - h) / 2;
    let found: ComponentItem | null = null;
    for (let i = components.length - 1; i >= 0; i--) {
      const c = components[i]; const xPx = originX + (c.x / wardrobeW) * w; const yPx = originY + (c.y / wardrobeH) * h;
      const wPx = (c.w / wardrobeW) * w; const hPx = (c.h / wardrobeH) * h;
      if (cx >= xPx && cx <= xPx + wPx && cy >= yPx && cy <= yPx + hPx) { found = c; break; }
    }
    if (found) setSelectedId(found.id); else setSelectedId(null);
  }

  // first mount draw
  useEffect(() => { draw(); }, []); // eslint-disable-line

  // small controls
  const incThickness = () => setThickness((t) => Math.max(1, t + 1));
  const decThickness = () => setThickness((t) => Math.max(1, t - 1));

  return (
    <div className="flex gap-4">
      {/* Left controls */}
      <div className="w-72 bg-white rounded p-3 border">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Wardrobe Width (mm)</label>
            <input className="mt-1 w-full border rounded p-2" type="number" value={wardrobeW} onChange={(e)=>setWardrobeW(Math.max(100, Number(e.target.value)))} />
          </div>
          <div>
            <label className="block text-sm font-medium">Wardrobe Height (mm)</label>
            <input className="mt-1 w-full border rounded p-2" type="number" value={wardrobeH} onChange={(e)=>setWardrobeH(Math.max(100, Number(e.target.value)))} />
          </div>

        <div>
          <label className="block text-sm font-medium">Plywood Thickness (mm)</label>
          <div className="flex items-center gap-2 mt-1">
            <button className="px-2 py-1 border rounded" onClick={decThickness}>−</button>
            <input type="number" value={thickness} onChange={(e)=>setThickness(Math.max(1, Number(e.target.value)))} className="w-20 border rounded p-1 text-center" />
            <button className="px-2 py-1 border rounded" onClick={incThickness}>+</button>
          </div>
        </div>

        <div className="flex gap-2 mt-2">
          <button className="flex-1 border rounded p-2" onClick={()=>addComponent("shelf")}>+ Add Shelf</button>
          <button className="flex-1 border rounded p-2" onClick={()=>addComponent("rod")}>+ Add Rod</button>
        </div>

        <div className="flex gap-2 mt-2">
          <button className="flex-1 border rounded p-2" onClick={saveProject}>Save</button>
          <button className="flex-1 border rounded p-2" onClick={loadProject}>Load</button>
        </div>

        <div className="flex gap-2 mt-2">
          <button className="flex-1 border rounded p-2" onClick={exportPNG}>Export PNG</button>
          </div>
        </div>
      </div>

      {/* center canvas */}
      <div className="flex-1 border rounded bg-white p-2">
        <div className="h-[700px] flex items-center justify-center">
          <canvas ref={canvasRef} onClick={onCanvasClick} style={{maxWidth:"100%", maxHeight:"100%"}} />
        </div>
      </div>

      {/* right tools */}
      <div className="w-80 bg-white rounded p-3 border">
        <div className="space-y-3">
          <label className="block text-sm font-medium">Shutter Count</label>
          <select className="mt-1 w-full border rounded p-2" value={shutterCount} onChange={(e)=>setShutterCount(Number(e.target.value))}>
            <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
          </select>

          <div className="flex items-center gap-2 mt-2">
            <input id="inner" type="checkbox" checked={innerDims} onChange={(e)=>setInnerDims(e.target.checked)} />
            <label htmlFor="inner"> Show Inner Dimensions</label>
          </div>

          <div className="mt-2">
            <label className="block text-sm">Grid Preset</label>
            <select className="mt-1 w-full border rounded p-2" value={gridPreset} onChange={(e)=>setGridPreset(Number(e.target.value))}>
              <option value={5}>5×5</option><option value={10}>10×10</option><option value={20}>20×20</option>
            </select>
          </div>

          <div className="mt-2">
            <label className="block text-sm">Grid Opacity</label>
            <input type="range" min={0} max={100} value={Math.round(gridOpacity*100)} onChange={(e)=>setGridOpacity(Number(e.target.value)/100)} className="w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
// DesignCenter.tsx END
