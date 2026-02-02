/**
 * ShelfContextMenu
 *
 * Context menu for adjusting shelf count in wardrobe sections.
 * Appears on right-click within a wardrobe section on the design canvas.
 */

import React, { useCallback } from "react";
import { Layers, Minus, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ShelfContextMenuProps {
  /** Position to render the menu */
  position: { x: number; y: number };
  /** Current shelf count */
  shelfCount: number;
  /** Section index being edited */
  sectionIndex: number;
  /** Section type for display */
  sectionType: string;
  /** Callback when shelf count changes */
  onShelfCountChange: (count: number) => void;
  /** Callback to close the menu */
  onClose: () => void;
}

const SECTION_TYPE_LABELS: Record<string, string> = {
  long_hang: "Long Hang",
  short_hang: "Short Hang",
  shelves: "Shelves",
  drawers: "Drawers",
  open: "Open",
};

export function ShelfContextMenu({
  position,
  shelfCount,
  sectionIndex,
  sectionType,
  onShelfCountChange,
  onClose,
}: ShelfContextMenuProps) {
  const handleDecrement = useCallback(() => {
    if (shelfCount > 0) {
      onShelfCountChange(shelfCount - 1);
    }
  }, [shelfCount, onShelfCountChange]);

  const handleIncrement = useCallback(() => {
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

  const typeLabel = SECTION_TYPE_LABELS[sectionType] || sectionType;

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
          "fixed z-50 min-w-[200px] rounded-lg border bg-white shadow-xl",
          "animate-in fade-in-0 zoom-in-95 duration-100"
        )}
        style={{
          left: position.x,
          top: position.y,
        }}
        onClick={handleMenuClick}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b bg-slate-50 rounded-t-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Section {sectionIndex + 1}
            </span>
            <span className="text-xs text-slate-400 ml-2">
              ({typeLabel})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-5 w-5 rounded flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <X className="h-3 w-3 text-slate-400" />
          </button>
        </div>

        {/* Shelf count control */}
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Shelves</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={shelfCount <= 0}
                className={cn(
                  "h-8 w-8 rounded flex items-center justify-center transition-colors",
                  "border border-slate-200 bg-white hover:bg-slate-100",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                aria-label="Decrease shelf count"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="w-12 h-8 flex items-center justify-center rounded border border-slate-200 bg-slate-50">
                <span className="text-sm font-bold text-slate-700">
                  {shelfCount}
                </span>
              </div>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={shelfCount >= 10}
                className={cn(
                  "h-8 w-8 rounded flex items-center justify-center transition-colors",
                  "border border-slate-200 bg-white hover:bg-slate-100",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                aria-label="Increase shelf count"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            Range: 0-10 shelves per section
          </p>
        </div>
      </div>
    </>
  );
}

export default ShelfContextMenu;
