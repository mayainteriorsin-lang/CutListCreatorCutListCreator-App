import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// PATCH 18: Strict prop typing
export interface PanelDimensionsProps {
  height?: number;
  width?: number;
  onHeightChange: (value: number) => void;
  onWidthChange: (value: number) => void;
  heightLabel?: string;
  widthLabel?: string;
}

export default function PanelDimensions({
  height,
  width,
  onHeightChange,
  onWidthChange,
  heightLabel = "Height (mm)",
  widthLabel = "Width (mm)",
}: PanelDimensionsProps) {

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
