import React, { useState, useEffect } from "react";
import { Trash2, ChevronUp, ChevronDown } from "lucide-react";
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
import { useVisualQuotationStore } from "../../store/visualQuotationStore";

const SQFT_RATE_OPTIONS = [100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600];
const RATE_STEP = 50;

const UNIT_TYPE_LABELS: Record<string, string> = {
  wardrobe: "Wardrobe",
  kitchen: "Kitchen",
  tv_unit: "TV Unit",
  dresser: "Dresser",
  other: "Other",
};

// Simple: mm to total inches
const mmToInches = (mm: number): number => Math.round(mm / 25.4);

// Simple: inches to mm
const inchesToMm = (inches: number): number => Math.round(inches * 25.4);

// Format inches to feet'inches" display
const formatDisplay = (inches: number): string => {
  if (inches === 0) return "";
  const feet = Math.floor(inches / 12);
  const remainingInches = inches % 12;
  if (feet === 0) return `${remainingInches}"`;
  if (remainingInches === 0) return `${feet}'`;
  return `${feet}'${remainingInches}"`;
};

const UnitsCompact: React.FC = () => {
  const {
    status,
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
    sqftRate,
    setSqftRate,
    setActiveEditPart,
    activeEditPart,
  } = useVisualQuotationStore();

  const locked = status === "APPROVED";
  const activeDrawnUnit = drawnUnits[activeUnitIndex];
  const isEditingNewUnit = wardrobeBox && drawnUnits.length === activeUnitIndex;
  const hasUnit = activeDrawnUnit || isEditingNewUnit;

  // Shutter dimensions
  const currentWidthMm = activeDrawnUnit?.widthMm ?? 0;
  const currentHeightMm = activeDrawnUnit?.heightMm ?? 0;
  const currentDepthMm = activeDrawnUnit?.depthMm ?? 0;
  // Loft dimensions (separate from shutter)
  const currentLoftWidthMm = activeDrawnUnit?.loftWidthMm ?? 0;
  const currentLoftHeightMm = activeDrawnUnit?.loftHeightMm ?? 0;
  const currentSections = activeDrawnUnit?.sectionCount || 1;
  const currentUnitType = activeDrawnUnit?.unitType || unitType;

  // Simple state: just store the display string for shutter
  const [widthStr, setWidthStr] = useState("");
  const [heightStr, setHeightStr] = useState("");
  const [depthStr, setDepthStr] = useState("");
  const [isWidthFocused, setIsWidthFocused] = useState(false);
  const [isHeightFocused, setIsHeightFocused] = useState(false);
  const [isDepthFocused, setIsDepthFocused] = useState(false);

  // State for loft dimensions
  const [loftWidthStr, setLoftWidthStr] = useState("");
  const [loftHeightStr, setLoftHeightStr] = useState("");
  const [isLoftWidthFocused, setIsLoftWidthFocused] = useState(false);
  const [isLoftHeightFocused, setIsLoftHeightFocused] = useState(false);

  // Reset fields when active unit changes - new units should start blank
  useEffect(() => {
    setWidthStr(currentWidthMm > 0 ? formatDisplay(mmToInches(currentWidthMm)) : "");
    setHeightStr(currentHeightMm > 0 ? formatDisplay(mmToInches(currentHeightMm)) : "");
    setDepthStr(currentDepthMm > 0 ? formatDisplay(mmToInches(currentDepthMm)) : "");
    setLoftWidthStr(currentLoftWidthMm > 0 ? formatDisplay(mmToInches(currentLoftWidthMm)) : "");
    setLoftHeightStr(currentLoftHeightMm > 0 ? formatDisplay(mmToInches(currentLoftHeightMm)) : "");
  }, [activeUnitIndex]);

  // Sync display when store values change (and not focused)
  useEffect(() => {
    if (!isWidthFocused) {
      setWidthStr(currentWidthMm > 0 ? formatDisplay(mmToInches(currentWidthMm)) : "");
    }
  }, [currentWidthMm, isWidthFocused]);

  useEffect(() => {
    if (!isHeightFocused) {
      setHeightStr(currentHeightMm > 0 ? formatDisplay(mmToInches(currentHeightMm)) : "");
    }
  }, [currentHeightMm, isHeightFocused]);

  useEffect(() => {
    if (!isDepthFocused) {
      setDepthStr(currentDepthMm > 0 ? formatDisplay(mmToInches(currentDepthMm)) : "");
    }
  }, [currentDepthMm, isDepthFocused]);

  // Sync loft display when store values change
  useEffect(() => {
    if (!isLoftWidthFocused) {
      setLoftWidthStr(currentLoftWidthMm > 0 ? formatDisplay(mmToInches(currentLoftWidthMm)) : "");
    }
  }, [currentLoftWidthMm, isLoftWidthFocused]);

  useEffect(() => {
    if (!isLoftHeightFocused) {
      setLoftHeightStr(currentLoftHeightMm > 0 ? formatDisplay(mmToInches(currentLoftHeightMm)) : "");
    }
  }, [currentLoftHeightMm, isLoftHeightFocused]);

  // Width handlers
  const onWidthFocus = () => {
    setIsWidthFocused(true);
    // Show raw inches number when focused
    const inches = mmToInches(currentWidthMm);
    setWidthStr(inches > 0 ? String(inches) : "");
  };

  const onWidthChange = (val: string) => {
    // Only allow digits
    const digits = val.replace(/\D/g, "");
    setWidthStr(digits);
    // Update store
    if (activeDrawnUnit) {
      const inches = digits ? parseInt(digits, 10) : 0;
      updateActiveDrawnUnit({ widthMm: inchesToMm(inches) });
    }
  };

  const onWidthBlur = () => {
    setIsWidthFocused(false);
    // Format to feet'inches"
    setWidthStr(formatDisplay(mmToInches(currentWidthMm)));
  };

  // Height handlers
  const onHeightFocus = () => {
    setIsHeightFocused(true);
    const inches = mmToInches(currentHeightMm);
    setHeightStr(inches > 0 ? String(inches) : "");
  };

  const onHeightChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    setHeightStr(digits);
    if (activeDrawnUnit) {
      const inches = digits ? parseInt(digits, 10) : 0;
      updateActiveDrawnUnit({ heightMm: inchesToMm(inches) });
    }
  };

  const onHeightBlur = () => {
    setIsHeightFocused(false);
    setHeightStr(formatDisplay(mmToInches(currentHeightMm)));
  };

  // Depth handlers
  const onDepthFocus = () => {
    setIsDepthFocused(true);
    const inches = mmToInches(currentDepthMm);
    setDepthStr(inches > 0 ? String(inches) : "");
  };

  const onDepthChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    setDepthStr(digits);
    if (activeDrawnUnit) {
      const inches = digits ? parseInt(digits, 10) : 0;
      updateActiveDrawnUnit({ depthMm: inchesToMm(inches) });
    }
  };

  const onDepthBlur = () => {
    setIsDepthFocused(false);
    setDepthStr(formatDisplay(mmToInches(currentDepthMm)));
  };

  // Loft Width handlers
  const onLoftWidthFocus = () => {
    setIsLoftWidthFocused(true);
    const inches = mmToInches(currentLoftWidthMm);
    setLoftWidthStr(inches > 0 ? String(inches) : "");
  };

  const onLoftWidthChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    setLoftWidthStr(digits);
    if (activeDrawnUnit) {
      const inches = digits ? parseInt(digits, 10) : 0;
      updateActiveDrawnUnit({ loftWidthMm: inchesToMm(inches) });
    }
  };

  const onLoftWidthBlur = () => {
    setIsLoftWidthFocused(false);
    setLoftWidthStr(formatDisplay(mmToInches(currentLoftWidthMm)));
  };

  // Loft Height handlers
  const onLoftHeightFocus = () => {
    setIsLoftHeightFocused(true);
    const inches = mmToInches(currentLoftHeightMm);
    setLoftHeightStr(inches > 0 ? String(inches) : "");
  };

  const onLoftHeightChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    setLoftHeightStr(digits);
    if (activeDrawnUnit) {
      const inches = digits ? parseInt(digits, 10) : 0;
      updateActiveDrawnUnit({ loftHeightMm: inchesToMm(inches) });
    }
  };

  const onLoftHeightBlur = () => {
    setIsLoftHeightFocused(false);
    setLoftHeightStr(formatDisplay(mmToInches(currentLoftHeightMm)));
  };

  const handleDelete = () => {
    if (activeDrawnUnit) {
      deleteDrawnUnit(activeUnitIndex);
    } else if (isEditingNewUnit) {
      clearWardrobeBox();
    }
  };

  const incrementRate = () => setSqftRate((prev) => prev + RATE_STEP);
  const decrementRate = () => setSqftRate((prev) => Math.max(RATE_STEP, prev - RATE_STEP));

  return (
    <div className="flex-1 p-2 rounded-xl border border-slate-600/50 bg-gradient-to-b from-slate-700/80 to-slate-800/80 backdrop-blur-sm shadow-lg shadow-black/10">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          Unit {hasUnit && <span className="text-indigo-400">- {UNIT_TYPE_LABELS[currentUnitType] || currentUnitType}</span>}
        </span>
        {isEditingNewUnit && (
          <span className="text-[9px] text-amber-400 font-medium flex items-center gap-1">
            <span className="w-1 h-1 bg-amber-400 rounded-full animate-pulse" />
            Unsaved
          </span>
        )}
      </div>

      {!hasUnit ? (
        <p className="text-[9px] text-slate-500 text-center py-2">
          Draw a unit on canvas
        </p>
      ) : (
        <>
          {/* W x H - Show shutter or loft fields based on activeEditPart */}
          <div className="flex items-center gap-1.5 text-[12px]">
            {activeEditPart === "shutter" ? (
              <>
                {/* Shutter dimensions */}
                <span className="text-[9px] text-blue-400 uppercase font-medium">Shut</span>
                <span className="text-slate-300 font-bold">W</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={widthStr}
                  onFocus={onWidthFocus}
                  onChange={(e) => onWidthChange(e.target.value)}
                  onBlur={onWidthBlur}
                  disabled={locked || isEditingNewUnit}
                  placeholder="90"
                  className="h-8 text-[12px] font-medium px-2 flex-1 bg-slate-800/60 border-slate-600/50 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-blue-500/30"
                />
                <span className="text-slate-300 font-bold">H</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={heightStr}
                  onFocus={onHeightFocus}
                  onChange={(e) => onHeightChange(e.target.value)}
                  onBlur={onHeightBlur}
                  disabled={locked || isEditingNewUnit}
                  placeholder="96"
                  className="h-8 text-[12px] font-medium px-2 flex-1 bg-slate-800/60 border-slate-600/50 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-blue-500/30"
                />
                {editMode === "carcass" && (
                  <>
                    <span className="text-slate-300 font-bold">D</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={depthStr}
                      onFocus={onDepthFocus}
                      onChange={(e) => onDepthChange(e.target.value)}
                      onBlur={onDepthBlur}
                      disabled={locked || isEditingNewUnit}
                      placeholder="24"
                      className="h-8 text-[12px] font-medium px-2 w-16 bg-slate-800/60 border-slate-600/50 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-blue-500/30"
                    />
                  </>
                )}
              </>
            ) : (
              <>
                {/* Loft dimensions */}
                <span className="text-[9px] text-amber-400 uppercase font-medium">Loft</span>
                <span className="text-slate-300 font-bold">W</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={loftWidthStr}
                  onFocus={onLoftWidthFocus}
                  onChange={(e) => onLoftWidthChange(e.target.value)}
                  onBlur={onLoftWidthBlur}
                  disabled={locked || isEditingNewUnit}
                  placeholder="90"
                  className="h-8 text-[12px] font-medium px-2 flex-1 bg-slate-800/60 border-amber-500/30 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-amber-500/30"
                />
                <span className="text-slate-300 font-bold">H</span>
                <Input
                  type="text"
                  inputMode="numeric"
                  value={loftHeightStr}
                  onFocus={onLoftHeightFocus}
                  onChange={(e) => onLoftHeightChange(e.target.value)}
                  onBlur={onLoftHeightBlur}
                  disabled={locked || isEditingNewUnit}
                  placeholder="18"
                  className="h-8 text-[12px] font-medium px-2 flex-1 bg-slate-800/60 border-amber-500/30 text-white placeholder:text-slate-500 focus:ring-1 focus:ring-amber-500/30"
                />
              </>
            )}
          </div>

          {/* Shutters + Sections + Loft + Delete */}
          <div className="flex items-center gap-1.5 text-[11px] mt-1.5">
            <span className="text-slate-300 font-semibold">Shut</span>
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
              disabled={locked || (!wardrobeBox && !activeDrawnUnit)}
              className="h-7 text-[11px] font-medium px-1.5 w-12 bg-slate-800/60 border-slate-600/50 text-white"
            />
            <span className="text-slate-300 font-semibold">Row</span>
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
              className="h-7 text-[11px] font-medium px-1.5 w-12 bg-slate-800/60 border-slate-600/50 text-white"
            />
            <span className="text-slate-300 font-semibold">Loft</span>
            <Switch
              checked={activeDrawnUnit?.loftEnabled ?? loftEnabled}
              onCheckedChange={(c) => {
                if (activeDrawnUnit) {
                  updateActiveDrawnUnit({ loftEnabled: c });
                  // Switch to loft when enabled, back to shutter when disabled
                  setActiveEditPart(c ? "loft" : "shutter");
                } else {
                  setLoftEnabled(c);
                }
              }}
              disabled={locked || (!wardrobeBox && !activeDrawnUnit)}
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
                className="h-7 w-12 text-[11px] font-medium px-1.5 bg-slate-800/60 border-amber-500/30 text-white"
              />
            )}
            <span className="text-slate-300 font-semibold">Rate</span>
            <Select
              value={String(sqftRate)}
              onValueChange={(v) => setSqftRate(Number(v))}
              disabled={locked || (!wardrobeBox && !activeDrawnUnit)}
            >
              <SelectTrigger className="h-7 w-16 text-[11px] font-medium px-1.5 bg-slate-800/60 border-slate-600/50 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {[...new Set([...SQFT_RATE_OPTIONS, sqftRate])].sort((a, b) => a - b).map((rate) => (
                  <SelectItem key={rate} value={String(rate)} className="text-xs text-slate-200 focus:bg-slate-700 focus:text-white">
                    {rate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-col">
              <button
                onClick={incrementRate}
                disabled={locked || (!wardrobeBox && !activeDrawnUnit)}
                className="h-3.5 w-5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600/50 rounded-t border border-slate-600/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronUp className="h-3 w-3" />
              </button>
              <button
                onClick={decrementRate}
                disabled={locked || (!wardrobeBox && !activeDrawnUnit) || sqftRate <= RATE_STEP}
                className="h-3.5 w-5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600/50 rounded-b border border-t-0 border-slate-600/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-auto transition-all"
              onClick={handleDelete}
              disabled={locked}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default UnitsCompact;
