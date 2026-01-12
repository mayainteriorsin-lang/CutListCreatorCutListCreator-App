import React, { useEffect, useMemo, useState } from "react";
import { Ruler, Check, Trash2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useVisualQuotationStore } from "../../store/visualQuotationStore";

const ScaleCalibrationPanel: React.FC = () => {
  const {
    roomPhoto,
    scale,
    scaleLine,
    scaleDrawMode,
    setScaleDrawMode,
    setScaleLine,
    setScale,
    clearScale,
    status,
  } = useVisualQuotationStore();

  const locked = status === "APPROVED";
  const [refMm, setRefMm] = useState<number>(scale?.mm ?? 0);

  useEffect(() => {
    setRefMm(scale?.mm ?? 0);
  }, [scale?.mm]);

  const canDraw = !!roomPhoto && !locked && !scaleDrawMode;
  const canApply = !!scaleLine && refMm > 0 && !locked;
  const ratioPreview = useMemo(() => {
    if (!scaleLine || refMm <= 0) return 0;
    return refMm / scaleLine.lengthPx;
  }, [scaleLine, refMm]);

  const startDraw = () => {
    if (!roomPhoto || locked) return;
    setScaleLine(undefined);
    setScaleDrawMode(true);
  };

  const applyScale = () => {
    if (!scaleLine || refMm <= 0) return;
    setScale(scaleLine.lengthPx, refMm);
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ruler className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Set Scale</span>
          </div>
          <Badge
            variant={scale ? "default" : "secondary"}
            className={scale ? "bg-green-100 text-green-700" : ""}
          >
            {scale ? `${scale.ratio.toFixed(3)} mm/px` : "Not set"}
          </Badge>
        </div>

        <p className="text-xs text-slate-500">
          Draw a reference line on the photo, enter its real length, then apply.
        </p>

        {/* Draw Button & Line Info */}
        <div className="flex gap-2">
          <Button
            variant={scaleDrawMode ? "default" : "outline"}
            size="sm"
            onClick={startDraw}
            disabled={!canDraw}
            className="flex-1"
          >
            <PenLine className="h-4 w-4 mr-2" />
            {scaleDrawMode ? "Drawing..." : "Draw Line"}
          </Button>
          <div className="flex-1 p-2 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Line Length</p>
            <p className="text-sm font-semibold text-slate-800">
              {scaleLine ? `${scaleLine.lengthPx.toFixed(1)} px` : roomPhoto ? "Draw line" : "No photo"}
            </p>
          </div>
        </div>

        {/* Reference Input & Preview */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[10px] text-slate-500 uppercase tracking-wide">
              Real Length (mm)
            </Label>
            <Input
              type="number"
              min={1}
              value={refMm || ""}
              onChange={(e) => setRefMm(Number(e.target.value))}
              disabled={locked}
              placeholder="e.g., 600"
              className="h-9"
            />
          </div>
          <div className="p-2 rounded-lg bg-slate-50 border border-dashed border-slate-200">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">Preview Ratio</p>
            <p className="text-sm font-semibold text-slate-800">
              {ratioPreview > 0 ? `${ratioPreview.toFixed(3)} mm/px` : "-"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={applyScale}
            disabled={!canApply}
            className="flex-1"
          >
            <Check className="h-4 w-4 mr-2" />
            Apply Scale
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => clearScale()}
            disabled={!scale || locked}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Hints */}
        {!roomPhoto && (
          <p className="text-xs text-slate-400 text-center">
            Add a room photo to calibrate scale.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ScaleCalibrationPanel;
