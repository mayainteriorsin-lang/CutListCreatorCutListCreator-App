/**
 * ShelfContextMenu
 *
 * Context menu for adjusting shelf count and center post count in wardrobe sections.
 * Shows BOTH controls in a single menu for quick editing.
 */

import React, { useCallback } from "react";
import { Layers, Minus, Plus, Columns, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ShelfContextMenuProps {
  /** Position to render the menu */
  position: { x: number; y: number };
  /** Type of menu to show (for header display) */
  menuType: "section" | "centerPost";
  /** Current shelf count */
  shelfCount: number;
  /** Section index being edited */
  sectionIndex: number;
  /** Section type for display */
  sectionType: string;
  /** Current center post count */
  centerPostCount: number;
  /** Callback when shelf count changes */
  onShelfCountChange: (count: number) => void;
  /** Callback when center post count changes */
  onCenterPostCountChange: (count: number) => void;
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

const MIN_SHELF_COUNT = 0;
const MAX_SHELF_COUNT = 10;
const MIN_POST_COUNT = 0;
const MAX_POST_COUNT = 9;

export function ShelfContextMenu({
  position,
  shelfCount,
  sectionIndex,
  sectionType,
  centerPostCount,
  onShelfCountChange,
  onCenterPostCountChange,
  onClose,
}: ShelfContextMenuProps) {
  // Shelf handlers
  const handleShelfDecrement = useCallback(() => {
    if (shelfCount > MIN_SHELF_COUNT) {
      onShelfCountChange(shelfCount - 1);
    }
  }, [shelfCount, onShelfCountChange]);

  const handleShelfIncrement = useCallback(() => {
    if (shelfCount < MAX_SHELF_COUNT) {
      onShelfCountChange(shelfCount + 1);
    }
  }, [shelfCount, onShelfCountChange]);

  // Center post handlers
  const handlePostDecrement = useCallback(() => {
    if (centerPostCount > MIN_POST_COUNT) {
      onCenterPostCountChange(centerPostCount - 1);
    }
  }, [centerPostCount, onCenterPostCountChange]);

  const handlePostIncrement = useCallback(() => {
    if (centerPostCount < MAX_POST_COUNT) {
      onCenterPostCountChange(centerPostCount + 1);
    }
  }, [centerPostCount, onCenterPostCountChange]);

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
          "fixed z-50 min-w-[240px] rounded-lg border bg-white shadow-xl",
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

        <div className="p-3 space-y-3">
          {/* Shelf count control */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Shelves</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleShelfDecrement}
                  disabled={shelfCount <= MIN_SHELF_COUNT}
                  className={cn(
                    "h-8 w-8 rounded flex items-center justify-center transition-colors",
                    "border border-slate-200 bg-white hover:bg-slate-100",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  aria-label="Decrease shelf count"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="w-10 h-8 flex items-center justify-center rounded border border-slate-200 bg-slate-50">
                  <span className="text-sm font-bold text-slate-700">
                    {shelfCount}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleShelfIncrement}
                  disabled={shelfCount >= MAX_SHELF_COUNT}
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
            <p className="text-[10px] text-slate-400 mt-1">
              Range: {MIN_SHELF_COUNT}-{MAX_SHELF_COUNT} shelves per section
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Center Post count control */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Columns className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Center Posts</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePostDecrement}
                  disabled={centerPostCount <= MIN_POST_COUNT}
                  className={cn(
                    "h-8 w-8 rounded flex items-center justify-center transition-colors",
                    "border border-slate-200 bg-white hover:bg-slate-100",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  aria-label="Decrease center post count"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="w-10 h-8 flex items-center justify-center rounded border border-slate-200 bg-slate-50">
                  <span className="text-sm font-bold text-slate-700">
                    {centerPostCount}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handlePostIncrement}
                  disabled={centerPostCount >= MAX_POST_COUNT}
                  className={cn(
                    "h-8 w-8 rounded flex items-center justify-center transition-colors",
                    "border border-slate-200 bg-white hover:bg-slate-100",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  aria-label="Increase center post count"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Range: {MIN_POST_COUNT}-{MAX_POST_COUNT} center posts
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default ShelfContextMenu;
