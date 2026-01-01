// client/src/components/ui/DesignCenter.tsx
import React, { useRef, useState, useEffect } from "react";
import { parseDXF } from "@/lib/dxf-parser";

/**
 * Simple DesignCenter: Lines, Rectangles, Move, Grid, Dimensions
 * - Single-file component for easy paste
 * - Uses SVG for accuracy and crisp export
 *
 * Usage: <DesignCenter />
 *
 * Notes:
 * - Coordinates / displayed units assume mm. (1 SVG unit = 1 mm for simplicity)
 * - Grid snap is configurable.
 */

type Mode = "select" | "line" | "rect" | "move" | "trim" | "dimHoriz" | "dimVert" | "dimRadius" | "quickDim";
type Id = string;

type BaseShape = {
  id: Id;
  type: "line" | "rect" | "dimension";
};

type LineShape = BaseShape & {
  type: "line";
  x1: number; y1: number; x2: number; y2: number;
  thickness?: number;
  color?: string;
  marker?: "none" | "arrow" | "circle";
  customLabel?: string;
  showDimension?: boolean;
};

type RectShape = BaseShape & {
  type: "rect";
  x: number; y: number; w: number; h: number;
};

type DimensionShape = BaseShape & {
  type: "dimension";
  x1: number; y1: number; x2: number; y2: number;
  label: string;
  dimType: "horizontal" | "vertical" | "radius";
  offset?: number;
};

type Shape = LineShape | RectShape | DimensionShape;

const uid = (prefix = "") => `${prefix}${Math.random().toString(36).slice(2, 9)}`;

type HistoryEntry = { shapes: Shape[]; description: string };

export interface DesignCenterProps {
  onExportToCutlist?: (data: { width: number; height: number; depth: number; name: string }) => void;
}

