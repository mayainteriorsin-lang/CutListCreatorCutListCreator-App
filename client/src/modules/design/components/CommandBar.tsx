// ============================================
// CommandBar.tsx
// ============================================
// Second toolbar row with module selector, depth input, and export button.
// Uses Zustand store for state management.

import React, { useState, useEffect } from "react";
import { useDesignStore } from "../store/designStore";
import { UNIT_TYPE_LABELS } from "@/modules/visual-quotation/constants";
import { MODULE_DEFAULTS, type ModuleConfig } from "../engine/shapeGenerator";
import { saveDesignToLibraryAsync } from "@/modules/library/storage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FolderOpen, Package, Box, Star, Heart, Briefcase, ShoppingBag, Coffee, Music, Camera, Zap, Palette, Check } from "lucide-react";
import { logger } from "@/lib/system/logger";
import styles from "./CommandBar.module.css";

// Storage key for custom folders (same as Rate Cards page)
const CUSTOM_FOLDERS_KEY = "vq_custom_folders";

// Custom folder type
interface CustomFolder {
  id: string;
  name: string;
  icon: string;
  color: string;
  createdAt: string;
}

// Icon map for folder icons
const FOLDER_ICON_MAP: Record<string, React.ReactNode> = {
  folder: <FolderOpen className="h-5 w-5" />,
  package: <Package className="h-5 w-5" />,
  box: <Box className="h-5 w-5" />,
  star: <Star className="h-5 w-5" />,
  heart: <Heart className="h-5 w-5" />,
  briefcase: <Briefcase className="h-5 w-5" />,
  shopping: <ShoppingBag className="h-5 w-5" />,
  coffee: <Coffee className="h-5 w-5" />,
  music: <Music className="h-5 w-5" />,
  camera: <Camera className="h-5 w-5" />,
  zap: <Zap className="h-5 w-5" />,
  palette: <Palette className="h-5 w-5" />,
};

// Color gradients map
const FOLDER_COLOR_MAP: Record<string, { gradient: string; bgColor: string; textColor: string }> = {
  indigo: { gradient: "from-indigo-500 to-blue-500", bgColor: "bg-indigo-50", textColor: "text-indigo-600" },
  blue: { gradient: "from-blue-500 to-cyan-500", bgColor: "bg-blue-50", textColor: "text-blue-600" },
  emerald: { gradient: "from-emerald-500 to-teal-500", bgColor: "bg-emerald-50", textColor: "text-emerald-600" },
  amber: { gradient: "from-amber-500 to-orange-500", bgColor: "bg-amber-50", textColor: "text-amber-600" },
  rose: { gradient: "from-rose-500 to-pink-500", bgColor: "bg-rose-50", textColor: "text-rose-600" },
  violet: { gradient: "from-violet-500 to-purple-500", bgColor: "bg-violet-50", textColor: "text-violet-600" },
  cyan: { gradient: "from-cyan-500 to-blue-500", bgColor: "bg-cyan-50", textColor: "text-cyan-600" },
  orange: { gradient: "from-orange-500 to-red-500", bgColor: "bg-orange-50", textColor: "text-orange-600" },
};

export interface CommandBarProps {
  onExport?: () => void;
  onAddToLibrary?: () => void;
}

