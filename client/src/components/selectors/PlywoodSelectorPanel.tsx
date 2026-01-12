/**
 * PlywoodSelectorPanel
 *
 * Wraps PlywoodCombobox with label and master settings integration.
 * Uses the new SaaS-level combobox component.
 *
 * Used in:
 * - Master Settings Card
 * - Cabinet Form
 * - Quotation Module
 */

import { Label } from "@/components/ui/label";
import { PlywoodCombobox } from "@/components/master-settings/PlywoodCombobox";
import { Package } from "lucide-react";

export interface PlywoodSelectorPanelProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: (value: string) => void;
  label?: string;
  showLabel?: boolean;
  showIcon?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * PlywoodSelectorPanel - Complete plywood brand selector with label.
 */
export function PlywoodSelectorPanel({
  value,
  onChange,
  onSave,
  label = "Plywood Brand",
  showLabel = true,
  showIcon = false,
  disabled = false,
  placeholder,
}: PlywoodSelectorPanelProps) {
  const handleChange = (newValue: string) => {
    const trimmed = newValue.trim();
    onChange(trimmed);
    onSave?.(trimmed);
  };

  return (
    <div className="space-y-2">
      {showLabel && (
        <Label className="text-sm font-medium flex items-center gap-1.5">
          {showIcon && <Package className="h-3.5 w-3.5 text-amber-600" />}
          {label}
        </Label>
      )}
      <PlywoodCombobox
        value={value}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
      />
    </div>
  );
}

export default PlywoodSelectorPanel;
