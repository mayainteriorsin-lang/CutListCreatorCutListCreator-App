import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

/**
 * NamePanel
 *
 * Reusable UI block for:
 *  - Client Name
 *  - Room Name
 *  - Cabinet Name
 *
 * Props:
 *  - clientName
 *  - roomName
 *  - cabinetName
 *  - onChange(field, value)
 */
export default function NamePanel({
  clientName,
  roomName,
  cabinetName,
  onChange,
}: any) {

  return (
    <div className="space-y-4 border rounded-md p-4 bg-gray-50">

      {/* Client Name */}
      <div className="space-y-1">
        <Label className="text-sm">Client Name</Label>
        <Input
          className="h-9"
          value={clientName}
          onChange={(e) => onChange("clientName", e.target.value)}
          placeholder="Enter client name"
        />
      </div>

      {/* Room Name */}
      <div className="space-y-1">
        <Label className="text-sm">Room Name</Label>
        <Input
          className="h-9"
          value={roomName}
          onChange={(e) => onChange("roomName", e.target.value)}
          placeholder="e.g., Bedroom, Hall, Kitchen"
        />
      </div>

      {/* Cabinet Name */}
      <div className="space-y-1">
        <Label className="text-sm">Cabinet Name</Label>
        <Input
          className="h-9"
          value={cabinetName}
          onChange={(e) => onChange("cabinetName", e.target.value)}
          placeholder="e.g., Wardrobe Left Unit"
        />
      </div>

    </div>
  );
}
