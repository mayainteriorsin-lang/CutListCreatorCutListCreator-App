/**
 * Panel Selection Overlay
 *
 * Floating overlay when a carcass panel is selected.
 * Shows Copy/Move/Edit/Delete buttons.
 */

import React from "react";
import { useDesignStore } from "../../store/designStore";
import { useShapeActions } from "../hooks";
import { getPanelInfo } from "../utils";
import {
  getOverlayContainerStyle,
  getButtonStyle,
  OVERLAY_TEXT_STYLES,
  LAYOUT_STYLES,
} from "../../utils/overlayTheme";

export function PanelOverlay() {
  const { shapes, selectedId, moduleConfig, actionMode } = useDesignStore();

  // Get panel info
  const panelInfo = selectedId && moduleConfig?.unitType === "wardrobe_carcass"
    ? getPanelInfo(selectedId, shapes)
    : null;

  // Use unified shape actions hook
  const { handleCopy, handleMove, handleEdit, handleDelete } = useShapeActions({
    selectedId,
    shapeType: "panel",
    panelKey: panelInfo?.key,
  });

  // Only show for carcass panels
  if (!panelInfo) {
    return null;
  }

  const { shape, label } = panelInfo;
  const w = Math.round(shape.w);
  const h = Math.round(shape.h);

  return (
    <div style={getOverlayContainerStyle("panel")}>
      {/* Title */}
      <div style={OVERLAY_TEXT_STYLES.title}>
        {label}
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

export default PanelOverlay;
