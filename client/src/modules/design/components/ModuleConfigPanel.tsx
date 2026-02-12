// ============================================
// ModuleConfigPanel.tsx
// ============================================
// Configuration panel for furniture modules - FULL IMPLEMENTATION.
// Wraps the UI component with Zustand store integration.

import React, { useState, useEffect } from "react";
import { useDesignStore } from "../store/designStore";
import ModuleConfigPanelUI from "./ModuleConfigPanelUI";
import { calculateModulePricing } from "../engine/pricingEngine";
import { addLibraryModule } from "@/modules/library/storage";
import type { LibraryModule, LibraryWardrobeSection, LibraryCategory } from "@/modules/library/types";
import type { ModuleConfig } from "../engine/shapeGenerator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FolderOpen, Package, Box, Star, Heart, Briefcase, ShoppingBag, Coffee, Music, Camera, Zap, Palette, Check, AlertTriangle } from "lucide-react";
import { useCustomFolderStore, selectFolders, type CustomFolder } from "@/modules/visual-quotation/store/customFolderStore";

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

// Helper function to map unit type to library category
function getCategoryFromUnitType(unitType: string): LibraryCategory {
  const categoryMap: Record<string, LibraryCategory> = {
    // Bedroom
    wardrobe: "bedroom",
    wardrobe_carcass: "bedroom",
    dresser: "bedroom",
    // Kitchen
    kitchen: "kitchen",
    kitchen_base: "kitchen",
    kitchen_wall: "kitchen",
    kitchen_tall: "kitchen",
    // Living
    tv_unit: "living",
    bar_unit: "living",
    display_unit: "living",
    // Study
    study_table: "study",
    book_shelf: "study",
    // Utility
    shoe_rack: "utility",
    pooja_unit: "utility",
    vanity: "utility",
    crockery_unit: "utility",
  };
  return categoryMap[unitType] || "custom";
}

