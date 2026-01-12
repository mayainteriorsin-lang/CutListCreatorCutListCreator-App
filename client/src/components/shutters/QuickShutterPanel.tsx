import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import LaminateSelectorPanel from "@/components/selectors/LaminateSelectorPanel";
import GrainToggle from "@/components/panel/GrainToggle";
import GaddiToggle from "@/components/panel/GaddiToggle";

// PATCH 18: Strict prop typing
export interface QuickShutterPanelProps {
  quickModeEnabled?: boolean;
  quickShutterCount?: number;
  quickWidthReduction?: number;
  quickLaminateCode?: string;
  quickInnerLaminateCode?: string;
  quickGrainDirection?: boolean;
  quickGaddi?: boolean;
  laminateCodes?: string[];
  onChange: (field: string, value: string | number | boolean) => void;
  onGenerate: () => void;
}

export default function QuickShutterPanel({
  quickModeEnabled,
  quickShutterCount,
  quickWidthReduction,
  quickLaminateCode,
  quickInnerLaminateCode,
  quickGrainDirection,
  quickGaddi,
  laminateCodes,
  onChange,
  onGenerate,
}: QuickShutterPanelProps) {

  return (
    <div className="space-y-4 border rounded-md p-4 bg-blue-50">

      {/* Toggle */}
      <div className="flex items-center justify-between">
        <Label className="font-medium text-sm">Enable Quick Shutter Mode</Label>
        <Switch
          checked={quickModeEnabled}
          onCheckedChange={(v) => onChange("quickModeEnabled", v)}
        />
      </div>

      {quickModeEnabled && (
        <div className="space-y-4">

          {/* Shutter Count */}
          <div className="space-y-1">
            <Label className="text-sm">Shutter Count</Label>
            <Input
              type="number"
              className="h-9"
              min={1}
              max={6}
              value={quickShutterCount}
              onChange={(e) =>
                onChange("quickShutterCount", parseInt(e.target.value) || 1)
              }
            />
          </div>

          {/* Width Reduction */}
          <div className="space-y-1">
            <Label className="text-sm">Width Reduction (mm)</Label>
            <Input
              type="number"
              className="h-9"
              value={quickWidthReduction}
              onChange={(e) =>
                onChange("quickWidthReduction", parseInt(e.target.value) || 0)
              }
            />
          </div>

          {/* Generate Button */}
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white h-9 w-full"
            onClick={onGenerate}
          >
            Auto Generate Shutter Sizes
          </Button>

          {/* Laminate */}
          <LaminateSelectorPanel
            value={quickLaminateCode || ""}
            onChange={(v: string) => onChange("quickLaminateCode", v)}
            label="Quick Shutter Laminate"
          />

          {/* Inner Laminate */}
          <LaminateSelectorPanel
            value={quickInnerLaminateCode || ""}
            onChange={(v: string) => onChange("quickInnerLaminateCode", v)}
            label="Quick Shutter Inner Laminate"
          />

          {/* Grain & Gaddi */}
          <div className="flex items-center gap-6 pt-2">
            <GrainToggle
              value={quickGrainDirection}
              onChange={(v) => onChange("quickGrainDirection", v)}
            />
            <GaddiToggle
              value={quickGaddi}
              onChange={(v) => onChange("quickGaddi", v)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
