// ============================================
// DESIGN MODULE - MAIN ENTRY
// ============================================
// Composes all design sub-components into the main DesignCenter.
// Handles overall layout only - logic lives in individual components.

import React from "react";
import { useDesignStore } from "./store/designStore";

// Components
import DesignCanvas from "./components/DesignCanvas";
import Toolbar from "./components/Toolbar";
import CommandBar from "./components/CommandBar";
import ComponentLibrary from "./components/ComponentLibrary";
import MeasurementPanel from "./components/MeasurementPanel";
import PropertiesPanel from "./components/PropertiesPanel";
import ModuleConfigPanel from "./components/ModuleConfigPanel";
import Preview3D from "./components/Preview3D";
import { CenterPostOverlay, PanelOverlay, ShelfOverlay } from "./panels";
import DisabledPanelsBar from "./components/DisabledPanelsBar";

// Types
import type { DesignCenterProps } from "./types";

// Re-export types for external use
export type { DesignCenterProps } from "./types";
export { useDesignStore } from "./store/designStore";

export default function DesignCenter({ onExportToCutlist }: DesignCenterProps = {}) {
  const { selectedId, selectedIds, moduleConfig } = useDesignStore();
  const hasSelection = selectedId !== null || selectedIds.size > 0;

  // Check if selected item is a center post, carcass panel, or shelf
  const isCenterPostSelected = selectedId?.startsWith("MOD-POST-");
  const isCarcassPanelSelected = selectedId && ["MOD-LEFT", "MOD-RIGHT", "MOD-TOP", "MOD-BOTTOM", "MOD-BACK"].includes(selectedId);
  const isShelfSelected = selectedId?.startsWith("MOD-SHELF-");
  const isModuleShapeSelected = isCenterPostSelected || isCarcassPanelSelected || isShelfSelected;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#ffffff" }}>
      {/* Top Toolbar */}
      <Toolbar />

      {/* Second Row: Command Bar with module selector, depth, export */}
      <CommandBar onExport={() => {
        if (onExportToCutlist && moduleConfig) {
          onExportToCutlist({
            width: moduleConfig.widthMm,
            height: moduleConfig.heightMm,
            depth: moduleConfig.depthMm,
            name: moduleConfig.name
          });
        }
      }} />

      {/* Main Content Area */}
      <div style={{ flex: 1, position: "relative", display: "flex", background: "#ffffff", overflow: "hidden" }}>
        {/* Canvas - fills available space */}
        <DesignCanvas />

        {/* Floating Panels (absolute positioned) */}
        <ComponentLibrary />
        <MeasurementPanel />

        {/* Properties Panel - show for regular selections, not module shapes */}
        {hasSelection && !isModuleShapeSelected && <PropertiesPanel />}

        {/* Center Post Overlay - show when center post is selected */}
        <CenterPostOverlay />

        {/* Panel Selection Overlay - show when carcass panel is selected */}
        <PanelOverlay />

        {/* Shelf Overlay - show when shelf is selected */}
        <ShelfOverlay />

        {/* Module Config Panel */}
        <ModuleConfigPanel onExportToCutlist={onExportToCutlist} />

        {/* Preview3D */}
        <Preview3D />

        {/* Disabled Panels Restore Bar */}
        <DisabledPanelsBar />
      </div>
    </div>
  );
}
