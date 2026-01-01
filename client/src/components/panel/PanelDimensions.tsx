import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

/**
 * PanelDimensions
 *
 * Reusable 2-field input (Height, Width)
 * Used across:
 * - CabinetForm
 * - ManualPanelDialog
 * - CenterPost
 * - Shelves
 * - Quick shutter mode
 */
export default function PanelDimensions({
  height,
  width,
  onHeightChange,
  onWidthChange,
  heightLabel = "Height (mm)",
  widthLabel = "Width (mm)",
}: any) {

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label className="text-sm">{heightLabel}</Label>
        <Input
          type="number"
          className="h-9"
          value={height}
          onChange={(e) => onHeightChange(parseInt(e.target.value) || 0)}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-sm">{widthLabel}</Label>
        <Input
          type="number"
          className="h-9"
          value={width}
          onChange={(e) => onWidthChange(parseInt(e.target.value) || 0)}
        />
      </div>
    </div>
  );
}
