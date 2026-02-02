import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import { Upload, Trash2, DoorOpen, Box, Plus, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DEFAULT_UNIT_TYPES, UnitType } from "../../types";
import { useDesignCanvasStore } from "../../store/v2/useDesignCanvasStore";
import { useQuotationMetaStore } from "../../store/v2/useQuotationMetaStore";
import { useRoomStore } from "../../store/v2/useRoomStore";
import { cn } from "@/lib/utils";
import { FloorPlanToolbar } from "../../features/floor-plan-3d";
import { FLOOR_OPTIONS, ROOM_OPTIONS, formatUnitTypeLabel, generateRoomName } from "../../constants";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const RoomInputCompact: React.FC = () => {
  // V2 Stores
  const { status } = useQuotationMetaStore();
  const { quotationRooms, activeRoomIndex, addRoom, setActiveRoomIndex } = useRoomStore();
  const {
    roomPhoto,
    wardrobeBox,
    unitType,
    customUnitTypes,
    drawnUnits,
    setRoomPhoto,
    clearRoomPhoto,
    setDrawMode,
    setUnitType,
    addCustomUnitType,
    editMode,
    setEditMode,
  } = useDesignCanvasStore();

  const [floor, setFloor] = useState("ground");
  const [room, setRoom] = useState("master_bedroom");
  const [newUnitType, setNewUnitType] = useState("");
  const [showAddUnit, setShowAddUnit] = useState(false);
  const locked = status === "APPROVED";
  const uploadRef = useRef<HTMLInputElement>(null);

  const allUnitTypes = [
    ...DEFAULT_UNIT_TYPES.map(v => ({ value: v, label: formatUnitTypeLabel(v) })),
    ...customUnitTypes.map(v => ({ value: v, label: formatUnitTypeLabel(v) })),
  ];

  const handleAddNewUnitType = () => {
    if (!newUnitType.trim()) return;
    const normalized = newUnitType.trim().toLowerCase().replace(/\s+/g, "_");
    addCustomUnitType(normalized);
    setUnitType(normalized);
    setNewUnitType("");
    setShowAddUnit(false);
  };

  const handleUnitTypeChange = (v: string) => {
    setUnitType(v as UnitType);
  };

  const handleRoomChange = (newRoom: string) => {
    if (locked) return;
    setRoom(newRoom);
    const newName = generateRoomName(newRoom, floor);
    const existingIndex = quotationRooms.findIndex(r => r.name === newName);

    if (existingIndex >= 0) {
      setActiveRoomIndex(existingIndex);
    } else {
      if (quotationRooms.length > 0) {
        saveCurrentRoomState();
      } else if (roomPhoto || wardrobeBox || drawnUnits.length > 0) {
        const currentName = generateRoomName(room, floor);
        addQuotationRoom(unitType, currentName);
      }
      addQuotationRoom(unitType, newName);
    }
  };

  const handleFloorChange = (newFloor: string) => {
    if (locked) return;
    setFloor(newFloor);
    const newName = generateRoomName(room, newFloor);
    const existingIndex = quotationRooms.findIndex(r => r.name === newName);

    if (existingIndex >= 0) {
      setActiveRoomIndex(existingIndex);
    } else {
      if (quotationRooms.length > 0) {
        saveCurrentRoomState();
      } else if (roomPhoto || wardrobeBox || drawnUnits.length > 0) {
        const currentName = generateRoomName(room, floor);
        addQuotationRoom(unitType, currentName);
      }
      addQuotationRoom(unitType, newName);
    }
  };

  useEffect(() => {
    if (quotationRooms.length > 0 && activeRoomIndex >= 0) {
      const currentRoom = quotationRooms[activeRoomIndex];
      if (currentRoom) {
        const roomMatch = ROOM_OPTIONS.find(r =>
          currentRoom.name.toLowerCase().includes(r.label.toLowerCase())
        );
        if (roomMatch) setRoom(roomMatch.value);
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
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Home className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-semibold text-slate-800">Room Setup</span>
      </div>

      {/* Room & Floor */}
      <div className="grid grid-cols-2 gap-2">
        <Select value={room} onValueChange={handleRoomChange} disabled={locked}>
          <SelectTrigger className="h-9 text-sm bg-white border-slate-200">
            <SelectValue placeholder="Room" />
          </SelectTrigger>
          <SelectContent>
            {ROOM_OPTIONS.map((r) => (
              <SelectItem key={r.value} value={r.value} className="text-sm">
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={floor} onValueChange={handleFloorChange} disabled={locked}>
          <SelectTrigger className="h-9 text-sm bg-white border-slate-200">
            <SelectValue placeholder="Floor" />
          </SelectTrigger>
          <SelectContent>
            {FLOOR_OPTIONS.map((f) => (
              <SelectItem key={f.value} value={f.value} className="text-sm">
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Unit Type */}
      <div className="flex gap-2">
        {showAddUnit ? (
          <div className="flex gap-2 flex-1">
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
              className="h-9 text-sm flex-1"
              autoFocus
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => { setShowAddUnit(false); setNewUnitType(""); }}
            >
              ×
            </Button>
          </div>
        ) : (
          <>
            <Select value={unitType} onValueChange={handleUnitTypeChange} disabled={locked}>
              <SelectTrigger className="h-9 flex-1 text-sm bg-white border-slate-200">
                <SelectValue>{formatUnitTypeLabel(unitType)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {allUnitTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-sm">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => setShowAddUnit(true)}
              disabled={locked}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3"
              onClick={() => uploadRef.current?.click()}
              disabled={locked}
            >
              <Upload className="h-4 w-4" />
            </Button>
            {roomPhoto && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 w-9 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                onClick={clearRoomPhoto}
                disabled={locked}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </div>

      <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      <FloorPlanToolbar onPhotoUploadClick={() => uploadRef.current?.click()} />

      {/* Draw Mode Toggle */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
        <button
          onClick={() => {
            setEditMode("shutter");
            if (!locked) {
              setFloorPlanEnabled(false);
              setCanvas3DViewEnabled(false);
              setDrawMode(true);
            }
          }}
          disabled={locked}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 h-8 text-xs font-medium rounded-md transition-all",
            locked ? "opacity-50 cursor-not-allowed" :
              editMode === "shutter" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <DoorOpen className="h-3.5 w-3.5" />
          Shutter
        </button>
        <button
          onClick={() => {
            setEditMode("carcass");
            if (!locked) {
              setFloorPlanEnabled(false);
              setCanvas3DViewEnabled(false);
              setDrawMode(true);
            }
          }}
          disabled={locked}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 h-8 text-xs font-medium rounded-md transition-all",
            locked ? "opacity-50 cursor-not-allowed" :
              editMode === "carcass" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Box className="h-3.5 w-3.5" />
          Carcass
        </button>
      </div>
    </div>
  );
};

export default RoomInputCompact;
