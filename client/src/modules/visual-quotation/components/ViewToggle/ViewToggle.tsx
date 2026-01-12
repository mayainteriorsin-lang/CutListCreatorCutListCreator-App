import React, { useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVisualQuotationStore, DrawnUnit } from "../../store/visualQuotationStore";
import { captureCanvasRegion } from "../Canvas/CanvasStage";

// Calculate bounding box that contains all units (including loft)
function calculateAllUnitsBounds(units: DrawnUnit[]): { x: number; y: number; width: number; height: number } | null {
  const validUnits = units.filter(u => u.box && u.box.width > 0 && u.box.height > 0);
  if (validUnits.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  validUnits.forEach(unit => {
    if (unit.box) {
      minX = Math.min(minX, unit.box.x);
      minY = Math.min(minY, unit.box.y);
      maxX = Math.max(maxX, unit.box.x + unit.box.width);
      maxY = Math.max(maxY, unit.box.y + unit.box.height);
    }
    // Include loft box if present
    if (unit.loftEnabled && unit.loftBox) {
      minX = Math.min(minX, unit.loftBox.x);
      minY = Math.min(minY, unit.loftBox.y);
      maxX = Math.max(maxX, unit.loftBox.x + unit.loftBox.width);
      maxY = Math.max(maxY, unit.loftBox.y + unit.loftBox.height);
    }
  });

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null;

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

const ViewToggle: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    quotationRooms,
    activeRoomIndex,
    activeUnitIndex,
    drawnUnits,
    saveCurrentRoomState,
    loadRoomState,
    setActiveUnitIndex,
    setProductionCanvasSnapshots,
  } = useVisualQuotationStore();

  // Helper to wait for canvas to render after room switch
  const waitForRender = () => new Promise(resolve => setTimeout(resolve, 150));

  // Capture all room canvases before navigating to production (cropped to unit bounds)
  const captureAllRoomCanvases = useCallback(async (): Promise<Map<number, string>> => {
    const allCanvasImages = new Map<number, string>();

    // Store original selection to restore later
    const originalUnitIndex = activeUnitIndex;

    // Clear selection before capturing (removes the blue selection box)
    setActiveUnitIndex(-1);
    await waitForRender();

    if (quotationRooms.length === 0) {
      // No rooms - capture current canvas cropped to unit bounds
      const bounds = calculateAllUnitsBounds(drawnUnits);
      if (bounds) {
        const currentImage = captureCanvasRegion(bounds, 30);
        if (currentImage) {
          allCanvasImages.set(0, currentImage);
        }
      }
      // Restore selection
      if (originalUnitIndex >= 0) {
        setActiveUnitIndex(originalUnitIndex);
      }
      return allCanvasImages;
    }

    // Save current room state first
    saveCurrentRoomState();
    const originalRoomIndex = activeRoomIndex;

    // Capture each room's canvas cropped to unit bounds
    for (let i = 0; i < quotationRooms.length; i++) {
      if (i !== originalRoomIndex) {
        // Switch to this room
        loadRoomState(i);
        await waitForRender(); // Wait for canvas to re-render
      }

      // Clear selection for this room too
      setActiveUnitIndex(-1);
      await waitForRender();

      // Get units for this room
      const roomUnits = i === originalRoomIndex ? drawnUnits : quotationRooms[i].drawnUnits;
      const bounds = calculateAllUnitsBounds(roomUnits);

      // Capture the canvas cropped to unit bounds
      if (bounds) {
        const canvasImage = captureCanvasRegion(bounds, 30);
        if (canvasImage) {
          allCanvasImages.set(i, canvasImage);
        }
      }
    }

    // Restore original room
    if (originalRoomIndex !== quotationRooms.length - 1) {
      loadRoomState(originalRoomIndex);
      await waitForRender();
    }

    // Restore original selection
    if (originalUnitIndex >= 0) {
      setActiveUnitIndex(originalUnitIndex);
    }

    return allCanvasImages;
  }, [quotationRooms, activeRoomIndex, activeUnitIndex, drawnUnits, saveCurrentRoomState, loadRoomState, setActiveUnitIndex]);

  const handleProductionClick = async () => {
    // Capture all room canvases before navigating
    const snapshots = await captureAllRoomCanvases();
    setProductionCanvasSnapshots(snapshots);

    // Preserve query params when navigating to production
    const params = searchParams.toString();
    navigate(`/visual-quotation/production${params ? `?${params}` : ""}`);
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
      <Button
        variant="default"
        size="sm"
        className="h-8 gap-2"
      >
        <Eye className="h-4 w-4" />
        <span className="hidden sm:inline">Customer</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleProductionClick}
        className="h-8 gap-2"
      >
        <Wrench className="h-4 w-4" />
        <span className="hidden sm:inline">Production</span>
      </Button>
    </div>
  );
};

export default ViewToggle;
