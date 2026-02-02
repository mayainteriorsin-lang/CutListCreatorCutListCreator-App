// ============================================
// Preview3D.tsx
// ============================================
// 3D isometric preview of the current module design.
// Renders actual shapes from the canvas as isometric projections.

import React from "react";
import { useDesignStore } from "../store/designStore";
import type { RectShape } from "../types";

export default function Preview3D() {
  const { show3DPreview, setShow3DPreview, shapes, customDepth, previewRotation, setPreviewRotation } = useDesignStore();

  if (!show3DPreview) return null;

  // Filter to rect shapes and take first 3
  const rectShapes = shapes.filter(s => s.type === "rect").slice(0, 3);
  const scale = 0.12;

  // Isometric projection helpers
  const isoX = (x: number, y: number, ox: number) => ox + (x - y) * 0.866;
  const isoY = (x: number, y: number, z: number, oy: number) => oy - (x + y) * 0.5 - z;

  return (
    <div style={{
      position: "absolute", bottom: 10, right: 10, width: 260, height: 200,
      background: "#2a2a3e", border: "1px solid #444", borderRadius: 4,
      boxShadow: "0 4px 16px rgba(0,0,0,0.4)", overflow: "hidden", zIndex: 100
    }}>
      <div style={{ padding: "6px 10px", background: "#333", borderBottom: "1px solid #444", fontWeight: 600, fontSize: 10, display: "flex", justifyContent: "space-between", alignItems: "center", color: "#ccc" }}>
        <span>3D Preview</span>
        <button onClick={() => setShow3DPreview(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#888" }}>×</button>
      </div>
      <div style={{ padding: 8 }}>
        <svg width="240" height="120" viewBox="0 0 240 120">
          {rectShapes.map((shape, idx) => {
            const r = shape as RectShape;
            const w = r.w * scale;
            const h = r.h * scale;
            const d = customDepth * scale * 0.5;
            const ox = 30 + idx * 20;
            const oy = 90 - idx * 10;
            return (
              <g key={shape.id}>
                {/* Front face */}
                <polygon
                  points={`${isoX(0,0,ox)},${isoY(0,0,0,oy)} ${isoX(w,0,ox)},${isoY(w,0,0,oy)} ${isoX(w,0,ox)},${isoY(w,0,h,oy)} ${isoX(0,0,ox)},${isoY(0,0,h,oy)}`}
                  fill="none" stroke="#00e5ff" strokeWidth={0.8}
                />
                {/* Top face */}
                <polygon
                  points={`${isoX(0,0,ox)},${isoY(0,0,h,oy)} ${isoX(w,0,ox)},${isoY(w,0,h,oy)} ${isoX(w,d,ox)},${isoY(w,d,h,oy)} ${isoX(0,d,ox)},${isoY(0,d,h,oy)}`}
                  fill="none" stroke="#00e5ff" strokeWidth={0.5}
                />
                {/* Right face */}
                <polygon
                  points={`${isoX(w,0,ox)},${isoY(w,0,0,oy)} ${isoX(w,d,ox)},${isoY(w,d,0,oy)} ${isoX(w,d,ox)},${isoY(w,d,h,oy)} ${isoX(w,0,ox)},${isoY(w,0,h,oy)}`}
                  fill="none" stroke="#00e5ff" strokeWidth={0.5}
                />
              </g>
            );
          })}
          {rectShapes.length === 0 && (
            <text x="120" y="60" textAnchor="middle" fontSize={10} fill="#555">Draw shapes for 3D</text>
          )}
        </svg>
      </div>
      <div style={{ padding: "4px 8px", background: "#333", borderTop: "1px solid #444", display: "flex", gap: 6, justifyContent: "center" }}>
        <button onClick={() => setPreviewRotation({ ...previewRotation, y: previewRotation.y - 15 })} style={{ padding: "3px 6px", fontSize: 9, border: "1px solid #444", borderRadius: 2, cursor: "pointer", background: "#2a2a3e", color: "#ccc" }}>← Rot</button>
        <button onClick={() => setPreviewRotation({ x: 30, y: -45 })} style={{ padding: "3px 6px", fontSize: 9, border: "1px solid #444", borderRadius: 2, cursor: "pointer", background: "#2a2a3e", color: "#ccc" }}>Reset</button>
        <button onClick={() => setPreviewRotation({ ...previewRotation, y: previewRotation.y + 15 })} style={{ padding: "3px 6px", fontSize: 9, border: "1px solid #444", borderRadius: 2, cursor: "pointer", background: "#2a2a3e", color: "#ccc" }}>Rot →</button>
      </div>
    </div>
  );
}
