/**
 * LaminateSelectorPanel
 *
 * Wraps LaminateSelector with label, wood grain toggle, and master settings integration.
 * Extracted from home.tsx for reuse across:
 * - Master Settings Card
 * - Cabinet Form
 * - Quotation Module
 */

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { LaminateSelector } from "@/components/master-settings/LaminateSelector";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export interface LaminateSelectorPanelProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: (value: string) => void;
  label?: string;
  showLabel?: boolean;
  showWoodGrainToggle?: boolean;
  woodGrainsPreferences?: Record<string, boolean>;
  onWoodGrainChange?: (laminateCode: string, enabled: boolean) => void;
  helpText?: string;
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
  showWoodGrainToggle = false,
  woodGrainsPreferences = {},
  onWoodGrainChange,
  helpText
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
      await apiRequest('POST', '/api/wood-grains-preference', {
        laminateCode: value,
        woodGrainsEnabled: newValue
      });

      toast({
        title: newValue ? "Wood Grain Enabled" : "Wood Grain Disabled",
        description: `${value} ${newValue ? 'now uses' : 'no longer uses'} wood grain memory`,
      });
    } catch (error) {
      console.error('Error toggling wood grains:', error);
      // Revert on error
      onWoodGrainChange?.(value, !newValue);
      toast({
        title: "Error",
        description: "Failed to update wood grain preference",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">{label}</Label>
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
                className={`text-xs cursor-pointer ${!value ? 'text-slate-300' : 'text-slate-600'}`}
              >
                Has Wood Grain
              </Label>
            </div>
          )}
        </div>
      )}
      <div className="flex gap-2 items-start">
        <div className="flex-1 space-y-2">
          <LaminateSelector
            value={value}
            onChange={handleChange}
            className={hasWoodGrain ? "text-amber-700 font-bold" : ""}
          />
        </div>
      </div>
      {helpText && (
        <p className="text-[10px] text-slate-500 italic">
          {helpText}
        </p>
      )}
    </div>
  );
}

export default LaminateSelectorPanel;
