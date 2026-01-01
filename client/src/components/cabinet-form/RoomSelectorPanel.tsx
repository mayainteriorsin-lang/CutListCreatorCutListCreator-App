import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

/**
 * RoomSelectorPanel
 *
 * Reusable room selection UI with quick-select buttons.
 *
 * Props:
 *  - roomName: current room name
 *  - existingRooms: array of previously used room names
 *  - onChange(field, value): callback for value changes
 */

interface RoomSelectorPanelProps {
  roomName: string;
  existingRooms: string[];
  onChange: (field: string, value: string) => void;
}

export default function RoomSelectorPanel({
  roomName,
  existingRooms,
  onChange,
}: RoomSelectorPanelProps) {
  return (
    <div className="border rounded-md p-4 bg-gray-50 space-y-4">

      {/* ROOM NAME */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">Room Name</Label>
        <Input
          placeholder="e.g., Bedroom, Kitchen, Hall"
          className="h-9"
          value={roomName || ""}
          onChange={(e) => onChange("roomName", e.target.value)}
        />
      </div>

      {/* EXISTING ROOMS LIST */}
      {existingRooms?.length > 0 && (
        <div className="space-y-1 text-sm">
          <Label className="font-medium">Previously Used Rooms:</Label>
          <div className="flex flex-wrap gap-2">
            {existingRooms.map((r: string, i: number) => (
              <button
                key={i}
                type="button"
                onClick={() => onChange("roomName", r)}
                className="px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-xs font-medium"
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
