/**
 * Category Sidebar Component
 * Vertical sidebar for filtering library modules by room category.
 */

import { cn } from "@/lib/utils";
import type { LibraryCategory } from "../types";
import {
  Home,
  ChefHat,
  Sofa,
  BookOpen,
  Wrench,
  Star,
  LayoutGrid,
  Package,
} from "lucide-react";

export interface CategoryCount {
  category: LibraryCategory | "all" | "favorites";
  count: number;
}

export interface CategorySidebarProps {
  categories: CategoryCount[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  all: { label: "All Modules", icon: <LayoutGrid className="w-4 h-4" />, color: "text-slate-600" },
  favorites: { label: "Favorites", icon: <Star className="w-4 h-4" />, color: "text-amber-500" },
  bedroom: { label: "Bedroom", icon: <Home className="w-4 h-4" />, color: "text-blue-600" },
  kitchen: { label: "Kitchen", icon: <ChefHat className="w-4 h-4" />, color: "text-amber-600" },
  living: { label: "Living Room", icon: <Sofa className="w-4 h-4" />, color: "text-emerald-600" },
  study: { label: "Study", icon: <BookOpen className="w-4 h-4" />, color: "text-violet-600" },
  utility: { label: "Utility", icon: <Wrench className="w-4 h-4" />, color: "text-slate-600" },
  custom: { label: "Custom", icon: <Package className="w-4 h-4" />, color: "text-indigo-600" },
};

export default function CategorySidebar({
  categories,
  activeCategory,
  onCategoryChange,
}: CategorySidebarProps) {
  return (
    <div className="w-48 flex-shrink-0 border-r border-slate-200 bg-slate-50/50 p-3 space-y-1">
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-3 mb-2">
        Categories
      </div>

      {categories.map((cat) => {
        const config = CATEGORY_CONFIG[cat.category] || CATEGORY_CONFIG.custom;
        const isActive = activeCategory === cat.category;

        return (
          <button
            key={cat.category}
            onClick={() => onCategoryChange(cat.category)}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              isActive
                ? "bg-white shadow-sm border border-slate-200 text-slate-900"
                : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
            )}
          >
            <span className={cn(isActive ? config.color : "text-slate-400")}>
              {config.icon}
            </span>
            <span className="flex-1 text-left truncate">{config.label}</span>
            {cat.count > 0 && (
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                  isActive
                    ? "bg-slate-100 text-slate-700"
                    : "bg-slate-200/60 text-slate-500"
                )}
              >
                {cat.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
