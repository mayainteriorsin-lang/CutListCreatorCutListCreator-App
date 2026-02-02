/**
 * PATCH 26: PlywoodTypeSelector
 *
 * Plywood type selector wrapper that uses PlywoodCombobox with localStorage support.
 * For use in CabinetForm where options are passed from parent.
 */

import { Label } from "@/components/ui/label";
import { PlywoodCombobox } from "@/components/master-settings/PlywoodCombobox";

export interface PlywoodTypeSelectorProps {
  value: string;
  options?: string[]; // Optional - PlywoodCombobox fetches its own data
  onChange: (value: string) => void;
  label?: string;
  showLabel?: boolean;
  className?: string;
}

export function PlywoodTypeSelector({
  value,
  onChange,
  label = "Plywood Type",
  showLabel = true,
  className = "",
}: PlywoodTypeSelectorProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {showLabel && <Label className="font-semibold">{label}</Label>}
      <PlywoodCombobox
        value={value || ""}
        onChange={onChange}
        placeholder="Select plywood type"
        className="h-9"
      />
    </div>
  );
}

export default PlywoodTypeSelector;
