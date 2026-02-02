import React, { useState, useEffect } from "react";
import { Settings2, IndianRupee, Pencil, Check, PenTool, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  WardrobeConfig,
  WardrobeType,
  WardrobeAddOn,
  CarcassMaterial,
  CarcassThickness,
  EdgeBand,
  ShutterMaterial,
  ShutterFinish,
  HandleType,
  AddOnPricing,
  PricingUnit,
  DEFAULT_WARDROBE_CONFIG,
  DEFAULT_ADDON_PRICING,
  DEFAULT_KITCHEN_ADDON_PRICING,
  DEFAULT_TV_UNIT_ADDON_PRICING,
  DEFAULT_DRESSER_ADDON_PRICING,
  DEFAULT_STUDY_TABLE_ADDON_PRICING,
  DEFAULT_SHOE_RACK_ADDON_PRICING,
  DEFAULT_BOOK_SHELF_ADDON_PRICING,
  DEFAULT_CROCKERY_ADDON_PRICING,
  DEFAULT_POOJA_ADDON_PRICING,
  DEFAULT_VANITY_ADDON_PRICING,
  DEFAULT_BAR_UNIT_ADDON_PRICING,
  DEFAULT_DISPLAY_UNIT_ADDON_PRICING,
  CARCASS_MATERIAL_PRICES,
  CARCASS_THICKNESS_PRICES,
  EDGE_BAND_PRICES,
  SHUTTER_MATERIAL_PRICES,
  SHUTTER_FINISH_PRICES,
  HANDLE_TYPE_PRICES,
} from "../../types";
import { cn } from "@/lib/utils";
import { UNIT_TYPE_LABELS } from "../../constants";

const WARDROBE_TYPES: { value: WardrobeType; label: string }[] = [
  { value: "shutter", label: "Shutter" },
  { value: "sliding", label: "Sliding" },
  { value: "open", label: "Open" },
];

const CARCASS_MATERIALS: { value: CarcassMaterial; label: string }[] = [
  { value: "plywood", label: "Plywood" },
  { value: "mdf", label: "MDF" },
  { value: "particle_board", label: "Particle Board" },
  { value: "hdhmr", label: "HDHMR" },
];

const CARCASS_THICKNESS: { value: CarcassThickness; label: string }[] = [
  { value: "18mm", label: "18mm" },
  { value: "25mm", label: "25mm" },
];

const EDGE_BANDS: { value: EdgeBand; label: string }[] = [
  { value: "pvc_0.8mm", label: "PVC 0.8mm" },
  { value: "pvc_2mm", label: "PVC 2mm" },
  { value: "abs_2mm", label: "ABS 2mm" },
];

const SHUTTER_MATERIALS: { value: ShutterMaterial; label: string }[] = [
  { value: "laminate", label: "Laminate" },
  { value: "acrylic", label: "Acrylic" },
  { value: "veneer", label: "Veneer" },
  { value: "lacquer", label: "Lacquer/PU" },
  { value: "membrane", label: "Membrane" },
];

const SHUTTER_FINISHES: { value: ShutterFinish; label: string }[] = [
  { value: "matte", label: "Matte" },
  { value: "gloss", label: "Gloss" },
  { value: "textured", label: "Textured" },
  { value: "super_matte", label: "Super Matte" },
];

const HANDLE_TYPES: { value: HandleType; label: string }[] = [
  { value: "j_profile", label: "J-Profile" },
  { value: "g_profile", label: "G-Profile" },
  { value: "knob", label: "Knob" },
  { value: "bar", label: "Bar Handle" },
  { value: "concealed", label: "Concealed" },
  { value: "none", label: "No Handle" },
];

const PRICING_UNITS: { value: PricingUnit; label: string }[] = [
  { value: "sqft", label: "/sqft" },
  { value: "unit", label: "/unit" },
  { value: "rft", label: "/rft" },
];

interface UnitConfigPanelProps {
  open: boolean;
  onClose: () => void;
  config: WardrobeConfig;
  onSave: (config: WardrobeConfig) => void;
  onDrawAddOn?: (addOnType: WardrobeAddOn) => void;
  onDrawUnit?: (editMode: "shutter" | "carcass") => void;
  unitType?: string;
}

