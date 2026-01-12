import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import { Upload, Trash2, DoorOpen, Box, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DEFAULT_UNIT_TYPES, UnitType, useVisualQuotationStore } from "../../store/visualQuotationStore";
import { cn } from "@/lib/utils";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// Labels for default unit types
const UNIT_TYPE_LABELS: Record<string, string> = {
  wardrobe: "Wardrobe",
  kitchen: "Kitchen",
  tv_unit: "TV Unit",
  dresser: "Dresser",
  study_table: "Study Table",
  shoe_rack: "Shoe Rack",
  book_shelf: "Book Shelf",
  crockery_unit: "Crockery Unit",
  pooja_unit: "Pooja Unit",
  vanity: "Vanity",
  bar_unit: "Bar Unit",
  display_unit: "Display Unit",
  other: "Other",
};

// Format unit type for display (capitalize, replace underscores)
function formatUnitTypeLabel(value: string): string {
  if (UNIT_TYPE_LABELS[value]) return UNIT_TYPE_LABELS[value];
  return value.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const FLOOR_OPTIONS = [
  { value: "ground", label: "Ground" },
  { value: "first", label: "1st Floor" },
  { value: "second", label: "2nd Floor" },
  { value: "third", label: "3rd Floor" },
  { value: "fourth", label: "4th Floor" },
  { value: "fifth", label: "5th Floor" },
  { value: "basement", label: "Basement" },
  { value: "terrace", label: "Terrace" },
];

const ROOM_OPTIONS = [
  { value: "master_bedroom", label: "Master Bedroom" },
  { value: "bedroom", label: "Bedroom" },
  { value: "kids_room", label: "Kids Room" },
  { value: "guest_room", label: "Guest Room" },
  { value: "kitchen", label: "Kitchen" },
  { value: "living_room", label: "Living Room" },
  { value: "dining", label: "Dining" },
  { value: "study", label: "Study" },
  { value: "pooja", label: "Pooja Room" },
  { value: "utility", label: "Utility" },
  { value: "balcony", label: "Balcony" },
  { value: "other", label: "Other" },
];

// Helper to generate room name from room + floor
function generateRoomName(roomValue: string, floorValue: string): string {
  const roomLabel = ROOM_OPTIONS.find(r => r.value === roomValue)?.label || "Room";
  const floorLabel = FLOOR_OPTIONS.find(f => f.value === floorValue)?.label || "";
  return floorLabel && floorLabel !== "Ground" ? `${roomLabel} (${floorLabel})` : roomLabel;
}

const RoomInputCompact: React.FC = () => {
  const {
    roomPhoto,
    wardrobeBox,
    unitType,
    customUnitTypes,
    drawnUnits,
    setRoomPhoto,
    clearRoomPhoto,
    clearWardrobeBox,
    setDrawMode,
    setUnitType,
    addCustomUnitType,
    status,
    editMode,
    setEditMode,
    // Multi-room quotation
    quotationRooms,
    activeRoomIndex,
    addQuotationRoom,
    setActiveRoomIndex,
    saveCurrentRoomState,
    updateQuotationRoom,
  } = useVisualQuotationStore();

  const [floor, setFloor] = useState("ground");
  const [room, setRoom] = useState("master_bedroom");
  const [newUnitType, setNewUnitType] = useState("");
  const [showAddUnit, setShowAddUnit] = useState(false);
  const locked = status === "APPROVED";
  const uploadRef = useRef<HTMLInputElement>(null);

  // All unit types: defaults + custom
  const allUnitTypes = [
    ...DEFAULT_UNIT_TYPES.map(v => ({ value: v, label: formatUnitTypeLabel(v) })),
    ...customUnitTypes.map(v => ({ value: v, label: formatUnitTypeLabel(v) })),
  ];

  // Handle adding new custom unit type
  const handleAddNewUnitType = () => {
    if (!newUnitType.trim()) return;
    const normalized = newUnitType.trim().toLowerCase().replace(/\s+/g, "_");
    addCustomUnitType(normalized);
    setUnitType(normalized);
    setNewUnitType("");
    setShowAddUnit(false);
  };

  // When room/floor changes, create new room or switch to existing
  const handleRoomChange = (newRoom: string) => {
    if (locked) return;
    setRoom(newRoom);

    const newName = generateRoomName(newRoom, floor);

    // Check if a room with this name already exists
    const existingIndex = quotationRooms.findIndex(r => r.name === newName);

    if (existingIndex >= 0) {
      // Switch to existing room
      setActiveRoomIndex(existingIndex);
    } else {
      // Save current work if we have any content on canvas
      if (quotationRooms.length > 0) {
        saveCurrentRoomState();
      } else if (roomPhoto || wardrobeBox || drawnUnits.length > 0) {
        // First room - save current canvas state as initial room
        const currentName = generateRoomName(room, floor);
        addQuotationRoom(unitType, currentName);
      }
      // Add new room with fresh canvas
      addQuotationRoom(unitType, newName);
    }
  };

  const handleFloorChange = (newFloor: string) => {
    if (locked) return;
    setFloor(newFloor);

    const newName = generateRoomName(room, newFloor);

    // Check if a room with this name already exists
    const existingIndex = quotationRooms.findIndex(r => r.name === newName);

    if (existingIndex >= 0) {
      // Switch to existing room
      setActiveRoomIndex(existingIndex);
    } else {
      // Save current work if we have any content on canvas
      if (quotationRooms.length > 0) {
        saveCurrentRoomState();
      } else if (roomPhoto || wardrobeBox || drawnUnits.length > 0) {
        // First room - save current canvas state as initial room
        const currentName = generateRoomName(room, floor);
        addQuotationRoom(unitType, currentName);
      }
      // Add new room with fresh canvas
      addQuotationRoom(unitType, newName);
    }
  };

  // When active room changes, try to parse room/floor from the name
  useEffect(() => {
    if (quotationRooms.length > 0 && activeRoomIndex >= 0) {
      const currentRoom = quotationRooms[activeRoomIndex];
      if (currentRoom) {
        // Try to match room name to our options
        const roomMatch = ROOM_OPTIONS.find(r =>
          currentRoom.name.toLowerCase().includes(r.label.toLowerCase())
        );
        if (roomMatch) {
          setRoom(roomMatch.value);
        }
        // Try to match floor
        const floorMatch = FLOOR_OPTIONS.find(f =>
          currentRoom.name.toLowerCase().includes(f.label.toLowerCase())
        );
        if (floorMatch) {
          setFloor(floorMatch.value);
        } else {
          setFloor("ground");
        }
      }
    }
  }, [activeRoomIndex, quotationRooms]);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    if (locked) return;
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/") || file.size > MAX_IMAGE_BYTES) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => setRoomPhoto(reader.result as string, img.naturalWidth, img.naturalHeight);
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex-1 p-2 rounded-xl border border-slate-600/50 bg-gradient-to-b from-slate-700/80 to-slate-800/80 backdrop-blur-sm space-y-1.5 shadow-lg shadow-black/10">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Room
        </span>
        {roomPhoto && (
          <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-slate-600/50 text-slate-300 border-0">
            {roomPhoto.width}x{roomPhoto.height}
          </Badge>
        )}
      </div>

      {/* Room & Floor */}
      <div className="grid grid-cols-2 gap-1.5">
        <div>
          <label className="text-[8px] text-slate-400 uppercase tracking-wide">Room</label>
          <Select value={room} onValueChange={handleRoomChange} disabled={locked}>
            <SelectTrigger className="h-8 w-full text-[11px] bg-slate-800/60 border-slate-600/50 text-white hover:bg-slate-700/60 focus:ring-1 focus:ring-blue-500/30 transition-all">
              <SelectValue placeholder="Select Room" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {ROOM_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value} className="text-xs text-slate-200 focus:bg-slate-700 focus:text-white">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[8px] text-slate-400 uppercase tracking-wide">Floor</label>
          <Select value={floor} onValueChange={handleFloorChange} disabled={locked}>
            <SelectTrigger className="h-8 w-full text-[11px] bg-slate-800/60 border-slate-600/50 text-white hover:bg-slate-700/60 focus:ring-1 focus:ring-blue-500/30 transition-all">
              <SelectValue placeholder="Floor" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              {FLOOR_OPTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value} className="text-xs text-slate-200 focus:bg-slate-700 focus:text-white">
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Unit Type + Photo in single row */}
      <div className="flex gap-1.5 items-end">
        <div className="flex-1">
          <label className="text-[8px] text-slate-400 uppercase tracking-wide">Unit Type</label>
          {showAddUnit ? (
            <div className="flex gap-1">
              <Input
                type="text"
                value={newUnitType}
                onChange={(e) => setNewUnitType(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddNewUnitType();
                  } else if (e.key === "Escape") {
                    setShowAddUnit(false);
                    setNewUnitType("");
                  }
                }}
                placeholder="Type name, Enter to save"
                className="h-8 text-[11px] flex-1 bg-slate-800/60 border-slate-600/50 text-white placeholder:text-slate-500"
                autoFocus
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-slate-400 hover:text-white hover:bg-slate-600/50"
                onClick={() => {
                  setShowAddUnit(false);
                  setNewUnitType("");
                }}
              >
                ×
              </Button>
            </div>
          ) : (
            <div className="flex gap-1">
              <Select
                value={unitType}
                onValueChange={(v) => {
                  // Simply change unit type - independent of room selection
                  setUnitType(v as UnitType);
                }}
                disabled={locked}
              >
                <SelectTrigger className="h-8 flex-1 text-[11px] bg-slate-800/60 border-slate-600/50 text-white hover:bg-slate-700/60 focus:ring-1 focus:ring-blue-500/30 transition-all">
                  <SelectValue>{formatUnitTypeLabel(unitType)}</SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {allUnitTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs text-slate-200 focus:bg-slate-700 focus:text-white">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                onClick={() => setShowAddUnit(true)}
                disabled={locked}
                title="Add custom unit type"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-[10px] px-2.5 bg-slate-700/50 border-slate-600/50 text-slate-300 hover:bg-slate-600/50 hover:text-white hover:border-slate-500/50 transition-all"
          onClick={() => uploadRef.current?.click()}
          disabled={locked}
        >
          <Upload className="h-3 w-3 mr-1" />
          Photo
        </Button>
        {roomPhoto && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
            onClick={clearRoomPhoto}
            disabled={locked}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {/* Shutter / Carcass Tabs */}
      <div className="flex gap-0.5 p-0.5 bg-slate-900/50 rounded-lg">
        <button
          onClick={() => {
            setEditMode("shutter");
            if (!locked) {
              setDrawMode(true);
            }
          }}
          disabled={locked}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 h-7 text-[10px] font-medium rounded-md transition-all duration-200",
            locked
              ? "opacity-50 cursor-not-allowed text-slate-500"
              : editMode === "shutter"
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
          )}
        >
          <DoorOpen className="h-3 w-3" />
          Shutter
        </button>
        <button
          onClick={() => {
            setEditMode("carcass");
            if (!locked) {
              setDrawMode(true);
            }
          }}
          disabled={locked}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 h-7 text-[10px] font-medium rounded-md transition-all duration-200",
            locked
              ? "opacity-50 cursor-not-allowed text-slate-500"
              : editMode === "carcass"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
          )}
        >
          <Box className="h-3 w-3" />
          Carcass
        </button>
      </div>

    </div>
  );
};

export default RoomInputCompact;
