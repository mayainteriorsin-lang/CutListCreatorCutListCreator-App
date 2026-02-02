/**
 * Back Panel Preview Component
 * Shows center post positions and back panel section layout with sheet fit status.
 * Extracted from ModuleConfigPanelUI.tsx for better maintainability.
 */

import { calculateBackPanelLayout } from "../engine/panelGenerator";

export interface BackPanelPreviewProps {
  widthMm: number;
  heightMm: number;
  carcassThicknessMm: number;
  backPanelThicknessMm: number;
  centerPostCount: number;
  backPanelDeduction: number;
  panelsEnabled: { top: boolean; bottom: boolean; left: boolean; right: boolean; back: boolean };
}

export default function BackPanelPreview({
  widthMm,
  heightMm,
  carcassThicknessMm,
  backPanelThicknessMm,
  centerPostCount,
  backPanelDeduction,
  panelsEnabled,
}: BackPanelPreviewProps) {
  const { postPositions, panelWidths, panelFits, backH } = calculateBackPanelLayout(
    widthMm,
    heightMm,
    carcassThicknessMm,
    centerPostCount,
    backPanelDeduction,
    panelsEnabled
  );

  const allFit = panelFits.every(f => f);
  const sheetsNeeded = panelWidths.length;

  return (
    <div style={{
      marginTop: 8,
      padding: "8px 10px",
      background: allFit ? "#f0fdf4" : "#fef2f2",
      borderRadius: 6,
      border: `1px solid ${allFit ? "#86efac" : "#fca5a5"}`,
    }}>
      <div style={{ fontSize: 10, color: allFit ? "#166534" : "#991b1b", fontWeight: 600, marginBottom: 6 }}>
        Back Panel Layout
      </div>

      {/* Post positions */}
      {centerPostCount > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 9, color: "#64748b", marginBottom: 2 }}>
            Center Post Positions (from left):
          </div>
          <div style={{ fontSize: 11, color: "#334155", fontWeight: 600 }}>
            {postPositions.map((pos, i) => (
              <span key={i}>
                {i > 0 && ", "}
                {pos}mm
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Panel breakdown */}
      <div style={{ fontSize: 9, color: "#64748b", marginBottom: 2 }}>
        Back Panels ({sheetsNeeded} pc{sheetsNeeded > 1 ? "s" : ""}):
      </div>
      {panelWidths.map((w, i) => (
        <div key={i} style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "3px 6px",
          marginBottom: 2,
          background: panelFits[i] ? "#dcfce7" : "#fee2e2",
          borderRadius: 3,
          fontSize: 11,
        }}>
          <span style={{ color: "#334155", fontWeight: 500 }}>
            Panel {i + 1}: {w} × {backH} mm
          </span>
          <span style={{
            fontSize: 9,
            color: panelFits[i] ? "#16a34a" : "#dc2626",
            fontWeight: 500,
          }}>
            {panelFits[i] ? "✓" : "✗"}
          </span>
        </div>
      ))}

      {/* Summary */}
      <div style={{
        marginTop: 6,
        paddingTop: 6,
        borderTop: "1px solid #e2e8f0",
        fontSize: 10,
      }}>
        <div style={{ color: "#64748b" }}>
          Thickness: {backPanelThicknessMm}mm
        </div>
        <div style={{
          color: allFit ? "#16a34a" : "#dc2626",
          fontWeight: 600,
          marginTop: 2,
        }}>
          {allFit
            ? "✓ All panels fit in sheet (1200×2400)"
            : "⚠️ Some panels too large for sheet"
          }
        </div>
        <div style={{ color: "#334155", fontWeight: 500, marginTop: 2 }}>
          Sheets needed: {sheetsNeeded}
        </div>
      </div>
    </div>
  );
}
