/**
 * Quotation2DToolbar
 *
 * Canvas toolbar for the 2D quotation page.
 * Shows draw mode controls, shutter settings, unit navigation.
 */

import React, { useMemo } from "react";
import {
  Camera,
  Plus,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  IndianRupee,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DrawnUnit } from "../../types";
import { getQuickRatePreview } from "../../services";
import type { RateMode } from "../../types/pricing";
import { useNavigate } from "react-router-dom";
import { RATE_CARD_IDS } from "../../constants";
import { LibraryQuickPicker } from "../../components/LibraryQuickPicker";

type DrawModeType = "shutter" | "shutter_loft" | "loft_only" | "iso_kitchen";

// Map DrawModeType to RateMode
const DRAW_MODE_TO_RATE_MODE: Record<DrawModeType, RateMode> = {
  shutter: "SHUTTER",
  shutter_loft: "SHUTTER_LOFT",
  loft_only: "LOFT_ONLY",
  iso_kitchen: "SHUTTER", // Kitchen uses same rate mode as shutter for now
};

interface Quotation2DToolbarProps {
  drawMode: boolean;
  drawModeType: DrawModeType;
  setDrawModeType: (type: DrawModeType) => void;
  setDrawMode: (enabled: boolean) => void;
  locked: boolean;
  activeDrawnUnit: DrawnUnit | undefined;
  shutterCount: number;
  setShutterCount: (count: number) => void;
  currentSections: number;
  setSectionCount: (count: number) => void;
  loftEnabled: boolean;
  setLoftEnabled: (enabled: boolean) => void;
  loftShutterCount: number;
  setLoftShutterCount: (count: number) => void;
  updateActiveDrawnUnit: (updates: Partial<DrawnUnit>) => void;
  setActiveEditPart: (part: "shutter" | "loft") => void;
  drawnUnits: DrawnUnit[];
  activeUnitIndex: number;
  setActiveUnitIndex: (index: number) => void;
  isFullscreen: boolean;
  setIsFullscreen: (fullscreen: boolean) => void;
  onAddLibraryUnit?: (unit: DrawnUnit) => void;
}