// Validation result type
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Validate module config before export
function validateModuleConfig(config: ModuleConfig): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields - these will block export
  if (!config.name || config.name.trim() === "") {
    errors.push("Module name is required");
  }
  if (!config.unitType) {
    errors.push("Unit type is required");
  }
  if (!config.widthMm || config.widthMm <= 0) {
    errors.push("Width must be greater than 0");
  }
  if (!config.heightMm || config.heightMm <= 0) {
    errors.push("Height must be greater than 0");
  }
  if (!config.depthMm || config.depthMm <= 0) {
    errors.push("Depth must be greater than 0");
  }
  if (!config.carcassMaterial || config.carcassMaterial.trim() === "") {
    errors.push("Carcass material is required");
  }

  // Warnings - these allow export but notify user
  if (!config.shutterMaterial || config.shutterMaterial.trim() === "") {
    warnings.push("Shutter material not set");
  }
  if (config.carcassThicknessMm === undefined || config.carcassThicknessMm <= 0) {
    warnings.push("Carcass thickness not set (will default to 18mm)");
  }
  if (config.gaddiEnabled === undefined) {
    warnings.push("Gaddi (edge banding) not specified");
  }

  // Wardrobe carcass specific validations
  if (config.unitType === "wardrobe_carcass") {
    if (config.backPanelThicknessMm === undefined || config.backPanelThicknessMm <= 0) {
      warnings.push("Back panel thickness not set (will default to 10mm)");
    }
    if (!config.panelsEnabled) {
      warnings.push("Panel enable/disable settings not configured");
    }
    if (!config.sections || config.sections.length === 0) {
      warnings.push("No sections configured for wardrobe");
    }
    if (config.backPanelDeduction === undefined) {
      warnings.push("Back panel deduction not set (will default to 20mm)");
    }
    if (config.shelfBackDeduction === undefined) {
      warnings.push("Shelf back deduction not set (will default to 20mm)");
    }
    if (config.shelfFrontDeduction === undefined) {
      warnings.push("Shelf front deduction not set (will default to 10mm)");
    }
  }

  // Loft validations
  if (config.loftEnabled && (!config.loftHeightMm || config.loftHeightMm <= 0)) {
    errors.push("Loft is enabled but loft height is not set");
  }

  // Skirting validations
  if (config.skirtingEnabled && (!config.skirtingHeightMm || config.skirtingHeightMm <= 0)) {
    warnings.push("Skirting is enabled but height not set (will default to 115mm)");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export interface ModuleConfigPanelProps {
  // Props can be extended in the future
}

export default function ModuleConfigPanel(_props: ModuleConfigPanelProps) {
  const {
    showModulePanel, setShowModulePanel,
    moduleConfig, setModuleConfig,
    regenerateModuleShapes
  } = useDesignStore();

  // Folder selection state
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Custom folders from Zustand store (auto-persisted)
  const customFolders = useCustomFolderStore(selectFolders);

  // Validation state
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  if (!showModulePanel || !moduleConfig) return null;

  // Handle config change
  const handleChange = (updated: typeof moduleConfig) => {
    setModuleConfig(updated);
    regenerateModuleShapes(updated);
  };

  // Handle save to library - validates first, then opens folder selection dialog
  const handleSaveToLibrary = () => {
    if (!moduleConfig) return;

    // Validate the config before allowing export
    const result = validateModuleConfig(moduleConfig);
    setValidationResult(result);

    if (!result.isValid) {
      // Has errors - show validation dialog, block export
      setShowValidationDialog(true);
      return;
    }

    if (result.warnings.length > 0) {
      // Has warnings - show validation dialog but allow proceed
      setShowValidationDialog(true);
      return;
    }

    // No errors or warnings - go directly to folder selection
    setSelectedFolderId(null);
    setShowFolderDialog(true);
  };

  // Proceed to folder dialog after acknowledging warnings
  const handleProceedWithWarnings = () => {
    setShowValidationDialog(false);
    setSelectedFolderId(null);
    setShowFolderDialog(true);
  };

  // Actually save to library with selected folder
  const handleConfirmSaveToLibrary = () => {
    if (!moduleConfig) return;

    // Convert ModuleConfig to LibraryModule format
    const now = new Date().toISOString();
    const libraryModule: LibraryModule = {
      id: `LIB-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: moduleConfig.name || "Custom Module",
      unitType: moduleConfig.unitType,
      source: "custom",
      description: `Custom ${moduleConfig.unitType} module`,

      // Dimensions
      widthMm: moduleConfig.widthMm,
      heightMm: moduleConfig.heightMm,
      depthMm: moduleConfig.depthMm,

      // Configuration
      shutterCount: moduleConfig.shutterCount,
      shutterEnabled: moduleConfig.shutterEnabled,
      sectionCount: moduleConfig.sectionCount,
      loftEnabled: moduleConfig.loftEnabled,
      loftHeightMm: moduleConfig.loftHeightMm,

      // Materials
      carcassMaterial: moduleConfig.carcassMaterial,
      shutterMaterial: moduleConfig.shutterMaterial,
      carcassThicknessMm: moduleConfig.carcassThicknessMm,
      gaddiEnabled: moduleConfig.gaddiEnabled,

      // Wardrobe carcass specific fields
      centerPostCount: moduleConfig.centerPostCount,
      backPanelThicknessMm: moduleConfig.backPanelThicknessMm,
      backPanelFit: moduleConfig.backPanelFit,
      backPanelDeduction: moduleConfig.backPanelDeduction,
      backPanelFrontDeduction: moduleConfig.backPanelFrontDeduction,
      shelfBackDeduction: moduleConfig.shelfBackDeduction,
      shelfFrontDeduction: moduleConfig.shelfFrontDeduction,
      panelsEnabled: moduleConfig.panelsEnabled,
      skirtingEnabled: moduleConfig.skirtingEnabled,
      skirtingHeightMm: moduleConfig.skirtingHeightMm,

      // Convert sections if present
      sections: moduleConfig.sections?.map((s): LibraryWardrobeSection => ({
        type: s.type,
        widthMm: s.widthMm,
        shelfCount: s.shelfCount,
        drawerCount: s.drawerCount,
        rodHeightPct: s.rodHeightPct,
      })),

      // Full config for exact reproduction
      fullConfig: { ...moduleConfig } as Record<string, unknown>,

      // Tags based on unit type and materials
      tags: [
        moduleConfig.unitType,
        moduleConfig.carcassMaterial,
        moduleConfig.shutterMaterial,
        moduleConfig.loftEnabled ? "with-loft" : "no-loft",
        moduleConfig.gaddiEnabled ? "with-gaddi" : "no-gaddi",
        moduleConfig.skirtingEnabled ? "with-skirting" : undefined,
        moduleConfig.centerPostCount ? `${moduleConfig.centerPostCount}-posts` : undefined,
      ].filter(Boolean) as string[],

      // Timestamps
      createdAt: now,
      updatedAt: now,

      // Category based on unit type
      category: getCategoryFromUnitType(moduleConfig.unitType),

      // Folder association
      folderId: selectedFolderId || undefined,
    };

    // Save to library
    addLibraryModule(libraryModule);

    // Close dialog and show feedback
    setShowFolderDialog(false);
    const folderName = selectedFolderId
      ? customFolders.find(f => f.id === selectedFolderId)?.name || "selected folder"
      : "Library";
    alert(`Module "${libraryModule.name}" saved to ${folderName}!`);
  };

  // Handle close
  const handleClose = () => {
    setShowModulePanel(false);
  };

  // Calculate pricing
  const pricing = calculateModulePricing(moduleConfig);

  return (
    <>
      <ModuleConfigPanelUI
        config={moduleConfig}
        onChange={handleChange}
        onSaveToLibrary={handleSaveToLibrary}
        onClose={handleClose}
        pricing={pricing}
      />

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

      {/* Validation Warning Dialog */}
      <Dialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className={cn(
                "h-5 w-5",
                validationResult?.isValid ? "text-amber-500" : "text-red-500"
              )} />
              {validationResult?.isValid ? "Export Warnings" : "Cannot Export"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {/* Errors Section */}
            {validationResult && validationResult.errors.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-red-600 mb-2">
                  Errors (must fix before export):
                </p>
                <ul className="space-y-1">
                  {validationResult.errors.map((error, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-red-700 bg-red-50 p-2 rounded">
                      <span className="text-red-500 mt-0.5">✗</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings Section */}
            {validationResult && validationResult.warnings.length > 0 && (
              <div>
                <p className="text-sm font-medium text-amber-600 mb-2">
                  Warnings (optional but recommended):
                </p>
                <ul className="space-y-1">
                  {validationResult.warnings.map((warning, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-2 rounded">
                      <span className="text-amber-500 mt-0.5">⚠</span>
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Summary */}
            <div className="mt-4 pt-4 border-t text-sm text-slate-600">
              {validationResult?.isValid
                ? "You can proceed with export, but consider fixing the warnings for better results."
                : "Please fix the errors above before exporting to library."
              }
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowValidationDialog(false)}>
              {validationResult?.isValid ? "Cancel" : "Close"}
            </Button>
            {validationResult?.isValid && (
              <Button
                onClick={handleProceedWithWarnings}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Proceed Anyway
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