export default function CommandBar({ onExport, onAddToLibrary }: CommandBarProps) {
  const {
    moduleConfig, setModuleConfig, customDepth, setCustomDepth, setDepthModified,
    regenerateModuleShapes
  } = useDesignStore();

  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "duplicate">("idle");

  // Folder selection state
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Load custom folders from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_FOLDERS_KEY);
      if (stored) {
        setCustomFolders(JSON.parse(stored));
      }
    } catch (e) {
      logger.error("Failed to load custom folders:", e);
    }
  }, []);

  // Handle module template selection
  const handleTemplateSelect = (unitType: string) => {
    if (!unitType) return;

    // Get defaults from MODULE_DEFAULTS (from library presets)
    const defaults = MODULE_DEFAULTS[unitType];

    // Create base config from template using proper defaults
    const baseConfig = {
      unitType,
      name: defaults?.name || UNIT_TYPE_LABELS[unitType as keyof typeof UNIT_TYPE_LABELS] || unitType,
      // Use defaults from presets, with special handling for wardrobe_carcass
      widthMm: defaults?.widthMm || (unitType === "wardrobe_carcass" ? 2400 : 1000),
      heightMm: defaults?.heightMm || 2400,
      depthMm: customDepth || defaults?.depthMm || 560,
      shutterCount: defaults?.shutterCount ?? 2,
      sectionCount: defaults?.sectionCount ?? (unitType === "wardrobe_carcass" ? 3 : 1),
      loftEnabled: defaults?.loftEnabled ?? false,
      loftHeightMm: defaults?.loftHeightMm ?? 400,
      carcassMaterial: defaults?.carcassMaterial || "plywood",
      shutterMaterial: defaults?.shutterMaterial || "laminate",
      centerPostCount: unitType === "wardrobe_carcass" ? 2 : 0,
      carcassThicknessMm: 18,
      backPanelDeduction: unitType === "wardrobe_carcass" ? 20 : 0, // Default 20mm back deduction
      backPanelFrontDeduction: 0, // Default 0mm front deduction
      shelfBackDeduction: 20, // Default 20mm shelf back deduction
      shelfFrontDeduction: 10, // Default 10mm shelf front deduction
      // Explicitly enable all panels for wardrobe_carcass
      panelsEnabled: unitType === "wardrobe_carcass"
        ? { top: true, bottom: true, left: true, right: true, back: true }
        : undefined,
      // Skirting defaults (disabled by default)
      skirtingEnabled: false,
      skirtingHeightMm: 115, // Default 115mm skirting height
    };

    setModuleConfig(baseConfig as ModuleConfig);
    regenerateModuleShapes(baseConfig as ModuleConfig);
  };

  // Handle depth change
  const handleDepthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = Math.max(100, parseInt(e.target.value) || 450);
    if (moduleConfig) {
      const updated: ModuleConfig = { ...moduleConfig, depthMm: d };
      setModuleConfig(updated);
      regenerateModuleShapes(updated);
    }
    setCustomDepth(d);
    setDepthModified(true);
  };

  // Handle export
  const handleExport = () => {
    if (onExport) {
      onExport();
    } else if (moduleConfig) {
      // Default export behavior - could trigger cutlist generation
      logger.log("Export module:", moduleConfig);
    }
  };

  // Handle add to library - opens folder selection dialog first
  const handleAddToLibrary = async () => {
    if (!moduleConfig) return;

    if (onAddToLibrary) {
      onAddToLibrary();
    } else {
      // Show folder selection dialog
      setSelectedFolderId(null);
      setShowFolderDialog(true);
    }
  };

  // Actually save to library with selected folder
  const handleConfirmSaveToLibrary = async () => {
    if (!moduleConfig) return;

    // If status is already "duplicate", clicking again means "save anyway"
    const forceSave = saveStatus === "duplicate";

    // Close dialog
    setShowFolderDialog(false);

    // Save to library (localStorage + API for persistence) with folder ID
    try {
      const result = await saveDesignToLibraryAsync(moduleConfig, {
        allowDuplicate: forceSave,
        folderId: selectedFolderId || undefined,
      });

      if (result.error === 'DUPLICATE') {
        // Duplicate found - show warning, user can click again to force save
        setSaveStatus("duplicate");
        logger.warn("Duplicate module found:", result.duplicate?.name, "- Click again to save anyway");
        // Reset status after 4 seconds (give user time to click again)
        setTimeout(() => setSaveStatus("idle"), 4000);
        return;
      }

      if (result.module) {
        setSaveStatus("saved");
        const folderName = selectedFolderId
          ? customFolders.find(f => f.id === selectedFolderId)?.name || "folder"
          : "Library";
        logger.log("Saved to", folderName + ":", result.module.id, result.module.name, result.success ? "(synced to server)" : "(local only)");
      }
    } catch (error) {
      logger.error("Failed to save to library:", error);
    }
    // Reset status after 2 seconds
    setTimeout(() => setSaveStatus("idle"), 2000);
  };

  return (
    <div className={styles.container}>
      {/* Module Selector */}
      <select
        value={moduleConfig?.unitType || ""}
        onChange={(e) => handleTemplateSelect(e.target.value)}
        className={styles.moduleSelect}
      >
        <option value="">-- Select Module --</option>
        {Object.entries(UNIT_TYPE_LABELS).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      {/* Depth Input */}
      <span className={styles.depthContainer}>
        Depth:
        <input
          type="number"
          min="100"
          max="1000"
          value={moduleConfig?.depthMm || customDepth}
          onChange={handleDepthChange}
          className={styles.depthInput}
        />
      </span>

      {/* Spacer */}
      <div className={styles.spacer} />

      {/* Add to Library Button */}
      <button
        onClick={handleAddToLibrary}
        disabled={!moduleConfig}
        className={styles.actionButton}
        style={{
          background: saveStatus === "saved" ? "#166534" : saveStatus === "duplicate" ? "#7f1d1d" : (moduleConfig ? "#333" : "#222"),
          color: saveStatus === "saved" ? "#4ade80" : saveStatus === "duplicate" ? "#fca5a5" : (moduleConfig ? "#a78bfa" : "#666"),
          border: `1px solid ${saveStatus === "saved" ? "#4ade80" : saveStatus === "duplicate" ? "#f87171" : (moduleConfig ? "#a78bfa" : "#444")}`,
          cursor: moduleConfig ? "pointer" : "default",
          opacity: moduleConfig ? 1 : 0.5,
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {saveStatus === "saved" ? (
            <polyline points="20,6 9,17 4,12" />
          ) : saveStatus === "duplicate" ? (
            <>
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </>
          ) : (
            <>
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17,21 17,13 7,13 7,21" />
              <polyline points="7,3 7,8 15,8" />
            </>
          )}
        </svg>
        {saveStatus === "saved" ? "SAVED!" : saveStatus === "duplicate" ? "EXISTS! CLICK=SAVE" : "LIBRARY"}
      </button>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={!moduleConfig}
        className={styles.actionButton}
        style={{
          background: moduleConfig ? "#333" : "#222",
          color: moduleConfig ? "#00e5ff" : "#666",
          border: `1px solid ${moduleConfig ? "#00e5ff" : "#444"}`,
          cursor: moduleConfig ? "pointer" : "default",
          opacity: moduleConfig ? 1 : 0.5
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17,8 12,3 7,8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        EXPORT
      </button>

      {/* Folder Selection Dialog */}
      <Dialog open={showFolderDialog} onOpenChange={setShowFolderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-indigo-600" />
              Save to Folder
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-slate-600 mb-4">
              Choose a folder to organize your module, or save directly to the library.
            </p>

            {/* Folder Options */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {/* Default - No folder */}
              <button
                onClick={() => setSelectedFolderId(null)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                  selectedFolderId === null
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center",
                  selectedFolderId === null ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-500"
                )}>
                  <Package className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900">Library (Default)</div>
                  <div className="text-xs text-slate-500">Save without folder categorization</div>
                </div>
                {selectedFolderId === null && (
                  <Check className="h-5 w-5 text-indigo-600" />
                )}
              </button>

              {/* Custom Folders */}
              {customFolders.map((folder) => {
                const colorConfig = FOLDER_COLOR_MAP[folder.color] || FOLDER_COLOR_MAP.indigo;
                const icon = FOLDER_ICON_MAP[folder.icon] || <FolderOpen className="h-5 w-5" />;
                const isSelected = selectedFolderId === folder.id;

                return (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolderId(folder.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                      isSelected
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br text-white",
                      colorConfig.gradient
                    )}>
                      {icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">{folder.name}</div>
                      <div className="text-xs text-slate-500">Custom folder</div>
                    </div>
                    {isSelected && (
                      <Check className="h-5 w-5 text-indigo-600" />
                    )}
                  </button>
                );
              })}

              {/* No custom folders message */}
              {customFolders.length === 0 && (
                <div className="text-center py-4 text-slate-400">
                  <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No custom folders yet</p>
                  <p className="text-xs mt-1">Create folders from the Rate Cards page</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFolderDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSaveToLibrary}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Save to {selectedFolderId ? customFolders.find(f => f.id === selectedFolderId)?.name : "Library"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
