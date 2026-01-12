import { useEffect, useState } from "react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useLaminateCodes } from "@/hooks/useLaminateGodown";

interface LaminateSelectorProps {
  value: string;
  onChange: (value: string) => void;
  laminateCodes?: string[];
  label?: string;
  className?: string;
}

export function LaminateSelector({ value, onChange, laminateCodes: externalCodes, label, className }: LaminateSelectorProps) {
  const [localValue, setLocalValue] = useState(value || "");

  // Fetch from hook if not provided externally
  const { data: fetchedCodes } = useLaminateCodes();

  // PATCH 17: Use external codes if provided, otherwise use fetched codes - always ensure array
  const safeExternalCodes = Array.isArray(externalCodes) ? externalCodes : [];
  const safeFetchedCodes = Array.isArray(fetchedCodes) ? fetchedCodes.map(c => c.code) : [];
  const codes = safeExternalCodes.length > 0 ? safeExternalCodes : safeFetchedCodes;

  // Sync from parent -> local
  useEffect(() => {
    setLocalValue(value || "");
  }, [value]);

  // Notify parent ONLY when user changes
  function handleChange(v: string) {
    setLocalValue(v);
    onChange(v);
  }

  return (
    <div className={`space-y-1 ${className || ""}`}>
      {label && <Label className="font-semibold">{label}</Label>}
      <Select value={localValue} onValueChange={handleChange}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Select laminate..." />
        </SelectTrigger>
        <SelectContent>
          {/* PATCH 37: Empty state */}
          {codes.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500">
              No laminate codes available
            </div>
          ) : (
            codes.map((c: string) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

export default LaminateSelector;
