import React, { useMemo, useState } from "react";
import { AlertTriangle, Plus, X, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVisualQuotationStore, ObstructionType } from "../../store/visualQuotationStore";

const TYPE_OPTIONS: { type: ObstructionType; label: string }[] = [
  { type: "BEAM", label: "Beam Drop" },
  { type: "SKIRTING", label: "Skirting" },
  { type: "WINDOW", label: "Window" },
  { type: "SWITCHBOARD", label: "Switchboard" },
  { type: "DOOR_SWING", label: "Door Swing" },
  { type: "PLINTH", label: "Plinth" },
  { type: "OTHER", label: "Other" },
];

const ObstructionPanel: React.FC = () => {
  const { room, addObstruction, removeObstruction, clearObstructions, status } = useVisualQuotationStore();

  const locked = status === "APPROVED";

  const [type, setType] = useState<ObstructionType>("BEAM");
  const [label, setLabel] = useState<string>("Beam Drop");
  const [x, setX] = useState<number>(80);
  const [y, setY] = useState<number>(80);
  const [w, setW] = useState<number>(160);
  const [h, setH] = useState<number>(60);

  const canAdd = useMemo(() => w > 0 && h > 0, [w, h]);

  const onAdd = () => {
    addObstruction({
      type,
      label,
      rect: { x, y, w, h },
    });
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-slate-700">Site Conditions</span>
          </div>
          {room.obstructions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearObstructions}
              disabled={locked}
              className="h-7 text-xs text-slate-500"
            >
              Clear All
            </Button>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Mark beams, windows, switchboards, door swing areas, etc.
        </p>

        {/* Form */}
        <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] text-slate-500 uppercase tracking-wide">Type</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  const t = v as ObstructionType;
                  setType(t);
                  const found = TYPE_OPTIONS.find((o) => o.type === t);
                  setLabel(found?.label || "Other");
                }}
                disabled={locked}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.type} value={o.type}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] text-slate-500 uppercase tracking-wide">Label</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={locked}
                className="h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500">X (px)</Label>
              <Input
                type="number"
                value={x}
                onChange={(e) => setX(Number(e.target.value))}
                disabled={locked}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500">Y (px)</Label>
              <Input
                type="number"
                value={y}
                onChange={(e) => setY(Number(e.target.value))}
                disabled={locked}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500">W (px)</Label>
              <Input
                type="number"
                value={w}
                onChange={(e) => setW(Number(e.target.value))}
                disabled={locked}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-slate-500">H (px)</Label>
              <Input
                type="number"
                value={h}
                onChange={(e) => setH(Number(e.target.value))}
                disabled={locked}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <Button
            size="sm"
            onClick={onAdd}
            disabled={locked || !canAdd}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Constraint
          </Button>
        </div>

        {/* Obstructions List */}
        {room.obstructions.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-2">
            No constraints added yet.
          </p>
        ) : (
          <div className="space-y-2">
            {room.obstructions.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between p-2 rounded-lg border border-slate-200 bg-white"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">{o.label}</span>
                    <Badge variant="outline" className="text-[9px]">{o.type}</Badge>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    x:{o.rect.x} y:{o.rect.y} w:{o.rect.w} h:{o.rect.h}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeObstruction(o.id)}
                  disabled={locked}
                  className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Locked Warning */}
        {locked && (
          <Alert className="bg-amber-50 border-amber-200">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-xs text-amber-800">
              Approved quotes cannot be edited.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ObstructionPanel;
