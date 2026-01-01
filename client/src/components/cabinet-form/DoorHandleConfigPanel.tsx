import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

/**
 * DoorHandleConfigPanel
 *
 * Props:
 *  - handleType
 *  - handlePosition
 *  - handleSize
 *  - handleOffset
 *  - onChange(field, value)
 */
export default function DoorHandleConfigPanel({
  handleType,
  handlePosition,
  handleSize,
  handleOffset,
  onChange,
}: any) {
  return (
    <div className="border rounded-md p-4 bg-gray-50 space-y-4">

      {/* TYPE */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">Handle Type</Label>
        <Select value={handleType} onValueChange={(v) => onChange("handleType", v)}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select handle type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="knob">Knob</SelectItem>
            <SelectItem value="profile">Profile</SelectItem>
            <SelectItem value="groove">G-Groove</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* POSITION */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">Position</Label>
        <Select value={handlePosition} onValueChange={(v) => onChange("handlePosition", v)}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Left</SelectItem>
            <SelectItem value="right">Right</SelectItem>
            <SelectItem value="center">Center</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* SIZE + OFFSET */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-sm font-medium">Handle Size (mm)</Label>
          <Input
            type="number"
            value={handleSize}
            className="h-9"
            onChange={(e) => onChange("handleSize", parseInt(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-1">
          <Label className="text-sm font-medium">Offset (mm)</Label>
          <Input
            type="number"
            value={handleOffset}
            className="h-9"
            onChange={(e) => onChange("handleOffset", parseInt(e.target.value) || 0)}
          />
        </div>
      </div>

    </div>
  );
}
