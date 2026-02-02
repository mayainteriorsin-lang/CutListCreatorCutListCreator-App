import { Label } from "@/components/ui/label";
import { LaminateCombobox } from "@/components/master-settings/LaminateCombobox";
import GrainToggle from "@/components/panel/GrainToggle";
import GaddiToggle from "@/components/panel/GaddiToggle";

// PATCH 18: Strict prop typing
export interface PanelMaterialSelectorProps {
  label: string;
  laminateCode?: string;
  innerLaminateCode?: string;
  grainDirection?: boolean;
  gaddi?: boolean;

  laminateCodes?: string[]; // Optional - LaminateCombobox fetches its own data

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
  return (
    <div className="space-y-2 border rounded-md p-3 bg-gray-50">

      <Label className="font-medium text-sm">{label}</Label>

      {/* Outer Laminate */}
      <div className="space-y-1">
        <Label className="text-xs">Laminate Code</Label>
        <LaminateCombobox
          value={laminateCode || ""}
          onChange={(v) => onChange("laminateCode", v)}
          externalCodes={laminateCodes}
          placeholder="Select laminate..."
          className="h-9"
        />
      </div>

      {/* Inner Laminate */}
      <div className="space-y-1 pt-1">
        <Label className="text-xs">Inner Laminate</Label>
        <LaminateCombobox
          value={innerLaminateCode || ""}
          onChange={(v) => onChange("innerLaminateCode", v)}
          externalCodes={laminateCodes}
          placeholder="Select inner laminate..."
          className="h-9"
        />
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
