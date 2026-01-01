import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import GrainToggle from "@/components/panel/GrainToggle";
import GaddiToggle from "@/components/panel/GaddiToggle";

/**
 * ShelfConfigPanel
 *
 * Reusable shelf configuration UI.
 *
 * Props:
 *  - shelfCount: number
 *  - shelfLaminate: string
 *  - shelfInnerLaminate: string
 *  - shelfGrain: boolean
 *  - shelfGaddi: boolean
 *  - laminateCodes: array of laminate options
 *  - onChange(field, value): callback for value changes
 */

interface ShelfConfigPanelProps {
  shelfCount: number;
  shelfLaminate: string;
  shelfInnerLaminate: string;
  shelfGrain: boolean;
  shelfGaddi: boolean;
  laminateCodes: Array<{ id: string; code: string }>;
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
              <Select
                value={shelfLaminate}
                onValueChange={(v) => onChange("shelfLaminate", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select laminate" />
                </SelectTrigger>
                <SelectContent>
                  {laminateCodes.map((l) => (
                    <SelectItem key={l.id} value={l.code}>
                      {l.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Shelf Inner Laminate</Label>
              <Select
                value={shelfInnerLaminate}
                onValueChange={(v) => onChange("shelfInnerLaminate", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select inner laminate" />
                </SelectTrigger>
                <SelectContent>
                  {laminateCodes.map((l) => (
                    <SelectItem key={l.id} value={l.code}>
                      {l.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
