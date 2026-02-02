/**
 * PATCH 26: SimpleLaminateSelector
 *
 * Laminate code selector wrapper that uses LaminateCombobox with localStorage support.
 * For use in CabinetForm where options are passed from parent.
 */

import { Label } from "@/components/ui/label";
import { LaminateCombobox } from "@/components/master-settings/LaminateCombobox";

export interface SimpleLaminateSelectorProps {
  label: string;
  value?: string;
  options?: string[]; // Optional - LaminateCombobox fetches its own data
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SimpleLaminateSelector({
  label,
  value,
  options,
  onChange,
  placeholder = "Select laminate",
  className = "",
}: SimpleLaminateSelectorProps) {
  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-sm">{label}</Label>
      <LaminateCombobox
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        externalCodes={options}
        className="h-9"
      />
    </div>
  );
}

export default SimpleLaminateSelector;
