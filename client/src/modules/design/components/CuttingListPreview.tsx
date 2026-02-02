/**
 * Cutting List Preview Component
 * Displays the cutting list with panel dimensions and sheet fit status.
 * Extracted from ModuleConfigPanelUI.tsx for better maintainability.
 */

import type { ModuleConfig } from "../engine/shapeGenerator";
import { generateCuttingList } from "../engine/panelGenerator";

export interface CuttingListPreviewProps {
  config: ModuleConfig;
}

export default function CuttingListPreview({ config }: CuttingListPreviewProps) {
  const cutList = generateCuttingList(config);

  if (cutList.length === 0) return null;

  const allFit = cutList.every(item => item.fits);
  const totalPieces = cutList.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div style={{
      marginTop: 12,
      padding: "10px 12px",
      background: "#f8fafc",
      borderRadius: 6,
      border: "1px solid #e2e8f0",
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: "#334155",
        marginBottom: 8,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span>Cutting List</span>
        <span style={{
          fontSize: 10,
          fontWeight: 500,
          color: "#64748b",
          background: "#e2e8f0",
          padding: "2px 6px",
          borderRadius: 4,
        }}>
          {totalPieces} pcs
        </span>
      </div>

      {/* Column headers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 28px 90px 20px",
        gap: 4,
        padding: "4px 6px",
        background: "#e2e8f0",
        borderRadius: 4,
        marginBottom: 4,
        fontSize: 9,
        fontWeight: 600,
        color: "#64748b",
      }}>
        <span>Panel</span>
        <span style={{ textAlign: "center" }}>Qty</span>
        <span style={{ textAlign: "right" }}>W x H (mm)</span>
        <span></span>
      </div>

      {/* Cutting list items */}
      {cutList.map((item, idx) => (
        <div
          key={idx}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 28px 90px 20px",
            gap: 4,
            padding: "5px 6px",
            marginBottom: 2,
            background: item.fits ? "#f0fdf4" : "#fef2f2",
            borderRadius: 4,
            fontSize: 11,
            alignItems: "center",
          }}
        >
          <span style={{ color: "#334155", fontWeight: 500 }}>
            {item.name}
          </span>
          <span style={{
            textAlign: "center",
            color: "#64748b",
            fontWeight: 600,
          }}>
            {item.qty}
          </span>
          <span style={{
            textAlign: "right",
            color: "#334155",
            fontFamily: "monospace",
            fontSize: 10,
          }}>
            {Math.round(item.width)} x {Math.round(item.height)}
          </span>
          <span style={{
            textAlign: "center",
            fontSize: 10,
            color: item.fits ? "#16a34a" : "#dc2626",
          }}>
            {item.fits ? "✓" : "✗"}
          </span>
        </div>
      ))}

      {/* Summary footer */}
      <div style={{
        marginTop: 6,
        paddingTop: 6,
        borderTop: "1px solid #e2e8f0",
        fontSize: 10,
        color: allFit ? "#16a34a" : "#dc2626",
        fontWeight: 500,
      }}>
        {allFit
          ? "✓ All panels fit in 1200×2400 sheet"
          : "⚠ Some panels exceed sheet size"
        }
      </div>
    </div>
  );
}
