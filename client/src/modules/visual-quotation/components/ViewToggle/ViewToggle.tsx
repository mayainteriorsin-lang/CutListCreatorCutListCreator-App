import React, { useCallback } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { Eye, Wrench, Image, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRoomStore } from "../../store/v2/useRoomStore";
import { useDesignCanvasStore } from "../../store/v2/useDesignCanvasStore";
import type { DrawnUnit } from "../../types";
import { captureCanvasRegion } from "../Canvas";
import { roomService } from "../../services/roomService";

// Calculate bounding box for a single unit (including loft if present)
function calculateUnitBounds(unit: DrawnUnit): { x: number; y: number; width: number; height: number } | null {
  if (!unit.box || unit.box.width <= 0 || unit.box.height <= 0) return null;

  let minX = unit.box.x;
  let minY = unit.box.y;
  let maxX = unit.box.x + unit.box.width;
  let maxY = unit.box.y + unit.box.height;

  // Include loft box if present (for units with loft)
  if (unit.loftEnabled && unit.loftBox) {
    minX = Math.min(minX, unit.loftBox.x);
    minY = Math.min(minY, unit.loftBox.y);
    maxX = Math.max(maxX, unit.loftBox.x + unit.loftBox.width);
    maxY = Math.max(maxY, unit.loftBox.y + unit.loftBox.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

const ViewToggle: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Determine which view is active based on URL
  const isProductionPage = location.pathname.includes("/production");
  const isCustomerPage = !isProductionPage;

  // Detect if we're on 2D or 3D quotation page
  const is2DQuotation = location.pathname.includes("/2d-quotation");
  const baseRoute = is2DQuotation ? "/2d-quotation" : "/3d-quotation";

  const {
    quotationRooms,
    activeRoomIndex,
  } = useRoomStore();

  const {
    activeUnitIndex,
    drawnUnits,
    setActiveUnitIndex,
    setProductionCanvasSnapshots,
    setCaptureOnlyUnitId,
  } = useDesignCanvasStore();

  // Helper to wait for canvas to render after room switch
  const waitForRender = () => new Promise(resolve => setTimeout(resolve, 150));

  // Capture per-unit canvas snapshots (each unit gets its own isolated image)
  const capturePerUnitSnapshots = useCallback(async (): Promise<Map<string, string>> => {
    const unitSnapshots = new Map<string, string>();

    // Store original selection to restore later
    const originalUnitIndex = activeUnitIndex;

    // Clear selection before capturing (removes the blue selection box)
    setActiveUnitIndex(-1);
    await waitForRender();

    if (quotationRooms.length === 0) {
      // No rooms - capture each unit in current drawnUnits
      for (const unit of drawnUnits) {
        // Set to only show this unit
        setCaptureOnlyUnitId(unit.id);
        await waitForRender();

        const bounds = calculateUnitBounds(unit);
        if (bounds) {
          const unitImage = captureCanvasRegion(bounds, 15);
          if (unitImage) {
            unitSnapshots.set(unit.id, unitImage);
          }
        }
      }
      // Clear the capture filter
      setCaptureOnlyUnitId(null);
      await waitForRender();

      // Restore selection
      if (originalUnitIndex >= 0) {
        setActiveUnitIndex(originalUnitIndex);
      }
      return unitSnapshots;
    }

    // Save current room state first
    roomService.saveCurrentRoom();
    const originalRoomIndex = activeRoomIndex;

    // Capture each unit in each room
    for (let i = 0; i < quotationRooms.length; i++) {
      if (i !== originalRoomIndex) {
        // Switch to this room
        roomService.switchToRoom(i);
        await waitForRender(); // Wait for canvas to re-render
      }

      // Clear selection for this room too
      setActiveUnitIndex(-1);
      await waitForRender();

      // Get units for this room
      const roomUnits = i === originalRoomIndex ? drawnUnits : quotationRooms[i].drawnUnits;

      // Capture each unit individually (isolated)
      for (const unit of roomUnits) {
        // Set to only show this unit
        setCaptureOnlyUnitId(unit.id);
        await waitForRender();

        const bounds = calculateUnitBounds(unit);
        if (bounds) {
          const unitImage = captureCanvasRegion(bounds, 15);
          if (unitImage) {
            unitSnapshots.set(unit.id, unitImage);
          }
        }
      }
    }

    // Clear the capture filter
    setCaptureOnlyUnitId(null);
    await waitForRender();

    // Restore original room
    if (originalRoomIndex !== quotationRooms.length - 1) {
      roomService.switchToRoom(originalRoomIndex);
      await waitForRender();
    }

    // Restore original selection
    if (originalUnitIndex >= 0) {
      setActiveUnitIndex(originalUnitIndex);
    }

    return unitSnapshots;
  }, [quotationRooms, activeRoomIndex, activeUnitIndex, drawnUnits, setActiveUnitIndex, setCaptureOnlyUnitId]);

  // Validate that all units have dimensions entered
  const validateUnitDimensions = useCallback((): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Helper to get unit type label
    const getUnitTypeLabel = (unitType: string) => {
      const labels: Record<string, string> = {
        wardrobe: "Wardrobe",
        kitchen: "Kitchen",
        tv_unit: "TV Unit",
        dresser: "Dresser",
        study_table: "Study Table",
        shoe_rack: "Shoe Rack",
        book_shelf: "Book Shelf",
        crockery_unit: "Crockery Unit",
        pooja_unit: "Pooja Unit",
        vanity: "Vanity",
        bar_unit: "Bar Unit",
        display_unit: "Display Unit",
        other: "Other",
      };
      return labels[unitType] || unitType;
    };

    // Check units in quotation rooms
    if (quotationRooms.length > 0) {
      quotationRooms.forEach((room, roomIdx) => {
        const unitsToCheck = roomIdx === activeRoomIndex ? drawnUnits : room.drawnUnits;
        unitsToCheck.forEach((unit, unitIdx) => {
          const unitLabel = `${room.name} - ${getUnitTypeLabel(unit.unitType)} ${unitIdx + 1}`;
          const isLoftOnly = unit.loftOnly || false;

          if (isLoftOnly) {
            // Loft-only unit: check loft dimensions
            if (!unit.loftWidthMm || unit.loftWidthMm <= 0) {
              errors.push(`${unitLabel}: Loft width not entered`);
            }
            if (!unit.loftHeightMm || unit.loftHeightMm <= 0) {
              errors.push(`${unitLabel}: Loft height not entered`);
            }
          } else {
            // Regular unit: check shutter dimensions
            if (!unit.widthMm || unit.widthMm <= 0) {
              errors.push(`${unitLabel}: Width not entered`);
            }
            if (!unit.heightMm || unit.heightMm <= 0) {
              errors.push(`${unitLabel}: Height not entered`);
            }
          }
        });
      });
    } else {
      // No rooms - check current drawnUnits
      drawnUnits.forEach((unit, unitIdx) => {
        const unitLabel = `${getUnitTypeLabel(unit.unitType)} ${unitIdx + 1}`;
        const isLoftOnly = unit.loftOnly || false;

        if (isLoftOnly) {
          if (!unit.loftWidthMm || unit.loftWidthMm <= 0) {
            errors.push(`${unitLabel}: Loft width not entered`);
          }
          if (!unit.loftHeightMm || unit.loftHeightMm <= 0) {
            errors.push(`${unitLabel}: Loft height not entered`);
          }
        } else {
          if (!unit.widthMm || unit.widthMm <= 0) {
            errors.push(`${unitLabel}: Width not entered`);
          }
          if (!unit.heightMm || unit.heightMm <= 0) {
            errors.push(`${unitLabel}: Height not entered`);
          }
        }
      });
    }

    return { valid: errors.length === 0, errors };
  }, [quotationRooms, activeRoomIndex, drawnUnits]);

  const handleProductionClick = async () => {
    // Validate dimensions before navigating
    const validation = validateUnitDimensions();
    if (!validation.valid) {
      const errorList = validation.errors.slice(0, 5).join("\n• ");
      const moreCount = validation.errors.length > 5 ? `\n...and ${validation.errors.length - 5} more` : "";
      alert(`Cannot open Production view - missing dimensions:\n\n• ${errorList}${moreCount}\n\nPlease enter dimensions for all units first.`);
      return;
    }

    // Capture per-unit snapshots before navigating
    const snapshots = await capturePerUnitSnapshots();
    setProductionCanvasSnapshots(snapshots);

    // Preserve query params when navigating to production
    const params = searchParams.toString();
    navigate(`${baseRoute}/production${params ? `?${params}` : ""}`);
  };

  const handleCustomerClick = () => {
    const params = searchParams.toString();
    navigate(`${baseRoute}${params ? `?${params}` : ""}`);
  };

  // Handle 2D/3D page switch
  const handle2DClick = () => {
    const params = searchParams.toString();
    const suffix = isProductionPage ? "/production" : "";
    navigate(`/2d-quotation${suffix}${params ? `?${params}` : ""}`);
  };

  const handle3DClick = () => {
    const params = searchParams.toString();
    const suffix = isProductionPage ? "/production" : "";
    navigate(`/3d-quotation${suffix}${params ? `?${params}` : ""}`);
  };

  return (
    <div className="flex items-center gap-2">
      {/* 2D/3D Toggle */}
      <div className="flex items-center gap-0.5 p-0.5 bg-slate-700/50 rounded-lg border border-slate-600">
        <Button
          variant="ghost"
          size="sm"
          onClick={handle2DClick}
          className={cn(
            "h-6 px-2 gap-1 rounded transition-all text-xs",
            is2DQuotation
              ? "bg-indigo-500 text-white hover:bg-indigo-500"
              : "text-slate-400 hover:text-white hover:bg-slate-600"
          )}
        >
          <Image className="h-3 w-3" />
          2D
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handle3DClick}
          className={cn(
            "h-6 px-2 gap-1 rounded transition-all text-xs",
            !is2DQuotation
              ? "bg-indigo-500 text-white hover:bg-indigo-500"
              : "text-slate-400 hover:text-white hover:bg-slate-600"
          )}
        >
          <Box className="h-3 w-3" />
          3D
        </Button>
      </div>

      {/* Customer/Production Toggle - Icon only for compact */}
      <div className="flex items-center gap-0.5 p-0.5 bg-slate-700/50 rounded-lg border border-slate-600">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCustomerClick}
          title="Customer View"
          className={cn(
            "h-6 w-6 p-0 rounded transition-all",
            isCustomerPage
              ? "bg-blue-500 text-white hover:bg-blue-500"
              : "text-slate-400 hover:text-white hover:bg-slate-600"
          )}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleProductionClick}
          title="Production View"
          className={cn(
            "h-6 w-6 p-0 rounded transition-all",
            isProductionPage
              ? "bg-amber-500 text-white hover:bg-amber-500"
              : "text-slate-400 hover:text-white hover:bg-slate-600"
          )}
        >
          <Wrench className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default ViewToggle;
