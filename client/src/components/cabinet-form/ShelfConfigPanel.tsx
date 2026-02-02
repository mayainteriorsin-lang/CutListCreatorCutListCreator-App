import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LaminateCombobox } from "@/components/master-settings/LaminateCombobox";
import GrainToggle from "@/components/panel/GrainToggle";
import GaddiToggle from "@/components/panel/GaddiToggle";

/**
 * ShelfConfigPanel
 *
 * Reusable shelf configuration UI with localStorage support for laminate codes.
 *
 * Props:
 *  - shelfCount: number
 *  - shelfLaminate: string
 *  - shelfInnerLaminate: string
 *  - shelfGrain: boolean
 *  - shelfGaddi: boolean
 *  - laminateCodes: optional array of laminate options (Combobox fetches its own data)
 *  - onChange(field, value): callback for value changes
 */

interface ShelfConfigPanelProps {
  shelfCount: number;
  shelfLaminate: string;
  shelfInnerLaminate: string;
  shelfGrain: boolean;
  shelfGaddi: boolean;
  laminateCodes?: Array<{ id: string; code: string }>; // Optional - Combobox fetches its own data
  onChange: (field: string, value: any) => void;
}

export default function ShelfConfigPanel({
  shelfCount,
  shelfLaminate,
  shelfInnerLaminate,
  shelfGrain,
  shelfGaddi,
  laminateCodes,
  onChange,
}: ShelfConfigPanelProps) {
  // Convert laminateCodes to string array for LaminateCombobox
  const safeLaminateCodes = Array.isArray(laminateCodes)
    ? laminateCodes.map((l) => l.code)
    : undefined;

  return (
    <div className="space-y-4 border rounded-md p-4 bg-gray-50">
      <Label className="font-semibold">Shelf Configuration</Label>

      {/* COUNT */}
      <div className="space-y-1">
        <Label className="text-sm">Shelf Count</Label>
        <Input
          type="number"
          min={0}
          max={10}
          className="h-9"
          value={shelfCount}
          onChange={(e) => onChange("shelfCount", parseInt(e.target.value) || 0)}
        />
      </div>

      {shelfCount > 0 && (
        <>
          {/* LAMINATE CODES */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-sm">Shelf Laminate</Label>
              <LaminateCombobox
                value={shelfLaminate || ""}
                onChange={(v) => onChange("shelfLaminate", v)}
                externalCodes={safeLaminateCodes}
                placeholder="Select laminate"
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Shelf Inner Laminate</Label>
              <LaminateCombobox
                value={shelfInnerLaminate || ""}
                onChange={(v) => onChange("shelfInnerLaminate", v)}
                externalCodes={safeLaminateCodes}
                placeholder="Select inner laminate"
                className="h-9"
              />
            </div>
          </div>

          {/* TOGGLES */}
          <div className="flex gap-6 pt-2">
            <GrainToggle
              value={shelfGrain}
              onChange={(v: boolean) => onChange("shelfGrain", v)}
            />
            <GaddiToggle
              value={shelfGaddi}
              onChange={(v: boolean) => onChange("shelfGaddi", v)}
            />
          </div>
        </>
      )}
    </div>
  );
}
