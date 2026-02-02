/**
 * UnitContextMenu
 *
 * Context menu for wardrobe units on canvas.
 * Allows setting shelf count and other unit-specific options.
 */

import React, { useCallback } from "react";
import { Layers, Minus, Plus, Trash2, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface UnitContextMenuProps {
  /** Position to render the menu */
  position: { x: number; y: number };
  /** Current shelf count of the unit */
  shelfCount: number;
  /** Whether the unit is locked (approved quote) */
  locked?: boolean;
  /** Callback when shelf count changes */
  onShelfCountChange: (count: number) => void;
  /** Callback to delete the unit */
  onDelete?: () => void;
  /** Callback to duplicate the unit */
  onDuplicate?: () => void;
  /** Callback to close the menu */
  onClose: () => void;
}

export function UnitContextMenu({
  position,
  shelfCount,
  locked = false,
  onShelfCountChange,
  onDelete,
  onDuplicate,
  onClose,
}: UnitContextMenuProps) {
  const handleShelfDecrement = useCallback(() => {
    if (shelfCount > 0) {
      onShelfCountChange(shelfCount - 1);
    }
  }, [shelfCount, onShelfCountChange]);

  const handleShelfIncrement = useCallback(() => {
    if (shelfCount < 10) {
      onShelfCountChange(shelfCount + 1);
    }
  }, [shelfCount, onShelfCountChange]);

  // Close on click outside
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClose();
    },
    [onClose]
  );

  // Prevent menu click from closing
  const handleMenuClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <>
      {/* Invisible backdrop to capture outside clicks */}
      <div
        className="fixed inset-0 z-40"
        onClick={handleBackdropClick}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />

      {/* Context menu */}
      <div
        className={cn(
          "fixed z-50 min-w-[180px] rounded-lg border bg-white shadow-lg",
          "animate-in fade-in-0 zoom-in-95 duration-100"
        )}
        style={{
          left: position.x,
          top: position.y,
        }}
        onClick={handleMenuClick}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b bg-slate-50 rounded-t-lg">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Unit Options
          </span>
        </div>

        {/* Shelf count control */}
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Shelves</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleShelfDecrement}
                disabled={locked || shelfCount <= 0}
                className={cn(
                  "h-7 w-7 rounded flex items-center justify-center transition-colors",
                  "border border-slate-200 bg-white hover:bg-slate-100",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                aria-label="Decrease shelf count"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <div className="w-10 h-7 flex items-center justify-center rounded border border-slate-200 bg-slate-50">
                <span className="text-sm font-semibold text-slate-700">
                  {shelfCount}
                </span>
              </div>
              <button
                type="button"
                onClick={handleShelfIncrement}
                disabled={locked || shelfCount >= 10}
                className={cn(
                  "h-7 w-7 rounded flex items-center justify-center transition-colors",
                  "border border-slate-200 bg-white hover:bg-slate-100",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                aria-label="Increase shelf count"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">
            Range: 0–10 shelves
          </p>
        </div>

        {/* Action buttons */}
        <div className="p-1.5">
          {onDuplicate && (
            <button
              type="button"
              onClick={() => {
                onDuplicate();
                onClose();
              }}
              disabled={locked}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-slate-700",
                "hover:bg-slate-100 transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Copy className="h-4 w-4" />
              Duplicate Unit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              disabled={locked}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-red-600",
                "hover:bg-red-50 transition-colors",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Trash2 className="h-4 w-4" />
              Delete Unit
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export default UnitContextMenu;
