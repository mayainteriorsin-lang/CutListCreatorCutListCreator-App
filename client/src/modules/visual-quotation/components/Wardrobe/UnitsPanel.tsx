import React, { useState } from "react";
import { Plus, Trash2, Lock, Box, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useDesignCanvasStore } from "../../store/v2/useDesignCanvasStore";
import { useQuotationMetaStore } from "../../store/v2/useQuotationMetaStore";
import { DEFAULT_WARDROBE_CONFIG, WardrobeConfig, WardrobeAddOn, WallId } from "../../types";
import { WardrobeConfigModal } from "./WardrobeConfigModal";

const UnitsPanel: React.FC = () => {
  const {
    room,
    drawnUnits,
    addUnit,
    deleteDrawnUnit,
    updateDrawnUnitById,
    setAddOnDrawMode,
    setEditMode,
    setDrawMode,
    setCanvas3DViewEnabled
  } = useDesignCanvasStore();

  const { status } = useQuotationMetaStore();
  const locked = status === "APPROVED";

  // Filter units for current wall
  // Ensure we have a valid selectedWallId. If not, maybe show all or none.
  // The original component assumes selectedWallId is always set.
  const units = drawnUnits.filter(u => u.wallId === room.selectedWallId);

  // Modal state for wardrobe config
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);

  const handleOpenConfig = (unitId: string) => {
    setActiveUnitId(unitId);
    setConfigModalOpen(true);
  };

  const handleSaveConfig = (config: WardrobeConfig) => {
    if (activeUnitId) {
      updateDrawnUnitById(activeUnitId, { wardrobeConfig: config });
    }
  };

  const handleAddUnit = () => {
    const newUnitId = `unit-${Date.now()}`;
    addUnit({
      id: newUnitId,
      unitType: 'wardrobe', // Default
      wallId: room.selectedWallId as WallId,
      box: { x: 100, y: 100, width: 200, height: 200, rotation: 0, source: 'manual' }, // Placeholder box
      shutterCount: 2,
      shutterDividerXs: [],
      loftEnabled: false,
      loftHeightRatio: 0.2, // Default
      loftShutterCount: 2,
      loftDividerXs: [],
      loftDividerYs: [],
      horizontalDividerYs: [],
      widthMm: 900,
      heightMm: 2100,
      depthMm: 600,
      loftWidthMm: 900,
      loftHeightMm: 600,
      sectionCount: 1,
      shelfCount: 4,
      drawnAddOns: [],
      finish: {
        shutterLaminateCode: '',
        loftLaminateCode: '',
        innerLaminateCode: ''
      },
      wardrobeConfig: DEFAULT_WARDROBE_CONFIG
    });
  };

  const handleDrawAddOn = (addOnType: WardrobeAddOn) => {
    // Disable floor plan and 3D view to show 2D canvas for drawing
    setCanvas3DViewEnabled(false);
    // Trigger draw mode for this add-on type
    setAddOnDrawMode(addOnType);
  };

  const handleDrawUnit = (mode: "shutter" | "carcass") => {
    // Use existing edit mode for shutter/carcass drawing
    setEditMode(mode);
    // Disable floor plan and 3D view to show 2D canvas for drawing
    setCanvas3DViewEnabled(false);
    setDrawMode(true);
  };

  const activeUnit = drawnUnits.find((u) => u.id === activeUnitId);
  const activeConfig = activeUnit?.wardrobeConfig || DEFAULT_WARDROBE_CONFIG;

  // Helper to get wardrobe type label
  const getWardrobeTypeLabel = (config: WardrobeConfig | undefined) => {
    if (!config) return "Shutter";
    const labels: Record<string, string> = {
      shutter: "Shutter",
      sliding: "Sliding",
      open: "Open",
    };
    return labels[config.wardrobeType] || "Shutter";
  };

  return (
    <>
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
              onClick={handleAddUnit}
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
              {units.map((u, idx) => {
                const globalIndex = drawnUnits.findIndex(du => du.id === u.id);
                return (
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
                          <Badge variant="secondary" className="text-[10px]">
                            {getWardrobeTypeLabel(u.wardrobeConfig)}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {u.widthMm} x {u.heightMm} x {u.depthMm} mm
                          {u.loftEnabled && ` + Loft ${u.loftHeightMm}mm`}
                        </p>
                        {u.wardrobeConfig && u.wardrobeConfig.addOns.length > 0 && (
                          <p className="text-[10px] text-blue-600 mt-0.5">
                            Add-ons: {u.wardrobeConfig.addOns.length}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenConfig(u.id)}
                          disabled={locked}
                          className="h-8 w-8 p-0 text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (globalIndex !== -1) deleteDrawnUnit(globalIndex);
                          }}
                          disabled={locked}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Dimensions */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-500">Width</Label>
                        <Input
                          type="number"
                          value={u.widthMm}
                          onChange={(e) => updateDrawnUnitById(u.id, { widthMm: Number(e.target.value) })}
                          disabled={locked}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-500">Height</Label>
                        <Input
                          type="number"
                          value={u.heightMm}
                          onChange={(e) => updateDrawnUnitById(u.id, { heightMm: Number(e.target.value) })}
                          disabled={locked}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-500">Depth</Label>
                        <Input
                          type="number"
                          value={u.depthMm}
                          onChange={(e) => updateDrawnUnitById(u.id, { depthMm: Number(e.target.value) })}
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
                          onChange={(e) => updateDrawnUnitById(u.id, { sectionCount: Math.max(1, Number(e.target.value)) })}
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
                          onCheckedChange={(checked) => updateDrawnUnitById(u.id, { loftEnabled: checked })}
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
                            onChange={(e) => updateDrawnUnitById(u.id, { loftHeightMm: Number(e.target.value) })}
                            disabled={locked}
                            className="h-7 w-20 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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

      {/* Wardrobe Config Modal */}
      <WardrobeConfigModal
        open={configModalOpen}
        onOpenChange={setConfigModalOpen}
        config={activeConfig}
        onSave={handleSaveConfig}
        onDrawAddOn={handleDrawAddOn}
        onDrawUnit={handleDrawUnit}
      />
    </>
  );
};

export default UnitsPanel;
