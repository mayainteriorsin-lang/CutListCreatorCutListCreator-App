import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import GrainToggle from "@/components/panel/GrainToggle";
import GaddiToggle from "@/components/panel/GaddiToggle";

// PATCH 18: Strict prop typing
export interface PanelMaterialSelectorProps {
  label: string;
  laminateCode?: string;
  innerLaminateCode?: string;
  grainDirection?: boolean;
  gaddi?: boolean;

  laminateCodes: string[];

  onChange: (
    field: "laminateCode" | "innerLaminateCode" | "grainDirection" | "gaddi",
    value: string | boolean
  ) => void;

  showGrain?: boolean;
  showGaddi?: boolean;
}

export default function PanelMaterialSelector({
  label,
  laminateCode,
  innerLaminateCode,
  grainDirection,
  gaddi,
  laminateCodes,
  onChange,
  showGrain = false,
  showGaddi = false,
}: PanelMaterialSelectorProps) {

  // PATCH 17: Safe array fallback to prevent undefined.map() crashes
  const safeLaminateCodes = Array.isArray(laminateCodes) ? laminateCodes : [];

  return (
    <div className="space-y-2 border rounded-md p-3 bg-gray-50">

      <Label className="font-medium text-sm">{label}</Label>

      {/* Outer Laminate */}
      <div className="space-y-1">
        <Label className="text-xs">Laminate Code</Label>
        <Select
          value={laminateCode}
          onValueChange={(v) => onChange("laminateCode", v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {/* PATCH 37: Empty state */}
            {safeLaminateCodes.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500">
                No laminate codes available
              </div>
            ) : (
              safeLaminateCodes.map((code: string) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Inner Laminate */}
      <div className="space-y-1 pt-1">
        <Label className="text-xs">Inner Laminate</Label>
        <Select
          value={innerLaminateCode}
          onValueChange={(v) => onChange("innerLaminateCode", v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {/* PATCH 37: Empty state */}
            {safeLaminateCodes.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500">
                No laminate codes available
              </div>
            ) : (
              safeLaminateCodes.map((code: string) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Grain + Gaddi */}
      {(showGrain || showGaddi) && (
        <div className="flex items-center gap-4 pt-2">
          {showGrain && (
            <GrainToggle
              value={grainDirection}
              onChange={(v) => onChange("grainDirection", v)}
            />
          )}
          {showGaddi && (
            <GaddiToggle
              value={gaddi}
              onChange={(v) => onChange("gaddi", v)}
            />
          )}
        </div>
      )}

    </div>
  );
}
