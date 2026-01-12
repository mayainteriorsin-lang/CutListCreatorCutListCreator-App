import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { LaminateSelectorPanel } from "@/components/selectors";

// PATCH 18: Strict prop typing
export interface ShelfConfigPanelProps {
  shelvesEnabled?: boolean;
  shelvesQuantity?: number;
  shelvesLaminateCode?: string;
  laminateCodes?: string[];
  onChange: (field: string, value: string | number | boolean) => void;
}

export default function ShelfConfigPanel({
  shelvesEnabled,
  shelvesQuantity,
  shelvesLaminateCode,
  laminateCodes,
  onChange,
}: ShelfConfigPanelProps) {

  return (
    <div className="space-y-4 border rounded-md p-4 bg-gray-50">

      {/* Enable Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Enable Shelves</Label>
        <Switch
          checked={shelvesEnabled}
          onCheckedChange={(v) => onChange("shelvesEnabled", v)}
        />
      </div>

      {shelvesEnabled && (
        <div className="space-y-4">

          {/* Quantity */}
          <div className="space-y-1">
            <Label className="text-sm">Shelf Quantity</Label>
            <Input
              type="number"
              min={1}
              max={20}
              className="h-9"
              value={shelvesQuantity}
              onChange={(e) =>
                onChange("shelvesQuantity", parseInt(e.target.value) || 1)
              }
            />
          </div>

          {/* Laminate Code */}
          <LaminateSelectorPanel
            value={shelvesLaminateCode || ""}
            onChange={(v: string) => onChange("shelvesLaminateCode", v)}
            label="Shelf Laminate Code"
          />
        </div>
      )}
    </div>
  );
}
