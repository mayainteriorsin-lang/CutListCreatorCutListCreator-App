/**
 * PlywoodSelectorPanel
 *
 * Wraps PlywoodSelector with label and master settings integration.
 * Extracted from home.tsx for reuse across:
 * - Master Settings Card
 * - Cabinet Form
 * - Quotation Module
 */

import { Label } from "@/components/ui/label";
import { PlywoodSelector } from "@/components/master-settings/PlywoodSelector";

export interface PlywoodSelectorPanelProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: (value: string) => void;
  label?: string;
  showLabel?: boolean;
}

/**
 * PlywoodSelectorPanel - Complete plywood brand selector with label.
 */
export function PlywoodSelectorPanel({
  value,
  onChange,
  onSave,
  label = "Plywood Brand",
  showLabel = true
}: PlywoodSelectorPanelProps) {
  const handleChange = (newValue: string) => {
    const trimmed = newValue.trim();
    onChange(trimmed);
    onSave?.(trimmed);
  };

  return (
    <div className="space-y-2">
      {showLabel && (
        <Label className="text-sm font-medium">{label}</Label>
      )}
      <PlywoodSelector
        value={value}
        onChange={handleChange}
      />
    </div>
  );
}

export default PlywoodSelectorPanel;
