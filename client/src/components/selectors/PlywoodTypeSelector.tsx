/**
 * PATCH 26: PlywoodTypeSelector
 *
 * Simple plywood type selector that takes options as props.
 * For use in CabinetForm where options are passed from parent.
 * Different from master-settings/PlywoodSelector which fetches its own data.
 */

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export interface PlywoodTypeSelectorProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  label?: string;
  showLabel?: boolean;
  className?: string;
}

export function PlywoodTypeSelector({
  value,
  options,
  onChange,
  label = "Plywood Type",
  showLabel = true,
  className = "",
}: PlywoodTypeSelectorProps) {
  // PATCH 17: Safe fallback for array
  const safeOptions = Array.isArray(options) ? options : [];

  return (
    <div className={`space-y-2 ${className}`}>
      {showLabel && <Label className="font-semibold">{label}</Label>}
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Select plywood type" />
        </SelectTrigger>
        <SelectContent>
          {/* PATCH 37: Empty state */}
          {safeOptions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500">
              No plywood types available
            </div>
          ) : (
            safeOptions.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

export default PlywoodTypeSelector;
