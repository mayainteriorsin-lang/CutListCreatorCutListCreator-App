import React from "react";
import { IndianRupee } from "lucide-react";
import { useVisualQuotationStore } from "../../store/visualQuotationStore";
import { calculatePricing } from "../../engine/pricingEngine";

const UNIT_TYPE_LABELS: Record<string, string> = {
  wardrobe: "Wardrobe",
  kitchen: "Kitchen",
  tv_unit: "TV Unit",
  dresser: "Dresser",
  other: "Other",
};

// Format inches to feet'inches"
const formatDimension = (mm: number): string => {
  if (mm === 0) return "-";
  const inches = Math.round(mm / 25.4);
  const feet = Math.floor(inches / 12);
  const rem = inches % 12;
  if (feet === 0) return `${rem}"`;
  if (rem === 0) return `${feet}'`;
  return `${feet}'${rem}"`;
};

const PriceCompact: React.FC = () => {
  const { drawnUnits, sqftRate, activeUnitIndex, activeEditPart } = useVisualQuotationStore();

  // Get current unit's data
  const currentUnit = drawnUnits[activeUnitIndex];

  // Check if user has entered W and H for shutter (both must be > 0)
  const hasShutterDimensions = currentUnit && currentUnit.widthMm > 0 && currentUnit.heightMm > 0;
  // Check if user has entered W and H for loft (both must be > 0)
  const hasLoftDimensions = currentUnit && currentUnit.loftWidthMm > 0 && currentUnit.loftHeightMm > 0;

  // Only calculate pricing for units with valid dimensions - current room
  const validUnits = drawnUnits.filter(u => u.widthMm > 0 && u.heightMm > 0);
  const price = calculatePricing(validUnits, sqftRate);

  // Find current unit's pricing in the valid units array
  const currentUnitInValid = validUnits.findIndex(u => u === currentUnit);
  const currentPricing = currentUnitInValid >= 0 ? price.units[currentUnitInValid] : null;

  // Dimensions for display
  const shutterW = currentUnit?.widthMm || 0;
  const shutterH = currentUnit?.heightMm || 0;
  const loftW = currentUnit?.loftWidthMm || 0;
  const loftH = currentUnit?.loftHeightMm || 0;

  return (
    <div className="w-[140px] p-2 rounded-xl border border-emerald-600/30 bg-gradient-to-br from-emerald-900/40 to-teal-900/30 backdrop-blur-sm space-y-1.5 shadow-lg shadow-emerald-900/20">
      <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        Estimate
      </span>

      {/* Current part being edited */}
      {currentUnit ? (
        <div className="bg-slate-800/60 rounded-lg p-1.5 text-[9px] border border-slate-600/30">
          <div className="font-semibold text-slate-200 mb-0.5">
            #{activeUnitIndex + 1} {UNIT_TYPE_LABELS[currentUnit.unitType] || currentUnit.unitType}
          </div>

          {activeEditPart === "shutter" ? (
            <>
              <div className="text-[8px] text-blue-400 uppercase font-medium">Shutter</div>
              {hasShutterDimensions ? (
                <>
                  <div className="flex justify-between text-slate-300">
                    <span>{formatDimension(shutterW)} x {formatDimension(shutterH)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>{currentPricing?.wardrobeSqft || 0} sqft</span>
                    <span className="text-emerald-400">₹{(currentPricing?.wardrobePrice || 0).toLocaleString("en-IN")}</span>
                  </div>
                </>
              ) : (
                <div className="text-amber-400 text-center py-1 text-[8px]">Enter W & H</div>
              )}
            </>
          ) : (
            <>
              <div className="text-[8px] text-amber-400 uppercase font-medium">Loft</div>
              {currentUnit.loftEnabled ? (
                hasLoftDimensions ? (
                  <>
                    <div className="flex justify-between text-slate-300">
                      <span>{formatDimension(loftW)} x {formatDimension(loftH)}</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>{currentPricing?.loftSqft || 0} sqft</span>
                      <span className="text-emerald-400">₹{(currentPricing?.loftPrice || 0).toLocaleString("en-IN")}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-amber-400 text-center py-1 text-[8px]">Enter Loft W & H</div>
                )
              ) : (
                <div className="text-slate-500 text-center text-[8px]">Loft not enabled</div>
              )}
            </>
          )}
        </div>
      ) : (
        <p className="text-[9px] text-slate-500 text-center py-1">No unit selected</p>
      )}

      {/* Unit total for selected item only */}
      {currentUnit && currentPricing && (
        <div className="border-t border-emerald-600/30 pt-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-emerald-400">Unit Total</span>
            <div className="flex items-center text-emerald-300">
              <IndianRupee className="h-3 w-3" />
              <span className="text-sm font-bold">{currentPricing.unitTotal.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceCompact;
