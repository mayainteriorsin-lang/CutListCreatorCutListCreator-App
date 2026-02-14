/**
 * Module Card Component
 * Visual card for displaying a library module template with thumbnail preview.
 */

import { cn } from "@/lib/utils";
import type { LibraryModule } from "../types";
import { UNIT_TYPE_LABELS } from "@/constants/unitTypes";
import { Edit3, Trash2, Star, Layers, Maximize2, Ruler, CreditCard } from "lucide-react";
import RealModelPreview from "./RealModelPreview";

export interface ModuleCardProps {
  module: LibraryModule;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onPreview?: () => void;
  onCreateRateCard?: () => void;
}

// Gradient colors by unit type
const TYPE_GRADIENTS: Record<string, string> = {
  wardrobe: "from-blue-500 to-indigo-500",
  wardrobe_carcass: "from-blue-600 to-indigo-600",
  kitchen: "from-amber-500 to-orange-500",
  tv_unit: "from-emerald-500 to-teal-500",
  dresser: "from-pink-500 to-rose-500",
  study_table: "from-violet-500 to-purple-500",
  shoe_rack: "from-cyan-500 to-blue-500",
  book_shelf: "from-green-500 to-emerald-500",
  crockery_unit: "from-yellow-500 to-amber-500",
  pooja_unit: "from-orange-500 to-red-500",
  vanity: "from-rose-500 to-pink-500",
  bar_unit: "from-purple-500 to-indigo-500",
  display_unit: "from-teal-500 to-cyan-500",
  other: "from-slate-500 to-gray-500",
};

const TYPE_BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  wardrobe: { bg: "bg-blue-100", text: "text-blue-700" },
  wardrobe_carcass: { bg: "bg-blue-100", text: "text-blue-700" },
  kitchen: { bg: "bg-amber-100", text: "text-amber-700" },
  tv_unit: { bg: "bg-emerald-100", text: "text-emerald-700" },
  dresser: { bg: "bg-pink-100", text: "text-pink-700" },
  study_table: { bg: "bg-violet-100", text: "text-violet-700" },
  shoe_rack: { bg: "bg-cyan-100", text: "text-cyan-700" },
  book_shelf: { bg: "bg-green-100", text: "text-green-700" },
  crockery_unit: { bg: "bg-yellow-100", text: "text-yellow-700" },
  pooja_unit: { bg: "bg-orange-100", text: "text-orange-700" },
  vanity: { bg: "bg-rose-100", text: "text-rose-700" },
  bar_unit: { bg: "bg-purple-100", text: "text-purple-700" },
  display_unit: { bg: "bg-teal-100", text: "text-teal-700" },
  other: { bg: "bg-slate-100", text: "text-slate-700" },
};

