/**
 * RateLineRow
 *
 * Single row in the rate line grid.
 * Shows material photo, inline dropdowns, and rate.
 */

import React from "react";
import { Edit2, Check, X, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { RateLine, RateLineUpdate } from "../../types/rateLine";
import {
  CARCASS_MATERIAL_PRICES,
  CARCASS_THICKNESS_PRICES,
  EDGE_BAND_PRICES,
  SHUTTER_MATERIAL_PRICES,
  SHUTTER_FINISH_PRICES,
  HANDLE_TYPE_PRICES,
} from "../../types/pricing";
import { getMaterialDisplayName } from "../../constants/materialPhotos";

// ============================================================================
// Types
// ============================================================================

interface RateLineRowProps {
  line: RateLine;
  isEditing: boolean;
  onEditToggle: () => void;
  onUpdate: (updates: RateLineUpdate) => void;
  readOnly?: boolean;
}

// ============================================================================
// Options
// ============================================================================

const CARCASS_MATERIAL_OPTIONS = Object.keys(CARCASS_MATERIAL_PRICES).map((key) => ({
  value: key,
  label: getMaterialDisplayName(key),
  price: CARCASS_MATERIAL_PRICES[key as keyof typeof CARCASS_MATERIAL_PRICES],
}));

const CARCASS_THICKNESS_OPTIONS = Object.keys(CARCASS_THICKNESS_PRICES).map((key) => ({
  value: key,
  label: key,
  price: CARCASS_THICKNESS_PRICES[key as keyof typeof CARCASS_THICKNESS_PRICES],
}));

const EDGE_BAND_OPTIONS = Object.keys(EDGE_BAND_PRICES).map((key) => ({
  value: key,
  label: getMaterialDisplayName(key),
  price: EDGE_BAND_PRICES[key as keyof typeof EDGE_BAND_PRICES],
}));

const SHUTTER_MATERIAL_OPTIONS = Object.keys(SHUTTER_MATERIAL_PRICES).map((key) => ({
  value: key,
  label: getMaterialDisplayName(key),
  price: SHUTTER_MATERIAL_PRICES[key as keyof typeof SHUTTER_MATERIAL_PRICES],
}));

const SHUTTER_FINISH_OPTIONS = Object.keys(SHUTTER_FINISH_PRICES).map((key) => ({
  value: key,
  label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
  price: SHUTTER_FINISH_PRICES[key as keyof typeof SHUTTER_FINISH_PRICES],
}));

const HANDLE_TYPE_OPTIONS = Object.keys(HANDLE_TYPE_PRICES).map((key) => ({
  value: key,
  label: key.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
  price: HANDLE_TYPE_PRICES[key as keyof typeof HANDLE_TYPE_PRICES],
}));

// ============================================================================
// Component
// ============================================================================

export const RateLineRow: React.FC<RateLineRowProps> = ({
  line,
  isEditing,
  onEditToggle,
  onUpdate,
  readOnly = false,
}) => {
  const isShutter = line.type === "shutter";
  const isCarcass = line.type === "carcass";
  const isLoft = line.type === "loft";
  const isInnerLaminate = line.type === "inner_laminate";

  // Get options based on line type
  const materialOptions = isShutter ? SHUTTER_MATERIAL_OPTIONS : CARCASS_MATERIAL_OPTIONS;
  const thicknessOptions = CARCASS_THICKNESS_OPTIONS;
  const finishOptions = SHUTTER_FINISH_OPTIONS;
  const edgeOptions = isShutter ? HANDLE_TYPE_OPTIONS : EDGE_BAND_OPTIONS;

  // Row background based on type
  const rowBg = cn(
    "grid grid-cols-[80px_1fr_100px_100px_100px_100px_100px] gap-px",
    isLoft && "bg-slate-50",
    isInnerLaminate && !line.isEnabled && "opacity-50"
  );

  return (
    <div className={rowBg}>
      {/* Photo */}
      <div className="bg-white px-2 py-2 flex items-center justify-center">
        <div
          className="w-14 h-14 rounded-lg border border-gray-200 overflow-hidden shadow-sm"
          style={{
            backgroundImage: line.photoUrl ? `url(${line.photoUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      </div>

      {/* Type / Material */}
      <div className="bg-white px-3 py-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-gray-900">{line.label}</span>
          {isEditing && !readOnly && (isShutter || isCarcass) ? (
            <Select
              value={line.material}
              onValueChange={(v) => onUpdate({ material: v })}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {materialOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label} {opt.price > 0 && `(₹${opt.price})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm text-gray-600">
              {getMaterialDisplayName(line.material)}
            </span>
          )}
        </div>
      </div>

      {/* Thickness */}
      <div className="bg-white px-3 py-2 flex items-center">
        {isEditing && !readOnly && isCarcass ? (
          <Select
            value={line.thickness}
            onValueChange={(v) => onUpdate({ thickness: v })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {thicknessOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label} {opt.price > 0 && `(+₹${opt.price})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm text-gray-600">{line.thickness}</span>
        )}
      </div>

      {/* Finish */}
      <div className="bg-white px-3 py-2 flex items-center">
        {isEditing && !readOnly && isShutter ? (
          <Select
            value={line.finish}
            onValueChange={(v) => onUpdate({ finish: v })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {finishOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label} {opt.price > 0 && `(+₹${opt.price})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm text-gray-600">{line.finish}</span>
        )}
      </div>

      {/* Edge/Handle */}
      <div className="bg-white px-3 py-2 flex items-center">
        {isEditing && !readOnly && (isShutter || isCarcass) ? (
          <Select
            value={line.edge}
            onValueChange={(v) => onUpdate({ edge: v })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {edgeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label} {opt.price > 0 && `(₹${opt.price})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-sm text-gray-600">
            {line.edge === "-" ? "-" : getMaterialDisplayName(line.edge)}
          </span>
        )}
      </div>

      {/* Rate */}
      <div className="bg-white px-3 py-2 flex items-center justify-end">
        <span
          className={cn(
            "text-sm font-bold flex items-center",
            isLoft ? "text-blue-600" : "text-gray-800",
            line.isCalculated && "italic"
          )}
        >
          <IndianRupee className="h-3.5 w-3.5" />
          {line.rate.toLocaleString("en-IN")}
        </span>
      </div>

      {/* Action */}
      <div className="bg-white px-3 py-2 flex items-center justify-center gap-1">
        {isInnerLaminate && (
          <Switch
            checked={line.isEnabled}
            onCheckedChange={(checked) => onUpdate({ isEnabled: checked })}
            className="mr-2"
          />
        )}
        {!readOnly && !isLoft && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onEditToggle}
          >
            {isEditing ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Edit2 className="h-4 w-4 text-gray-400" />
            )}
          </Button>
        )}
        {isLoft && (
          <span className="text-[10px] text-gray-400 italic">Auto</span>
        )}
      </div>
    </div>
  );
};

export default RateLineRow;
