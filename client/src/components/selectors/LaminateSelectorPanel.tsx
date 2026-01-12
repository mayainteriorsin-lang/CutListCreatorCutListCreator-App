/**
 * LaminateSelectorPanel
 *
 * Wraps LaminateCombobox with label, wood grain toggle, and master settings integration.
 * Uses the new SaaS-level combobox component.
 *
 * Used in:
 * - Master Settings Card
 * - Cabinet Form
 * - Quotation Module
 */

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LaminateCombobox } from "@/components/master-settings/LaminateCombobox";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { toastError } from "@/lib/errors/toastError";
import { Palette } from "lucide-react";

export interface LaminateSelectorPanelProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: (value: string) => void;
  label?: string;
  showLabel?: boolean;
  showIcon?: boolean;
  showWoodGrainToggle?: boolean;
  woodGrainsPreferences?: Record<string, boolean>;
  onWoodGrainChange?: (laminateCode: string, enabled: boolean) => void;
  helpText?: string;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * LaminateSelectorPanel - Complete laminate selector with label and optional wood grain toggle.
 */
export function LaminateSelectorPanel({
  value,
  onChange,
  onSave,
  label = "Laminate",
  showLabel = true,
  showIcon = false,
  showWoodGrainToggle = false,
  woodGrainsPreferences = {},
  onWoodGrainChange,
  helpText,
  disabled = false,
  placeholder,
}: LaminateSelectorPanelProps) {
  const hasWoodGrain = value ? woodGrainsPreferences[value] === true : false;

  const handleChange = (newValue: string) => {
    onChange(newValue);
    onSave?.(newValue);
  };

  const handleWoodGrainToggle = async (checked: boolean | "indeterminate") => {
    if (!value) return;
    const newValue = checked === true;

    try {
      // Optimistic update
      onWoodGrainChange?.(value, newValue);

      // Persist to backend
      await apiRequest("POST", "/api/wood-grains-preference", {
        laminateCode: value,
        woodGrainsEnabled: newValue,
      });

      toast({
        title: newValue ? "Wood Grain Enabled" : "Wood Grain Disabled",
        description: `${value} ${newValue ? "now uses" : "no longer uses"} wood grain memory`,
      });
    } catch (error) {
      console.error("Error toggling wood grains:", error);
      // Revert on error
      onWoodGrainChange?.(value, !newValue);
      toastError(error);
    }
  };

  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            {showIcon && <Palette className="h-3.5 w-3.5 text-indigo-600" />}
            {label}
          </Label>
          {showWoodGrainToggle && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="wood-grain-quick-toggle"
                checked={hasWoodGrain}
                onCheckedChange={handleWoodGrainToggle}
                disabled={!value}
              />
              <Label
                htmlFor="wood-grain-quick-toggle"
                className={`text-xs cursor-pointer ${!value ? "text-slate-300" : "text-slate-600"}`}
              >
                Has Wood Grain
              </Label>
            </div>
          )}
        </div>
      )}
      <LaminateCombobox
        value={value}
        onChange={handleChange}
        woodGrainsPreferences={woodGrainsPreferences}
        disabled={disabled}
        placeholder={placeholder}
      />
      {helpText && (
        <p className="text-[10px] text-slate-500 italic">{helpText}</p>
      )}
    </div>
  );
}

export default LaminateSelectorPanel;
