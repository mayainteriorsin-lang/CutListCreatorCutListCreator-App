import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PlywoodCombobox } from "@/components/master-settings/PlywoodCombobox";
import { LaminateCombobox } from "@/components/master-settings/LaminateCombobox";

// PATCH 18: Strict prop typing
export interface LaminateCode {
  code: string;
}

export interface LaminatePresetPanelProps {
  masterPlywood?: string;
  masterLaminate?: string;
  masterInnerLaminate?: string;
  applyToAll?: boolean;
  plywoodBrands?: string[]; // Optional - Combobox fetches its own data
  laminateCodes?: LaminateCode[]; // Optional - Combobox fetches its own data
  onChange: (field: string, value: string | boolean) => void;
}

export default function LaminatePresetPanel({
  masterPlywood,
  masterLaminate,
  masterInnerLaminate,
  applyToAll,
  laminateCodes,
  onChange,
}: LaminatePresetPanelProps) {
  // Convert laminateCodes to string array for LaminateCombobox
  const safeLaminateCodes = Array.isArray(laminateCodes)
    ? laminateCodes.map((l) => l.code)
    : undefined;

  return (
    <div className="border rounded-md p-4 bg-gray-50 space-y-4">

      {/* MASTER PLYWOOD */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">Master Plywood Brand</Label>
        <PlywoodCombobox
          value={masterPlywood || ""}
          onChange={(v) => onChange("masterPlywood", v)}
          placeholder="Select plywood"
          className="h-9"
        />
      </div>

      {/* MASTER LAMINATE */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">Master Laminate (Front)</Label>
        <LaminateCombobox
          value={masterLaminate || ""}
          onChange={(v) => onChange("masterLaminate", v)}
          laminateCodes={safeLaminateCodes}
          placeholder="Select laminate"
          className="h-9"
        />
      </div>

      {/* MASTER INNER LAMINATE */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">Inner Laminate</Label>
        <LaminateCombobox
          value={masterInnerLaminate || ""}
          onChange={(v) => onChange("masterInnerLaminate", v)}
          laminateCodes={safeLaminateCodes}
          placeholder="Select inner laminate"
          className="h-9"
        />
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
