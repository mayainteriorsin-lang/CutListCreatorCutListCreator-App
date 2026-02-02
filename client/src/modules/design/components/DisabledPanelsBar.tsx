// ============================================
// DisabledPanelsBar.tsx
// ============================================
// Shows deleted/disabled panels at bottom with restore buttons.

import React from "react";
import { useDesignStore } from "../store/designStore";
import type { ModuleConfig } from "../engine/shapeGenerator";

// Panel ID to label map
const PANEL_ID_MAP: Record<string, { label: string }> = {
  "MOD-TOP": { label: "Top" },
  "MOD-BOTTOM": { label: "Bottom" },
  "MOD-LEFT": { label: "Left Side" },
  "MOD-RIGHT": { label: "Right Side" },
  "MOD-BACK": { label: "Back Panel" },
};

export default function DisabledPanelsBar() {
  const { moduleConfig, setModuleConfig, regenerateModuleShapes } = useDesignStore();

  // Only show for wardrobe carcass with disabled panels
  if (moduleConfig?.unitType !== "wardrobe_carcass" || !moduleConfig.panelsEnabled) {
    return null;
  }

  const panels = moduleConfig.panelsEnabled;
  const disabledPanels = Object.entries(panels).filter(([_, enabled]) => !enabled);

  if (disabledPanels.length === 0) {
    return null;
  }

  // Handle restore panel
  const handleRestorePanel = (key: string) => {
    if (!moduleConfig || !moduleConfig.panelsEnabled) return;

    const updated: ModuleConfig = {
      ...moduleConfig,
      panelsEnabled: {
        ...moduleConfig.panelsEnabled,
        [key]: true
      }
    };

    setModuleConfig(updated);
    regenerateModuleShapes(updated);
  };

  return (
    <div style={{
      position: "absolute",
      left: "50%",
      bottom: 20,
      transform: "translateX(-50%)",
      background: "#fef3c7",
      border: "1px solid #f59e0b",
      borderRadius: 6,
      padding: "8px 12px",
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 11,
      zIndex: 150
    }}>
      <span style={{ color: "#92400e", fontWeight: 500 }}>Deleted panels:</span>
      {disabledPanels.map(([key]) => (
        <button
          key={key}
          onClick={() => handleRestorePanel(key)}
          style={{
            padding: "4px 8px",
            background: "#fff",
            border: "1px solid #d97706",
            borderRadius: 4,
            fontSize: 10,
            color: "#92400e",
            cursor: "pointer"
          }}
        >
          + {PANEL_ID_MAP[`MOD-${key.toUpperCase()}`]?.label || key}
        </button>
      ))}
    </div>
  );
}