export default function DesignCenter({ onExportToCutlist }: DesignCenterProps = {}) {
  const [gridSize, setGridSize] = useState(10);
  const [lineThickness, setLineThickness] = useState(18);
  const [lineColor, setLineColor] = useState("#000000");
  const [lineMarker, setLineMarker] = useState<"none" | "arrow" | "circle">("none");
  const [angleSnap, setAngleSnap] = useState(true);
  const [showLineAngle, setShowLineAngle] = useState(true);
  const [showLineCoords, setShowLineCoords] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [gridVisible, setGridVisible] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<Id>>(new Set());
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [clipboard, setClipboard] = useState<Shape[] | null>(null);
  const [showAllDimensions, setShowAllDimensions] = useState(true);
  const [dimensionStart, setDimensionStart] = useState<{ x: number; y: number } | null>(null);
  const [widthValue, setWidthValue] = useState(200);
  const [widthReduction, setWidthReduction] = useState(36);
  const calculatedWidth = widthValue - widthReduction;

  // Smart Toolbar state
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customDepth, setCustomDepth] = useState(560);
  const [depthModified, setDepthModified] = useState(false);

  const SNAP = (v: number) => Math.round(v / gridSize) * gridSize;
  const getAngle = (x1: number, y1: number, x2: number, y2: number) => Math.round(Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI) % 360;
  const snapAngle = (angle: number) => Math.round(angle / 45) * 45;

  const [mode, setMode] = useState<Mode>("select");
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [temp, setTemp] = useState<Partial<Shape> | null>(null);
  const [selectedId, setSelectedId] = useState<Id | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ w: 100000, h: 100000 });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // History management
  const pushHistory = (newShapes: Shape[], description: string) => {
    const newEntry: HistoryEntry = { shapes: newShapes, description };
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newEntry]);
    setHistoryIndex(prev => prev + 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setShapes(history[historyIndex - 1].shapes);
      setSelectedId(null);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setShapes(history[historyIndex + 1].shapes);
      setSelectedId(null);
    }
  };

  // Copy/Paste
  const copy = () => {
    const selected = shapes.filter(s => selectedIds.has(s.id));
    if (selected.length > 0) {
      setClipboard(selected);
    }
  };

  const paste = () => {
    if (!clipboard || clipboard.length === 0) return;
    const pasted = clipboard.map(s => ({ ...s, id: uid(s.type === "line" ? "L-" : "R-") }));
    const newShapes = [...shapes, ...pasted];
    pushHistory(newShapes, "Paste");
    setShapes(newShapes);
  };

  // Trim tool - split line at intersection
  const trim = () => {
    if (!selectedId) return;
    const selected = shapes.find(s => s.id === selectedId);
    if (!selected || selected.type !== "line") return;

    const line = selected as LineShape;
    let trimmed = false;

    // Find intersecting lines and trim
    for (const s of shapes) {
      if (s.id === selectedId || s.type !== "line") continue;
      const other = s as LineShape;
      const intersect = getLineIntersection(line.x1, line.y1, line.x2, line.y2, other.x1, other.y1, other.x2, other.y2);
      if (intersect) {
        // Trim the selected line at intersection
        line.x2 = intersect.x;
        line.y2 = intersect.y;
        trimmed = true;
        break;
      }
    }

    if (trimmed) {
      const newShapes = shapes.map(s => s.id === selectedId ? line : s);
      pushHistory(newShapes, "Trim");
      setShapes(newShapes);
    }
  };

  // Select all
  const selectAll = () => {
    setSelectedIds(new Set(shapes.map(s => s.id)));
  };

  // Save file
  const saveFile = async () => {
    const format = prompt("Save as: json or dxf?", "json");
    if (!format) return;

    if (format === "json") {
      const data = JSON.stringify({ shapes, gridSize, lineThickness }, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "design-center.json";
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === "dxf") {
      // Export as DXF format
      let dxfContent = "0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n";
      for (const shape of shapes) {
        if (shape.type === "line") {
          const l = shape as LineShape;
          dxfContent += `0\nLINE\n8\n0\n10\n${l.x1}\n20\n${l.y1}\n11\n${l.x2}\n21\n${l.y2}\n`;
        }
      }
      dxfContent += "0\nENDSEC\n0\nEOF\n";
      const blob = new Blob([dxfContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "design-center.dxf";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Helper: line intersection
  const getLineIntersection = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) => {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null;
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    if (t < 0 || t > 1) return null;
    return { x: SNAP(x1 + t * (x2 - x1)), y: SNAP(y1 + t * (y2 - y1)) };
  };

  // Import DXF or DWG file
  function importCADFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const isDWG = file.name.toLowerCase().endsWith(".dwg");
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        let dxfContent: string;

        if (isDWG) {
          // DWG: Convert to DXF first - send as binary directly
          const response = await fetch("/api/convert-dwg-to-dxf", {
            method: "POST",
            headers: { "Content-Type": "application/octet-stream" },
            body: event.target?.result as ArrayBuffer,
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || "DWG conversion failed on server");
          }

          const { dxfContent: converted } = await response.json();
          dxfContent = converted;
        } else {
          // DXF: Use directly
          dxfContent = event.target?.result as string;
        }

        // Parse DXF content
        const parsed = parseDXF(dxfContent);

        // Normalize coordinates to fit in canvas
        const bounds = parsed.bounds;
        const padding = 1000;
        const offsetX = -bounds.minX + padding;
        const offsetY = -bounds.minY + padding;

        // Convert DXF lines to our LineShape format
        const importedLines: LineShape[] = parsed.lines.map((line, idx) => ({
          id: uid("CAD-"),
          type: "line",
          x1: line.x1 + offsetX,
          y1: line.y1 + offsetY,
          x2: line.x2 + offsetX,
          y2: line.y2 + offsetY,
          thickness: lineThickness,
          color: line.color || "#000000",
          marker: "none",
        }));

        // Add imported lines to shapes with history
        const newShapes = [...shapes, ...importedLines];
        pushHistory(newShapes, "Import CAD");
        setShapes(newShapes);
        setMode("select");
        setSelectedId(null);
      } catch (err) {
        console.error("CAD import error:", err);
        alert(`Failed to import ${isDWG ? "DWG" : "DXF"} file. Make sure it's a valid AutoCAD drawing.`);
      }
    };

    // Read as ArrayBuffer for DWG, text for DXF
    if (isDWG) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }

    // Reset input so same file can be imported again
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Helpers: SVG coordinate from mouse
  function getSvgPoint(evt: React.MouseEvent) {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const cursor = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    return { x: cursor.x - panRef.current.x, y: cursor.y - panRef.current.y };
  }

  // Mode handlers
  function onMouseDown(e: React.MouseEvent) {
    const p = getSvgPoint(e);
    const snapped = { x: SNAP(p.x), y: SNAP(p.y) };

    if (mode === "line") {
      const id = uid("L-");
      const l: LineShape = { id, type: "line", x1: snapped.x, y1: snapped.y, x2: snapped.x, y2: snapped.y, thickness: lineThickness, color: lineColor, marker: lineMarker };
      setTemp(l);
      setSelectedId(id);
    } else if (mode === "rect") {
      const id = uid("R-");
      const r: RectShape = { id, type: "rect", x: snapped.x, y: snapped.y, w: 0, h: 0 };
      setTemp(r);
      setSelectedId(id);
    } else if (mode === "move") {
      const hit = hitTest(snapped.x, snapped.y);
      if (hit) {
        setSelectedId(hit.id);
        setTemp({ ...(hit as any), __dragOrigin: snapped } as any);
        setIsDragging(true);
      } else {
        setSelectedId(null);
      }
    } else if (mode === "trim") {
      const hit = hitTest(snapped.x, snapped.y);
      if (hit) {
        setSelectedId(hit.id);
        trim();
      }
    } else if (mode === "quickDim") {
      const hit = hitTest(snapped.x, snapped.y);
      if (hit && hit.type === "line") {
        const line = hit as LineShape;
        const len = Math.round(Math.hypot(line.x2 - line.x1, line.y2 - line.y1));
        const angle = getAngle(line.x1, line.y1, line.x2, line.y2);
        let dimType: "horizontal" | "vertical" | "radius" = "horizontal";
        if (Math.abs(angle - 90) < 15 || Math.abs(angle - 270) < 15) dimType = "vertical";
        const dim: DimensionShape = {
          id: uid("DIM-"),
          type: "dimension",
          x1: line.x1,
          y1: line.y1,
          x2: line.x2,
          y2: line.y2,
          label: `${len}`,
          dimType: dimType,
          offset: 30,
        };
        const newShapes = [...shapes, dim];
        pushHistory(newShapes, `Auto Dimension`);
        setShapes(newShapes);
      }
    } else if (mode === "dimHoriz" || mode === "dimVert" || mode === "dimRadius") {
      if (!dimensionStart) {
        setDimensionStart(snapped);
      } else {
        const len = Math.round(Math.hypot(snapped.x - dimensionStart.x, snapped.y - dimensionStart.y));
        const dim: DimensionShape = {
          id: uid("DIM-"),
          type: "dimension",
          x1: dimensionStart.x,
          y1: dimensionStart.y,
          x2: snapped.x,
          y2: snapped.y,
          label: `${len}`,
          dimType: mode === "dimHoriz" ? "horizontal" : mode === "dimVert" ? "vertical" : "radius",
          offset: 30,
        };
        const newShapes = [...shapes, dim];
        pushHistory(newShapes, `Add Dimension`);
        setShapes(newShapes);
        setDimensionStart(null);
      }
    } else {
      // select mode
      const hit = hitTest(snapped.x, snapped.y);
      if (hit) {
        if (e.ctrlKey || e.metaKey) {
          setSelectedIds(prev => {
            const next = new Set<string>();
            prev.forEach(id => next.add(id));
            next.add(hit.id);
            return next;
          });
        } else {
          setSelectedId(hit.id);
          setSelectedIds(new Set([hit.id]));
        }
      } else {
        setSelectedId(null);
        setSelectedIds(new Set());
      }
    }
  }

  function onMouseMove(e: React.MouseEvent) {
    const p = getSvgPoint(e);
    let snapped = { x: SNAP(p.x), y: SNAP(p.y) };

    if (!temp) return;

    if (mode === "line" && temp.type === "line") {
      let x2 = snapped.x, y2 = snapped.y;
      if (angleSnap && (temp as LineShape).x1 !== undefined) {
        const angle = getAngle((temp as LineShape).x1, (temp as LineShape).y1, p.x, p.y);
        const snappedAngle = snapAngle(angle);
        const dist = Math.hypot(p.x - (temp as LineShape).x1, p.y - (temp as LineShape).y1);
        x2 = (temp as LineShape).x1 + dist * Math.cos(snappedAngle * Math.PI / 180);
        y2 = (temp as LineShape).y1 + dist * Math.sin(snappedAngle * Math.PI / 180);
        x2 = SNAP(x2); y2 = SNAP(y2);
      }
      setTemp({ ...temp, x2, y2 });
    } else if (mode === "rect" && temp.type === "rect") {
      const dx = snapped.x - (temp.x ?? 0);
      const dy = snapped.y - (temp.y ?? 0);
      const w = Math.abs(dx);
      const h = Math.abs(dy);
      const x = dx < 0 ? snapped.x : temp.x ?? 0;
      const y = dy < 0 ? snapped.y : temp.y ?? 0;
      setTemp({ ...temp, x, y, w, h });
    } else if (mode === "move" && isDragging && temp) {
      // temp holds initial shape + __dragOrigin
      const origin = (temp as any).__dragOrigin as { x: number; y: number } | undefined;
      if (!origin) return;
      const dx = snapped.x - origin.x;
      const dy = snapped.y - origin.y;
      const dragged = shapes.find(s => s.id === temp.id);
      if (!dragged) return;
      // compute new shape repositioned and snap
      if (dragged.type === "rect") {
        const r = dragged as RectShape;
        const nx = SNAP(r.x + dx);
        const ny = SNAP(r.y + dy);
        // update temp.__dragOrigin for next move step
        setTemp({ ...temp, __dragOrigin: snapped } as any);
        setShapes(prev => prev.map(s => s.id === r.id ? { ...r, x: nx, y: ny } : s));
      } else if (dragged.type === "line") {
        const l = dragged as LineShape;
        const nx1 = SNAP(l.x1 + dx);
        const ny1 = SNAP(l.y1 + dy);
        const nx2 = SNAP(l.x2 + dx);
        const ny2 = SNAP(l.y2 + dy);
        setTemp({ ...temp, __dragOrigin: snapped } as any);
        setShapes(prev => prev.map(s => s.id === l.id ? { ...l, x1: nx1, y1: ny1, x2: nx2, y2: ny2 } : s));
      }
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
        if ((e.key === "z" && e.shiftKey) || (e.key === "y")) { e.preventDefault(); redo(); }
        if (e.key === "c") { e.preventDefault(); copy(); }
        if (e.key === "v") { e.preventDefault(); paste(); }
        if (e.key === "a") { e.preventDefault(); selectAll(); }
        if (e.key === "s") { e.preventDefault(); saveFile(); }
      }
      if (e.key === "Delete" && selectedId) {
        const newShapes = shapes.filter(s => s.id !== selectedId);
        pushHistory(newShapes, "Delete");
        setShapes(newShapes);
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shapes, selectedId, selectedIds, clipboard, historyIndex, history]);

  function onMouseUp(e: React.MouseEvent) {
    const p = getSvgPoint(e);
    const snapped = { x: SNAP(p.x), y: SNAP(p.y) };

    if (mode === "line" && temp && (temp as any).type === "line") {
      const l = temp as LineShape;
      const fixed = { ...l, x2: snapped.x, y2: snapped.y };
      const newShapes = [...shapes.filter(s => s.id !== fixed.id), fixed];
      pushHistory(newShapes, "Draw Line");
      setShapes(newShapes);
      setTemp(null);
    } else if (mode === "rect" && temp && (temp as any).type === "rect") {
      const r = temp as RectShape;
      if ((r.w ?? 0) > 0 && (r.h ?? 0) > 0) {
        const newShapes = [...shapes.filter(s => s.id !== r.id), r];
        pushHistory(newShapes, "Draw Rect");
        setShapes(newShapes);
      }
      setTemp(null);
    } else if (mode === "move") {
      // finish dragging
      setIsDragging(false);
      setTemp(null);
    }
  }

  // Hit test: basic bounding box test (snap to grid already applied)
  function hitTest(x: number, y: number): Shape | null {
    for (let i = shapes.length - 1; i >= 0; i--) {
      const s = shapes[i];
      if (s.type === "rect") {
        const r = s as RectShape;
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r;
      } else {
        const l = s as LineShape;
        // distance to segment
        const d = pointToSegmentDistance(x, y, l.x1, l.y1, l.x2, l.y2);
        if (d < gridSize * 0.6) return l;
      }
    }
    return null;
  }

  // math helper
  function pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
    const vx = x2 - x1, vy = y2 - y1;
    const wx = px - x1, wy = py - y1;
    const c1 = vx * wx + vy * wy;
    if (c1 <= 0) return Math.hypot(px - x1, py - y1);
    const c2 = vx * vx + vy * vy;
    if (c2 <= c1) return Math.hypot(px - x2, py - y2);
    const b = c1 / c2;
    const bx = x1 + b * vx, by = y1 + b * vy;
    return Math.hypot(px - bx, py - by);
  }

  // Simple clear
  function clearAll() {
    pushHistory([], "Clear All");
    setShapes([]);
    setTemp(null);
    setSelectedId(null);
    setSelectedIds(new Set());
  }

  // Export SVG as PNG (small helper) - optional
  async function exportPNG() {
    const svg = svgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvasSize.w;
      canvas.height = canvasSize.h;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "design-center.png";
      a.click();
    };
    img.src = url;
  }

  // Smart Export Logic
  function handleExport() {
    // Find selected rectangle or largest rectangle
    let targetRect: RectShape | null = null;

    if (selectedId) {
      const selected = shapes.find(s => s.id === selectedId);
      if (selected && selected.type === "rect") {
        targetRect = selected as RectShape;
      }
    }

    // If no selected rect, find largest
    if (!targetRect) {
      let maxArea = 0;
      for (const shape of shapes) {
        if (shape.type === "rect") {
          const rect = shape as RectShape;
          const area = rect.w * rect.h;
          if (area > maxArea) {
            maxArea = area;
            targetRect = rect;
          }
        }
      }
    }

    if (!targetRect) {
      alert("Please draw and select a rectangle to export");
      return;
    }

    const width = Math.round(targetRect.w);
    const height = Math.round(targetRect.h);

    // Smart Naming logic
    let smartName = "Cabinet";
    if (height > 1800) {
      smartName = "Wardrobe (from Design)";
    } else if (height < 900) {
      smartName = "Base Unit (from Design)";
    } else {
      smartName = "Cabinet (from Design)";
    }

    // Smart Depth suggestion
    let suggestedDepth = customDepth;
    if (!depthModified) {
      if (height > 1800) {
        suggestedDepth = 560;
      } else if (height < 900) {
        suggestedDepth = 560;
      } else if (height < 1000 && width < 1000) {
        suggestedDepth = 300;
      } else {
        suggestedDepth = 560;
      }
      setCustomDepth(suggestedDepth);
    }

    // Call callback
    if (onExportToCutlist) {
      onExportToCutlist({
        width,
        height,
        depth: customDepth,
        name: smartName
      });
    }
  }

  // Initialize history
  useEffect(() => {
    if (history.length === 0 && shapes.length > 0) {
      pushHistory(shapes, "Initialize");
    }
  }, []);

  // Resize canvas to fit container
  useEffect(() => {
    const onResize = () => {
      const container = svgRef.current?.parentElement;
      if (!container) return;
      setCanvasSize({ w: Math.max(600, container.clientWidth - 320), h: Math.max(400, container.clientHeight - 40) });
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Quick sample (if none)
  useEffect(() => {
    if (shapes.length === 0) {
      const sample: Shape[] = [
        { id: uid("R-"), type: "rect", x: 100, y: 120, w: 600, h: 300 },
        { id: uid("L-"), type: "line", x1: 120, y1: 150, x2: 680, y2: 150 },
      ];
      setShapes(sample);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hierarchical grid based on gridSize - BOLD & VISIBLE with rulers
  function renderGrid() {
    const fine = gridSize;           // 1x - light gray (user's grid size)
    const medium = gridSize * 10;    // 10x - medium gray
    const coarse = gridSize * 100;   // 100x - dark gray

    // Rulers on X and Y axes
    const rulerMarks: JSX.Element[] = [];
    const labelInterval = coarse > 0 ? coarse : medium;

    // X-axis ruler (top)
    for (let x = 0; x <= canvasSize.w; x += labelInterval) {
      rulerMarks.push(
        <g key={`xruler-${x}`}>
          <line x1={x} y1={0} x2={x} y2={8} stroke="#505050" strokeWidth={1} />
          <text x={x} y={18} fontSize={10} fill="#505050" textAnchor="middle" fontFamily="monospace">
            {(x / 1000).toFixed(0)}
          </text>
        </g>
      );
    }

    // Y-axis ruler (left)
    for (let y = 0; y <= canvasSize.h; y += labelInterval) {
      rulerMarks.push(
        <g key={`yruler-${y}`}>
          <line x1={0} y1={y} x2={8} y2={y} stroke="#505050" strokeWidth={1} />
          <text x={-12} y={y + 3} fontSize={10} fill="#505050" textAnchor="end" fontFamily="monospace">
            {(y / 1000).toFixed(0)}
          </text>
        </g>
      );
    }

    return (
      <>
        <defs>
          {/* Fine grid: 1x gridSize - light blue - COMPLETE SQUARES */}
          <pattern id="gridFine" width={fine} height={fine} patternUnits="userSpaceOnUse">
            <path d={`M ${fine} 0 L ${fine} ${fine} L 0 ${fine}`} stroke="#b3d9ff" strokeWidth={0.8} fill="none" />
          </pattern>

          {/* Medium grid: 10x gridSize - bold medium blue - COMPLETE SQUARES */}
          {medium > fine && (
            <pattern id="gridMedium" width={medium} height={medium} patternUnits="userSpaceOnUse">
              <path d={`M ${medium} 0 L ${medium} ${medium} L 0 ${medium}`} stroke="#4da6ff" strokeWidth={1.5} fill="none" />
            </pattern>
          )}

          {/* Coarse grid: 100x gridSize - bold dark blue - COMPLETE SQUARES */}
          {coarse > medium && (
            <pattern id="gridCoarse" width={coarse} height={coarse} patternUnits="userSpaceOnUse">
              <path d={`M ${coarse} 0 L ${coarse} ${coarse} L 0 ${coarse}`} stroke="#0052cc" strokeWidth={2.5} fill="none" />
            </pattern>
          )}
        </defs>

        {/* Layered background */}
        <rect width={canvasSize.w} height={canvasSize.h} fill="#fff" />
        {gridVisible && <rect width={canvasSize.w} height={canvasSize.h} fill="url(#gridFine)" />}
        {gridVisible && medium > fine && <rect width={canvasSize.w} height={canvasSize.h} fill="url(#gridMedium)" />}
        {gridVisible && coarse > medium && <rect width={canvasSize.w} height={canvasSize.h} fill="url(#gridCoarse)" />}

        {/* Rulers on X and Y axes */}
        <g id="rulers">
          {rulerMarks}
        </g>
      </>
    );
  }

  function renderShape(s: Shape) {
    const isSelected = s.id === selectedId || selectedIds.has(s.id);
    if (s.type === "dimension") {
      const d = s as DimensionShape;
      const mx = (d.x1 + d.x2) / 2;
      const my = (d.y1 + d.y2) / 2;
      const len = Math.round(Math.hypot(d.x2 - d.x1, d.y2 - d.y1));
      const angle = getAngle(d.x1, d.y1, d.x2, d.y2);

      if (d.dimType === "horizontal") {
        return (
          <g key={d.id}>
            <line x1={d.x1} y1={d.y1 + (d.offset || 30)} x2={d.x2} y2={d.y1 + (d.offset || 30)} stroke="#ff6b9d" strokeWidth={2} />
            <line x1={d.x1} y1={d.y1} x2={d.x1} y2={d.y1 + (d.offset || 30)} stroke="#ff6b9d" strokeWidth={1} />
            <line x1={d.x2} y1={d.y1} x2={d.x2} y2={d.y1 + (d.offset || 30)} stroke="#ff6b9d" strokeWidth={1} />
            <polygon points={`${d.x2 - 6},${d.y1 + (d.offset || 30) - 4} ${d.x2},${d.y1 + (d.offset || 30)} ${d.x2 - 6},${d.y1 + (d.offset || 30) + 4}`} fill="#ff6b9d" />
            <polygon points={`${d.x1 + 6},${d.y1 + (d.offset || 30) - 4} ${d.x1},${d.y1 + (d.offset || 30)} ${d.x1 + 6},${d.y1 + (d.offset || 30) + 4}`} fill="#ff6b9d" />
            <text x={mx} y={d.y1 + (d.offset || 30) - 8} textAnchor="middle" fontSize={14} fill="#ff6b9d" fontWeight="bold">{d.label || `${len}mm`}</text>
          </g>
        );
      } else if (d.dimType === "vertical") {
        return (
          <g key={d.id}>
            <line x1={d.x1 + (d.offset || 30)} y1={d.y1} x2={d.x1 + (d.offset || 30)} y2={d.y2} stroke="#ff6b9d" strokeWidth={2} />
            <line x1={d.x1} y1={d.y1} x2={d.x1 + (d.offset || 30)} y2={d.y1} stroke="#ff6b9d" strokeWidth={1} />
            <line x1={d.x1} y1={d.y2} x2={d.x1 + (d.offset || 30)} y2={d.y2} stroke="#ff6b9d" strokeWidth={1} />
            <polygon points={`${d.x1 + (d.offset || 30) - 4},${d.y2 - 6} ${d.x1 + (d.offset || 30)},${d.y2} ${d.x1 + (d.offset || 30) + 4},${d.y2 - 6}`} fill="#ff6b9d" />
            <polygon points={`${d.x1 + (d.offset || 30) - 4},${d.y1 + 6} ${d.x1 + (d.offset || 30)},${d.y1} ${d.x1 + (d.offset || 30) + 4},${d.y1 + 6}`} fill="#ff6b9d" />
            <text x={d.x1 + (d.offset || 30) + 12} y={my} textAnchor="start" fontSize={14} fill="#ff6b9d" fontWeight="bold">{d.label || `${len}mm`}</text>
          </g>
        );
      } else if (d.dimType === "radius") {
        return (
          <g key={d.id}>
            <line x1={d.x1} y1={d.y1} x2={d.x2} y2={d.y2} stroke="#ff6b9d" strokeWidth={1.5} strokeDasharray="4 4" />
            <circle cx={d.x1} cy={d.y1} r={3} fill="#ff6b9d" />
            <text x={(d.x1 + d.x2) / 2} y={(d.y1 + d.y2) / 2 - 8} textAnchor="middle" fontSize={12} fill="#ff6b9d" fontWeight="bold">{d.label}</text>
          </g>
        );
      }
    } else if (s.type === "rect") {
      const r = s as RectShape;
      return (
        <g key={r.id}>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={8} ry={8}
            fill="#e9fbf7" stroke="#0b7a6b" strokeWidth={4} opacity={0.95} />
          {isSelected && (
            <g>
              {/* small handle */}
              <rect x={r.x - 6} y={r.y - 6} width={12} height={12} fill="#fff" stroke="#0b7a6b" />
            </g>
          )}
          {/* dimension label */}
          <text x={r.x + r.w / 2} y={r.y + r.h / 2} textAnchor="middle" alignmentBaseline="middle"
            fontSize={20} fontWeight={700} fill="#0b7a6b">{`${r.w} × ${r.h} mm`}</text>
        </g>
      );
    } else {
      const l = s as LineShape;
      const mx = (l.x1 + l.x2) / 2;
      const my = (l.y1 + l.y2) / 2;
      const len = Math.round(Math.hypot(l.x2 - l.x1, l.y2 - l.y1));
      const angle = getAngle(l.x1, l.y1, l.x2, l.y2);
      const lineCol = l.color ?? "#000000";
      const marker = l.marker ?? "none";

      // Arrow calculation
      const arrowLen = 16;
      const arrowAngle = angle * Math.PI / 180;
      const ax = l.x2 - arrowLen * Math.cos(arrowAngle);
      const ay = l.y2 - arrowLen * Math.sin(arrowAngle);
      const arrowLeft = Math.atan2(ay - (l.y2 - 6 * Math.sin(arrowAngle)), ax - (l.x2 - 6 * Math.cos(arrowAngle)));
      const arrowRight = Math.atan2(ay - (l.y2 + 6 * Math.sin(arrowAngle)), ax - (l.x2 + 6 * Math.cos(arrowAngle)));

      return (
        <g key={l.id}>
          <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={lineCol} strokeWidth={2.5} />

          {/* End marker */}
          {marker === "arrow" && (
            <polygon points={`${l.x2},${l.y2} ${ax + 8 * Math.cos(arrowLeft)},${ay + 8 * Math.sin(arrowLeft)} ${ax + 8 * Math.cos(arrowRight)},${ay + 8 * Math.sin(arrowRight)}`} fill={lineCol} />
          )}
          {marker === "circle" && <circle cx={l.x2} cy={l.y2} r={4} fill={lineCol} />}

          {/* Endpoints */}
          <circle cx={l.x1} cy={l.y1} r={3} fill="#fff" stroke={lineCol} strokeWidth={1.5} />
          <circle cx={l.x2} cy={l.y2} r={3} fill="#fff" stroke={lineCol} strokeWidth={1.5} />

          {isSelected && (
            <>
              <rect x={l.x1 - 6} y={l.y1 - 6} width={12} height={12} fill="none" stroke={lineCol} strokeWidth={1} />
              <rect x={l.x2 - 6} y={l.y2 - 6} width={12} height={12} fill="none" stroke={lineCol} strokeWidth={1} />

              {/* Prominent length display when selected */}
              <rect x={mx - 32} y={my - 26} width={64} height={20} fill="#4da6ff" rx={4} />
              <text x={mx} y={my - 10} textAnchor="middle" fontSize={14} fill="#fff" fontWeight="bold">{len}mm</text>
            </>
          )}

          {/* Dimension labels: custom label takes priority */}
          {!isSelected && (
            <text x={mx} y={my - 8} textAnchor="middle" fontSize={12} fill={lineCol} fontWeight={600}>
              {l.customLabel ? l.customLabel : showAllDimensions ? `${len}mm` : showLineAngle && showLineCoords ? `${len}mm ${angle}° (${Math.round(l.x2)},${Math.round(l.y2)})` : showLineAngle ? `${len}mm ${angle}°` : showLineCoords ? `${len}mm (${Math.round(l.x2)},${Math.round(l.y2)})` : `${len}mm × ${l.thickness ?? 18}mm`}
            </text>
          )}
        </g>
      );
    }
  }

  return (
    <div style={{ display: "flex", height: "100%", minHeight: 600, background: "#fff" }}>
      {/* left: vertical toolbar - clean monochrome */}
      <div style={{ width: 48, padding: "6px 0", background: "#f0f0f0", borderRight: "1px solid #ccc", display: "flex", flexDirection: "column", gap: 2, alignItems: "center" }}>
        <button onClick={() => setMode("select")} title="Select" style={{ width: 40, height: 40, padding: 0, background: mode === "select" ? "#e0e0e0" : "transparent", color: "#333", border: "none", borderRadius: 2, fontWeight: 400, cursor: "pointer", fontSize: 16 }}>✏️</button>
        <button onClick={() => setMode("line")} title="Draw Line" style={{ width: 40, height: 40, padding: 0, background: mode === "line" ? "#e0e0e0" : "transparent", color: "#333", border: "none", borderRadius: 2, fontWeight: 400, cursor: "pointer", fontSize: 16 }}>—</button>
        <button onClick={() => setMode("rect")} title="Draw Rect" style={{ width: 40, height: 40, padding: 0, background: mode === "rect" ? "#e0e0e0" : "transparent", color: "#333", border: "none", borderRadius: 2, fontWeight: 400, cursor: "pointer", fontSize: 16 }}>◻</button>
        <button onClick={() => setMode("move")} title="Move" style={{ width: 40, height: 40, padding: 0, background: mode === "move" ? "#e0e0e0" : "transparent", color: "#333", border: "none", borderRadius: 2, fontWeight: 400, cursor: "pointer", fontSize: 16 }}>⊕</button>
        <button onClick={() => setMode("trim")} title="Trim" style={{ width: 40, height: 40, padding: 0, background: mode === "trim" ? "#e0e0e0" : "transparent", color: "#333", border: "none", borderRadius: 2, fontWeight: 400, cursor: "pointer", fontSize: 14 }}>✂</button>
        <button onClick={() => setMode("quickDim")} title="Quick Dimension (click line)" style={{ width: 40, height: 40, padding: 0, background: mode === "quickDim" ? "#e0e0e0" : "transparent", color: "#333", border: "none", borderRadius: 2, fontWeight: 400, cursor: "pointer", fontSize: 14 }}>⚡</button>
        <button onClick={() => { setMode("dimHoriz"); setDimensionStart(null); }} title="Horizontal Dimension" style={{ width: 40, height: 40, padding: 0, background: mode === "dimHoriz" ? "#e0e0e0" : "transparent", color: "#333", border: "none", borderRadius: 2, fontWeight: 400, cursor: "pointer", fontSize: 14 }}>⟷</button>
        <button onClick={() => { setMode("dimVert"); setDimensionStart(null); }} title="Vertical Dimension" style={{ width: 40, height: 40, padding: 0, background: mode === "dimVert" ? "#e0e0e0" : "transparent", color: "#333", border: "none", borderRadius: 2, fontWeight: 400, cursor: "pointer", fontSize: 14 }}>⟨⟩</button>
        <button onClick={() => { setMode("dimRadius"); setDimensionStart(null); }} title="Radius Dimension" style={{ width: 40, height: 40, padding: 0, background: mode === "dimRadius" ? "#e0e0e0" : "transparent", color: "#333", border: "none", borderRadius: 2, fontWeight: 400, cursor: "pointer", fontSize: 14 }}>⌒</button>

        <div style={{ width: 24, height: 1, background: "#ccc", margin: "4px 0" }} />

        <button onClick={undo} title="Undo (Ctrl+Z)" disabled={historyIndex <= 0} style={{ width: 40, height: 40, padding: 0, background: "transparent", color: historyIndex <= 0 ? "#ccc" : "#333", border: "none", borderRadius: 2, fontWeight: 400, cursor: "pointer", fontSize: 14 }}>↶</button>
        <button onClick={redo} title="Redo (Ctrl+Y)" disabled={historyIndex >= history.length - 1} style={{ width: 40, height: 40, padding: 0, background: "transparent", color: historyIndex >= history.length - 1 ? "#ccc" : "#333", border: "none", borderRadius: 2, fontWeight: 400, cursor: "pointer", fontSize: 14 }}>↷</button>

        <div style={{ width: 24, height: 1, background: "#ccc", margin: "4px 0" }} />

        <button onClick={copy} title="Copy (Ctrl+C)" style={{ width: 40, height: 40, padding: 0, background: "transparent", color: "#333", border: "none", borderRadius: 2, fontWeight: 400, cursor: "pointer", fontSize: 12 }}>Cp</button>
        <button onClick={paste} title="Paste (Ctrl+V)" style={{ width: 40, height: 40, padding: 0, background: "transparent", color: "#333", border: "none", borderRadius: 2, fontWeight: 400, cursor: "pointer", fontSize: 12 }}>Ps</button>
        <button onClick={selectAll} title="Select All (Ctrl+A)" style={{ width: 40, height: 40, padding: 0, background: "transparent", color: "#333", border: "none", borderRadius: 2, fontWeight: 400, cursor: "pointer", fontSize: 12 }}>All</button>

        <div style={{ width: 24, height: 1, background: "#ccc", margin: "4px 0" }} />

        <button onClick={() => setGridVisible(!gridVisible)} title="Toggle Grid" style={{ width: 40, height: 40, padding: 0, background: gridVisible ? "#e0e0e0" : "transparent", color: "#333", border: "none", borderRadius: 2, fontWeight: 400, cursor: "pointer", fontSize: 14 }}>⊞</button>
        <button onClick={() => setShowAllDimensions(!showAllDimensions)} title="Show/Hide Dimensions" style={{ width: 40, height: 40, padding: 0, background: showAllDimensions ? "#e0e0e0" : "transparent", color: "#333", border: "none", borderRadius: 2, fontWeight: 400, cursor: "pointer", fontSize: 12 }}>∟</button>
        <button onClick={saveFile} title="Save File (Ctrl+S)" style={{ width: 40, height: 40, padding: 0, background: "transparent", color: "#333", border: "none", borderRadius: 2, fontWeight: 400, cursor: "pointer", fontSize: 14 }}>💾</button>

        <div style={{ width: 24, height: 1, background: "#ccc", margin: "4px 0" }} />

        <button onClick={() => setZoom(Math.min(5, zoom + 0.2))} title="Zoom In" style={{ width: 40, height: 40, padding: 0, background: "transparent", color: "#333", border: "none", borderRadius: 2, fontWeight: 400, cursor: "pointer", fontSize: 18 }}>🔍+</button>
        <button onClick={() => setZoom(Math.max(0.1, zoom - 0.2))} title="Zoom Out" style={{ width: 40, height: 40, padding: 0, background: "transparent", color: "#333", border: "none", borderRadius: 2, fontWeight: 400, cursor: "pointer", fontSize: 18 }}>🔍−</button>
        <button onClick={() => setZoom(1)} title="Reset Zoom (1:1)" style={{ width: 40, height: 40, padding: 0, background: "transparent", color: "#333", border: "none", borderRadius: 2, cursor: "pointer", fontSize: 12, fontWeight: "bold" }}>1:1</button>

        <div style={{ width: 24, height: 1, background: "#ccc", margin: "4px 0" }} />

        <button onClick={() => fileInputRef.current?.click()} title="Import DXF/DWG" style={{ width: 40, height: 40, padding: 0, background: "transparent", color: "#333", border: "none", borderRadius: 2, cursor: "pointer", fontSize: 14, fontWeight: "bold" }}>CAD</button>
        <input
          ref={fileInputRef}
          type="file"
          accept="*/*"
          onChange={importCADFile}
          style={{ display: "none" }}
        />

        <button onClick={clearAll} title="Clear All" style={{ width: 40, height: 40, padding: 0, background: "transparent", color: "#333", border: "none", borderRadius: 2, fontWeight: 400, cursor: "pointer", fontSize: 16 }}>✕</button>
        <button onClick={() => exportPNG()} title="Export PNG" style={{ width: 40, height: 40, padding: 0, background: "transparent", color: "#333", border: "none", borderRadius: 2, fontWeight: 400, cursor: "pointer", fontSize: 16 }}>⬇</button>
      </div>

      {/* main: canvas takes all remaining space */}
      <div style={{ flex: 1, position: "relative", padding: 0, display: "flex", flexDirection: "column", background: "#fff", overflow: "hidden" }}>
        {/* top status bar */}
        <div style={{ height: 32, padding: "4px 12px", background: "#f8f8f8", borderBottom: "1px solid #d0d0d0", display: "flex", gap: 10, alignItems: "center", fontSize: 10, color: "#555", flexWrap: "wrap" }}>
          <span style={{ display: "flex", gap: 2, alignItems: "center" }}>
            Width: <input type="number" min="1" value={widthValue} onChange={(e) => setWidthValue(Math.max(1, parseInt(e.target.value) || widthValue))} style={{ width: 32, padding: "2px 4px", border: "1px solid #ccc", borderRadius: 2, fontSize: 10, fontFamily: "monospace" }} />
            − <input type="number" min="0" value={widthReduction} onChange={(e) => setWidthReduction(Math.max(0, parseInt(e.target.value) || widthReduction))} style={{ width: 32, padding: "2px 4px", border: "1px solid #ccc", borderRadius: 2, fontSize: 10, fontFamily: "monospace" }} />
            = <span style={{ fontWeight: "bold", color: "#333" }}>{widthValue - widthReduction}</span> mm
          </span>
          <span style={{ display: "flex", gap: 2, alignItems: "center" }}>
            Grid: <input type="number" min="5" max="50" value={gridSize} onChange={(e) => setGridSize(Math.max(5, parseInt(e.target.value) || gridSize))} style={{ width: 24, padding: "2px 2px", border: "1px solid #ccc", borderRadius: 2, fontSize: 10, fontFamily: "monospace" }} />
            mm
          </span>
          <span style={{ display: "flex", gap: 2, alignItems: "center" }}>
            Thick: <input type="number" min="3" max="50" value={lineThickness} onChange={(e) => setLineThickness(Math.max(3, parseInt(e.target.value) || lineThickness))} style={{ width: 24, padding: "2px 2px", border: "1px solid #ccc", borderRadius: 2, fontSize: 10, fontFamily: "monospace" }} />
            mm
          </span>
          <span style={{ display: "flex", gap: 2, alignItems: "center" }}>
            Color: <input type="color" value={lineColor} onChange={(e) => setLineColor(e.target.value)} style={{ width: 24, height: 20, border: "1px solid #ccc", borderRadius: 2, cursor: "pointer" }} />
          </span>
          <span style={{ display: "flex", gap: 2, alignItems: "center" }}>
            Marker: <select value={lineMarker} onChange={(e) => setLineMarker(e.target.value as any)} style={{ padding: "2px 4px", border: "1px solid #ccc", borderRadius: 2, fontSize: 10 }}>
              <option value="none">None</option>
              <option value="arrow">Arrow</option>
              <option value="circle">Circle</option>
            </select>
          </span>
          <span>
            <label style={{ display: "flex", gap: 4, alignItems: "center", cursor: "pointer" }}>
              <input type="checkbox" checked={angleSnap} onChange={(e) => setAngleSnap(e.target.checked)} style={{ cursor: "pointer" }} />
              Angle Snap
            </label>
          </span>
          <span>
            <label style={{ display: "flex", gap: 4, alignItems: "center", cursor: "pointer" }}>
              <input type="checkbox" checked={showLineAngle} onChange={(e) => setShowLineAngle(e.target.checked)} style={{ cursor: "pointer" }} />
              Angle
            </label>
          </span>
          <span>
            <label style={{ display: "flex", gap: 4, alignItems: "center", cursor: "pointer" }}>
              <input type="checkbox" checked={showLineCoords} onChange={(e) => setShowLineCoords(e.target.checked)} style={{ cursor: "pointer" }} />
              Coords
            </label>
          </span>
          <span style={{ marginLeft: "auto", fontSize: 10, color: "#777", display: "flex", gap: 16, alignItems: "center" }}>
            <span style={{ fontWeight: "bold", color: "#0b7a6b", backgroundColor: "#e9fbf7", padding: "2px 8px", borderRadius: 3 }}>
              Inner Width: {calculatedWidth} mm
            </span>
            🔍 Zoom: {(zoom * 100).toFixed(0)}% | {mode === "line" && angleSnap && "⚡ Angle snap ON"}
          </span>
        </div>

        {/* Smart Toolbar for Export */}
        <div style={{ height: 40, padding: "6px 12px", background: "#f0f7ff", borderBottom: "1px solid #b3d9ff", display: "flex", gap: 12, alignItems: "center", fontSize: 11 }}>
          <select value={selectedTemplate || ""} onChange={(e) => setSelectedTemplate(e.target.value || null)} style={{ padding: "4px 8px", border: "1px solid #4da6ff", borderRadius: 3, fontSize: 11, cursor: "pointer" }}>
            <option value="">📋 Templates</option>
            <option value="wardrobe">Wardrobe (900×2100)</option>
            <option value="base">Base Unit (600×870)</option>
            <option value="wall">Wall Unit (600×720)</option>
          </select>

          <span style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 11 }}>
            Depth (mm):
            <input
              type="number"
              min="100"
              max="1000"
              value={customDepth}
              onChange={(e) => {
                setCustomDepth(Math.max(100, parseInt(e.target.value) || customDepth));
                setDepthModified(true);
              }}
              style={{ width: 50, padding: "4px 6px", border: "1px solid #4da6ff", borderRadius: 3, fontSize: 11 }}
            />
          </span>

          <button
            onClick={handleExport}
            style={{
              marginLeft: "auto",
              padding: "6px 14px",
              background: "linear-gradient(135deg, #0b7a6b, #0d9488)",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
            }}
          >
            📤 Export to Cutlist
          </button>
        </div>

        {/* canvas - fills all available space with zoom */}
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          style={{ background: "#fff", cursor: mode === "line" || mode === "rect" ? "crosshair" : mode === "move" ? "grab" : "default" }}
          viewBox={`0 0 ${canvasSize.w / zoom} ${canvasSize.h / zoom}`}
          preserveAspectRatio="none"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        >
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.08" />
            </filter>
          </defs>

          {/* efficient grid pattern */}
          {renderGrid()}

          {/* shapes */}
          <g>
            {shapes.map(s => renderShape(s))}
            {/* temp shape on top */}
            {temp && (temp as any).type === "rect" && (() => {
              const r = temp as RectShape;
              return <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={6} ry={6} fill="rgba(11,122,107,0.08)" stroke="#0b7a6b" strokeWidth={4} strokeDasharray="6 6" />;
            })()}
            {temp && (temp as any).type === "line" && (() => {
              const l = temp as LineShape;
              return <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.color || "#000000"} strokeWidth={2.5} strokeDasharray="4 4" />;
            })()}
          </g>
        </svg>
      </div>
    </div>
  );
}
