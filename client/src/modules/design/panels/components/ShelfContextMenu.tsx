/**
 * Shelf Context Menu
 *
 * Context menu for adjusting shelf count and posts below in wardrobe sections.
 * Shows TWO TABS: Shelves and Posts for quick editing.
 */

import React, { useCallback, useState } from "react";
import { Layers, Minus, Plus, Columns, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTION_TYPE_LABELS } from "../config";

// =============================================================================
// TYPES
// =============================================================================

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
  /** Current posts below count */
  postsBelow: number;
  /** Callback when shelf count changes */
  onShelfCountChange: (count: number) => void;
  /** Callback when center post count changes */
  onCenterPostCountChange: (count: number) => void;
  /** Callback when posts below count changes */
  onPostsBelowChange: (count: number) => void;
  /** Callback to close the menu */
  onClose: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MIN_SHELF_COUNT = 0;
const MAX_SHELF_COUNT = 10;
const MIN_POST_COUNT = 0;
const MAX_POST_COUNT = 9;

// =============================================================================
// COMPONENT
// =============================================================================

export function ShelfContextMenu({
  position,
  shelfCount,
  sectionIndex,
  sectionType,
  centerPostCount,
  postsBelow,
  onShelfCountChange,
  onCenterPostCountChange,
  onPostsBelowChange,
  onClose,
}: ShelfContextMenuProps) {
  // Tab state: "shelves" or "posts"
  const [activeTab, setActiveTab] = useState<"shelves" | "posts">("shelves");

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

  // Posts below handlers
  const handlePostsBelowDecrement = useCallback(() => {
    if (postsBelow > MIN_POST_COUNT) {
      onPostsBelowChange(postsBelow - 1);
    }
  }, [postsBelow, onPostsBelowChange]);

  const handlePostsBelowIncrement = useCallback(() => {
    if (postsBelow < MAX_POST_COUNT) {
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

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab("shelves")}
            className={cn(
              "flex-1 px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "shelves"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            )}
          >
            <Layers className="h-4 w-4 inline mr-1.5" />
            Shelves
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("posts")}
            className={cn(
              "flex-1 px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "posts"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            )}
          >
            <Columns className="h-4 w-4 inline mr-1.5" />
            Posts
          </button>
        </div>

        <div className="p-3">
          {/* Shelves Tab Content */}
          {activeTab === "shelves" && (
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
          )}

          {/* Posts Tab Content */}
          {activeTab === "posts" && (
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Columns className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">Posts Below</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePostsBelowDecrement}
                    disabled={postsBelow <= MIN_POST_COUNT}
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
                    onClick={handlePostsBelowIncrement}
                    disabled={postsBelow >= MAX_POST_COUNT}
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
                {shelfCount > 0
                  ? "Adds vertical dividers from lowest shelf to bottom"
                  : "Adds vertical dividers spanning full section height"}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ShelfContextMenu;
