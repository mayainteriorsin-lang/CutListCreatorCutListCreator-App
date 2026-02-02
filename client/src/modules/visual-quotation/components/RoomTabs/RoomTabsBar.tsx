/**
 * RoomTabsBar - Horizontal tabs showing quotation rooms
 *
 * Displays room tabs based on quotationRooms array.
 * Highlights the activeRoomIndex tab.
 * Click on tab to switch rooms (saves current, loads selected).
 * "+ Add Room" button with unit type popover.
 * Context menu for rename/delete on each tab.
 * Aggregate pricing summary when multiple rooms exist.
 */

import React, { useState, useMemo } from "react";
import { Plus, MoreHorizontal, Pencil, Trash2, X, Check, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRoomStore } from "../../store/v2/useRoomStore";
import { useDesignCanvasStore } from "../../store/v2/useDesignCanvasStore";
import { useQuotationMetaStore } from "../../store/v2/useQuotationMetaStore";
import roomService from "../../services/roomService";
import { useServices } from "../../services/useServices";
import { DEFAULT_UNIT_TYPES } from "../../types/core";
import { formatUnitTypeLabel } from "../../constants";

// ... imports ...

const RoomTabsBar: React.FC = () => {
  const {
    quotationRooms,
    activeRoomIndex,
    setActiveRoomIndex,
  } = useRoomStore();

  const { drawnUnits } = useDesignCanvasStore();

  const {
    status,
  } = useQuotationMetaStore();

  const customUnitTypes: string[] = [];

  const addQuotationRoom = (unitType: string) => {
    roomService.createRoom({
      name: "", // Service generates name
      unitType: unitType as any
    });
  };

  const deleteQuotationRoom = (index: number) => {
    roomService.deleteRoom(index);
  };

  const updateQuotationRoom = (index: number, updates: any) => {
    roomService.updateRoom(index, updates);
  };

  // ... rest of component

  const { pricingService } = useServices();

  const [addPopoverOpen, setAddPopoverOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const locked = status === "APPROVED";

  // Calculate aggregate pricing across all rooms
  const aggregatePricing = useMemo(() => {
    // Collect all drawn units from all rooms plus current session
    const allUnits = [
      // Units from saved rooms (excluding current active room to avoid double counting)
      ...quotationRooms.flatMap((room, idx) =>
        idx === activeRoomIndex ? [] : room.drawnUnits
      ),
      // Current session's drawn units
      ...drawnUnits,
    ];

    // Filter valid units (have dimensions)
    const validUnits = allUnits.filter(u => {
      if (u.loftOnly) {
        return u.loftWidthMm > 0 && u.loftHeightMm > 0;
      }
      return u.widthMm > 0 && u.heightMm > 0;
    });

    if (validUnits.length === 0) return null;

    const pricing = pricingService.calculate(validUnits);
    return {
      total: pricing.total,
      subtotal: pricing.subtotal,
      gst: pricing.gst,
      unitCount: validUnits.length,
      roomCount: quotationRooms.length || 1,
    };
  }, [quotationRooms, activeRoomIndex, drawnUnits, pricingService]);

  const handleTabClick = (index: number) => {
    if (locked) return;
    if (editingIndex !== null) return; // Don't switch while editing
    if (index === activeRoomIndex) return;
    setActiveRoomIndex(index);
  };

  const handleAddRoom = (unitType: string) => {
    if (locked) return;
    addQuotationRoom(unitType);
    setAddPopoverOpen(false);
  };

  const handleStartRename = (index: number, currentName: string) => {
    if (locked) return;
    setEditingIndex(index);
    setEditingName(currentName);
  };

  const handleCancelRename = () => {
    setEditingIndex(null);
    setEditingName("");
  };

  const handleConfirmRename = () => {
    if (editingIndex === null) return;
    if (editingName.trim()) {
      updateQuotationRoom(editingIndex, { name: editingName.trim() });
    }
    setEditingIndex(null);
    setEditingName("");
  };

  const handleDelete = (index: number) => {
    if (locked) return;
    const room = quotationRooms[index];
    if (window.confirm(`Delete "${room?.name || `Room ${index + 1}`}"? This cannot be undone.`)) {
      deleteQuotationRoom(index);
    }
  };

  // Build unit type options
  const unitTypeOptions = [
    ...DEFAULT_UNIT_TYPES.map((v) => ({ value: v, label: formatUnitTypeLabel(v) })),
    ...customUnitTypes.map((v) => ({ value: v, label: formatUnitTypeLabel(v) })),
  ];

  // Always show the bar so "+ Add Room" is accessible
  return (
    <div className="flex-shrink-0 h-8 bg-slate-100 border-b border-slate-200 px-3 flex items-center gap-1 overflow-x-auto">
      {/* Room tabs */}
      {quotationRooms.map((room, index) => {
        const isActive = index === activeRoomIndex;
        const unitLabel = formatUnitTypeLabel(room.unitType);
        const unitCount = room.drawnUnits.length;
        const isEditing = editingIndex === index;

        return (
          <div
            key={room.id}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-t-md text-xs font-medium transition-colors group",
              isActive
                ? "bg-white border border-b-0 border-slate-200 text-slate-900 -mb-px"
                : "bg-slate-200/60 text-slate-600 hover:bg-slate-200",
              locked && !isActive && "opacity-60"
            )}
          >
            {isEditing ? (
              /* Rename input */
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleConfirmRename();
                    } else if (e.key === "Escape") {
                      handleCancelRename();
                    }
                  }}
                  className="h-5 w-24 text-xs px-1"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleConfirmRename}
                  className="h-4 w-4 flex items-center justify-center text-emerald-600 hover:text-emerald-700"
                >
                  <Check className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={handleCancelRename}
                  className="h-4 w-4 flex items-center justify-center text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              /* Normal tab content */
              <>
                <button
                  type="button"
                  onClick={() => handleTabClick(index)}
                  disabled={locked}
                  className={cn(
                    "flex items-center gap-1.5",
                    !isActive && !locked && "cursor-pointer",
                    locked && "cursor-not-allowed"
                  )}
                >
                  {/* Room name */}
                  <span className="truncate max-w-[100px]">{room.name}</span>

                  {/* Unit type badge */}
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-medium",
                      isActive
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-slate-300/60 text-slate-500"
                    )}
                  >
                    {unitLabel}
                  </span>

                  {/* Unit count badge */}
                  {unitCount > 0 && (
                    <span
                      className={cn(
                        "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-semibold",
                        isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-300/60 text-slate-500"
                      )}
                    >
                      {unitCount}
                    </span>
                  )}
                </button>

                {/* Context menu (visible on hover or when active) */}
                {!locked && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "h-4 w-4 flex items-center justify-center rounded text-slate-400 hover:text-slate-600 hover:bg-slate-300/50 transition-opacity",
                          isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-32">
                      <DropdownMenuItem
                        onClick={() => handleStartRename(index, room.name)}
                        className="text-xs"
                      >
                        <Pencil className="h-3 w-3 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(index)}
                        className="text-xs text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-3 w-3 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </>
            )}
          </div>
        );
      })}

      {/* Add Room Button */}
      <Popover open={addPopoverOpen} onOpenChange={setAddPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={locked}
            className={cn(
              "h-6 px-2 text-xs gap-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200/80",
              locked && "cursor-not-allowed opacity-60"
            )}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Room
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-48 p-2"
          align="start"
          sideOffset={4}
        >
          <div className="text-xs font-medium text-slate-500 mb-2 px-1">
            Select unit type
          </div>
          <div className="flex flex-col gap-0.5 max-h-64 overflow-y-auto">
            {unitTypeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleAddRoom(option.value)}
                className="w-full text-left px-2 py-1.5 text-xs font-medium text-slate-700 rounded hover:bg-slate-100 transition-colors"
              >
                {option.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Spacer to push total to right */}
      <div className="flex-1" />

      {/* Aggregate Pricing Summary */}
      {aggregatePricing && aggregatePricing.total > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-xs">
                <IndianRupee className="h-3 w-3 text-emerald-600" />
                <span className="font-semibold text-emerald-700">
                  {aggregatePricing.total.toLocaleString("en-IN")}
                </span>
                <span className="text-emerald-600/70 text-[10px]">
                  ({aggregatePricing.unitCount} units)
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <div className="space-y-1">
                <div className="font-medium">Total Quote Summary</div>
                <div className="text-slate-400">
                  Subtotal: ₹{aggregatePricing.subtotal.toLocaleString("en-IN")}
                </div>
                <div className="text-slate-400">
                  GST (18%): ₹{aggregatePricing.gst.toLocaleString("en-IN")}
                </div>
                <div className="font-semibold text-emerald-600">
                  Total: ₹{aggregatePricing.total.toLocaleString("en-IN")}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};

export default RoomTabsBar;
