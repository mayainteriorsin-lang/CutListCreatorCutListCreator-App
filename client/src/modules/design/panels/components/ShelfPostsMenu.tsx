/**
 * Shelf Posts Menu
 *
 * Context menu for adjusting "Posts Below" count when right-clicking on a shelf.
 * Posts Below creates partial center posts from the shelf down to the bottom panel.
 */

import React, { useCallback } from "react";
import { Columns, Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// TYPES
// =============================================================================

export interface ShelfPostsMenuProps {
  /** Position to render the menu */
  position: { x: number; y: number };
  /** Shelf ID being edited */
  shelfId: string;
  /** Section index (0-based) */
  sectionIndex: number;
  /** Current posts below count */
  postsBelow: number;
  /** Callback when posts below count changes */
  onPostsBelowChange: (count: number) => void;
  /** Callback to close the menu */
  onClose: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MIN_POSTS_BELOW = 0;
const MAX_POSTS_BELOW = 9;

// =============================================================================
// COMPONENT
// =============================================================================

export function ShelfPostsMenu({
  position,
  shelfId,
  sectionIndex,
  postsBelow,
  onPostsBelowChange,
  onClose,
}: ShelfPostsMenuProps) {
  // Posts below handlers
  const handleDecrement = useCallback(() => {
    if (postsBelow > MIN_POSTS_BELOW) {
      onPostsBelowChange(postsBelow - 1);
    }
  }, [postsBelow, onPostsBelowChange]);

  const handleIncrement = useCallback(() => {
    if (postsBelow < MAX_POSTS_BELOW) {
      onPostsBelowChange(postsBelow + 1);
    }
  }, [postsBelow, onPostsBelowChange]);

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

  // Parse shelf number from ID (e.g., "MOD-SHELF-1-1" -> "Shelf 1")
  // Shelf IDs are 1-indexed: MOD-SHELF-{sectionIndex+1}-{shelfNumber}
  const shelfNumber = (() => {
    const parts = shelfId.split("-");
    if (parts.length >= 4) {
      return parseInt(parts[3], 10); // Already 1-indexed
    }
    return 1;
  })();

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
          "fixed z-50 min-w-[220px] rounded-lg border bg-white shadow-xl",
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
              Shelf {shelfNumber}
            </span>
            <span className="text-xs text-slate-400 ml-2">
              (Section {sectionIndex + 1})
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

        <div className="p-3">
          {/* Posts Below control */}
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Columns className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">Posts Below</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={postsBelow <= MIN_POSTS_BELOW}
                  className={cn(
                    "h-8 w-8 rounded flex items-center justify-center transition-colors",
                    "border border-slate-200 bg-white hover:bg-slate-100",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  aria-label="Decrease posts below count"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="w-10 h-8 flex items-center justify-center rounded border border-slate-200 bg-slate-50">
                  <span className="text-sm font-bold text-slate-700">
                    {postsBelow}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={postsBelow >= MAX_POSTS_BELOW}
                  className={cn(
                    "h-8 w-8 rounded flex items-center justify-center transition-colors",
                    "border border-slate-200 bg-white hover:bg-slate-100",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  aria-label="Increase posts below count"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Adds vertical dividers from lowest shelf to bottom
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default ShelfPostsMenu;
