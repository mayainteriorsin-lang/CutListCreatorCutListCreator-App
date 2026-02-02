import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Image,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useDesignCanvasStore,
} from "../../../store/v2/useDesignCanvasStore";
import { useRoomStore } from "../../../store/v2/useRoomStore";
import type { KitchenLayoutType } from "../state/types";

const LAYOUT_OPTIONS: { id: KitchenLayoutType; label: string; icon: string }[] = [
  { id: "straight", label: "Straight (I)", icon: "━" },
  { id: "l_shape", label: "L-Shape", icon: "┗" },
  { id: "u_shape", label: "U-Shape", icon: "┗┛" },
  { id: "parallel", label: "Parallel", icon: "═" },
  { id: "island", label: "Island", icon: "▣" },
];

interface FloorPlanToolbarProps {
  onPhotoUploadClick?: () => void;
}

const FloorPlanToolbar: React.FC<FloorPlanToolbarProps> = ({ onPhotoUploadClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    floorPlan,
    setFloorPlanEnabled,
    setKitchenConfig,
  } = useDesignCanvasStore();

  const { quotationRooms, activeRoomIndex } = useRoomStore();
  const activeRoom = quotationRooms[activeRoomIndex];
  const unitType = activeRoom?.unitType;

  const { enabled, kitchenConfig } = floorPlan;
  const isKitchen = unitType === "kitchen";

  // Determine which page we're on based on URL
  const is2DPage = location.pathname === "/2d-quotation";
  const is3DPage = location.pathname === "/3d-quotation" || location.pathname.startsWith("/3d-quotation/");

  const handleEnableFloorPlan = () => {
    setFloorPlanEnabled(!enabled);
    if (!enabled && isKitchen) {
      // Initialize kitchen config when enabling floor plan for kitchen
      setKitchenConfig({
        layoutType: "straight",
        baseUnit: null,
        wallUnit: null,
        tallUnit: null,
        counterTopOverhang: 25,
        splashbackHeight: 450,
        ceilingHeight: 2700,
      });
    }
  };

  // NOTE: handleEnableFloorPlan is currently unused in the UI but preserved for future toggle functionality

  const ViewToggle = ({
    is2DPage,
    is3DPage,
    navigate,
  }: {
    is2DPage: boolean;
    is3DPage: boolean;
    navigate: (path: string) => void;
  }) => (
    <div className="p-2 bg-slate-800/50 rounded-lg border border-slate-600/50">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">
          Canvas Mode
        </span>
      </div>
      <div className="flex gap-1 p-0.5 bg-slate-900/50 rounded-lg">
        <button
          onClick={() => {
            // Navigate to 2D Quotation page
            navigate("/2d-quotation");
          }}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 h-8 text-[10px] font-medium rounded-md transition-all duration-200",
            is2DPage
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
              : "text-slate-400 hover:text-white hover:bg-slate-700/50"
          )}
        >
          <Image className="h-3.5 w-3.5" />
          2D Quotation
        </button>
        <button
          onClick={() => {
            // Navigate to 3D Quotation page
            navigate("/3d-quotation");
          }}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 h-8 text-[10px] font-medium rounded-md transition-all duration-200",
            is3DPage
              ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
              : "text-slate-400 hover:text-white hover:bg-slate-700/50"
          )}
        >
          <Maximize2 className="h-3.5 w-3.5" />
          3D Quotation
        </button>
      </div>
      {is2DPage && (
        <p className="text-[8px] text-slate-500 mt-1.5 text-center">
          Photo-based 2D quotation
        </p>
      )}
      {is3DPage && (
        <p className="text-[8px] text-slate-500 mt-1.5 text-center">
          Floor plan 3D quotation
        </p>
      )}
    </div>
  );

  if (!enabled) {
    return <ViewToggle is2DPage={is2DPage} is3DPage={is3DPage} navigate={navigate} />;
  }

  return (
    <div className="space-y-2">
      {/* View Toggle */}
      <ViewToggle is2DPage={is2DPage} is3DPage={is3DPage} navigate={navigate} />

      {/* Kitchen Estimate Info - Only show when floor plan enabled AND unit type is kitchen */}
      {isKitchen && kitchenConfig && (
        <div className="p-2 bg-slate-800/50 rounded-lg border border-amber-500/30">
          {/* Header */}
          <div className="flex items-center gap-1.5 mb-2">
            <LayoutGrid className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide">
              Estimate
            </span>
          </div>

          {/* Layout Info */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">Layout:</span>
              <span className="text-slate-200 font-medium">
                {LAYOUT_OPTIONS.find(l => l.id === kitchenConfig.layoutType)?.label || "-"}
              </span>
            </div>

            {/* Running Feet Display */}
            {kitchenConfig.baseUnit && (
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Base Units:</span>
                <span className="text-green-400 font-semibold">
                  {kitchenConfig.baseUnit.totalRunningFeet.toFixed(1)} RFT
                </span>
              </div>
            )}
            {kitchenConfig.wallUnit && (
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Wall Units:</span>
                <span className="text-blue-400 font-semibold">
                  {kitchenConfig.wallUnit.totalRunningFeet.toFixed(1)} RFT
                </span>
              </div>
            )}

            {/* Total if both exist */}
            {kitchenConfig.baseUnit && kitchenConfig.wallUnit && (
              <>
                <div className="border-t border-slate-600/50 my-1.5" />
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-300 font-medium">Total:</span>
                  <span className="text-amber-400 font-semibold">
                    {(kitchenConfig.baseUnit.totalRunningFeet + kitchenConfig.wallUnit.totalRunningFeet).toFixed(1)} RFT
                  </span>
                </div>
              </>
            )}

            {/* No units message */}
            {!kitchenConfig.baseUnit && !kitchenConfig.wallUnit && (
              <p className="text-[9px] text-slate-500 text-center py-2">
                Draw kitchen units to see estimate
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FloorPlanToolbar;
