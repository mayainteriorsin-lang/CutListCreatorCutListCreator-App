/**
 * LibraryQuickPicker
 *
 * A dropdown picker for selecting library modules in the 2D quotation page.
 * Shows favorites first, then recent modules grouped by category.
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Library,
  Star,
  Search,
  Package,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LibraryModule, LibraryCategory } from "@/modules/library/types";
import { loadLibraryModules, generateHumanReadableId } from "@/modules/library/storage";
import { UNIT_TYPE_LABELS } from "../constants";
import type { DrawnUnit, WardrobeBox, LoftBox } from "../types/wardrobe";
import type { UnitType } from "../types/core";

// Category labels for display
const CATEGORY_LABELS: Record<LibraryCategory, string> = {
  bedroom: "Bedroom",
  kitchen: "Kitchen",
  living: "Living Room",
  study: "Study",
  utility: "Utility",
  custom: "Custom",
};

// Category icons (emoji for simplicity)
const CATEGORY_ICONS: Record<LibraryCategory, string> = {
  bedroom: "🛏️",
  kitchen: "🍳",
  living: "📺",
  study: "📚",
  utility: "🧹",
  custom: "✨",
};

interface LibraryQuickPickerProps {
  onSelectModule: (unit: DrawnUnit) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Convert a LibraryModule to a DrawnUnit.
 * DIRECT PASS-THROUGH: Uses original library fullConfig without modification.
 * The renderer reads from libraryConfig for exact reproduction.
 */
