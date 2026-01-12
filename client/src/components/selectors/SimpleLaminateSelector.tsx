/**
 * PATCH 26: SimpleLaminateSelector
 *
 * Simple laminate code selector that takes options as props.
 * For use in CabinetForm where options are passed from parent.
 * Different from master-settings/LaminateSelector which fetches its own data.
 */

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export interface SimpleLaminateSelectorProps {
  label: string;
  value?: string;
  options: string[];
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
  // PATCH 17: Safe fallback for array
  const safeOptions = Array.isArray(options) ? options : [];

  return (
    <div className={`space-y-1 ${className}`}>
      <Label className="text-sm">{label}</Label>
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {safeOptions.map((code) => (
            <SelectItem key={code} value={code}>
              {code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default SimpleLaminateSelector;
