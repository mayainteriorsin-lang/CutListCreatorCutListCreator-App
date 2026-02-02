// ============================================
// MeasurementPanel.tsx
// ============================================
// Displays measurements for selected shapes.
// Uses Zustand store for state management.

import React, { useCallback } from "react";
import { useDesignStore } from "../store/designStore";
import type { LineShape, RectShape, MeasurementResult } from "../types";

export default function MeasurementPanel() {
  const {
    shapes, selectedId, selectedIds, showMeasurementPanel,
    measurementResult, setMeasurementResult, setShowMeasurementPanel, setMode
  } = useDesignStore();

  // Calculate measurements for selected shapes
  const calculateMeasurements = useCallback((): MeasurementResult => {
    const selected = shapes.filter(s => selectedIds.has(s.id) || s.id === selectedId);
    let totalLength = 0, area = 0, perimeter = 0;

    for (const shape of selected) {
      if (shape.type === "line") {
        const l = shape as LineShape;
        totalLength += Math.hypot(l.x2 - l.x1, l.y2 - l.y1);
      } else if (shape.type === "rect") {
        const r = shape as RectShape;
        area += r.w * r.h;
        perimeter += 2 * (r.w + r.h);
      }
    }

    return {
      totalLength: Math.round(totalLength),
      area: Math.round(area),
      perimeter: Math.round(perimeter),
      selectedCount: selected.length
    };
  }, [shapes, selectedId, selectedIds]);

  if (!showMeasurementPanel) return null;

  return (
    <div style={{
      position: "absolute", top: 10, left: 10, width: 170,
      background: "#2a2a3e", border: "1px solid #444", borderRadius: 4,
      boxShadow: "0 4px 16px rgba(0,0,0,0.4)", overflow: "hidden", zIndex: 100
    }}>
      {/* Header */}
      <div style={{ padding: "6px 10px", background: "#333", borderBottom: "1px solid #444", fontWeight: 600, fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", color: "#ccc" }}>
        <span>Measure</span>
        <button onClick={() => { setShowMeasurementPanel(false); setMode("select"); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#888" }}>×</button>
      </div>

      {/* Measurements */}
      <div style={{ padding: 10, fontFamily: "'Courier New', monospace" }}>
        {measurementResult && measurementResult.selectedCount > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #333" }}>
              <span style={{ fontSize: 10, color: "#888" }}>Selected:</span>
              <span style={{ fontWeight: 600, color: "#ccc", fontSize: 10 }}>{measurementResult.selectedCount}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #333" }}>
              <span style={{ fontSize: 10, color: "#888" }}>Length:</span>
              <span style={{ fontWeight: 600, color: "#00e5ff", fontSize: 10 }}>{measurementResult.totalLength}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #333" }}>
              <span style={{ fontSize: 10, color: "#888" }}>Area:</span>
              <span style={{ fontWeight: 600, color: "#00e5ff", fontSize: 10 }}>{(measurementResult.area / 1000000).toFixed(3)} m²</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ fontSize: 10, color: "#888" }}>Perimeter:</span>
              <span style={{ fontWeight: 600, color: "#00e5ff", fontSize: 10 }}>{measurementResult.perimeter}</span>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "14px 0", color: "#666", fontSize: 10 }}>
            Click shapes to measure
          </div>
        )}
      </div>

      {/* Recalculate Button */}
      <div style={{ padding: "6px 10px", background: "#333", borderTop: "1px solid #444" }}>
        <button onClick={() => setMeasurementResult(calculateMeasurements())}
          style={{ width: "100%", padding: "4px", background: "#2a2a3e", color: "#00e5ff", border: "1px solid #00e5ff", borderRadius: 2, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "'Courier New', monospace" }}>
          RECALCULATE
        </button>
      </div>
    </div>
  );
}
