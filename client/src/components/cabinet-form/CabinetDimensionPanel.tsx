import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

/**
 * CabinetDimensionPanel
 *
 * Props:
 *  - height
 *  - width
 *  - depth
 *  - widthReduction
 *  - onChange(field, value)
 */
export default function CabinetDimensionPanel({
  height,
  width,
  depth,
  widthReduction,
  onChange,
}: any) {
  return (
    <div className="border rounded-md p-4 bg-gray-50 space-y-4">

      {/* HEIGHT */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">Height (mm)</Label>
        <Input
          type="number"
          className="h-9"
          value={height}
          min={0}
          onChange={(e) => onChange("height", parseInt(e.target.value) || 0)}
        />
      </div>

      {/* WIDTH */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">Width (mm)</Label>
        <Input
          type="number"
          className="h-9"
          value={width}
          min={0}
          onChange={(e) => onChange("width", parseInt(e.target.value) || 0)}
        />
      </div>

      {/* DEPTH */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">Depth (mm)</Label>
        <Input
          type="number"
          className="h-9"
          value={depth}
          min={0}
          onChange={(e) => onChange("depth", parseInt(e.target.value) || 0)}
        />
      </div>

      {/* WIDTH REDUCTION */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">
          Width Reduction (mm)
        </Label>
        <Input
          type="number"
          className="h-9"
          value={widthReduction}
          min={0}
          onChange={(e) =>
            onChange("widthReduction", parseInt(e.target.value) || 0)
          }
        />
      </div>
    </div>
  );
}
