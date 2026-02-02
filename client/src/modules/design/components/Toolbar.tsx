// ============================================
// Toolbar.tsx
// ============================================
// AutoCAD-style dark toolbar with drawing tools, dimensions, and settings.
// Uses Zustand store for state management.

import React, { useRef, useCallback } from "react";
import { useDesignStore } from "../store/designStore";
import { saveAsJSON, importCADFile, exportPNG } from "../utils/fileIO";
import { DIMENSION_FONT_SIZES } from "../dimensions";

// Tool button style helper
const toolBtn = (active: boolean) => ({
  width: 28, height: 28, padding: 0,
  background: active ? "#3a3a4a" : "transparent",
  color: active ? "#00e5ff" : "#aab",
  border: active ? "1px solid #00e5ff" : "1px solid transparent",
  borderRadius: 2, cursor: "pointer", fontSize: 13,
  display: "flex" as const, alignItems: "center" as const, justifyContent: "center" as const,
  transition: "all 0.1s ease"
});

const divider = { width: 1, height: 20, background: "#444", margin: "0 3px" };

export default function Toolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get state and actions from store
  const {
    mode, setMode, lineThickness, setLineThickness, lineColor, setLineColor,
    gridSize, setGridSize, gridVisible, setGridVisible, zoom, setZoom,
    angleSnap, setAngleSnap, orthoMode, setOrthoMode,
    smartSnapEnabled, setSmartSnapEnabled, showComponentPanel, setShowComponentPanel,
    show3DPreview, setShow3DPreview, showModulePanel, setShowModulePanel,
    showMeasurementPanel, setShowMeasurementPanel, setDimensionStart,
    moduleConfig, historyIndex, history, undo, redo, copyToClipboard, pasteFromClipboard,
    selectAll, clearAll, widthValue, widthReduction, shapes, setShapes, pushHistory,
    dimFontSize, setDimFontSize
  } = useDesignStore();

  const calculatedWidth = widthValue - widthReduction;

  // File I/O handlers
  const handleSave = useCallback(() => {
    saveAsJSON(shapes, gridSize, lineThickness, "design-drawing.json");
  }, [shapes, gridSize, lineThickness]);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importCADFile(file, "/api", lineThickness);
      if (result.success && result.shapes.length > 0) {
        const newShapes = [...shapes, ...result.shapes];
        pushHistory(newShapes, `Import ${file.name}`);
        setShapes(newShapes);
      } else if (result.error) {
        alert(`Import failed: ${result.error}`);
      }
    } catch (err) {
      console.error("Import failed:", err);
      alert("Failed to import file. Check console for details.");
    }
    // Reset input
    e.target.value = "";
  }, [shapes, lineThickness, pushHistory, setShapes]);

  const handleExportPNG = useCallback(() => {
    const svgElement = document.querySelector("svg") as SVGSVGElement | null;
    if (svgElement) {
      const { width, height } = svgElement.getBoundingClientRect();
      exportPNG(svgElement, width, height, "design-export.png");
    }
  }, []);

  return (
    <div style={{ height: 38, padding: "0 8px", background: "#2a2a3e", borderBottom: "1px solid #3a3a4e", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
      {/* Drawing Tools */}
      <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
        <button onClick={() => setMode("select")} title="Select (V)" style={toolBtn(mode === "select")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>
        </button>
        <button onClick={() => setMode("rect")} title="Rectangle (R)" style={toolBtn(mode === "rect")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="0"/></svg>
        </button>
        <button onClick={() => setMode("line")} title="Line (L)" style={toolBtn(mode === "line")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="19" x2="19" y2="5"/></svg>
        </button>
        <button onClick={() => setMode("move")} title="Move (M)" style={toolBtn(mode === "move")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="5,9 2,12 5,15"/><polyline points="9,5 12,2 15,5"/><polyline points="15,19 12,22 9,19"/><polyline points="19,9 22,12 19,15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
        </button>
        <button onClick={() => setMode("trim")} title="Trim/Delete" style={toolBtn(mode === "trim")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>
        </button>
        {/* Plywood Thickness Dropdown */}
        <select value={lineThickness} onChange={(e) => setLineThickness(Number(e.target.value))} title="Plywood Thickness (mm)"
          style={{ padding: "2px 4px", marginLeft: 4, border: "1px solid #444", borderRadius: 2, fontSize: 10, background: "#1e1e2e", color: "#00e5ff", fontFamily: "'Courier New', monospace", cursor: "pointer", minWidth: 58 }}>
          <option value={6}>6 mm</option>
          <option value={8}>8 mm</option>
          <option value={9}>9 mm</option>
          <option value={12}>12 mm</option>
          <option value={15}>15 mm</option>
          <option value={18}>18 mm</option>
          <option value={19}>19 mm</option>
          <option value={25}>25 mm</option>
        </select>
      </div>

      <div style={divider} />

      {/* Dimension Tools */}
      <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
        <button onClick={() => setMode("quickDim")} title="Quick Dimension" style={toolBtn(mode === "quickDim")}>⚡</button>
        <button onClick={() => { setMode("dimHoriz"); setDimensionStart(null); }} title="Horizontal Dim" style={toolBtn(mode === "dimHoriz")}>↔</button>
        <button onClick={() => { setMode("dimVert"); setDimensionStart(null); }} title="Vertical Dim" style={toolBtn(mode === "dimVert")}>↕</button>
        <button onClick={() => { setMode("measure"); setShowMeasurementPanel(true); }} title="Measure" style={toolBtn(mode === "measure")}>📏</button>
        {/* Dimension Font Size - unified config */}
        <select value={dimFontSize} onChange={(e) => setDimFontSize(Number(e.target.value))} title="Dimension Font Size (All Dimensions)"
          style={{ padding: "2px 4px", marginLeft: 4, border: "1px solid #444", borderRadius: 2, fontSize: 10, background: "#1e1e2e", color: "#00e5ff", fontFamily: "'Courier New', monospace", cursor: "pointer", minWidth: 50 }}>
          {DIMENSION_FONT_SIZES.map(({ value, label }) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div style={divider} />

      {/* Edit Tools */}
      <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
        <button onClick={undo} title="Undo (Ctrl+Z)" disabled={historyIndex <= 0} style={{...toolBtn(false), opacity: historyIndex <= 0 ? 0.4 : 1}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1,4 1,10 7,10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
        </button>
        <button onClick={redo} title="Redo (Ctrl+Y)" disabled={historyIndex >= history.length - 1} style={{...toolBtn(false), opacity: historyIndex >= history.length - 1 ? 0.4 : 1}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23,4 23,10 17,10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </button>
        <button onClick={copyToClipboard} title="Copy (Ctrl+C)" style={toolBtn(false)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button onClick={pasteFromClipboard} title="Paste (Ctrl+V)" style={toolBtn(false)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
        </button>
        <button onClick={selectAll} title="Select All" style={toolBtn(false)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2"/></svg>
        </button>
      </div>

      <div style={divider} />

      {/* View Tools */}
      <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
        <button onClick={() => setGridVisible(!gridVisible)} title="Toggle Grid" style={toolBtn(gridVisible)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
        </button>
        <button onClick={() => setSmartSnapEnabled(!smartSnapEnabled)} title="Smart Snap" style={toolBtn(smartSnapEnabled)}>🧲</button>
        <button onClick={() => setShowComponentPanel(!showComponentPanel)} title="Components" style={toolBtn(showComponentPanel)}>🧩</button>
        <button onClick={() => setShow3DPreview(!show3DPreview)} title="3D Preview" style={toolBtn(show3DPreview)}>🎲</button>
        <button onClick={() => { if (moduleConfig) setShowModulePanel(!showModulePanel); }} title="Module Config" style={{...toolBtn(showModulePanel), opacity: moduleConfig ? 1 : 0.4}}>🏗️</button>
      </div>

      <div style={divider} />

      {/* Zoom */}
      <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
        <button onClick={() => setZoom(Math.max(0.1, zoom - 0.2))} title="Zoom Out" style={toolBtn(false)}>−</button>
        <span style={{ fontSize: 9, color: "#888", minWidth: 36, textAlign: "center", fontFamily: "'Courier New', monospace" }}>{(zoom * 100).toFixed(0)}%</span>
        <button onClick={() => setZoom(Math.min(5, zoom + 0.2))} title="Zoom In" style={toolBtn(false)}>+</button>
        <button onClick={() => setZoom(1)} title="Reset Zoom" style={{...toolBtn(false), fontSize: 10, fontWeight: 600}}>1:1</button>
      </div>

      <div style={divider} />

      {/* File Tools */}
      <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
        <button onClick={handleSave} title="Save (Ctrl+S)" style={toolBtn(false)}>💾</button>
        <button onClick={() => fileInputRef.current?.click()} title="Import CAD" style={{...toolBtn(false), fontSize: 9, fontWeight: 600}}>CAD</button>
        <input ref={fileInputRef} type="file" accept=".dxf,.dwg,.json" onChange={handleImport} style={{ display: "none" }} />
        <button onClick={handleExportPNG} title="Export PNG" style={toolBtn(false)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button onClick={clearAll} title="Clear All" style={{...toolBtn(false), color: "#dc2626"}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,6 5,6 21,6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Quick Settings */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 10, color: "#888" }}>
        <span style={{ display: "flex", gap: 3, alignItems: "center" }}>
          Grid:<input type="number" min="5" max="50" value={gridSize} onChange={(e) => setGridSize(Math.max(5, parseInt(e.target.value) || gridSize))} style={{ width: 30, padding: "1px 3px", border: "1px solid #444", borderRadius: 2, fontSize: 10, background: "#1e1e2e", color: "#ccc" }} />
        </span>
        <span style={{ display: "flex", gap: 3, alignItems: "center" }}>
          <input type="color" value={lineColor} onChange={(e) => setLineColor(e.target.value)} title="Line Color" style={{ width: 20, height: 18, border: "1px solid #444", borderRadius: 2, cursor: "pointer", background: "transparent" }} />
        </span>
        <label style={{ display: "flex", gap: 3, alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={angleSnap} onChange={(e) => setAngleSnap(e.target.checked)} style={{ cursor: "pointer", accentColor: "#00e5ff" }} />
          <span>45°</span>
        </label>
        <button onClick={() => setOrthoMode(!orthoMode)} title="Ortho Mode (H/V only)"
          style={{ padding: "2px 6px", fontSize: 10, fontWeight: 700, fontFamily: "'Courier New', monospace", background: orthoMode ? "#00e5ff" : "#1e1e2e", color: orthoMode ? "#1e1e2e" : "#888", border: `1px solid ${orthoMode ? "#00e5ff" : "#444"}`, borderRadius: 2, cursor: "pointer", letterSpacing: 0.5 }}>
          ORTHO
        </button>
      </div>

      {/* Status */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginLeft: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: "#00e5ff", background: "#1e1e2e", padding: "2px 6px", borderRadius: 2, border: "1px solid #333", fontFamily: "'Courier New', monospace" }}>
          {calculatedWidth}mm
        </span>
      </div>
    </div>
  );
}
