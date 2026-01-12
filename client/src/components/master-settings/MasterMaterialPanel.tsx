/**
 * MasterMaterialPanel - SaaS-level Material Settings Panel
 *
 * A polished, professional panel for managing default materials.
 * Features:
 * - Modern combobox selectors with search and create
 * - Visual memory chips with quick-apply
 * - Clean visual hierarchy with proper spacing
 * - Responsive and accessible design
 */

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { PlywoodCombobox } from "./PlywoodCombobox";
import { LaminateCombobox } from "./LaminateCombobox";
import { Package, Palette, Plus, Sparkles, History, X } from "lucide-react";

export interface MasterMaterialPanelProps {
  masterPlywoodBrand?: string;
  masterLaminateCode?: string;
  plywoodMemory: string[];
  laminateMemory: string[];
  laminateCodes?: string[];
  woodGrainsPreferences?: Record<string, boolean>;
  onChange: (field: "masterPlywoodBrand" | "masterLaminateCode", value: string) => void;
  onAddPlywood: () => void;
  onAddLaminate: () => void;
  onRemoveFromPlywoodMemory?: (brand: string) => void;
  onRemoveFromLaminateMemory?: (code: string) => void;
}

export default function MasterMaterialPanel({
  masterPlywoodBrand,
  masterLaminateCode,
  plywoodMemory,
  laminateMemory,
  laminateCodes,
  woodGrainsPreferences = {},
  onChange,
  onAddPlywood,
  onAddLaminate,
  onRemoveFromPlywoodMemory,
  onRemoveFromLaminateMemory,
}: MasterMaterialPanelProps) {
  const safePlywoodMemory = useMemo(
    () => (Array.isArray(plywoodMemory) ? plywoodMemory : []),
    [plywoodMemory]
  );
  const safeLaminateMemory = useMemo(
    () => (Array.isArray(laminateMemory) ? laminateMemory : []),
    [laminateMemory]
  );

  const isPlywoodInMemory = safePlywoodMemory.some(
    (m) => m.toLowerCase() === (masterPlywoodBrand || "").toLowerCase()
  );
  const isLaminateInMemory = safeLaminateMemory.some(
    (m) => m.toLowerCase() === (masterLaminateCode || "").toLowerCase()
  );

  return (
    <Card className="bg-white border-slate-200 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-to-br from-amber-50 to-indigo-50">
            <Sparkles className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-lg text-slate-900">Master Materials</CardTitle>
            <CardDescription className="text-xs">
              Set default materials for new cabinets
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* DEFAULT PLYWOOD BRAND */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 font-medium text-sm text-slate-700">
            <Package className="h-4 w-4 text-amber-600" />
            Default Plywood Brand
          </Label>

          <PlywoodCombobox
            value={masterPlywoodBrand || ""}
            onChange={(v) => onChange("masterPlywoodBrand", v)}
          />

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={onAddPlywood}
            disabled={!masterPlywoodBrand || isPlywoodInMemory}
          >
            <Plus className="h-3 w-3 mr-1" />
            {isPlywoodInMemory ? "Already in Memory" : "Add to Memory"}
          </Button>

          {safePlywoodMemory.length > 0 && (
            <div className="pt-2">
              <Label className="flex items-center gap-1.5 text-[11px] text-slate-500 uppercase tracking-wide mb-2">
                <History className="h-3 w-3" />
                Plywood Memory
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {safePlywoodMemory.map((brand) => (
                  <Badge
                    key={brand}
                    variant="secondary"
                    className="cursor-pointer hover:bg-amber-100 transition-colors group py-1 px-2"
                    onClick={() => onChange("masterPlywoodBrand", brand)}
                  >
                    <Package className="h-3 w-3 mr-1 text-amber-600" />
                    <span className="text-xs">{brand}</span>
                    {onRemoveFromPlywoodMemory && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveFromPlywoodMemory(brand);
                        }}
                        className="ml-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded p-0.5 transition-opacity"
                      >
                        <X className="h-2.5 w-2.5 text-red-500" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100" />

        {/* DEFAULT LAMINATE CODE */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2 font-medium text-sm text-slate-700">
            <Palette className="h-4 w-4 text-indigo-600" />
            Default Laminate Code
          </Label>

          <LaminateCombobox
            value={masterLaminateCode || ""}
            onChange={(v) => onChange("masterLaminateCode", v)}
            laminateCodes={laminateCodes}
            woodGrainsPreferences={woodGrainsPreferences}
          />

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={onAddLaminate}
            disabled={!masterLaminateCode || isLaminateInMemory}
          >
            <Plus className="h-3 w-3 mr-1" />
            {isLaminateInMemory ? "Already in Memory" : "Add to Memory"}
          </Button>

          {safeLaminateMemory.length > 0 && (
            <div className="pt-2">
              <Label className="flex items-center gap-1.5 text-[11px] text-slate-500 uppercase tracking-wide mb-2">
                <History className="h-3 w-3" />
                Laminate Memory
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {safeLaminateMemory.map((code) => {
                  const hasGrain = woodGrainsPreferences[code] === true;
                  return (
                    <Badge
                      key={code}
                      variant="secondary"
                      className={`cursor-pointer hover:bg-indigo-100 transition-colors group py-1 px-2 ${hasGrain ? "bg-amber-50 border-amber-200" : ""}`}
                      onClick={() => onChange("masterLaminateCode", code)}
                    >
                      <Palette className={`h-3 w-3 mr-1 ${hasGrain ? "text-amber-600" : "text-indigo-600"}`} />
                      <span className="text-xs">{code}</span>
                      {hasGrain && <span className="ml-1 text-[9px] text-amber-600 font-medium">G</span>}
                      {onRemoveFromLaminateMemory && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveFromLaminateMemory(code);
                          }}
                          className="ml-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded p-0.5 transition-opacity"
                        >
                          <X className="h-2.5 w-2.5 text-red-500" />
                        </button>
                      )}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 text-[10px] text-slate-400 border-t border-slate-50">
          Tip: Click memory chips to quickly apply, or use the dropdown to search and add new materials.
        </div>
      </CardContent>
    </Card>
  );
}

export { MasterMaterialPanel };
