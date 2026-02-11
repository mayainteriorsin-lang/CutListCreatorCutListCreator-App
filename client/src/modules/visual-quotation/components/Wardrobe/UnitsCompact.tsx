import React, { useState, useEffect } from "react";
import { Trash2, LayoutGrid, Ruler, Move3D, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useDesignCanvasStore } from "../../store/v2/useDesignCanvasStore";
import { useQuotationMetaStore } from "../../store/v2/useQuotationMetaStore";
import { DEFAULT_WARDROBE_CONFIG } from "../../types";
import UnitConfigPanel from "./UnitConfigPanel";
import { cn } from "@/lib/utils";
import { UNIT_TYPE_LABELS } from "../../constants";

const mmToInches = (mm: number): number => Math.round(mm / 25.4);
const inchesToMm = (inches: number): number => Math.round(inches * 25.4);

const formatDisplay = (inches: number): string => {
  if (inches === 0) return "";
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;
  if (feet === 0) return `${remainingInches}"`;
  if (remainingInches === 0) return `${feet}'`;
  return `${feet}'${remainingInches}"`;
};

const UnitsCompact: React.FC = () => {
  const { status } = useQuotationMetaStore();
  const {
    shutterCount,
    setShutterCount,
    loftEnabled,
    setLoftEnabled,
    loftShutterCount,
    setLoftShutterCount,
    wardrobeBox,
    drawnUnits,
    activeUnitIndex,
    unitType,
    deleteDrawnUnit,
    updateActiveDrawnUnit,
    clearWardrobeBox,
    editMode,
    setActiveEditPart,
    activeEditPart,
  } = useDesignCanvasStore();

  const locked = status === "APPROVED";
  const activeDrawnUnit = drawnUnits[activeUnitIndex];
  const isEditingNewUnit = wardrobeBox && drawnUnits.length === activeUnitIndex;
  const hasUnit = activeDrawnUnit || isEditingNewUnit;
  const isLoftOnly = activeDrawnUnit?.loftOnly || false;

  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const activeConfig = activeDrawnUnit?.wardrobeConfig || DEFAULT_WARDROBE_CONFIG;

  const currentWidthMm = activeDrawnUnit?.widthMm ?? 0;
  const currentHeightMm = activeDrawnUnit?.heightMm ?? 0;
  const currentDepthMm = activeDrawnUnit?.depthMm ?? 0;
  const currentLoftWidthMm = activeDrawnUnit?.loftWidthMm ?? 0;
  const currentLoftHeightMm = activeDrawnUnit?.loftHeightMm ?? 0;
  const currentSections = activeDrawnUnit?.sectionCount || 1;
  const currentUnitType = activeDrawnUnit?.unitType || unitType;

  const [widthStr, setWidthStr] = useState("");
  const [heightStr, setHeightStr] = useState("");
  const [depthStr, setDepthStr] = useState("");
  const [isWidthFocused, setIsWidthFocused] = useState(false);
  const [isHeightFocused, setIsHeightFocused] = useState(false);
  const [isDepthFocused, setIsDepthFocused] = useState(false);

  const [loftWidthStr, setLoftWidthStr] = useState("");
  const [loftHeightStr, setLoftHeightStr] = useState("");
  const [isLoftWidthFocused, setIsLoftWidthFocused] = useState(false);
  const [isLoftHeightFocused, setIsLoftHeightFocused] = useState(false);

  useEffect(() => {
    const width = currentWidthMm > 0 ? formatDisplay(mmToInches(currentWidthMm)) : "";
    if (width !== widthStr) setWidthStr(width);

    const height = currentHeightMm > 0 ? formatDisplay(mmToInches(currentHeightMm)) : "";
    if (height !== heightStr) setHeightStr(height);

    const depth = currentDepthMm > 0 ? formatDisplay(mmToInches(currentDepthMm)) : "";
    if (depth !== depthStr) setDepthStr(depth);

    const loftWidth = currentLoftWidthMm > 0 ? formatDisplay(mmToInches(currentLoftWidthMm)) : "";
    if (loftWidth !== loftWidthStr) setLoftWidthStr(loftWidth);
    setLoftHeightStr(currentLoftHeightMm > 0 ? formatDisplay(mmToInches(currentLoftHeightMm)) : "");
  }, [activeUnitIndex]);

  useEffect(() => {
    if (!isWidthFocused) {
      const val = currentWidthMm > 0 ? formatDisplay(mmToInches(currentWidthMm)) : "";
      if (val !== widthStr) setWidthStr(val);
    }
  }, [currentWidthMm, isWidthFocused, widthStr]);

  useEffect(() => {
    if (!isHeightFocused) setHeightStr(currentHeightMm > 0 ? formatDisplay(mmToInches(currentHeightMm)) : "");
  }, [currentHeightMm, isHeightFocused]);

  useEffect(() => {
    if (!isDepthFocused) setDepthStr(currentDepthMm > 0 ? formatDisplay(mmToInches(currentDepthMm)) : "");
  }, [currentDepthMm, isDepthFocused]);

  useEffect(() => {
    if (!isLoftWidthFocused) setLoftWidthStr(currentLoftWidthMm > 0 ? formatDisplay(mmToInches(currentLoftWidthMm)) : "");
  }, [currentLoftWidthMm, isLoftWidthFocused]);

  useEffect(() => {
    if (!isLoftHeightFocused) setLoftHeightStr(currentLoftHeightMm > 0 ? formatDisplay(mmToInches(currentLoftHeightMm)) : "");
  }, [currentLoftHeightMm, isLoftHeightFocused]);

  const onWidthFocus = () => { setIsWidthFocused(true); setWidthStr(mmToInches(currentWidthMm) > 0 ? String(mmToInches(currentWidthMm)) : ""); };
  const onWidthChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    setWidthStr(digits);
    if (activeDrawnUnit) updateActiveDrawnUnit({ widthMm: inchesToMm(digits ? parseInt(digits, 10) : 0) });
  };
  const onWidthBlur = () => { setIsWidthFocused(false); setWidthStr(formatDisplay(mmToInches(currentWidthMm))); };

  const onHeightFocus = () => { setIsHeightFocused(true); setHeightStr(mmToInches(currentHeightMm) > 0 ? String(mmToInches(currentHeightMm)) : ""); };
  const onHeightChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    setHeightStr(digits);
    if (activeDrawnUnit) updateActiveDrawnUnit({ heightMm: inchesToMm(digits ? parseInt(digits, 10) : 0) });
  };
  const onHeightBlur = () => { setIsHeightFocused(false); setHeightStr(formatDisplay(mmToInches(currentHeightMm))); };

  const onDepthFocus = () => { setIsDepthFocused(true); setDepthStr(mmToInches(currentDepthMm) > 0 ? String(mmToInches(currentDepthMm)) : ""); };
  const onDepthChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    setDepthStr(digits);
    if (activeDrawnUnit) updateActiveDrawnUnit({ depthMm: inchesToMm(digits ? parseInt(digits, 10) : 0) });
  };
  const onDepthBlur = () => { setIsDepthFocused(false); setDepthStr(formatDisplay(mmToInches(currentDepthMm))); };

  const onLoftWidthFocus = () => { setIsLoftWidthFocused(true); setLoftWidthStr(mmToInches(currentLoftWidthMm) > 0 ? String(mmToInches(currentLoftWidthMm)) : ""); };
  const onLoftWidthChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    setLoftWidthStr(digits);
    if (activeDrawnUnit) updateActiveDrawnUnit({ loftWidthMm: inchesToMm(digits ? parseInt(digits, 10) : 0) });
  };
  const onLoftWidthBlur = () => { setIsLoftWidthFocused(false); setLoftWidthStr(formatDisplay(mmToInches(currentLoftWidthMm))); };

  const onLoftHeightFocus = () => { setIsLoftHeightFocused(true); setLoftHeightStr(mmToInches(currentLoftHeightMm) > 0 ? String(mmToInches(currentLoftHeightMm)) : ""); };
  const onLoftHeightChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    setLoftHeightStr(digits);
    if (activeDrawnUnit) updateActiveDrawnUnit({ loftHeightMm: inchesToMm(digits ? parseInt(digits, 10) : 0) });
  };
  const onLoftHeightBlur = () => { setIsLoftHeightFocused(false); setLoftHeightStr(formatDisplay(mmToInches(currentLoftHeightMm))); };

  const handleDelete = () => {
    if (activeDrawnUnit) deleteDrawnUnit(activeUnitIndex);
    else if (isEditingNewUnit) clearWardrobeBox();
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-semibold text-slate-800">Dimensions</span>
          {hasUnit && (
            <span className="text-xs text-indigo-600 font-medium">
              {UNIT_TYPE_LABELS[currentUnitType] || currentUnitType}
            </span>
          )}
        </div>
        {isEditingNewUnit && (
          <span className="text-[10px] text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
            Unsaved
          </span>
        )}
      </div>

      {!hasUnit ? (
        <div className="text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <Move3D className="h-8 w-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs text-slate-500">Draw a unit on canvas</p>
        </div>
      ) : (
        <>
          {/* Loft Only Badge */}
          {isLoftOnly && (
            <div className="flex items-center justify-center p-1.5 bg-amber-50 rounded-lg border border-amber-200">
              <span className="text-xs font-semibold text-amber-700">Loft Only Unit</span>
            </div>
          )}

          {/* Shutter Dimensions - Always visible when not loft-only */}
          {!isLoftOnly && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-semibold text-blue-600">Shutter</span>
              </div>
              <div className={cn("grid gap-2", editMode === "carcass" ? "grid-cols-4" : "grid-cols-3")}>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Width</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={widthStr}
                    onFocus={onWidthFocus}
                    onChange={(e) => onWidthChange(e.target.value)}
                    onBlur={onWidthBlur}
                    disabled={locked || isEditingNewUnit}
                    placeholder="10'"
                    className="h-9 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Height</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={heightStr}
                    onFocus={onHeightFocus}
                    onChange={(e) => onHeightChange(e.target.value)}
                    onBlur={onHeightBlur}
                    disabled={locked || isEditingNewUnit}
                    placeholder="8'"
                    className="h-9 text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Shutters</label>
                  <Input
                    type="number"
                    min={1}
                    value={activeDrawnUnit?.shutterCount || shutterCount}
                    onChange={(e) => {
                      const val = Math.max(1, Number(e.target.value));
                      if (activeDrawnUnit) updateActiveDrawnUnit({ shutterCount: val });
                      else setShutterCount(val);
                    }}
                    disabled={locked || (!wardrobeBox && !activeDrawnUnit)}
                    className="h-9 text-sm bg-white"
                  />
                </div>
                {editMode === "carcass" && (
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Depth</label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={depthStr}
                      onFocus={onDepthFocus}
                      onChange={(e) => onDepthChange(e.target.value)}
                      onBlur={onDepthBlur}
                      disabled={locked || isEditingNewUnit}
                      placeholder="2'"
                      className="h-9 text-sm bg-white"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loft Dimensions - Always visible when loft is enabled or loft-only */}
          {(activeDrawnUnit?.loftEnabled || loftEnabled || isLoftOnly) && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-semibold text-amber-600">Loft</span>
                </div>
                {/* Same as Shutter button */}
                {!isLoftOnly && currentWidthMm > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[9px] font-medium gap-1 text-blue-600 hover:bg-blue-50"
                    onClick={() => {
                      if (activeDrawnUnit) {
                        updateActiveDrawnUnit({ loftWidthMm: currentWidthMm });
                        setLoftWidthStr(formatDisplay(mmToInches(currentWidthMm)));
                      }
                    }}
                    disabled={locked || isEditingNewUnit}
                  >
                    <Copy className="h-2.5 w-2.5" />
                    Same Width
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-amber-600/70 mb-1 block">Width</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={loftWidthStr}
                    onFocus={onLoftWidthFocus}
                    onChange={(e) => onLoftWidthChange(e.target.value)}
                    onBlur={onLoftWidthBlur}
                    disabled={locked || isEditingNewUnit}
                    placeholder="10'"
                    className="h-9 text-sm bg-amber-50/50 border-amber-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-amber-600/70 mb-1 block">Height</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={loftHeightStr}
                    onFocus={onLoftHeightFocus}
                    onChange={(e) => onLoftHeightChange(e.target.value)}
                    onBlur={onLoftHeightBlur}
                    disabled={locked || isEditingNewUnit}
                    placeholder="1'6&quot;"
                    className="h-9 text-sm bg-amber-50/50 border-amber-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-amber-600/70 mb-1 block">Shutters</label>
                  <Input
                    type="number"
                    min={1}
                    value={activeDrawnUnit?.loftShutterCount || loftShutterCount}
                    onChange={(e) => {
                      const val = Math.max(1, Number(e.target.value));
                      if (activeDrawnUnit) updateActiveDrawnUnit({ loftShutterCount: val });
                      else setLoftShutterCount(val);
                    }}
                    disabled={locked}
                    className="h-9 text-sm bg-amber-50/50 border-amber-200"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Config Row */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            {/* Rows and Loft toggle - hide for loft-only */}
            {!isLoftOnly && (
              <>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-slate-500">Rows</label>
                  <Input
                    type="number"
                    min={1}
                    value={currentSections}
                    onChange={(e) => {
                      const newCount = Math.max(1, Number(e.target.value));
                      if (activeDrawnUnit) {
                        const boxHeight = activeDrawnUnit.box.height;
                        const boxY = activeDrawnUnit.box.y;
                        const newDividerYs = newCount > 1
                          ? Array.from({ length: newCount - 1 }, (_, i) => boxY + (boxHeight / newCount) * (i + 1))
                          : [];
                        updateActiveDrawnUnit({ sectionCount: newCount, horizontalDividerYs: newDividerYs });
                      }
                    }}
                    disabled={locked || (!wardrobeBox && !activeDrawnUnit)}
                    className="h-7 w-12 text-xs bg-white"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-slate-500">Loft</label>
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
                    disabled={locked || (!wardrobeBox && !activeDrawnUnit)}
                    className="data-[state=checked]:bg-amber-500"
                  />
                </div>
              </>
            )}

            <div className="flex-1" />

            <Button
              variant="outline"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setShowConfigPanel(true)}
              disabled={locked || !hasUnit}
              title="Configure"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
              onClick={handleDelete}
              disabled={locked}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </>
      )}

      <UnitConfigPanel
        open={showConfigPanel}
        onClose={() => setShowConfigPanel(false)}
        config={activeConfig}
        onSave={(newConfig) => {
          if (activeDrawnUnit) updateActiveDrawnUnit({ wardrobeConfig: newConfig });
          setShowConfigPanel(false);
        }}
        unitType={currentUnitType}
      />
    </div>
  );
};

export default UnitsCompact;
