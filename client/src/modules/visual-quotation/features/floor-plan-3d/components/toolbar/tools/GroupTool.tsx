/**
 * GroupTool - Group/ungroup multiple selected items
 *
 * Features:
 * - Group multiple floors, walls, or units together
 * - Move grouped items as one
 * - Ungroup to edit individual items
 * - Keyboard shortcut: Ctrl+G to group, Ctrl+Shift+G to ungroup
 */

import React, { useCallback, useEffect, useState } from "react";
import { Group, Ungroup } from "lucide-react";
import ToolButton from "../ToolButton";
import { useDesignCanvasStore } from "../../../../../store/v2/useDesignCanvasStore";

interface GroupToolProps {
  selectedFloorId: string | null;
  selectedWallId: string | null;
  selectedUnitId: string | null;
  multiSelection?: string[]; // IDs of multiple selected items
  onGroup?: (groupId: string) => void;
  onUngroup?: () => void;
}

export default function GroupTool({
  selectedFloorId,
  selectedWallId,
  selectedUnitId,
  multiSelection = [],
  onGroup,
  onUngroup,
}: GroupToolProps) {
  const {
    floorPlan,
    drawnUnits,
    updateFloorPlanFloor,
    updateFloorPlanWall,
    updateDrawnUnitById,
  } = useDesignCanvasStore();

  const { floors, walls } = floorPlan;

  const [showMenu, setShowMenu] = useState(false);

  // Check if any selected item is in a group
  const getSelectedGroupId = useCallback(() => {
    if (selectedFloorId) {
      const floor = floors.find(f => f.id === selectedFloorId);
      return floor?.groupId;
    }
    if (selectedWallId) {
      const wall = walls.find(w => w.id === selectedWallId);
      return wall?.groupId;
    }
    if (selectedUnitId) {
      const unit = drawnUnits.find(u => u.id === selectedUnitId);
      return unit?.groupId;
    }
    return undefined;
  }, [selectedFloorId, selectedWallId, selectedUnitId, floors, walls, drawnUnits]);

  const currentGroupId = getSelectedGroupId();
  const isInGroup = !!currentGroupId;
  const hasSelection = selectedFloorId || selectedWallId || selectedUnitId;
  const canGroup = multiSelection.length >= 2;

  // Create a new group from selection
  const createGroup = useCallback(() => {
    if (!canGroup) return;

    const groupId = `group-${Date.now()}`;

    // Update all selected items with the group ID
    multiSelection.forEach(id => {
      // Try to find in floors
      if (floors.find(f => f.id === id)) {
        updateFloorPlanFloor(id, { groupId });
      }
      // Try to find in walls
      else if (walls.find(w => w.id === id)) {
        updateFloorPlanWall(id, { groupId });
      }
      // Try to find in units
      else if (drawnUnits.find(u => u.id === id)) {
        updateDrawnUnitById(id, { groupId });
      }
    });

    onGroup?.(groupId);
    setShowMenu(false);
  }, [canGroup, multiSelection, floors, walls, drawnUnits, updateFloorPlanFloor, updateFloorPlanWall, updateDrawnUnitById, onGroup]);

  // Ungroup the current selection
  const ungroupSelection = useCallback(() => {
    if (!currentGroupId) return;

    // Find all items in the group and remove groupId
    floors.filter(f => f.groupId === currentGroupId).forEach(f => {
      updateFloorPlanFloor(f.id, { groupId: undefined });
    });

    walls.filter(w => w.groupId === currentGroupId).forEach(w => {
      updateFloorPlanWall(w.id, { groupId: undefined });
    });

    drawnUnits.filter(u => u.groupId === currentGroupId).forEach(u => {
      updateDrawnUnitById(u.id, { groupId: undefined });
    });

    onUngroup?.();
    setShowMenu(false);
  }, [currentGroupId, floors, walls, drawnUnits, updateFloorPlanFloor, updateFloorPlanWall, updateDrawnUnitById, onUngroup]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl+G to group
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g" && !e.shiftKey) {
        e.preventDefault();
        if (canGroup) {
          createGroup();
        }
      }

      // Ctrl+Shift+G to ungroup
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g" && e.shiftKey) {
        e.preventDefault();
        if (isInGroup) {
          ungroupSelection();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canGroup, isInGroup, createGroup, ungroupSelection]);

  // Click outside to close menu
  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = () => setShowMenu(false);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [showMenu]);

  // Get group member count
  const getGroupMemberCount = useCallback(() => {
    if (!currentGroupId) return 0;

    const floorCount = floors.filter(f => f.groupId === currentGroupId).length;
    const wallCount = walls.filter(w => w.groupId === currentGroupId).length;
    const unitCount = drawnUnits.filter(u => u.groupId === currentGroupId).length;

    return floorCount + wallCount + unitCount;
  }, [currentGroupId, floors, walls, drawnUnits]);

  return (
    <div className="relative">
      <ToolButton
        onClick={() => setShowMenu(!showMenu)}
        title={
          isInGroup
            ? `In Group (${getGroupMemberCount()} items) - Ctrl+Shift+G to ungroup`
            : canGroup
              ? "Group Selected (Ctrl+G)"
              : "Select multiple items to group"
        }
        disabled={!hasSelection && !canGroup}
        isActive={isInGroup}
        variant={isInGroup ? "success" : "default"}
      >
        {isInGroup ? <Ungroup className="w-4 h-4" /> : <Group className="w-4 h-4" />}
      </ToolButton>

      {/* Group menu */}
      {showMenu && (
        <div
          className="absolute right-full mr-1 top-0 bg-slate-800 rounded-lg shadow-lg border border-slate-600 py-1 min-w-[120px] z-50"
          onClick={(e) => e.stopPropagation()}
        >
          {canGroup && !isInGroup && (
            <button
              onClick={createGroup}
              className="w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
            >
              <Group className="w-3 h-3" />
              Group ({multiSelection.length})
            </button>
          )}

          {isInGroup && (
            <>
              <div className="px-3 py-1.5 text-[10px] text-slate-500">
                Group: {getGroupMemberCount()} items
              </div>
              <button
                onClick={ungroupSelection}
                className="w-full px-3 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
              >
                <Ungroup className="w-3 h-3" />
                Ungroup
              </button>
            </>
          )}

          {!canGroup && !isInGroup && (
            <div className="px-3 py-1.5 text-[10px] text-slate-500">
              Select 2+ items to group
            </div>
          )}
        </div>
      )}
    </div>
  );
}
