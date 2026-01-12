import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// PATCH 18 + 21: Strict prop typing with validation errors
export interface CabinetDimensionPanelProps {
  height?: number;
  width?: number;
  depth?: number;
  widthReduction?: number;
  onChange: (field: "height" | "width" | "depth" | "widthReduction", value: number) => void;
  // PATCH 21: Form validation errors from Zod
  errors?: {
    height?: string;
    width?: string;
    depth?: string;
    widthReduction?: string;
  };
}

// PATCH 21: Inline error message component
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-600 mt-1">{message}</p>;
}

export default function CabinetDimensionPanel({
  height,
  width,
  depth,
  widthReduction,
  onChange,
  errors = {},
}: CabinetDimensionPanelProps) {
  return (
    <div className="border rounded-md p-4 bg-gray-50 space-y-4">

      {/* HEIGHT */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">Height (mm)</Label>
        <Input
          type="number"
          className={`h-9 ${errors.height ? "border-red-500" : ""}`}
          value={height}
          min={0}
          onChange={(e) => onChange("height", parseInt(e.target.value) || 0)}
        />
        <FieldError message={errors.height} />
      </div>

      {/* WIDTH */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">Width (mm)</Label>
        <Input
          type="number"
          className={`h-9 ${errors.width ? "border-red-500" : ""}`}
          value={width}
          min={0}
          onChange={(e) => onChange("width", parseInt(e.target.value) || 0)}
        />
        <FieldError message={errors.width} />
      </div>

      {/* DEPTH */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">Depth (mm)</Label>
        <Input
          type="number"
          className={`h-9 ${errors.depth ? "border-red-500" : ""}`}
          value={depth}
          min={0}
          onChange={(e) => onChange("depth", parseInt(e.target.value) || 0)}
        />
        <FieldError message={errors.depth} />
      </div>

      {/* WIDTH REDUCTION */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">
          Width Reduction (mm)
        </Label>
        <Input
          type="number"
          className={`h-9 ${errors.widthReduction ? "border-red-500" : ""}`}
          value={widthReduction}
          min={0}
          onChange={(e) =>
            onChange("widthReduction", parseInt(e.target.value) || 0)
          }
        />
        <FieldError message={errors.widthReduction} />
      </div>
    </div>
  );
}
