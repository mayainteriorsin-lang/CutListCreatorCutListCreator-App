import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import LaminateSelectorPanel from "@/components/selectors/LaminateSelectorPanel";
import PanelDimensions from "@/components/panel/PanelDimensions";

/**
 * CenterPostConfigPanel
 *
 * Reusable UI panel for managing center post configuration.
 *
 * Props:
 *  - centerPostEnabled
 *  - centerPostQuantity
 *  - centerPostHeight
 *  - centerPostDepth
 *  - centerPostLaminateCode
 *  - laminateCodes
 *  - onChange(field, value)
 */
export default function CenterPostConfigPanel({
  centerPostEnabled,
  centerPostQuantity,
  centerPostHeight,
  centerPostDepth,
  centerPostLaminateCode,
  laminateCodes,
  onChange,
}: any) {

  return (
    <div className="space-y-4 border rounded-md p-4 bg-gray-50">

      {/* Enable Toggle */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Enable Center Post</Label>
        <Switch
          checked={centerPostEnabled}
          onCheckedChange={(v) => onChange("centerPostEnabled", v)}
        />
      </div>

      {centerPostEnabled && (
        <div className="space-y-4">

          {/* Quantity */}
          <div className="space-y-1">
            <Label className="text-sm">Quantity</Label>
            <Input
              type="number"
              className="h-9"
              value={centerPostQuantity}
              min={1}
              max={10}
              onChange={(e) =>
                onChange("centerPostQuantity", parseInt(e.target.value) || 1)
              }
            />
          </div>

          {/* Dimensions */}
          <PanelDimensions
            height={centerPostHeight}
            width={centerPostDepth}
            heightLabel="Center Post Height (mm)"
            widthLabel="Center Post Depth (mm)"
            onHeightChange={(v) => onChange("centerPostHeight", v)}
            onWidthChange={(v) => onChange("centerPostDepth", v)}
          />

          {/* Laminate */}
          <LaminateSelectorPanel
            value={centerPostLaminateCode}
            laminateCodes={laminateCodes}
            label="Center Post Laminate"
            onChange={(v) => onChange("centerPostLaminateCode", v)}
          />
        </div>
      )}
    </div>
  );
}
