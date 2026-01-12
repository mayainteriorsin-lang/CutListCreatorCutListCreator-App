import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

// PATCH 18: Strict prop typing
export interface LaminateCode {
  code: string;
}

export interface LaminatePresetPanelProps {
  masterPlywood?: string;
  masterLaminate?: string;
  masterInnerLaminate?: string;
  applyToAll?: boolean;
  plywoodBrands: string[];
  laminateCodes: LaminateCode[];
  onChange: (field: string, value: string | boolean) => void;
}

export default function LaminatePresetPanel({
  masterPlywood,
  masterLaminate,
  masterInnerLaminate,
  applyToAll,
  plywoodBrands,
  laminateCodes,
  onChange,
}: LaminatePresetPanelProps) {
  // PATCH 34: Safe array fallbacks to prevent .map() crashes
  const safePlywoodBrands = Array.isArray(plywoodBrands) ? plywoodBrands : [];
  const safeLaminateCodes = Array.isArray(laminateCodes) ? laminateCodes : [];

  return (
    <div className="border rounded-md p-4 bg-gray-50 space-y-4">

      {/* MASTER PLYWOOD */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">Master Plywood Brand</Label>
        <Select
          value={masterPlywood}
          onValueChange={(v) => onChange("masterPlywood", v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select plywood" />
          </SelectTrigger>
          <SelectContent>
            {/* PATCH 37: Empty state */}
            {safePlywoodBrands.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500">
                No plywood brands available
              </div>
            ) : (
              safePlywoodBrands.map((p: string, i: number) => (
                <SelectItem key={i} value={p}>{p}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* MASTER LAMINATE */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">Master Laminate (Front)</Label>
        <Select
          value={masterLaminate}
          onValueChange={(v) => onChange("masterLaminate", v)}
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
              safeLaminateCodes.map((l: LaminateCode) => (
                <SelectItem key={l.code} value={l.code}>{l.code}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* MASTER INNER LAMINATE */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">Inner Laminate</Label>
        <Select
          value={masterInnerLaminate}
          onValueChange={(v) => onChange("masterInnerLaminate", v)}
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
              safeLaminateCodes.map((l: LaminateCode) => (
                <SelectItem key={l.code} value={l.code}>{l.code}</SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* APPLY TO ALL PANELS */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Apply to All Panels</Label>
        <Switch
          checked={applyToAll}
          onCheckedChange={(c) => onChange("applyToAll", c)}
        />
      </div>
    </div>
  );
}
