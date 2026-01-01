import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

/**
 * CabinetTypeSelectorPanel
 *
 * Reusable cabinet type and shutter configuration selector.
 *
 * Props:
 *  - cabinetType: current cabinet type
 *  - shutterEnabled: whether shutters are enabled
 *  - shutterCount: number of shutters
 *  - shutterType: type of shutter
 *  - onChange(field, value): callback for value changes
 */

interface CabinetTypeSelectorPanelProps {
  cabinetType: string;
  shutterEnabled: boolean;
  shutterCount: number;
  shutterType: string;
  onChange: (field: string, value: any) => void;
}

export default function CabinetTypeSelectorPanel({
  cabinetType,
  shutterEnabled,
  shutterCount,
  shutterType,
  onChange,
}: CabinetTypeSelectorPanelProps) {
  return (
    <div className="border rounded-md p-4 bg-gray-50 space-y-4">

      {/* CABINET TYPE */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">Cabinet Type</Label>
        <Select
          value={cabinetType}
          onValueChange={(v) => onChange("type", v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select cabinet type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single">Single</SelectItem>
            <SelectItem value="double">Double</SelectItem>
            <SelectItem value="lshape">L-Shape</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* SHUTTER ENABLE */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Enable Shutters</Label>
        <Switch
          checked={shutterEnabled}
          onCheckedChange={(c) => onChange("shuttersEnabled", c)}
        />
      </div>

      {shutterEnabled && (
        <>
          {/* SHUTTER COUNT */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Shutter Count</Label>
            <Input
              type="number"
              className="h-9"
              min={1}
              max={10}
              value={shutterCount}
              onChange={(e) =>
                onChange("shutterCount", parseInt(e.target.value) || 1)
              }
            />
          </div>

          {/* SHUTTER TYPE */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Shutter Type</Label>
            <Select
              value={shutterType}
              onValueChange={(v) => onChange("shutterType", v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Standard">Standard</SelectItem>
                <SelectItem value="Profile">Profile</SelectItem>
                <SelectItem value="Glass">Glass</SelectItem>
                <SelectItem value="Custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}
