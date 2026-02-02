// ============================================
// PropertiesPanel.tsx
// ============================================
// Shows and edits properties of selected shapes.
// Uses Zustand store for state management.

import React from "react";
import { useDesignStore } from "../store/designStore";
import type { LineShape, RectShape } from "../types";

export default function PropertiesPanel() {
  const {
    shapes, selectedId, selectedIds, actionMode,
    setActionMode, setMode, setShowModulePanel,
    updateShape, deleteShape, deleteSelectedShapes,
    pushHistory, setShapes, setSelectedId, setSelectedIds
  } = useDesignStore();

  // Get selected shape(s)
  const selectedShape = selectedId ? shapes.find(s => s.id === selectedId) : null;
  const hasMultiSelection = selectedIds.size > 1;
  const hasSelection = selectedId !== null || selectedIds.size > 0;

  // Don't show for any module shapes (MOD-*) - they have dedicated overlays
  const isModuleShape = selectedShape?.id.startsWith("MOD-");
  if (!hasSelection || isModuleShape) return null;

  // Get dimensions based on shape type
  const getDimensions = () => {
    if (!selectedShape) return { w: 0, h: 0, x: 0, y: 0 };
    if (selectedShape.type === "rect") {
      const r = selectedShape as RectShape;
      return { w: Math.round(r.w), h: Math.round(r.h), x: Math.round(r.x), y: Math.round(r.y) };
    }
    if (selectedShape.type === "line") {
      const l = selectedShape as LineShape;
      const len = Math.round(Math.hypot(l.x2 - l.x1, l.y2 - l.y1));
      return { w: len, h: l.thickness || 18, x: Math.round(l.x1), y: Math.round(l.y1) };
    }
    return { w: 0, h: 0, x: 0, y: 0 };
  };

  const dims = getDimensions();
  const isModShape = selectedShape?.id.startsWith("MOD-");

  // Handle copy
  const handleCopy = () => {
    if (!selectedShape || selectedShape.type !== "rect") return;
    setActionMode("copy");
    const rect = selectedShape as RectShape;
    const newId = `${selectedShape.id}-COPY-${Date.now()}`;
    const newShape: RectShape = { ...rect, id: newId, x: rect.x + 50 };
    const newShapes = [...shapes, newShape];
    pushHistory(newShapes, "Copy shape");
    setShapes(newShapes);
    setSelectedId(newId);
    setSelectedIds(new Set([newId]));
    setTimeout(() => setActionMode(null), 500);
  };

  // Handle move mode
  const handleMove = () => {
    setActionMode("move");
    setMode("move");
  };

  // Handle edit
  const handleEdit = () => {
    setActionMode(null);
    setShowModulePanel(true);
  };

  // Handle delete
  const handleDelete = () => {
    setActionMode("delete");
    if (hasMultiSelection) {
      deleteSelectedShapes();
    } else if (selectedId) {
      deleteShape(selectedId);
    }
    setTimeout(() => setActionMode(null), 500);
  };

  return (
    <div style={{
      position: "absolute", left: "50%", top: 80, transform: "translateX(-50%)",
      background: "#1e293b", border: "2px solid #3b82f6", borderRadius: 8,
      padding: "12px 16px", boxShadow: "0 4px 20px rgba(0,0,0,0.3)", zIndex: 200, minWidth: 240
    }}>
      {/* Title */}
      <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", textAlign: "center" }}>
        {hasMultiSelection ? `${selectedIds.size} Shapes Selected` : selectedShape?.type === "rect" ? "Rectangle" : selectedShape?.type === "line" ? "Line" : "Shape"}
      </div>

      {/* Dimensions */}
      {!hasMultiSelection && selectedShape && (
        <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center", marginBottom: 12 }}>
          {selectedShape.type === "line" ? `${dims.w} × ${dims.h}mm` : `${dims.w} × ${dims.h} mm`}
          <br />
          <span style={{ fontSize: 10 }}>at ({dims.x}, {dims.y})</span>
        </div>
      )}

      {/* Properties Grid */}
      {!hasMultiSelection && selectedShape && selectedShape.type === "rect" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 9, color: "#64748b" }}>Width</label>
            <input type="number" value={dims.w} onChange={(e) => updateShape(selectedShape.id, { w: Number(e.target.value) })}
              style={{ width: "100%", padding: "4px 6px", background: "#0f172a", border: "1px solid #334155", borderRadius: 4, color: "#fff", fontSize: 11 }} />
          </div>
          <div>
            <label style={{ fontSize: 9, color: "#64748b" }}>Height</label>
            <input type="number" value={dims.h} onChange={(e) => updateShape(selectedShape.id, { h: Number(e.target.value) })}
              style={{ width: "100%", padding: "4px 6px", background: "#0f172a", border: "1px solid #334155", borderRadius: 4, color: "#fff", fontSize: 11 }} />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button onClick={handleCopy} disabled={hasMultiSelection || isModShape}
          style={{ flex: 1, padding: "8px 10px", background: actionMode === "copy" ? "#2563eb" : "#3b82f6", color: "#fff", border: actionMode === "copy" ? "2px solid #fff" : "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "copy", opacity: hasMultiSelection || isModShape ? 0.5 : 1 }}>
          Copy
        </button>
        <button onClick={handleMove}
          style={{ flex: 1, padding: "8px 10px", background: actionMode === "move" ? "#d97706" : "#f59e0b", color: "#fff", border: actionMode === "move" ? "2px solid #fff" : "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "move" }}>
          Move
        </button>
        <button onClick={handleEdit} disabled={!isModShape}
          style={{ flex: 1, padding: "8px 10px", background: "#10b981", color: "#fff", border: "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", opacity: isModShape ? 1 : 0.5 }}>
          Edit
        </button>
        <button onClick={handleDelete}
          style={{ flex: 1, padding: "8px 10px", background: actionMode === "delete" ? "#b91c1c" : "#dc2626", color: "#fff", border: actionMode === "delete" ? "2px solid #fff" : "none", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "not-allowed" }}>
          Delete
        </button>
      </div>
    </div>
  );
}