export function libraryModuleToDrawnUnit(
  module: LibraryModule,
  box: WardrobeBox
): DrawnUnit {
  // Get the original config - this is the EXACT data from Design page
  const fc = module.fullConfig as Record<string, unknown> | undefined;

  // Extract basic values for DrawnUnit structure (required fields)
  const widthMm = (fc?.widthMm as number) || module.widthMm || 2400;
  const heightMm = (fc?.heightMm as number) || module.heightMm || 2400;
  const depthMm = (fc?.depthMm as number) || module.depthMm || 560;

  // For wardrobe_carcass, use centerPostCount to determine sections
  // centerPostCount = 2 means 3 vertical sections (2 posts divide into 3)
  const isWardrobeCarcass = module.unitType === "wardrobe_carcass";
  const centerPostCount = (fc?.centerPostCount as number) || 0;

  // Calculate shutterCount: for wardrobe_carcass use centerPostCount + 1, else use stored value
  const shutterCount = isWardrobeCarcass
    ? (centerPostCount + 1)
    : ((fc?.shutterCount as number) || module.shutterCount || 2);

  // For wardrobe_carcass, sectionCount means horizontal rows (typically 1 for full height)
  const sectionCount = isWardrobeCarcass
    ? 1
    : ((fc?.sectionCount as number) || module.sectionCount || 1);

  return {
    id: `unit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    unitType: module.unitType as UnitType,
    box,
    // Don't calculate dividers - let renderer use libraryConfig directly
    shutterDividerXs: [],
    horizontalDividerYs: [],
    // Basic required fields - computed above for wardrobe_carcass
    shutterCount,
    sectionCount,
    loftEnabled: (fc?.loftEnabled as boolean) ?? false,
    loftOnly: false,
    loftHeightRatio: 0.25,
    loftShutterCount: (fc?.loftShutterCount as number) || 1,
    loftDividerXs: [],
    // Dimensions from original config
    widthMm,
    heightMm,
    depthMm,
    loftWidthMm: widthMm,
    loftHeightMm: (fc?.loftHeightMm as number) || 400,
    shelfCount: 0,
    drawnAddOns: [],
    wardrobeConfig: undefined,
    finish: {
      shutterLaminateCode: (fc?.shutterLaminateCode as string) || module.shutterLaminateCode,
    },
    // CRITICAL: Pass the COMPLETE original config - renderer uses this directly
    libraryConfig: fc,
  };
}

export function LibraryQuickPicker({
  onSelectModule,
  disabled = false,
  className,
}: LibraryQuickPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [modules, setModules] = useState<LibraryModule[]>([]);

  // Load modules when popover opens
  useEffect(() => {
    if (open) {
      const loaded = loadLibraryModules();
      setModules(loaded);
    }
  }, [open]);

  // Filter and group modules
  const { favorites, byCategory, filtered } = useMemo(() => {
    const searchLower = search.toLowerCase().trim();

    // Filter by search term
    const filtered = searchLower
      ? modules.filter(
          (m) =>
            m.name.toLowerCase().includes(searchLower) ||
            m.unitType.toLowerCase().includes(searchLower) ||
            generateHumanReadableId(m.fullConfig || (m as unknown as Record<string, unknown>)).toLowerCase().includes(searchLower)
        )
      : modules;

    // Separate favorites
    const favorites = filtered.filter((m) => m.favorite);

    // Group by category
    const byCategory: Record<LibraryCategory, LibraryModule[]> = {
      bedroom: [],
      kitchen: [],
      living: [],
      study: [],
      utility: [],
      custom: [],
    };

    filtered.forEach((m) => {
      if (!m.favorite) {
        const cat = m.category || "custom";
        byCategory[cat].push(m);
      }
    });

    return { favorites, byCategory, filtered };
  }, [modules, search]);

  // Handle module selection
  const handleSelect = (module: LibraryModule) => {
    // Use stored dimensions or defaults
    const widthMm = module.widthMm > 0 ? module.widthMm : 2400;
    const heightMm = module.heightMm > 0 ? module.heightMm : 2400;

    // Calculate aspect ratio to maintain proportions
    const aspectRatio = widthMm / heightMm;

    // Target size: fit within visible canvas area with generous padding
    // Canvas visible area is ~650x450 after toolbars, leave room for resize handles
    const maxHeight = 320;
    const maxWidth = 450;

    let boxHeight = maxHeight;
    let boxWidth = boxHeight * aspectRatio;

    // If width exceeds max, scale down
    if (boxWidth > maxWidth) {
      boxWidth = maxWidth;
      boxHeight = boxWidth / aspectRatio;
    }

    // Position: start from top-left with minimal padding
    // This ensures the full unit is visible without cropping
    const defaultBox: WardrobeBox = {
      x: 60,
      y: 30,
      width: boxWidth,
      height: boxHeight,
      rotation: 0,
      source: "library",
    };

    const drawnUnit = libraryModuleToDrawnUnit(module, defaultBox);
    onSelectModule(drawnUnit);
    setOpen(false);
    setSearch("");
  };

  // Render a module item
  const renderModuleItem = (module: LibraryModule) => {
    const humanId = generateHumanReadableId(module.fullConfig || (module as unknown as Record<string, unknown>));
    const typeLabel = UNIT_TYPE_LABELS[module.unitType as keyof typeof UNIT_TYPE_LABELS] || module.unitType;

    return (
      <button
        key={module.id}
        className={cn(
          "w-full text-left px-3 py-2 rounded-md transition-colors",
          "hover:bg-slate-100 dark:hover:bg-slate-700",
          "flex items-start gap-2"
        )}
        onClick={() => handleSelect(module)}
      >
        <div className="flex-shrink-0 w-8 h-8 rounded bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xs">
          <Package className="h-4 w-4 text-slate-500 dark:text-slate-300" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-medium text-sm text-slate-800 dark:text-slate-100 truncate">
              {module.name}
            </span>
            {module.favorite && (
              <Star className="h-3 w-3 text-amber-400 fill-amber-400 flex-shrink-0" />
            )}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            {humanId}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
              {typeLabel}
            </span>
            {module.widthMm > 0 && (
              <span className="text-[9px] text-slate-400">
                {module.widthMm}×{module.heightMm}×{module.depthMm}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0 mt-1" />
      </button>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-6 px-2 text-[10px] gap-1",
            "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-500",
            "disabled:opacity-50",
            className
          )}
        >
          <Library className="h-3 w-3" />
          Library
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="start"
        sideOffset={5}
      >
        {/* Search Header */}
        <div className="p-2 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search modules..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-7 text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Module List */}
        <ScrollArea className="h-[320px]">
          {modules.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No modules in library</p>
              <p className="text-xs mt-1">
                Save modules from the Design page first
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No matching modules</p>
            </div>
          ) : (
            <div className="p-2">
              {/* Favorites Section */}
              {favorites.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <Star className="h-3 w-3 fill-amber-400" />
                    Favorites
                  </div>
                  <div className="space-y-0.5">
                    {favorites.map(renderModuleItem)}
                  </div>
                </div>
              )}

              {/* Categories */}
              {(Object.keys(byCategory) as LibraryCategory[]).map((cat) => {
                const catModules = byCategory[cat];
                if (catModules.length === 0) return null;

                return (
                  <div key={cat} className="mb-3">
                    <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      <span>{CATEGORY_ICONS[cat]}</span>
                      {CATEGORY_LABELS[cat]}
                      <span className="text-slate-400 font-normal">
                        ({catModules.length})
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {catModules.map(renderModuleItem)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
          <p className="text-[10px] text-slate-500 text-center">
            {modules.length} module{modules.length !== 1 ? "s" : ""} in library
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default LibraryQuickPicker;
