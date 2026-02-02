import React from "react";
import { IndianRupee, Settings2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDesignCanvasStore } from "../../store/v2/useDesignCanvasStore";
import { usePricingStore } from "../../store/v2/usePricingStore";
import { cn } from "@/lib/utils";
import { UNIT_TYPE_LABELS } from "../../constants";
import { useNavigate } from "react-router-dom";

interface PriceCompactProps {
  onOpenRateCard?: () => void; // Deprecated - now navigates to /rate-cards
}

const formatDimension = (mm: number): string => {
  if (mm === 0) return "-";
  const inches = Math.round(mm / 25.4);
  const feet = Math.floor(inches / 12);
  const rem = inches % 12;

  if (feet === 0) {
    return rem + '"';
  }
  if (rem === 0) {
    return feet + "'";
  }
  return feet + "'" + rem + '"';
};

const PriceCompact: React.FC<PriceCompactProps> = () => {
  const navigate = useNavigate();
  const { drawnUnits, activeUnitIndex, activeEditPart } = useDesignCanvasStore();
  const pricingStore = usePricingStore();

  // Safely destructure with fallbacks to handle stale persisted state
  const pricingControl = pricingStore.pricingControl ?? { sqftRate: 1200, loftSqftRate: 1000 };
  const pricingLocked = pricingStore.pricingLocked ?? false;
  const finalPrice = pricingStore.finalPrice ?? null;

  const currentUnit = drawnUnits[activeUnitIndex];
  const isLoftOnly = currentUnit?.loftOnly || false;
  const hasShutterDimensions = currentUnit && currentUnit.widthMm > 0 && currentUnit.heightMm > 0;
  const hasLoftDimensions = currentUnit && currentUnit.loftWidthMm > 0 && currentUnit.loftHeightMm > 0;

  const shutterW = currentUnit?.widthMm || 0;
  const shutterH = currentUnit?.heightMm || 0;
  const loftW = currentUnit?.loftWidthMm || 0;
  const loftH = currentUnit?.loftHeightMm || 0;

  // Get rates from Rate Card (usePricingStore) - with fallback defaults
  const shutterRate = pricingControl?.sqftRate ?? 1200;
  const loftRate = pricingControl?.loftSqftRate ?? 1000;
  const shutterLoftShutterRate = pricingControl?.shutterLoftShutterRate ?? shutterRate;
  const shutterLoftLoftRate = pricingControl?.shutterLoftLoftRate ?? loftRate;

  // Determine which rates to use based on unit type
  const hasLoft = currentUnit?.loftEnabled || (loftW > 0 && loftH > 0);
  const effectiveShutterRate = hasLoft ? shutterLoftShutterRate : shutterRate;
  const effectiveLoftRate = hasLoft ? shutterLoftLoftRate : loftRate;

  // Calculate sqft
  const mmToInchesNum = (mm: number) => mm / 25.4;
  const shutterSqft = hasShutterDimensions
    ? (mmToInchesNum(shutterW) * mmToInchesNum(shutterH)) / 144
    : 0;
  const loftSqft = hasLoftDimensions
    ? (mmToInchesNum(loftW) * mmToInchesNum(loftH)) / 144
    : 0;

  // Calculate prices
  const shutterPrice = isLoftOnly ? 0 : shutterSqft * effectiveShutterRate;
  const loftPrice = loftSqft * effectiveLoftRate;
  const unitTotal = shutterPrice + loftPrice;

  // ============================================================================
  // LOCKED STATE - Show final price only (READ-ONLY)
  // ============================================================================
  if (pricingLocked && finalPrice) {
    const lockedUnit = finalPrice.units.find((u) => u.unitId === currentUnit?.id) ||
      finalPrice.units[activeUnitIndex];

    return (
      <div className="space-y-3">
        {/* Header - LOCKED */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-slate-800">Final Price</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 rounded text-emerald-700 text-[10px] font-medium">
            <Lock className="h-3 w-3" />
            Locked
          </div>
        </div>

        <div className="bg-emerald-50 rounded-lg p-3 space-y-3 border border-emerald-200">
          {lockedUnit ? (
            <>
              {/* Unit Info */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{lockedUnit.unitLabel}</span>
              </div>

              {/* Shutter (if any) */}
              {lockedUnit.shutterSqft > 0 && (
                <div className="rounded-md p-2 bg-slate-100 border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-blue-600 uppercase">Shutter</span>
                    <span className="text-[10px] text-slate-500">₹{finalPrice.ratesUsed.shutterRate}/sqft</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400">Area</span>
                      <div className="font-medium text-slate-700">{lockedUnit.shutterSqft} sqft</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Price</span>
                      <div className="font-semibold text-emerald-600">₹{lockedUnit.shutterPrice.toLocaleString("en-IN")}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Loft (if any) */}
              {lockedUnit.loftSqft > 0 && (
                <div className="rounded-md p-2 bg-slate-100 border border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-amber-600 uppercase">Loft</span>
                    <span className="text-[10px] text-slate-500">₹{finalPrice.ratesUsed.loftRate}/sqft</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400">Area</span>
                      <div className="font-medium text-slate-700">{lockedUnit.loftSqft} sqft</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400">Price</span>
                      <div className="font-semibold text-emerald-600">₹{lockedUnit.loftPrice.toLocaleString("en-IN")}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Unit Total */}
              <div className="flex items-center justify-between pt-2 border-t border-emerald-200">
                <span className="text-sm font-medium text-slate-600">Unit Total</span>
                <div className="flex items-center text-emerald-600">
                  <IndianRupee className="h-4 w-4" />
                  <span className="text-lg font-bold">{lockedUnit.unitTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-500 text-center py-2">No unit data</p>
          )}

          {/* Grand Total */}
          <div className="flex items-center justify-between pt-2 border-t border-emerald-300 bg-emerald-100 -mx-3 -mb-3 px-3 py-2 rounded-b-lg">
            <span className="text-sm font-semibold text-emerald-800">Grand Total</span>
            <div className="flex items-center text-emerald-700">
              <IndianRupee className="h-5 w-5" />
              <span className="text-xl font-bold">{finalPrice.grandTotal.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Finalized timestamp */}
        <p className="text-[10px] text-slate-400 text-center">
          Finalized: {new Date(finalPrice.finalizedAt).toLocaleString("en-IN")}
        </p>
      </div>
    );
  }

  // ============================================================================
  // NORMAL STATE - Editable pricing
  // ============================================================================
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IndianRupee className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-semibold text-slate-800">Estimate</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[10px] font-medium gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
          onClick={() => navigate("/rate-cards")}
          title="Edit Rate Card"
        >
          <Settings2 className="h-3 w-3" />
          Rate Card
        </Button>
      </div>

      {currentUnit ? (
        <div className="bg-slate-50 rounded-lg p-3 space-y-3">
          {/* Unit Info */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">
              #{activeUnitIndex + 1} {UNIT_TYPE_LABELS[currentUnit.unitType] || currentUnit.unitType}
              {isLoftOnly && <span className="ml-1 text-amber-600 text-xs">(Loft Only)</span>}
            </span>
          </div>

          {/* Shutter Section - Hide for loft-only units */}
          {!isLoftOnly && (
            <div className={cn(
              "rounded-md p-2 border",
              activeEditPart === "shutter" ? "bg-blue-50 border-blue-200" : "bg-slate-100 border-slate-200"
            )}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">Shutter</span>
                <span className="text-[10px] text-slate-500">₹{effectiveShutterRate.toLocaleString("en-IN")}/sqft</span>
              </div>
              {hasShutterDimensions ? (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400">Size</span>
                    <div className="font-medium text-slate-700">{formatDimension(shutterW)} × {formatDimension(shutterH)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Area</span>
                    <div className="font-medium text-slate-700">{shutterSqft.toFixed(2)} sqft</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Price</span>
                    <div className="font-semibold text-emerald-600">₹{Math.round(shutterPrice).toLocaleString("en-IN")}</div>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-amber-600 text-center py-1">Enter Width & Height</p>
              )}
            </div>
          )}

          {/* Loft Section - Show when loft is enabled OR for loft-only units */}
          {(currentUnit.loftEnabled || isLoftOnly) && (
            <div className={cn(
              "rounded-md p-2 border",
              (activeEditPart === "loft" || isLoftOnly) ? "bg-amber-50 border-amber-200" : "bg-slate-100 border-slate-200"
            )}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">
                  {isLoftOnly ? "Loft Only" : "Loft"}
                </span>
                <span className="text-[10px] text-slate-500">₹{effectiveLoftRate.toLocaleString("en-IN")}/sqft</span>
              </div>
              {hasLoftDimensions ? (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400">Size</span>
                    <div className="font-medium text-slate-700">{formatDimension(loftW)} × {formatDimension(loftH)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Area</span>
                    <div className="font-medium text-slate-700">{loftSqft.toFixed(2)} sqft</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Price</span>
                    <div className="font-semibold text-emerald-600">₹{Math.round(loftPrice).toLocaleString("en-IN")}</div>
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-amber-600 text-center py-1">Enter Loft W & H</p>
              )}
            </div>
          )}

          {/* Rate Card Button */}
          <div
            className="flex items-center justify-between py-1.5 px-2 bg-amber-50 rounded border border-amber-100 cursor-pointer hover:bg-amber-100/70 transition-colors"
            onClick={() => navigate("/rate-cards")}
            title="Click to edit Rate Card"
          >
            <span className="text-[10px] text-amber-600 font-medium">Edit Rates</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-500">
                {isLoftOnly ? `Loft ₹${effectiveLoftRate}` : hasLoft ? `S ₹${effectiveShutterRate} • L ₹${effectiveLoftRate}` : `Shutter ₹${effectiveShutterRate}`}/sqft
              </span>
              <Settings2 className="h-3 w-3 text-amber-500" />
            </div>
          </div>

          {/* Unit Total */}
          {(hasShutterDimensions || hasLoftDimensions) && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-sm font-medium text-slate-600">Unit Total</span>
              <div className="flex items-center text-emerald-600">
                <IndianRupee className="h-4 w-4" />
                <span className="text-lg font-bold">{Math.round(unitTotal).toLocaleString("en-IN")}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded-lg">No unit selected</p>
      )}
    </div>
  );
};

export default PriceCompact;
