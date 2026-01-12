import React, { ChangeEvent, useRef, useState } from "react";
import {
  Upload,
  Camera,
  Trash2,
  PenTool,
  Home,
  Sofa,
  Tv,
  ChefHat,
  Box,
  Info,
  Lock,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UnitType, useVisualQuotationStore } from "../../store/visualQuotationStore";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

const UNIT_TYPE_OPTIONS: { value: UnitType; label: string; icon: React.ReactNode }[] = [
  { value: "wardrobe", label: "Wardrobe", icon: <Box className="h-4 w-4" /> },
  { value: "kitchen", label: "Kitchen", icon: <ChefHat className="h-4 w-4" /> },
  { value: "tv_unit", label: "TV Unit", icon: <Tv className="h-4 w-4" /> },
  { value: "dresser", label: "Dresser", icon: <Sofa className="h-4 w-4" /> },
  { value: "other", label: "Other", icon: <Home className="h-4 w-4" /> },
];

const ROOM_TYPE_OPTIONS = [
  "Bedroom - Wardrobe",
  "Kitchen",
  "Living Room",
  "Office",
  "Other",
];

const RoomInputPanel: React.FC = () => {
  const {
    room,
    roomPhoto,
    wardrobeBox,
    shutterCount,
    loftEnabled,
    loftShutterCount,
    scale,
    roomType,
    unitType,
    setRoomInputType,
    setRoomPhoto,
    clearRoomPhoto,
    clearWardrobeBox,
    setDrawMode,
    setShutterCount,
    setLoftEnabled,
    setLoftShutterCount,
    wardrobeSpec,
    setDepthMm,
    computeAreas,
    setRoomType,
    setUnitType,
    setManualRoom,
    status,
  } = useVisualQuotationStore();

  const locked = status === "APPROVED";
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const unitLabel = UNIT_TYPE_OPTIONS.find((u) => u.value === unitType)?.label || "Unit";

  const handleFileSelection = (e: ChangeEvent<HTMLInputElement>) => {
    if (locked) return;
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image size must be under 10MB.");
      return;
    }

    setError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setRoomPhoto(reader.result as string, img.naturalWidth, img.naturalHeight);
      };
      img.onerror = () => setError("Could not load the selected image.");
      img.src = reader.result as string;
    };
    reader.onerror = () => setError("Could not read the selected file.");
    reader.readAsDataURL(file);
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-4 space-y-4">
        {/* Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={room.inputType === "PHOTO" ? "default" : "outline"}
            size="sm"
            onClick={() => setRoomInputType("PHOTO")}
            disabled={locked}
            className="flex-1"
          >
            <Camera className="h-4 w-4 mr-2" />
            Photo
          </Button>
          <Button
            variant={room.inputType === "MANUAL" ? "default" : "outline"}
            size="sm"
            onClick={() => setRoomInputType("MANUAL")}
            disabled={locked}
            className="flex-1"
          >
            <PenTool className="h-4 w-4 mr-2" />
            Manual
          </Button>
        </div>

        {/* PHOTO MODE */}
        {room.inputType === "PHOTO" && (
          <div className="space-y-4">
            {/* Unit Type Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-600">Unit Type</Label>
                <Select
                  value={unitType}
                  onValueChange={(v) => setUnitType(v as UnitType)}
                  disabled={locked}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          {opt.icon}
                          {opt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-slate-600">Room Type</Label>
                <Select
                  value={roomType}
                  onValueChange={setRoomType}
                  disabled={locked}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600">Room Photo</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => uploadInputRef.current?.click()}
                  disabled={locked}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={locked}
                  className="flex-1"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Camera
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    clearRoomPhoto();
                    setError(null);
                  }}
                  disabled={locked || !roomPhoto}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelection}
              disabled={locked}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelection}
              disabled={locked}
            />

            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            {roomPhoto && (
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-200">
                <div className="h-8 w-8 rounded bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-green-800 truncate">
                    Photo loaded
                  </p>
                  <p className="text-xs text-green-600">
                    {roomPhoto.width} x {roomPhoto.height} px
                  </p>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px]">
                  Ready
                </Badge>
              </div>
            )}

            {/* Draw Area Button */}
            <div className="flex gap-2">
              <Button
                onClick={() => setDrawMode(true)}
                disabled={locked || !roomPhoto || Boolean(wardrobeBox)}
                className="flex-1"
                size="sm"
              >
                <PenTool className="h-4 w-4 mr-2" />
                Draw {unitLabel} Area
              </Button>
              {wardrobeBox && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => clearWardrobeBox()}
                  disabled={locked}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Wardrobe-specific options */}
            {unitType === "wardrobe" && (
              <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-slate-600">Shutters</Label>
                  <Input
                    type="number"
                    min={1}
                    value={shutterCount}
                    onChange={(e) => setShutterCount(Number(e.target.value) || 1)}
                    disabled={locked || !wardrobeBox}
                    className="w-20 h-8 text-center"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-slate-600">Loft</Label>
                  <Switch
                    checked={loftEnabled}
                    onCheckedChange={setLoftEnabled}
                    disabled={locked || !wardrobeBox}
                  />
                </div>

                {loftEnabled && (
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-slate-600">Loft Shutters</Label>
                    <Input
                      type="number"
                      min={1}
                      value={loftShutterCount}
                      onChange={(e) => setLoftShutterCount(Number(e.target.value) || 1)}
                      disabled={locked || !wardrobeBox}
                      className="w-20 h-8 text-center"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Wardrobe Specification */}
            {wardrobeBox && scale && unitType === "wardrobe" && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-800">Wardrobe Specification</span>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-blue-700">Depth (mm)</Label>
                  <Input
                    type="number"
                    min={300}
                    max={900}
                    defaultValue={wardrobeSpec?.depthMm ?? 600}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setDepthMm(val);
                      computeAreas();
                    }}
                    disabled={locked}
                    className="h-9 bg-white"
                    data-testid="input-wardrobe-depth"
                  />
                </div>

                {wardrobeSpec && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-white rounded border border-blue-100">
                      <p className="text-[10px] text-blue-600 uppercase tracking-wide">Carcass</p>
                      <p className="text-sm font-bold text-blue-900">{wardrobeSpec.carcassAreaSqft} sqft</p>
                    </div>
                    <div className="p-2 bg-white rounded border border-blue-100">
                      <p className="text-[10px] text-blue-600 uppercase tracking-wide">Shutter</p>
                      <p className="text-sm font-bold text-blue-900">{wardrobeSpec.shutterAreaSqft} sqft</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MANUAL MODE */}
        {room.inputType === "MANUAL" && (
          <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600">Length (mm)</Label>
              <Input
                type="number"
                disabled={locked}
                placeholder="e.g., 3000"
                className="h-9"
                onChange={(e) =>
                  setManualRoom({
                    lengthMm: Number(e.target.value),
                    widthMm: room.manualRoom?.widthMm || 0,
                    heightMm: room.manualRoom?.heightMm || 0,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600">Width (mm)</Label>
              <Input
                type="number"
                disabled={locked}
                placeholder="e.g., 2400"
                className="h-9"
                onChange={(e) =>
                  setManualRoom({
                    lengthMm: room.manualRoom?.lengthMm || 0,
                    widthMm: Number(e.target.value),
                    heightMm: room.manualRoom?.heightMm || 0,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-slate-600">Height (mm)</Label>
              <Input
                type="number"
                disabled={locked}
                placeholder="e.g., 2700"
                className="h-9"
                onChange={(e) =>
                  setManualRoom({
                    lengthMm: room.manualRoom?.lengthMm || 0,
                    widthMm: room.manualRoom?.widthMm || 0,
                    heightMm: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
        )}

        {/* Locked Warning */}
        {locked && (
          <Alert className="bg-amber-50 border-amber-200">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-xs text-amber-800">
              Approved quotes cannot be edited. Duplicate to make changes.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default RoomInputPanel;
