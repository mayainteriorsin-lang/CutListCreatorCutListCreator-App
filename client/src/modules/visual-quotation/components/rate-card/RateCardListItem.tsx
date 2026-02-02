/**
 * RateCardListItem
 *
 * Individual rate card item in the list view.
 * Shows card name, preview rates, and action buttons.
 */

import React from "react";
import {
  Star,
  MoreVertical,
  Copy,
  Trash2,
  Edit2,
  IndianRupee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RateCard, RateCardPreview } from "../../types/rateCard";
import { RATE_CARD_UNIT_TYPE_LABELS } from "../../types/rateCard";

interface RateCardListItemProps {
  card: RateCard;
  preview: RateCardPreview;
  isSelected: boolean;
  isDefault: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}

export const RateCardListItem: React.FC<RateCardListItemProps> = ({
  card,
  preview,
  isSelected,
  isDefault,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onSetDefault,
}) => {
  return (
    <div
      onClick={onSelect}
      className={`
        group relative p-4 rounded-lg border cursor-pointer transition-all
        ${isSelected
          ? "border-blue-500 bg-blue-50/50 shadow-sm"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
        }
      `}
    >
      {/* Default star badge */}
      {isDefault && (
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
          <Star className="h-3.5 w-3.5 text-white fill-white" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">{card.name}</h3>
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 text-gray-600">
              {RATE_CARD_UNIT_TYPE_LABELS[card.unitType]}
            </span>
          </div>
          {card.description && (
            <p className="mt-1 text-xs text-gray-500 truncate">{card.description}</p>
          )}
        </div>

        {/* Actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            {!isDefault && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSetDefault(); }}>
                <Star className="h-4 w-4 mr-2" />
                Set as Default
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Rate preview */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="p-2 rounded bg-slate-50 border border-slate-100">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Carcass</p>
          <p className="text-sm font-bold text-slate-800 flex items-center">
            <IndianRupee className="h-3 w-3" />
            {preview.carcassRate.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="p-2 rounded bg-slate-50 border border-slate-100">
          <p className="text-[10px] text-slate-500 uppercase tracking-wide">Shutter</p>
          <p className="text-sm font-bold text-slate-800 flex items-center">
            <IndianRupee className="h-3 w-3" />
            {preview.shutterRate.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="p-2 rounded bg-emerald-50 border border-emerald-100">
          <p className="text-[10px] text-emerald-600 uppercase tracking-wide">Combined</p>
          <p className="text-sm font-bold text-emerald-700 flex items-center">
            <IndianRupee className="h-3 w-3" />
            {preview.combinedRate.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Add-ons count */}
      {preview.enabledAddOns.length > 0 && (
        <div className="mt-2 text-[10px] text-gray-500">
          +{preview.enabledAddOns.length} add-on{preview.enabledAddOns.length > 1 ? "s" : ""} enabled
        </div>
      )}

      {/* Last updated */}
      <div className="mt-2 text-[10px] text-gray-400">
        Updated {new Date(card.updatedAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </div>
    </div>
  );
};

export default RateCardListItem;
