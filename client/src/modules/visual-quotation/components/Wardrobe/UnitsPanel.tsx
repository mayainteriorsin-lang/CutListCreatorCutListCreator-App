import React from "react";
import { Plus, Trash2, Lock, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useVisualQuotationStore } from "../../store/visualQuotationStore";

const UnitsPanel: React.FC = () => {
  const { room, units, addWardrobeUnit, removeWardrobeUnit, updateWardrobeUnit, status } =
    useVisualQuotationStore();

  const locked = status === "APPROVED";

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Wardrobes</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Wall: <Badge variant="secondary" className="ml-1 text-[10px]">{room.selectedWallId}</Badge>
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => addWardrobeUnit({ wallId: room.selectedWallId })}
            disabled={locked}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Unit
          </Button>
        </div>

        {/* Empty State */}
        {units.length === 0 && (
          <div className="py-8 text-center">
            <div className="h-12 w-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-3">
              <Box className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-600 font-medium">No units yet</p>
            <p className="text-xs text-slate-400 mt-1">Click "Add Unit" to create a wardrobe</p>
          </div>
        )}

        {/* Units List */}
        {units.length > 0 && (
          <div className="space-y-3">
            {units.map((u, idx) => (
              <div
                key={u.id}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3"
              >
                {/* Unit Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800">Unit {idx + 1}</span>
                      <Badge variant="outline" className="text-[10px]">{u.wallId}</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {u.widthMm} x {u.heightMm} x {u.depthMm} mm
                      {u.loftEnabled && ` + Loft ${u.loftHeightMm}mm`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeWardrobeUnit(u.id)}
                    disabled={locked}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Dimensions */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500">Width</Label>
                    <Input
                      type="number"
                      value={u.widthMm}
                      onChange={(e) => updateWardrobeUnit(u.id, { widthMm: Number(e.target.value) })}
                      disabled={locked}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500">Height</Label>
                    <Input
                      type="number"
                      value={u.heightMm}
                      onChange={(e) => updateWardrobeUnit(u.id, { heightMm: Number(e.target.value) })}
                      disabled={locked}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500">Depth</Label>
                    <Input
                      type="number"
                      value={u.depthMm}
                      onChange={(e) => updateWardrobeUnit(u.id, { depthMm: Number(e.target.value) })}
                      disabled={locked}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-slate-500">Sections</Label>
                    <Input
                      type="number"
                      min={1}
                      value={u.sectionCount}
                      onChange={(e) => updateWardrobeUnit(u.id, { sectionCount: Math.max(1, Number(e.target.value)) })}
                      disabled={locked}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Loft Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={u.loftEnabled}
                      onCheckedChange={(checked) => updateWardrobeUnit(u.id, { loftEnabled: checked })}
                      disabled={locked}
                    />
                    <Label className="text-xs text-slate-600">Loft</Label>
                  </div>
                  {u.loftEnabled && (
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] text-slate-500">Height</Label>
                      <Input
                        type="number"
                        value={u.loftHeightMm}
                        onChange={(e) => updateWardrobeUnit(u.id, { loftHeightMm: Number(e.target.value) })}
                        disabled={locked}
                        className="h-7 w-20 text-xs"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
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

export default UnitsPanel;
