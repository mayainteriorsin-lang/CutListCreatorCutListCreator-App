/**
 * RateCardToolbar
 *
 * Search, filter, and action toolbar for rate card list.
 */

import React from "react";
import {
  Search,
  Plus,
  Download,
  Upload,
  Filter,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RateCardFilterOptions, RateCardUnitType } from "../../types/rateCard";
import { RATE_CARD_UNIT_TYPE_LABELS } from "../../types/rateCard";

interface RateCardToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterUnitType: RateCardUnitType | null;
  onFilterUnitTypeChange: (unitType: RateCardUnitType | null) => void;
  sortBy: RateCardFilterOptions["sortBy"];
  onSortByChange: (sortBy: RateCardFilterOptions["sortBy"]) => void;
  sortOrder: RateCardFilterOptions["sortOrder"];
  onSortOrderChange: (order: RateCardFilterOptions["sortOrder"]) => void;
  onClearFilters: () => void;
  onCreateNew: () => void;
  onImport: () => void;
  cardCount: number;
  hasFilters: boolean;
}

export const RateCardToolbar: React.FC<RateCardToolbarProps> = ({
  searchQuery,
  onSearchChange,
  filterUnitType,
  onFilterUnitTypeChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  onClearFilters,
  onCreateNew,
  onImport,
  cardCount,
  hasFilters,
}) => {
  return (
    <div className="space-y-3">
      {/* Main toolbar */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search rate cards..."
            className="pl-9"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
            >
              <X className="h-3.5 w-3.5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Unit Type Filter */}
        <Select
          value={filterUnitType || "all_types"}
          onValueChange={(v) => onFilterUnitTypeChange(v === "all_types" ? null : v as RateCardUnitType)}
        >
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2 text-gray-400" />
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_types">All Types</SelectItem>
            {Object.entries(RATE_CARD_UNIT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <ArrowUpDown className="h-4 w-4" />
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => onSortByChange("updatedAt")}
              className={sortBy === "updatedAt" ? "bg-gray-100" : ""}
            >
              Last Updated
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSortByChange("createdAt")}
              className={sortBy === "createdAt" ? "bg-gray-100" : ""}
            >
              Date Created
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSortByChange("name")}
              className={sortBy === "name" ? "bg-gray-100" : ""}
            >
              Name
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSortByChange("rate")}
              className={sortBy === "rate" ? "bg-gray-100" : ""}
            >
              Rate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort Order Toggle */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onSortOrderChange(sortOrder === "asc" ? "desc" : "asc")}
          title={sortOrder === "asc" ? "Ascending" : "Descending"}
        >
          {sortOrder === "asc" ? (
            <SortAsc className="h-4 w-4" />
          ) : (
            <SortDesc className="h-4 w-4" />
          )}
        </Button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Import */}
        <Button variant="outline" onClick={onImport}>
          <Upload className="h-4 w-4 mr-2" />
          Import
        </Button>

        {/* Create New */}
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          New Rate Card
        </Button>
      </div>

      {/* Filter status bar */}
      {hasFilters && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">
            Showing {cardCount} rate card{cardCount !== 1 ? "s" : ""}
          </span>

          {searchQuery && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs flex items-center gap-1">
              "{searchQuery}"
              <button onClick={() => onSearchChange("")}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filterUnitType && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs flex items-center gap-1">
              {RATE_CARD_UNIT_TYPE_LABELS[filterUnitType]}
              <button onClick={() => onFilterUnitTypeChange(null)}>
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          <button
            onClick={onClearFilters}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
};

export default RateCardToolbar;