export default function ModuleCard({
  module,
  onEdit,
  onDelete,
  onToggleFavorite,
  onPreview,
  onCreateRateCard,
}: ModuleCardProps) {
  const badgeColor = TYPE_BADGE_COLORS[module.unitType] || TYPE_BADGE_COLORS.other;
  const typeLabel = UNIT_TYPE_LABELS[module.unitType] || module.unitType;

  // Check if module has dimensions (not a template)
  const hasDimensions = module.widthMm > 0 && module.heightMm > 0;

  // Format dimension for display
  const formatDim = (mm: number) => {
    if (mm === 0) return "—";
    if (mm >= 1000) return `${(mm / 1000).toFixed(1)}m`;
    return `${mm}`;
  };

  return (
    <div
      className="group relative bg-white rounded-xl border border-slate-200/60 overflow-hidden hover:shadow-lg hover:shadow-slate-200/50 transition-all cursor-pointer"
      onClick={onPreview}
    >
      {/* Real Model Preview */}
      <div className="relative h-28 bg-gradient-to-br from-slate-50 to-slate-100 border-b border-slate-100">
        <RealModelPreview
          module={module}
          className="w-full h-full"
          showDimensions={false}
        />

        {/* Favorite indicator */}
        {module.favorite && (
          <div className="absolute top-2 left-2 z-10">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400 drop-shadow" />
          </div>
        )}

        {/* Preview expand button */}
        {onPreview && (
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(); }}
            className="absolute top-2 right-2 h-6 w-6 rounded-md bg-white/80 backdrop-blur-sm border border-slate-200/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white"
            title="Preview"
          >
            <Maximize2 className="h-3 w-3 text-slate-600" />
          </button>
        )}
      </div>

      {/* Card Content */}
      <div className="p-3">
        {/* Type Badge */}
        <span
          className={cn(
            "px-2 py-0.5 rounded-full text-[10px] font-medium inline-block mb-1.5",
            badgeColor.bg,
            badgeColor.text
          )}
        >
          {typeLabel}
        </span>

        {/* Name */}
        <h3 className="font-semibold text-slate-800 text-sm leading-tight mb-1 line-clamp-1">
          {module.name}
        </h3>

        {/* Dimensions Row */}
        {hasDimensions ? (
          <div className="flex items-center gap-1 text-xs text-slate-500 mb-1.5">
            <Ruler className="w-3 h-3 text-slate-400" />
            <span className="font-mono">
              {formatDim(module.widthMm)} × {formatDim(module.heightMm)} × {formatDim(module.depthMm)}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-slate-400 mb-1.5">
            <Ruler className="w-3 h-3" />
            <span className="italic">No dimensions (template)</span>
          </div>
        )}

        {/* Materials */}
        {(module.carcassMaterial || module.shutterMaterial) && (
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-2">
            <Layers className="w-3 h-3" />
            <span className="truncate">
              {[module.carcassMaterial, module.shutterMaterial].filter(Boolean).join(" + ")}
            </span>
          </div>
        )}

        {/* Source badge */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={cn(
              "px-1.5 py-0.5 rounded text-[9px] font-medium",
              module.source === "predefined"
                ? "bg-slate-100 text-slate-500"
                : "bg-indigo-50 text-indigo-600"
            )}
          >
            {module.source === "predefined" ? "Preset" : "Custom"}
          </span>
          {module.isTemplate && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-teal-50 text-teal-600">
              Template
            </span>
          )}
          {module.shutterCount !== undefined && module.shutterCount > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-violet-50 text-violet-600">
              {module.shutterCount} Shutters
            </span>
          )}
        </div>
      </div>

      {/* Hover Actions */}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className={cn(
            "h-7 w-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center transition-colors shadow-sm",
            module.favorite
              ? "text-amber-500 hover:bg-amber-50 hover:border-amber-200"
              : "text-slate-400 hover:bg-slate-50 hover:text-amber-500"
          )}
          title={module.favorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Star className={cn("h-3.5 w-3.5", module.favorite && "fill-amber-400")} />
        </button>
        {onCreateRateCard && (
          <button
            onClick={(e) => { e.stopPropagation(); onCreateRateCard(); }}
            className="h-7 w-7 rounded-lg bg-white border border-slate-200 hover:bg-blue-50 hover:border-blue-200 flex items-center justify-center transition-colors shadow-sm"
            title="Create Rate Card"
          >
            <CreditCard className="h-3.5 w-3.5 text-slate-600" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="h-7 w-7 rounded-lg bg-white border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 flex items-center justify-center transition-colors shadow-sm"
          title="Edit module"
        >
          <Edit3 className="h-3.5 w-3.5 text-slate-600" />
        </button>
        {module.source !== "predefined" && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="h-7 w-7 rounded-lg bg-white border border-slate-200 hover:bg-red-50 hover:border-red-200 flex items-center justify-center transition-colors shadow-sm"
            title="Delete module"
          >
            <Trash2 className="h-3.5 w-3.5 text-slate-600" />
          </button>
        )}
      </div>
    </div>
  );
}
