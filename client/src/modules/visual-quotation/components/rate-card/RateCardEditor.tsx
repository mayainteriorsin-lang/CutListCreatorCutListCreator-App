/**
 * RateCardEditor
 *
 * Form for creating/editing a rate card.
 * Uses line-based grid for material configuration with photo previews.
 */

import React, { useState, useEffect } from "react";
import { Save, X, IndianRupee, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { RateLineGrid } from "./RateLineGrid";
import type { RateCard, RateCardUnitType, CreateRateCardParams, UpdateRateCardParams } from "../../types/rateCard";
import type {
  WardrobeConfig,
  AddOnPricing,
} from "../../types/pricing";
import {
  RATE_CARD_UNIT_TYPE_LABELS,
} from "../../types/rateCard";
import {
  DEFAULT_WARDROBE_CONFIG,
} from "../../types/pricing";

interface RateCardEditorProps {
  card?: RateCard | null;
  isCreating?: boolean;
  onSave: (params: CreateRateCardParams | UpdateRateCardParams) => void;
  onCancel: () => void;
}

// Helper to get default config for new cards
function getDefaultConfig(): WardrobeConfig {
  return JSON.parse(JSON.stringify(DEFAULT_WARDROBE_CONFIG));
}

export const RateCardEditor: React.FC<RateCardEditorProps> = ({
  card,
  isCreating = false,
  onSave,
  onCancel,
}) => {
  // Form state
  const [name, setName] = useState(card?.name || "");
  const [description, setDescription] = useState(card?.description || "");
  const [unitType, setUnitType] = useState<RateCardUnitType>(card?.unitType || "all");
  const [setAsDefault, setSetAsDefault] = useState(false);

  // Config state - managed by the grid
  const [config, setConfig] = useState<WardrobeConfig>(
    card?.config || getDefaultConfig()
  );

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form when card changes
  useEffect(() => {
    if (card) {
      setName(card.name);
      setDescription(card.description || "");
      setUnitType(card.unitType);
      setConfig(JSON.parse(JSON.stringify(card.config)));
    } else if (isCreating) {
      setName("");
      setDescription("");
      setUnitType("all");
      setConfig(getDefaultConfig());
      setSetAsDefault(false);
    }
  }, [card, isCreating]);

  // Handle config changes from the grid
  const handleConfigChange = (newConfig: WardrobeConfig) => {
    setConfig(newConfig);
  };

  // Update add-on
  const updateAddOn = (index: number, updates: Partial<AddOnPricing>) => {
    setConfig((prev) => ({
      ...prev,
      addOnPricing: prev.addOnPricing.map((addon, i) =>
        i === index ? { ...addon, ...updates } : addon
      ),
    }));
  };

  // Add new add-on
  const addAddOn = () => {
    const newAddOn: AddOnPricing = {
      id: `addon_${Date.now()}` as any,
      name: "New Add-on",
      enabled: true,
      pricePerUnit: 0,
      pricingUnit: "sqft",
    };
    setConfig((prev) => ({
      ...prev,
      addOnPricing: [...prev.addOnPricing, newAddOn],
    }));
  };

  // Remove add-on
  const removeAddOn = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      addOnPricing: prev.addOnPricing.filter((_, i) => i !== index),
    }));
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    } else if (name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    } else if (name.trim().length > 50) {
      newErrors.name = "Name must be less than 50 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = () => {
    if (!validate()) return;

    if (isCreating) {
      const params: CreateRateCardParams = {
        name: name.trim(),
        description: description.trim() || undefined,
        unitType,
        config,
        setAsDefault,
      };
      onSave(params);
    } else {
      const params: UpdateRateCardParams = {
        name: name.trim(),
        description: description.trim() || undefined,
        unitType,
        config,
      };
      onSave(params);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-900">
            {isCreating ? "Create Rate Card" : `Edit: ${card?.name}`}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="p-4 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Basic Information</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Premium Wardrobe"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitType">Unit Type</Label>
              <Select value={unitType} onValueChange={(v) => setUnitType(v as RateCardUnitType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RATE_CARD_UNIT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
            />
          </div>

          {isCreating && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Switch
                id="setAsDefault"
                checked={setAsDefault}
                onCheckedChange={setSetAsDefault}
              />
              <Label htmlFor="setAsDefault" className="text-sm text-amber-800">
                Set as default rate card
              </Label>
            </div>
          )}
        </div>

        <Separator />

        {/* Rate Line Grid - Spreadsheet style editor */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">Material & Rate Configuration</h3>
          <RateLineGrid
            config={config}
            onChange={handleConfigChange}
          />
        </div>

        <Separator />

        {/* Add-ons */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Add-ons</h3>
            <Button variant="outline" size="sm" onClick={addAddOn}>
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          {config.addOnPricing.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No add-ons configured. Click "Add" to create one.
            </p>
          ) : (
            <div className="space-y-3">
              {config.addOnPricing.map((addon, index) => (
                <div
                  key={addon.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <Switch
                    checked={addon.enabled}
                    onCheckedChange={(checked) => updateAddOn(index, { enabled: checked })}
                  />
                  <Input
                    value={addon.name}
                    onChange={(e) => updateAddOn(index, { name: e.target.value })}
                    placeholder="Add-on name"
                    className="flex-1 h-8"
                  />
                  <div className="relative w-28">
                    <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      type="number"
                      value={addon.pricePerUnit}
                      onChange={(e) => updateAddOn(index, { pricePerUnit: Number(e.target.value) })}
                      className="pl-7 h-8"
                    />
                  </div>
                  <Select
                    value={addon.pricingUnit}
                    onValueChange={(v) => updateAddOn(index, { pricingUnit: v as AddOnPricing["pricingUnit"] })}
                  >
                    <SelectTrigger className="w-24 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sqft">sqft</SelectItem>
                      <SelectItem value="unit">unit</SelectItem>
                      <SelectItem value="rft">rft</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAddOn(index)}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RateCardEditor;
