/**
 * Cutting List Preview Component
 * Displays the cutting list with panel dimensions and sheet fit status.
 * Click on a panel row to configure gaddi.
 */

import { useState } from "react";
import type { ModuleConfig } from "../engine/shapeGenerator";
import { generateCuttingList, type CuttingListItem } from "../engine/panelGenerator";

/** Panels that support gaddi configuration */
const GADDI_PANEL_NAMES = ["Left Side", "Right Side", "Top", "Bottom"];

/** Check if panel supports gaddi toggle */
function supportsGaddi(panelName: string): boolean {
  return GADDI_PANEL_NAMES.includes(panelName);
}

export interface CuttingListPreviewProps {
  config: ModuleConfig;
  /** Per-panel gaddi overrides (keyed by panel id) */
  panelGaddi?: Record<string, boolean>;
  /** Callback when gaddi is changed for a panel */
  onGaddiChange?: (panelId: string, gaddi: boolean) => void;
}

/** Panel Configuration Modal */
function PanelConfigModal({
  panel,
  onClose,
  onGaddiChange,
}: {
  panel: CuttingListItem;
  onClose: () => void;
  onGaddiChange: (gaddi: boolean) => void;
}) {
  const [gaddi, setGaddi] = useState(panel.gaddi);

  const toggleGaddi = () => {
    const newValue = !gaddi;
    setGaddi(newValue);
    onGaddiChange(newValue);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: 16,
          minWidth: 280,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
            paddingBottom: 8,
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>
            Configure Panel
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 18,
              color: "#64748b",
              cursor: "pointer",
              padding: 4,
            }}
          >
            ×
          </button>
        </div>

        {/* Panel Name */}
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: "#334155",
            marginBottom: 12,
          }}
        >
          {panel.name}
        </div>

        {/* Dimensions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            padding: "10px 12px",
            background: "#f1f5f9",
            borderRadius: 6,
          }}
        >
          <span style={{ fontSize: 12, color: "#64748b" }}>Dimensions</span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "monospace",
              color: "#334155",
            }}
          >
            {Math.round(panel.width)} x {Math.round(panel.height)} mm
          </span>
        </div>

        {/* Gaddi Toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            padding: "10px 12px",
            background: "#f1f5f9",
            borderRadius: 6,
          }}
        >
          <span style={{ fontSize: 12, color: "#64748b" }}>Gaddi</span>
          <button
            type="button"
            onClick={toggleGaddi}
            style={{
              width: 50,
              height: 26,
              borderRadius: 13,
              border: "none",
              background: gaddi ? "#16a34a" : "#d1d5db",
              cursor: "pointer",
              position: "relative",
              transition: "background 0.2s",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 3,
                left: gaddi ? 27 : 3,
                width: 20,
                height: 20,
                borderRadius: 10,
                background: "#fff",
                transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            />
          </button>
        </div>

        {/* Done Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px 16px",
            background: "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default function CuttingListPreview({
  config,
  panelGaddi,
  onGaddiChange,
}: CuttingListPreviewProps) {
  const [selectedPanel, setSelectedPanel] = useState<CuttingListItem | null>(null);

  const cutList = generateCuttingList(config, panelGaddi);

  if (cutList.length === 0) return null;

  const allFit = cutList.every((item) => item.fits);
  const totalPieces = cutList.reduce((sum, item) => sum + item.qty, 0);

  const handleRowClick = (item: CuttingListItem) => {
    // Only open config for panels that support gaddi
    if (supportsGaddi(item.name)) {
      setSelectedPanel(item);
    }
  };

  const handleGaddiChange = (gaddi: boolean) => {
    if (selectedPanel && onGaddiChange) {
      onGaddiChange(selectedPanel.id, gaddi);
    }
  };

  return (
    <div
      style={{
        marginTop: 12,
        padding: "10px 12px",
        background: "#f8fafc",
        borderRadius: 6,
        border: "1px solid #e2e8f0",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#334155",
          marginBottom: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Cutting List</span>
        <span
          style={{
            fontSize: 10,
            fontWeight: 500,
            color: "#64748b",
            background: "#e2e8f0",
            padding: "2px 6px",
            borderRadius: 4,
          }}
        >
          {totalPieces} pcs
        </span>
      </div>

      {/* Column headers */}
      <div
        style={{
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
        }}
      >
        <span>Panel</span>
        <span style={{ textAlign: "center" }}>Qty</span>
        <span style={{ textAlign: "right" }}>W x H (mm)</span>
        <span></span>
      </div>

      {/* Cutting list items */}
      {cutList.map((item) => {
        const canConfigure = supportsGaddi(item.name);
        return (
          <div
            key={item.id}
            onClick={() => handleRowClick(item)}
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
              cursor: canConfigure ? "pointer" : "default",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              if (canConfigure) {
                e.currentTarget.style.background = item.fits ? "#dcfce7" : "#fee2e2";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = item.fits ? "#f0fdf4" : "#fef2f2";
            }}
          >
            <span style={{ color: "#334155", fontWeight: 500 }}>{item.name}</span>
            <span
              style={{
                textAlign: "center",
                color: "#64748b",
                fontWeight: 600,
              }}
            >
              {item.qty}
            </span>
            <span
              style={{
                textAlign: "right",
                color: "#334155",
                fontFamily: "monospace",
                fontSize: 10,
              }}
            >
              {Math.round(item.width)} x {Math.round(item.height)}
            </span>
            <span
              style={{
                textAlign: "center",
                fontSize: 10,
                color: item.fits ? "#16a34a" : "#dc2626",
              }}
            >
              {item.fits ? "✓" : "✗"}
            </span>
          </div>
        );
      })}

      {/* Summary footer */}
      <div
        style={{
          marginTop: 6,
          paddingTop: 6,
          borderTop: "1px solid #e2e8f0",
          fontSize: 10,
          color: allFit ? "#16a34a" : "#dc2626",
          fontWeight: 500,
        }}
      >
        {allFit
          ? "✓ All panels fit in 1200×2400 sheet"
          : "⚠ Some panels exceed sheet size"}
      </div>

      {/* Panel Config Modal */}
      {selectedPanel && (
        <PanelConfigModal
          panel={selectedPanel}
          onClose={() => setSelectedPanel(null)}
          onGaddiChange={handleGaddiChange}
        />
      )}
    </div>
  );
}
