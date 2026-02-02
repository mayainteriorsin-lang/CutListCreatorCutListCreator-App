/**
 * LaminateSelector - Wrapper for LaminateCombobox with localStorage support
 */

import { Label } from "@/components/ui/label";
import { LaminateCombobox } from "@/components/master-settings/LaminateCombobox";

interface LaminateSelectorProps {
  value: string;
  onChange: (value: string) => void;
  laminateCodes?: string[];
  label?: string;
  className?: string;
}

export function LaminateSelector({
  value,
  onChange,
  laminateCodes: externalCodes,
  label,
  className
}: LaminateSelectorProps) {
  return (
    <div className={`space-y-1 ${className || ""}`}>
      {label && <Label className="font-semibold">{label}</Label>}
      <LaminateCombobox
        value={value || ""}
        onChange={onChange}
        externalCodes={externalCodes}
        placeholder="Select laminate..."
        className="h-9"
      />
    </div>
  );
}

export default LaminateSelector;
