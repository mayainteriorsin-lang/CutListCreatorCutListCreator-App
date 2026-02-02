// ============================================
// ComponentLibrary.tsx
// ============================================
// Pre-built furniture component library panel.
// Uses Zustand store for state management.

import React from "react";
import { useDesignStore } from "../store/designStore";
import type { ComponentTemplate, ShapeWithoutId } from "../types";

// Pre-built Component Library
const COMPONENT_LIBRARY: ComponentTemplate[] = [
  {
    id: "shelf", name: "Shelf", icon: "📚", category: "cabinet", width: 400, height: 18,
    shapes: [{ type: "rect", x: 0, y: 0, w: 400, h: 18 }] as ShapeWithoutId[]
  },
  {
    id: "drawer-box", name: "Drawer Box", icon: "🗄️", category: "cabinet", width: 450, height: 150,
    shapes: [
      { type: "rect", x: 0, y: 0, w: 450, h: 150 },
      { type: "line", x1: 10, y1: 10, x2: 440, y2: 10 },
      { type: "line", x1: 10, y1: 140, x2: 440, y2: 140 }
    ] as ShapeWithoutId[]
  },
  {
    id: "door-panel", name: "Door Panel", icon: "🚪", category: "cabinet", width: 400, height: 700,
    shapes: [
      { type: "rect", x: 0, y: 0, w: 400, h: 700 },
      { type: "rect", x: 20, y: 20, w: 360, h: 660 }
    ] as ShapeWithoutId[]
  },
  {
    id: "hinge", name: "Hinge", icon: "🔩", category: "hardware", width: 35, height: 48,
    shapes: [
      { type: "rect", x: 0, y: 0, w: 35, h: 48 },
      { type: "line", x1: 17, y1: 0, x2: 17, y2: 48 }
    ] as ShapeWithoutId[]
  },
  {
    id: "handle-bar", name: "Handle Bar", icon: "➖", category: "hardware", width: 160, height: 12,
    shapes: [
      { type: "rect", x: 0, y: 0, w: 160, h: 12 },
      { type: "line", x1: 20, y1: 6, x2: 140, y2: 6 }
    ] as ShapeWithoutId[]
  },
  {
    id: "knob", name: "Knob", icon: "⚫", category: "hardware", width: 32, height: 32,
    shapes: [{ type: "rect", x: 0, y: 0, w: 32, h: 32 }] as ShapeWithoutId[]
  },
  {
    id: "rail-slide", name: "Drawer Slide", icon: "↔️", category: "accessory", width: 450, height: 45,
    shapes: [
      { type: "rect", x: 0, y: 0, w: 450, h: 45 },
      { type: "line", x1: 0, y1: 22, x2: 450, y2: 22 }
    ] as ShapeWithoutId[]
  },
  {
    id: "corner-bracket", name: "Corner Bracket", icon: "📐", category: "accessory", width: 50, height: 50,
    shapes: [
      { type: "line", x1: 0, y1: 0, x2: 50, y2: 0 },
      { type: "line", x1: 0, y1: 0, x2: 0, y2: 50 },
      { type: "line", x1: 0, y1: 50, x2: 50, y2: 0 }
    ] as ShapeWithoutId[]
  }
];

export default function ComponentLibrary() {
  const {
    showComponentPanel, setShowComponentPanel,
    selectedComponent, setSelectedComponent,
    componentFilter, setComponentFilter,
    setMode
  } = useDesignStore();

  if (!showComponentPanel) return null;

  return (
    <div style={{
      position: "absolute", top: 10, right: 10, width: 200, maxHeight: 350,
      background: "#2a2a3e", border: "1px solid #444", borderRadius: 4,
      boxShadow: "0 4px 16px rgba(0,0,0,0.4)", overflow: "hidden", zIndex: 100
    }}>
      {/* Header */}
      <div style={{ padding: "8px 10px", background: "#333", borderBottom: "1px solid #444", fontWeight: 600, fontSize: 11, display: "flex", justifyContent: "space-between", alignItems: "center", color: "#ccc" }}>
        <span>Components</span>
        <button onClick={() => setShowComponentPanel(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#888" }}>×</button>
      </div>

      {/* Filter */}
      <div style={{ padding: "6px", borderBottom: "1px solid #444" }}>
        <select value={componentFilter} onChange={(e) => setComponentFilter(e.target.value as any)}
          style={{ width: "100%", padding: "4px", fontSize: 10, border: "1px solid #444", borderRadius: 2, background: "#1e1e2e", color: "#ccc" }}>
          <option value="all">All Components</option>
          <option value="cabinet">Cabinet Parts</option>
          <option value="hardware">Hardware</option>
          <option value="accessory">Accessories</option>
        </select>
      </div>

      {/* Component List */}
      <div style={{ maxHeight: 260, overflowY: "auto", padding: "6px" }}>
        {COMPONENT_LIBRARY
          .filter(c => componentFilter === "all" || c.category === componentFilter)
          .map(component => (
            <button key={component.id}
              onClick={() => {
                setSelectedComponent(component);
                setMode("component");
                setShowComponentPanel(false);
              }}
              style={{
                display: "flex", alignItems: "center", gap: 6, width: "100%",
                padding: "6px 8px", marginBottom: 3,
                background: selectedComponent?.id === component.id ? "#3a3a4a" : "transparent",
                border: selectedComponent?.id === component.id ? "1px solid #00e5ff" : "1px solid #333",
                borderRadius: 2, cursor: "pointer", textAlign: "left" as const, fontSize: 10, color: "#ccc"
              }}
            >
              <span style={{ fontSize: 16 }}>{component.icon}</span>
              <div>
                <div style={{ fontWeight: 500 }}>{component.name}</div>
                <div style={{ fontSize: 9, color: "#666" }}>{component.width}×{component.height}mm</div>
              </div>
            </button>
          ))}
      </div>

      {/* Place Hint */}
      {selectedComponent && (
        <div style={{ padding: "8px", background: "#333", borderTop: "1px solid #444", fontSize: 9, textAlign: "center", color: "#00e5ff" }}>
          Click canvas to place <strong>{selectedComponent.name}</strong>
        </div>
      )}
    </div>
  );
}
