// ============================================
// PanelSelectionOverlay.tsx
// ============================================
// Floating overlay when a carcass panel is selected.
// Shows Copy/Move/Edit/Delete buttons.

import React from "react";
import { useDesignStore } from "../store/designStore";
import { useShapeActions } from "../hooks/useShapeActions";
import {
  getOverlayContainerStyle,
  getButtonStyle,
  OVERLAY_TEXT_STYLES,
  LAYOUT_STYLES,
} from "../utils/overlayTheme";
import type { RectShape } from "../types";

// Panel ID to label/key map
const PANEL_ID_MAP: Record<string, { key: string; label: string }> = {
  "MOD-LEFT": { key: "left", label: "Left Side" },
  "MOD-RIGHT": { key: "right", label: "Right Side" },
  "MOD-TOP": { key: "top", label: "Top Panel" },
  "MOD-BOTTOM": { key: "bottom", label: "Bottom Panel" },
  "MOD-BACK": { key: "back", label: "Back Panel" },
};

export default function PanelSelectionOverlay() {
  const { shapes, selectedId, moduleConfig, actionMode } = useDesignStore();

  // Helper to get selected panel info
  const getSelectedPanelInfo = (): { id: string; key: string; label: string; shape: RectShape } | null => {
    if (!selectedId || !moduleConfig || moduleConfig.unitType !== "wardrobe_carcass") return null;
    const panelInfo = PANEL_ID_MAP[selectedId];
    if (!panelInfo) return null;
    const shape = shapes.find(s => s.id === selectedId);
    if (!shape || shape.type !== "rect") return null;
    return { id: selectedId, key: panelInfo.key, label: panelInfo.label, shape: shape as RectShape };
  };

  const selectedPanelInfo = getSelectedPanelInfo();

  // Use centralized shape actions hook
  const { handleCopy, handleMove, handleEdit, handleDelete } = useShapeActions({
    selectedId,
    shapeType: "panel",
    panelKey: selectedPanelInfo?.key,
  });

  // Only show for carcass panels (not center posts)
  if (!selectedPanelInfo) {
    return null;
  }

  const shape = selectedPanelInfo.shape;
  const w = Math.round(shape.w);
  const h = Math.round(shape.h);

  return (
    <div style={getOverlayContainerStyle("panel")}>
      {/* Title */}
      <div style={OVERLAY_TEXT_STYLES.title}>
        {selectedPanelInfo.label}
      </div>

      {/* Dimensions */}
      <div style={OVERLAY_TEXT_STYLES.dimensions}>
        {w} × {h} mm
      </div>

      {/* Action Buttons */}
      <div style={LAYOUT_STYLES.buttonContainer}>
        <button
          onClick={handleCopy}
          style={getButtonStyle({ variant: "copy", isActive: actionMode === "copy" })}
        >
          Copy
        </button>
        <button
          onClick={handleMove}
          style={getButtonStyle({ variant: "move", isActive: actionMode === "move" })}
        >
          Move
        </button>
        <button
          onClick={handleEdit}
          style={getButtonStyle({ variant: "edit" })}
        >
          Edit
        </button>
        <button
          onClick={handleDelete}
          style={getButtonStyle({ variant: "delete", isActive: actionMode === "delete" })}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