export function Quotation2DToolbar({
  drawMode,
  drawModeType,
  setDrawModeType,
  setDrawMode,
  locked,
  activeDrawnUnit,
  shutterCount,
  setShutterCount,
  currentSections,
  setSectionCount,
  loftEnabled,
  setLoftEnabled,
  loftShutterCount,
  setLoftShutterCount,
  updateActiveDrawnUnit,
  setActiveEditPart,
  drawnUnits,
  activeUnitIndex,
  setActiveUnitIndex,
  isFullscreen,
  setIsFullscreen,
  onAddLibraryUnit,
}: Quotation2DToolbarProps) {
  const navigate = useNavigate();

  // Get quick rate preview based on current draw mode
  const ratePreview = useMemo(() => {
    const rateMode = DRAW_MODE_TO_RATE_MODE[drawModeType];
    return getQuickRatePreview(rateMode);
  }, [drawModeType]);

  // Get current rate card ID
  const currentRateCardId = RATE_CARD_IDS[drawModeType];

  return (
    <div className="flex-shrink-0 h-9 bg-slate-800 border-b border-slate-700 px-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Camera className="h-3.5 w-3.5 text-blue-400" />
        <span className="text-xs font-medium text-white">
          {drawMode
            ? `Drawing ${drawModeType === "loft_only"
              ? "Loft Only"
              : drawModeType === "shutter_loft"
                ? "Shutter + Loft"
                : "Shutter"
            }`
            : "Photo Canvas"}
        </span>

        {/* Draw Mode Controls */}
        <div className="flex items-center gap-1.5 ml-2">
          <Select
            value={drawModeType}
            onValueChange={(v) => {
              setDrawModeType(v as DrawModeType);
              if (!locked) {
                setDrawMode(true);
              }
            }}
            disabled={locked}
          >
            <SelectTrigger
              className={cn(
                "h-6 w-[110px] text-[10px] border text-white",
                drawMode
                  ? "bg-blue-600 border-blue-500"
                  : "bg-slate-700 border-slate-600"
              )}
            >
              <Plus className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="shutter" className="text-xs">
                <div className="flex items-center justify-between w-full gap-2">
                  <span>Shutter</span>
                  <span
                    className="text-[9px] font-mono text-blue-500 hover:text-blue-400 hover:underline cursor-pointer"
                    onPointerDownCapture={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      navigate(`/rate-cards?highlight=${RATE_CARD_IDS.shutter}`);
                    }}
                  >
                    {RATE_CARD_IDS.shutter}
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="shutter_loft" className="text-xs">
                <div className="flex items-center justify-between w-full gap-2">
                  <span>Shutter + Loft</span>
                  <span
                    className="text-[9px] font-mono text-blue-500 hover:text-blue-400 hover:underline cursor-pointer"
                    onPointerDownCapture={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      navigate(`/rate-cards?highlight=${RATE_CARD_IDS.shutter_loft}`);
                    }}
                  >
                    {RATE_CARD_IDS.shutter_loft}
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="loft_only" className="text-xs">
                <div className="flex items-center justify-between w-full gap-2">
                  <span>Loft Only</span>
                  <span
                    className="text-[9px] font-mono text-blue-500 hover:text-blue-400 hover:underline cursor-pointer"
                    onPointerDownCapture={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      navigate(`/rate-cards?highlight=${RATE_CARD_IDS.loft_only}`);
                    }}
                  >
                    {RATE_CARD_IDS.loft_only}
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="iso_kitchen" className="text-xs">
                <div className="flex items-center justify-between w-full gap-2">
                  <span>Iso Kitchen</span>
                  <span
                    className="text-[9px] font-mono text-purple-500 hover:text-purple-400 hover:underline cursor-pointer"
                    onPointerDownCapture={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      navigate(`/rate-cards?highlight=${RATE_CARD_IDS.iso_kitchen}`);
                    }}
                  >
                    {RATE_CARD_IDS.iso_kitchen}
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Quick Rate Preview - Clickable to open Rate Card page */}
          <button
            type="button"
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium cursor-pointer",
              "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
              "hover:bg-emerald-500/30 hover:border-emerald-400/50 transition-colors"
            )}
            onClick={() => navigate("/rate-cards")}
            title={`Click to edit ${currentRateCardId} Rate Card`}
          >
            <IndianRupee className="h-2.5 w-2.5" />
            <span>{ratePreview.summaryText.replace("₹", "")}</span>
            <ExternalLink className="h-2.5 w-2.5 ml-0.5 opacity-60" />
          </button>

          {drawMode && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-slate-400 hover:text-white"
              onClick={() => setDrawMode(false)}
            >
              Cancel
            </Button>
          )}

          {/* Library Quick Picker */}
          {onAddLibraryUnit && (
            <LibraryQuickPicker
              onSelectModule={onAddLibraryUnit}
              disabled={locked}
            />
          )}
        </div>

        {/* Shutter Controls - Show when drawMode is active */}
        {drawMode && (
          <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-600/50">
            <span className="text-slate-300 text-[10px] font-semibold">Shut</span>
            <Input
              type="number"
              min={1}
              value={activeDrawnUnit?.shutterCount || shutterCount}
              onChange={(e) => {
                const val = Math.max(1, Number(e.target.value));
                if (activeDrawnUnit) {
                  updateActiveDrawnUnit({ shutterCount: val });
                } else {
                  setShutterCount(val);
                }
              }}
              disabled={locked}
              className="h-6 text-[10px] font-medium px-1.5 w-10 bg-slate-800/60 border-slate-600/50 text-white"
            />
            <span className="text-slate-300 text-[10px] font-semibold">Row</span>
            <Input
              type="number"
              min={1}
              value={currentSections}
              onChange={(e) => {
                const newCount = Math.max(1, Number(e.target.value));
                if (activeDrawnUnit) {
                  const boxHeight = activeDrawnUnit.box.height;
                  const boxY = activeDrawnUnit.box.y;
                  const newDividerYs =
                    newCount > 1
                      ? Array.from(
                        { length: newCount - 1 },
                        (_, i) => boxY + (boxHeight / newCount) * (i + 1)
                      )
                      : [];
                  updateActiveDrawnUnit({
                    sectionCount: newCount,
                    horizontalDividerYs: newDividerYs,
                  });
                } else {
                  setSectionCount(newCount);
                }
              }}
              disabled={locked}
              className="h-6 text-[10px] font-medium px-1.5 w-10 bg-slate-800/60 border-slate-600/50 text-white"
            />
            <span className="text-slate-300 text-[10px] font-semibold">Loft</span>
            <Switch
              checked={activeDrawnUnit?.loftEnabled ?? loftEnabled}
              onCheckedChange={(c) => {
                if (activeDrawnUnit) {
                  updateActiveDrawnUnit({ loftEnabled: c });
                  setActiveEditPart(c ? "loft" : "shutter");
                } else {
                  setLoftEnabled(c);
                }
              }}
              disabled={locked}
              className="scale-[0.7] data-[state=checked]:bg-amber-500"
            />
            {(activeDrawnUnit?.loftEnabled || (!activeDrawnUnit && loftEnabled)) && (
              <Input
                type="number"
                min={1}
                value={activeDrawnUnit?.loftShutterCount || loftShutterCount}
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value));
                  if (activeDrawnUnit) {
                    updateActiveDrawnUnit({ loftShutterCount: val });
                  } else {
                    setLoftShutterCount(val);
                  }
                }}
                disabled={locked}
                className="h-6 w-10 text-[10px] font-medium px-1.5 bg-slate-800/60 border-amber-500/30 text-white"
              />
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Unit Navigation */}
        {drawnUnits.length > 0 && (
          <div className="flex items-center bg-slate-700/40 rounded p-0.5 mr-2">
            <button
              className="h-5 w-5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 rounded disabled:opacity-30"
              disabled={activeUnitIndex === 0}
              onClick={() => setActiveUnitIndex(activeUnitIndex - 1)}
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <div className="flex items-center px-1.5 text-[9px] min-w-[50px] justify-center">
              <span className="font-semibold text-white">{activeUnitIndex + 1}</span>
              <span className="text-slate-500">/{drawnUnits.length}</span>
            </div>
            <button
              className="h-5 w-5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 rounded disabled:opacity-30"
              disabled={activeUnitIndex >= drawnUnits.length - 1}
              onClick={() => setActiveUnitIndex(activeUnitIndex + 1)}
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}

        <button
          className={cn(
            "h-6 w-6 flex items-center justify-center rounded",
            isFullscreen
              ? "text-amber-400 hover:bg-amber-500/10"
              : "text-slate-400 hover:text-white hover:bg-slate-700"
          )}
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