const getDefaultAddOnsForUnitType = (unitType: string): AddOnPricing[] => {
  switch (unitType) {
    case "kitchen":
      return DEFAULT_KITCHEN_ADDON_PRICING;
    case "tv_unit":
      return DEFAULT_TV_UNIT_ADDON_PRICING;
    case "dresser":
      return DEFAULT_DRESSER_ADDON_PRICING;
    case "study_table":
      return DEFAULT_STUDY_TABLE_ADDON_PRICING;
    case "shoe_rack":
      return DEFAULT_SHOE_RACK_ADDON_PRICING;
    case "book_shelf":
      return DEFAULT_BOOK_SHELF_ADDON_PRICING;
    case "crockery_unit":
      return DEFAULT_CROCKERY_ADDON_PRICING;
    case "pooja_unit":
      return DEFAULT_POOJA_ADDON_PRICING;
    case "vanity":
      return DEFAULT_VANITY_ADDON_PRICING;
    case "bar_unit":
      return DEFAULT_BAR_UNIT_ADDON_PRICING;
    case "display_unit":
      return DEFAULT_DISPLAY_UNIT_ADDON_PRICING;
    case "wardrobe":
    default:
      return DEFAULT_ADDON_PRICING;
  }
};

const UnitConfigPanel: React.FC<UnitConfigPanelProps> = ({
  open,
  onClose,
  config,
  onSave,
  onDrawAddOn,
  onDrawUnit,
  unitType = "wardrobe",
}) => {
  const unitTypeLabel = UNIT_TYPE_LABELS[unitType] || unitType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const [localConfig, setLocalConfig] = useState<WardrobeConfig>(config);
  const [editingAddOnId, setEditingAddOnId] = useState<string | null>(null);

  const defaultAddOns = getDefaultAddOnsForUnitType(unitType);

  useEffect(() => {
    const mergedAddOnPricing = defaultAddOns.map(defaultAddOn => {
      const existingConfig = config.addOnPricing.find(a => a.id === defaultAddOn.id);
      return existingConfig || defaultAddOn;
    });

    setLocalConfig({
      ...config,
      addOnPricing: mergedAddOnPricing,
    });
  }, [config, unitType]);

  // Auto-save when config changes
  useEffect(() => {
    const timer = setTimeout(() => {
      onSave(localConfig);
    }, 300);
    return () => clearTimeout(timer);
  }, [localConfig]);

  const handleAddOnToggle = (addOnId: WardrobeAddOn) => {
    setLocalConfig((prev) => ({
      ...prev,
      addOns: prev.addOns.includes(addOnId)
        ? prev.addOns.filter((a) => a !== addOnId)
        : [...prev.addOns, addOnId],
      addOnPricing: prev.addOnPricing.map((a) =>
        a.id === addOnId ? { ...a, enabled: !a.enabled } : a
      ),
    }));
  };

  const updateAddOnPricing = (
    addOnId: WardrobeAddOn,
    field: keyof AddOnPricing,
    value: string | number | PricingUnit
  ) => {
    setLocalConfig((prev) => ({
      ...prev,
      addOnPricing: prev.addOnPricing.map((a) =>
        a.id === addOnId ? { ...a, [field]: value } : a
      ),
    }));
  };

  const handleCarcassMaterialChange = (material: CarcassMaterial) => {
    setLocalConfig((prev) => ({
      ...prev,
      carcass: {
        ...prev.carcass,
        material,
        materialPrice: CARCASS_MATERIAL_PRICES[material],
      },
    }));
  };

  const handleCarcassThicknessChange = (thickness: CarcassThickness) => {
    setLocalConfig((prev) => ({
      ...prev,
      carcass: {
        ...prev.carcass,
        thickness,
        thicknessPrice: CARCASS_THICKNESS_PRICES[thickness],
      },
    }));
  };

  const handleEdgeBandChange = (edgeBand: EdgeBand) => {
    setLocalConfig((prev) => ({
      ...prev,
      carcass: {
        ...prev.carcass,
        edgeBand,
        edgeBandPrice: EDGE_BAND_PRICES[edgeBand],
      },
    }));
  };

  const handleShutterMaterialChange = (material: ShutterMaterial) => {
    setLocalConfig((prev) => ({
      ...prev,
      shutter: {
        ...prev.shutter,
        material,
        materialPrice: SHUTTER_MATERIAL_PRICES[material],
      },
    }));
  };

  const handleShutterFinishChange = (finish: ShutterFinish) => {
    setLocalConfig((prev) => ({
      ...prev,
      shutter: {
        ...prev.shutter,
        finish,
        finishPrice: SHUTTER_FINISH_PRICES[finish],
      },
    }));
  };

  const handleHandleTypeChange = (handleType: HandleType) => {
    setLocalConfig((prev) => ({
      ...prev,
      shutter: {
        ...prev.shutter,
        handleType,
        handlePrice: HANDLE_TYPE_PRICES[handleType],
      },
    }));
  };

  const carcassTotalPerSqft =
    localConfig.carcass.materialPrice +
    localConfig.carcass.thicknessPrice +
    localConfig.carcass.edgeBandPrice;

  const shutterTotalPerSqft =
    localConfig.shutter.materialPrice +
    localConfig.shutter.finishPrice +
    localConfig.shutter.handlePrice;

  const enabledAddOns = localConfig.addOnPricing.filter((a) => a.enabled);

  if (!open) return null;

  return (
    <div className={cn(
      "absolute right-0 top-0 bottom-0 w-[320px] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col transition-transform duration-300",
      open ? "translate-x-0" : "translate-x-full"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-slate-600" />
          <span className="font-semibold text-sm text-slate-800">{unitTypeLabel} Card</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Unit Type */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-slate-600">{unitTypeLabel} Type</Label>
          <div className="flex gap-1.5">
            {WARDROBE_TYPES.map((type) => (
              <Button
                key={type.value}
                variant={localConfig.wardrobeType === type.value ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setLocalConfig((prev) => ({ ...prev, wardrobeType: type.value }))
                }
                className="flex-1 h-7 text-xs"
              >
                {type.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Carcass Options */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <div
            className="flex items-center justify-between mb-2 cursor-pointer hover:bg-slate-100 -mx-1 -mt-1 px-1 pt-1 pb-0.5 rounded transition-all"
            onClick={() => {
              if (onDrawUnit) {
                onDrawUnit("carcass");
              }
            }}
            title="Click to draw carcass on canvas"
          >
            <div className="flex items-center gap-1.5">
              <div className="flex items-center justify-center w-5 h-5 rounded bg-slate-200 text-slate-600">
                <PenTool className="h-3 w-3" />
              </div>
              <Label className="text-xs font-semibold text-slate-700 cursor-pointer">Carcass</Label>
            </div>
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-200 rounded text-xs font-semibold">
              <IndianRupee className="h-2.5 w-2.5" />
              {carcassTotalPerSqft}/sqft
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-slate-500">Material</Label>
                <span className="text-[9px] text-green-600 font-medium">
                  +{localConfig.carcass.materialPrice}
                </span>
              </div>
              <Select
                value={localConfig.carcass.material}
                onValueChange={handleCarcassMaterialChange}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARCASS_MATERIALS.map((m) => (
                    <SelectItem key={m.value} value={m.value} className="text-xs">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-slate-500">Thickness</Label>
                <span className="text-[9px] text-green-600 font-medium">
                  +{localConfig.carcass.thicknessPrice}
                </span>
              </div>
              <Select
                value={localConfig.carcass.thickness}
                onValueChange={handleCarcassThicknessChange}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARCASS_THICKNESS.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-slate-500">Edge Band</Label>
                <span className="text-[9px] text-green-600 font-medium">
                  +{localConfig.carcass.edgeBandPrice}
                </span>
              </div>
              <Select
                value={localConfig.carcass.edgeBand}
                onValueChange={handleEdgeBandChange}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDGE_BANDS.map((e) => (
                    <SelectItem key={e.value} value={e.value} className="text-xs">
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Shutter Options - hide for open wardrobe */}
        {localConfig.wardrobeType !== "open" && (
          <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
            <div
              className="flex items-center justify-between mb-2 cursor-pointer hover:bg-blue-100 -mx-1 -mt-1 px-1 pt-1 pb-0.5 rounded transition-all"
              onClick={() => {
                if (onDrawUnit) {
                  onDrawUnit("shutter");
                }
              }}
              title="Click to draw shutter on canvas"
            >
              <div className="flex items-center gap-1.5">
                <div className="flex items-center justify-center w-5 h-5 rounded bg-blue-200 text-blue-600">
                  <PenTool className="h-3 w-3" />
                </div>
                <Label className="text-xs font-semibold text-blue-700 cursor-pointer">Shutter</Label>
              </div>
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-200 rounded text-xs font-semibold text-blue-800">
                <IndianRupee className="h-2.5 w-2.5" />
                {shutterTotalPerSqft}/sqft
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-blue-600">Material</Label>
                  <span className="text-[9px] text-green-600 font-medium">
                    +{localConfig.shutter.materialPrice}
                  </span>
                </div>
                <Select
                  value={localConfig.shutter.material}
                  onValueChange={handleShutterMaterialChange}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHUTTER_MATERIALS.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="text-xs">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-blue-600">Finish</Label>
                  <span className="text-[9px] text-green-600 font-medium">
                    +{localConfig.shutter.finishPrice}
                  </span>
                </div>
                <Select
                  value={localConfig.shutter.finish}
                  onValueChange={handleShutterFinishChange}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHUTTER_FINISHES.map((f) => (
                      <SelectItem key={f.value} value={f.value} className="text-xs">
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-blue-600">Handle</Label>
                  <span className="text-[9px] text-green-600 font-medium">
                    +{localConfig.shutter.handlePrice}
                  </span>
                </div>
                <Select
                  value={localConfig.shutter.handleType}
                  onValueChange={handleHandleTypeChange}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HANDLE_TYPES.map((h) => (
                      <SelectItem key={h.value} value={h.value} className="text-xs">
                        {h.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Add-ons */}
        <div className="p-2.5 rounded-lg bg-green-50 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs font-semibold text-green-700">Add-ons</Label>
            {enabledAddOns.length > 0 && (
              <span className="text-[10px] text-green-600 font-medium">
                {enabledAddOns.length} selected
              </span>
            )}
          </div>
          <div className="space-y-1.5">
            {localConfig.addOnPricing.map((addOn) => (
              <div
                key={addOn.id}
                className={`flex items-center gap-2 p-1.5 rounded border transition-all cursor-pointer ${addOn.enabled
                    ? "bg-green-100 border-green-300 hover:bg-green-150"
                    : "bg-white border-slate-200 hover:bg-blue-50 hover:border-blue-300"
                  }`}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('input, select, button, [role="combobox"]')) {
                    return;
                  }
                  if (!addOn.enabled) {
                    handleAddOnToggle(addOn.id);
                  }
                  if (onDrawAddOn) {
                    onDrawAddOn(addOn.id);
                  }
                }}
              >
                <div className="flex items-center justify-center w-5 h-5 rounded bg-blue-100 text-blue-600">
                  <PenTool className="h-3 w-3" />
                </div>

                <div className="flex-1 min-w-0 flex items-center gap-1">
                  {editingAddOnId === addOn.id ? (
                    <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={addOn.name}
                        onChange={(e) =>
                          updateAddOnPricing(addOn.id, "name", e.target.value)
                        }
                        className="h-6 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === "Escape") {
                            setEditingAddOnId(null);
                          }
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAddOnId(null);
                        }}
                      >
                        <Check className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-xs font-medium truncate">{addOn.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 opacity-50 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAddOnId(addOn.id);
                        }}
                        title="Edit name"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </Button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                  <IndianRupee className="h-2.5 w-2.5 text-slate-500" />
                  <Input
                    type="number"
                    value={addOn.pricePerUnit}
                    onChange={(e) =>
                      updateAddOnPricing(addOn.id, "pricePerUnit", Number(e.target.value))
                    }
                    className="h-6 w-14 text-xs text-right"
                  />
                </div>

                <div onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={addOn.pricingUnit}
                    onValueChange={(v: PricingUnit) =>
                      updateAddOnPricing(addOn.id, "pricingUnit", v)
                    }
                  >
                    <SelectTrigger className="h-6 w-16 text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICING_UNITS.map((u) => (
                        <SelectItem key={u.value} value={u.value} className="text-xs">
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {addOn.enabled && (
                  <div className="w-2 h-2 rounded-full bg-green-500" title="Enabled" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Estimate Summary */}
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
          <Label className="text-xs font-semibold text-amber-700 mb-1.5 block">
            Rate Summary (per sqft unless noted)
          </Label>
          <div className="space-y-0.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Carcass</span>
              <span className="font-medium flex items-center gap-0.5">
                <IndianRupee className="h-2.5 w-2.5" />
                {carcassTotalPerSqft}/sqft
              </span>
            </div>
            {localConfig.wardrobeType !== "open" && (
              <div className="flex justify-between">
                <span className="text-slate-600">Shutter</span>
                <span className="font-medium flex items-center gap-0.5">
                  <IndianRupee className="h-2.5 w-2.5" />
                  {shutterTotalPerSqft}/sqft
                </span>
              </div>
            )}
            {enabledAddOns.map((addOn) => (
              <div key={addOn.id} className="flex justify-between">
                <span className="text-slate-600">{addOn.name}</span>
                <span className="font-medium flex items-center gap-0.5">
                  <IndianRupee className="h-2.5 w-2.5" />
                  {addOn.pricePerUnit}/{addOn.pricingUnit}
                </span>
              </div>
            ))}
            <div className="border-t border-amber-300 pt-1.5 mt-1.5 flex justify-between font-semibold">
              <span>Combined Rate</span>
              <span className="flex items-center gap-0.5 text-amber-700">
                <IndianRupee className="h-2.5 w-2.5" />
                {carcassTotalPerSqft + (localConfig.wardrobeType !== "open" ? shutterTotalPerSqft : 0)}/sqft
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { UnitConfigPanel };
export type { UnitConfigPanelProps };
export default UnitConfigPanel;
