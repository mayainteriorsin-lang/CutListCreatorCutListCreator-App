import React, { useState, useEffect } from "react";
import { Settings2, IndianRupee, Pencil, Check, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

interface WardrobeConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: WardrobeConfig;
  onSave: (config: WardrobeConfig) => void;
  onDrawAddOn?: (addOnType: WardrobeAddOn) => void; // Callback to enter draw mode for add-on
  onDrawUnit?: (editMode: "shutter" | "carcass") => void; // Callback to enter unit draw mode (shutter/carcass)
  unitType?: string; // Current unit type for dynamic title
}

// Helper function to get default add-ons for a unit type
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
      // Default wardrobe add-ons for wardrobe and other unit types
      return DEFAULT_ADDON_PRICING;
  }
};

const WardrobeConfigModal: React.FC<WardrobeConfigModalProps> = ({
  open,
  onOpenChange,
  config,
  onSave,
  onDrawAddOn,
  onDrawUnit,
  unitType = "wardrobe",
}) => {
  // Get display label for unit type
  const unitTypeLabel = UNIT_TYPE_LABELS[unitType] || unitType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const [localConfig, setLocalConfig] = useState<WardrobeConfig>(config);
  const [editingAddOnId, setEditingAddOnId] = useState<string | null>(null);

  // Get the appropriate add-ons for this unit type
  const defaultAddOns = getDefaultAddOnsForUnitType(unitType);

  useEffect(() => {
    // When config changes, merge with default add-ons for current unit type
    // This ensures we show the correct add-ons for the unit type
    const mergedAddOnPricing = defaultAddOns.map(defaultAddOn => {
      // Check if user has already configured this add-on
      const existingConfig = config.addOnPricing.find(a => a.id === defaultAddOn.id);
      return existingConfig || defaultAddOn;
    });

    setLocalConfig({
      ...config,
      addOnPricing: mergedAddOnPricing,
    });
  }, [config, unitType]);

  // Toggle add-on enabled state
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

  // Update add-on pricing
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

  // Update carcass material and price
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

  // Update carcass thickness and price
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

  // Update edge band and price
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

  // Update shutter material and price
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

  // Update shutter finish and price
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

  // Update handle type and price
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

  // Calculate totals
  const carcassTotalPerSqft =
    localConfig.carcass.materialPrice +
    localConfig.carcass.thicknessPrice +
    localConfig.carcass.edgeBandPrice;

  const shutterTotalPerSqft =
    localConfig.shutter.materialPrice +
    localConfig.shutter.finishPrice +
    localConfig.shutter.handlePrice;

  const enabledAddOns = localConfig.addOnPricing.filter((a) => a.enabled);

  const handleSave = () => {
    onSave(localConfig);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto fixed right-4 left-auto top-[50%] translate-x-0 data-[state=open]:slide-in-from-right">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            {unitTypeLabel} Card
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Unit Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{unitTypeLabel} Type</Label>
            <div className="flex gap-2">
              {WARDROBE_TYPES.map((type) => (
                <Button
                  key={type.value}
                  variant={localConfig.wardrobeType === type.value ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setLocalConfig((prev) => ({ ...prev, wardrobeType: type.value }))
                  }
                  className="flex-1"
                >
                  {type.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Carcass Options with Pricing */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div
              className="flex items-center justify-between mb-3 cursor-pointer hover:bg-slate-100 -mx-2 -mt-2 px-2 pt-2 pb-1 rounded-t-lg transition-all"
              onClick={() => {
                if (onDrawUnit) {
                  onSave(localConfig);
                  onOpenChange(false);
                  onDrawUnit("carcass");
                }
              }}
              title="Click to draw carcass on canvas"
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded bg-slate-200 text-slate-600">
                  <PenTool className="h-3.5 w-3.5" />
                </div>
                <Label className="text-sm font-semibold text-slate-700 cursor-pointer">Carcass</Label>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-slate-200 rounded text-sm font-semibold">
                <IndianRupee className="h-3 w-3" />
                {carcassTotalPerSqft}/sqft
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {/* Material */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-500">Material</Label>
                  <span className="text-[10px] text-green-600 font-medium">
                    +{localConfig.carcass.materialPrice}
                  </span>
                </div>
                <Select
                  value={localConfig.carcass.material}
                  onValueChange={handleCarcassMaterialChange}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARCASS_MATERIALS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        <div className="flex justify-between items-center w-full gap-4">
                          <span>{m.label}</span>
                          <span className="text-xs text-slate-500">
                            {CARCASS_MATERIAL_PRICES[m.value]}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Thickness */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-500">Thickness</Label>
                  <span className="text-[10px] text-green-600 font-medium">
                    +{localConfig.carcass.thicknessPrice}
                  </span>
                </div>
                <Select
                  value={localConfig.carcass.thickness}
                  onValueChange={handleCarcassThicknessChange}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARCASS_THICKNESS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex justify-between items-center w-full gap-4">
                          <span>{t.label}</span>
                          <span className="text-xs text-slate-500">
                            +{CARCASS_THICKNESS_PRICES[t.value]}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Edge Band */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-slate-500">Edge Band</Label>
                  <span className="text-[10px] text-green-600 font-medium">
                    +{localConfig.carcass.edgeBandPrice}
                  </span>
                </div>
                <Select
                  value={localConfig.carcass.edgeBand}
                  onValueChange={handleEdgeBandChange}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EDGE_BANDS.map((e) => (
                      <SelectItem key={e.value} value={e.value}>
                        <div className="flex justify-between items-center w-full gap-4">
                          <span>{e.label}</span>
                          <span className="text-xs text-slate-500">
                            +{EDGE_BAND_PRICES[e.value]}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Shutter Options with Pricing - hide for open wardrobe */}
          {localConfig.wardrobeType !== "open" && (
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div
                className="flex items-center justify-between mb-3 cursor-pointer hover:bg-blue-100 -mx-2 -mt-2 px-2 pt-2 pb-1 rounded-t-lg transition-all"
                onClick={() => {
                  if (onDrawUnit) {
                    onSave(localConfig);
                    onOpenChange(false);
                    onDrawUnit("shutter");
                  }
                }}
                title="Click to draw shutter on canvas"
              >
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-blue-200 text-blue-600">
                    <PenTool className="h-3.5 w-3.5" />
                  </div>
                  <Label className="text-sm font-semibold text-blue-700 cursor-pointer">Shutter</Label>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-blue-200 rounded text-sm font-semibold text-blue-800">
                  <IndianRupee className="h-3 w-3" />
                  {shutterTotalPerSqft}/sqft
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {/* Material */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-blue-600">Material</Label>
                    <span className="text-[10px] text-green-600 font-medium">
                      +{localConfig.shutter.materialPrice}
                    </span>
                  </div>
                  <Select
                    value={localConfig.shutter.material}
                    onValueChange={handleShutterMaterialChange}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SHUTTER_MATERIALS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          <div className="flex justify-between items-center w-full gap-4">
                            <span>{m.label}</span>
                            <span className="text-xs text-slate-500">
                              {SHUTTER_MATERIAL_PRICES[m.value]}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Finish */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-blue-600">Finish</Label>
                    <span className="text-[10px] text-green-600 font-medium">
                      +{localConfig.shutter.finishPrice}
                    </span>
                  </div>
                  <Select
                    value={localConfig.shutter.finish}
                    onValueChange={handleShutterFinishChange}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SHUTTER_FINISHES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          <div className="flex justify-between items-center w-full gap-4">
                            <span>{f.label}</span>
                            <span className="text-xs text-slate-500">
                              +{SHUTTER_FINISH_PRICES[f.value]}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Handle */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-blue-600">Handle</Label>
                    <span className="text-[10px] text-green-600 font-medium">
                      +{localConfig.shutter.handlePrice}
                    </span>
                  </div>
                  <Select
                    value={localConfig.shutter.handleType}
                    onValueChange={handleHandleTypeChange}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HANDLE_TYPES.map((h) => (
                        <SelectItem key={h.value} value={h.value}>
                          <div className="flex justify-between items-center w-full gap-4">
                            <span>{h.label}</span>
                            <span className="text-xs text-slate-500">
                              +{HANDLE_TYPE_PRICES[h.value]}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Add-ons with Editable Pricing */}
          <div className="p-4 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold text-green-700">Add-ons</Label>
              {enabledAddOns.length > 0 && (
                <span className="text-xs text-green-600 font-medium">
                  {enabledAddOns.length} selected
                </span>
              )}
            </div>
            <div className="space-y-2">
              {localConfig.addOnPricing.map((addOn) => (
                <div
                  key={addOn.id}
                  className={`flex items-center gap-3 p-2 rounded border transition-all cursor-pointer ${addOn.enabled
                      ? "bg-green-100 border-green-300 hover:bg-green-150"
                      : "bg-white border-slate-200 hover:bg-blue-50 hover:border-blue-300"
                    }`}
                  onClick={(e) => {
                    // Don't trigger draw if clicking on edit controls
                    if ((e.target as HTMLElement).closest('input, select, button, [role="combobox"]')) {
                      return;
                    }
                    // Enable add-on and immediately enter draw mode
                    if (!addOn.enabled) {
                      handleAddOnToggle(addOn.id);
                    }
                    if (onDrawAddOn) {
                      onSave(localConfig);
                      onOpenChange(false);
                      onDrawAddOn(addOn.id);
                    }
                  }}
                >
                  {/* Draw indicator icon */}
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-blue-100 text-blue-600">
                    <PenTool className="h-3.5 w-3.5" />
                  </div>

                  {/* Name - Click to draw, Edit button for editing */}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    {editingAddOnId === addOn.id ? (
                      <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={addOn.name}
                          onChange={(e) =>
                            updateAddOnPricing(addOn.id, "name", e.target.value)
                          }
                          className="h-7 text-sm"
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
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingAddOnId(null);
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm font-medium truncate">{addOn.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingAddOnId(addOn.id);
                          }}
                          title="Edit name"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Price Input */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <IndianRupee className="h-3 w-3 text-slate-500" />
                    <Input
                      type="number"
                      value={addOn.pricePerUnit}
                      onChange={(e) =>
                        updateAddOnPricing(addOn.id, "pricePerUnit", Number(e.target.value))
                      }
                      className="h-7 w-20 text-sm text-right"
                    />
                  </div>

                  {/* Pricing Unit */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={addOn.pricingUnit}
                      onValueChange={(v: PricingUnit) =>
                        updateAddOnPricing(addOn.id, "pricingUnit", v)
                      }
                    >
                      <SelectTrigger className="h-7 w-20 text-xs">
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

                  {/* Status indicator */}
                  {addOn.enabled && (
                    <div className="w-2 h-2 rounded-full bg-green-500" title="Enabled" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Estimate Summary */}
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
            <Label className="text-sm font-semibold text-amber-700 mb-2 block">
              Rate Summary (per sqft unless noted)
            </Label>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Carcass</span>
                <span className="font-medium flex items-center gap-1">
                  <IndianRupee className="h-3 w-3" />
                  {carcassTotalPerSqft}/sqft
                </span>
              </div>
              {localConfig.wardrobeType !== "open" && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Shutter</span>
                    <span className="font-medium flex items-center gap-1">
                      <IndianRupee className="h-3 w-3" />
                      {shutterTotalPerSqft}/sqft
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Loft (Carcass + Shutter)</span>
                    <span className="font-medium flex items-center gap-1">
                      <IndianRupee className="h-3 w-3" />
                      {carcassTotalPerSqft + shutterTotalPerSqft}/sqft
                    </span>
                  </div>
                </>
              )}
              {enabledAddOns.map((addOn) => (
                <div key={addOn.id} className="flex justify-between">
                  <span className="text-slate-600">{addOn.name}</span>
                  <span className="font-medium flex items-center gap-1">
                    <IndianRupee className="h-3 w-3" />
                    {addOn.pricePerUnit}/{addOn.pricingUnit}
                  </span>
                </div>
              ))}
              <div className="border-t border-amber-300 pt-2 mt-2 flex justify-between font-semibold">
                <span>Combined Rate</span>
                <span className="flex items-center gap-1 text-amber-700">
                  <IndianRupee className="h-3 w-3" />
                  {carcassTotalPerSqft + (localConfig.wardrobeType !== "open" ? shutterTotalPerSqft : 0)}/sqft
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Configuration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { WardrobeConfigModal, DEFAULT_WARDROBE_CONFIG };
export type { WardrobeConfigModalProps };
