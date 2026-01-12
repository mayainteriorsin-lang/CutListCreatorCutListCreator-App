/**
 * PlywoodCombobox - SaaS-level Plywood Brand Selector
 *
 * Features:
 * - Command palette style with fuzzy search
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Create new brands inline with "+" action
 * - Recent/frequently used brands section
 * - Visual feedback with badges and icons
 * - Smooth animations and micro-interactions
 * - Accessible with proper ARIA labels
 */

import * as React from "react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus, X, Package, Clock, Trash2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useGodownStore } from "@/features/material";
import { useCreatePlywoodBrand, usePlywoodBrands } from "@/hooks/usePlywoodGodown";
import { toast } from "@/hooks/use-toast";

// Constants
const RECENT_STORAGE_KEY = "plywood_recent_brands";
const MAX_RECENT = 5;

export interface PlywoodComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onCreate?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function PlywoodCombobox({
  value,
  onChange,
  onCreate,
  placeholder = "Select plywood brand...",
  disabled = false,
  className,
}: PlywoodComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentBrands, setRecentBrands] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: brands = [] } = usePlywoodBrands();
  const createBrand = useCreatePlywoodBrand();
  const queryClient = useQueryClient();
  const removePlywood = useGodownStore((state) => state.removePlywood);
  const fetchMaterials = useGodownStore((state) => state.fetch);

  // Deduplicated and normalized brand list
  const plywoodOptions = useMemo(() => {
    const seen = new Set<string>();
    const deduped: string[] = [];
    const safeBrands = Array.isArray(brands) ? brands : [];

    safeBrands.forEach((entry) => {
      const brand = (entry.brand || "").trim();
      const key = brand.toLowerCase();
      if (!brand || seen.has(key)) return;
      seen.add(key);
      deduped.push(brand);
    });

    return deduped.sort((a, b) => a.localeCompare(b));
  }, [brands]);

  // Load recent brands from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Filter out brands that no longer exist
          const validRecent = parsed.filter((r: string) =>
            plywoodOptions.some((p) => p.toLowerCase() === r.toLowerCase())
          );
          setRecentBrands(validRecent.slice(0, MAX_RECENT));
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [plywoodOptions]);

  // Save to recent brands
  const addToRecent = useCallback((brand: string) => {
    setRecentBrands((prev) => {
      const filtered = prev.filter((r) => r.toLowerCase() !== brand.toLowerCase());
      const updated = [brand, ...filtered].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  }, []);

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return plywoodOptions;
    const query = searchQuery.toLowerCase();
    return plywoodOptions.filter((brand) =>
      brand.toLowerCase().includes(query)
    );
  }, [plywoodOptions, searchQuery]);

  // Check if search query is a new brand (not in existing list)
  const isNewBrand = useMemo(() => {
    if (!searchQuery.trim()) return false;
    const query = searchQuery.trim().toLowerCase();
    return !plywoodOptions.some((p) => p.toLowerCase() === query);
  }, [searchQuery, plywoodOptions]);

  // Handle brand selection
  const handleSelect = (brand: string) => {
    onChange(brand);
    addToRecent(brand);
    setOpen(false);
    setSearchQuery("");
  };

  // Handle creating new brand
  const handleCreate = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    try {
      if (onCreate) {
        onCreate(trimmed);
      } else {
        await createBrand.mutateAsync({ brand: trimmed });
        await fetchMaterials();
      }

      toast({
        title: "Brand Added",
        description: `"${trimmed}" has been added to your plywood brands.`,
      });

      onChange(trimmed);
      addToRecent(trimmed);
      setOpen(false);
      setSearchQuery("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create plywood brand. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle delete brand
  const handleDelete = async (brand: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const target = brand.toLowerCase();

    // Optimistic update for query cache
    queryClient.setQueryData(["godown", "plywood"], (prev: any) => {
      if (!Array.isArray(prev)) return prev;
      return prev.filter((entry: any) => (entry.brand || "").toLowerCase() !== target);
    });

    removePlywood(brand);

    // Remove from recent
    setRecentBrands((prev) => prev.filter((r) => r.toLowerCase() !== target));
    try {
      const stored = localStorage.getItem(RECENT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const updated = parsed.filter((r: string) => r.toLowerCase() !== target);
          localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(updated));
        }
      }
    } catch {
      // Ignore
    }

    // Clean up other localStorage references
    cleanupDeletedPlywoodFromLocalStorage(brand);

    // Clear selection if deleted brand was selected
    if (value && value.toLowerCase() === target) {
      onChange("");
    }

    toast({
      title: "Brand Removed",
      description: `"${brand}" has been removed from your plywood brands.`,
    });
  };

  // Helper function to clean deleted plywood from localStorage
  const cleanupDeletedPlywoodFromLocalStorage = (deletedBrand: string) => {
    if (typeof window === "undefined") return;

    const target = deletedBrand.toLowerCase();

    try {
      // Clean shutter form memory
      const SHUTTER_FORM_MEMORY_KEY = "shutterFormMemory_v1";
      const shutterMemory = localStorage.getItem(SHUTTER_FORM_MEMORY_KEY);
      if (shutterMemory) {
        const parsed = JSON.parse(shutterMemory);
        let changed = false;
        if (parsed.shutterPlywoodBrand?.toLowerCase() === target) {
          delete parsed.shutterPlywoodBrand;
          changed = true;
        }
        if (changed) {
          localStorage.setItem(SHUTTER_FORM_MEMORY_KEY, JSON.stringify(parsed));
        }
      }

      // Clean cabinet form memory
      const CABINET_FORM_MEMORY_KEY = "cabinetFormMemory_v1";
      const cabinetMemory = localStorage.getItem(CABINET_FORM_MEMORY_KEY);
      if (cabinetMemory) {
        const parsed = JSON.parse(cabinetMemory);
        let changed = false;
        const fieldsToCheck = [
          "topPanelPlywoodBrand",
          "bottomPanelPlywoodBrand",
          "leftPanelPlywoodBrand",
          "rightPanelPlywoodBrand",
          "backPanelPlywoodBrand",
          "shutterPlywoodBrand",
          "shelfPlywoodBrand",
        ];
        fieldsToCheck.forEach((field) => {
          if (parsed[field]?.toLowerCase() === target) {
            delete parsed[field];
            changed = true;
          }
        });
        if (changed) {
          localStorage.setItem(CABINET_FORM_MEMORY_KEY, JSON.stringify(parsed));
        }
      }
    } catch (error) {
      console.error("Failed to clean localStorage after plywood deletion:", error);
    }
  };

  // Get recent brands that are not already in filtered results at top
  const recentToShow = useMemo(() => {
    if (searchQuery.trim()) return []; // Don't show recent when searching
    return recentBrands.filter((r) => r.toLowerCase() !== value?.toLowerCase());
  }, [recentBrands, value, searchQuery]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select plywood brand"
          disabled={disabled}
          className={cn(
            "w-full justify-between h-10 font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {value ? (
              <>
                <Package className="h-4 w-4 shrink-0 text-amber-600" />
                <span className="truncate">{value}</span>
              </>
            ) : (
              <>
                <Package className="h-4 w-4 shrink-0 opacity-50" />
                <span>{placeholder}</span>
              </>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isNewBrand && searchQuery.trim()) {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              placeholder="Search or type to add..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="h-3 w-3 opacity-50" />
              </button>
            )}
          </div>

          <CommandList>
            {/* Create New Option */}
            {isNewBrand && searchQuery.trim() && (
              <>
                <CommandGroup>
                  <CommandItem
                    onSelect={handleCreate}
                    className="cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4 text-green-600" />
                    <span>Create </span>
                    <Badge variant="secondary" className="ml-1 font-medium">
                      {searchQuery.trim()}
                    </Badge>
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* Recent Brands */}
            {recentToShow.length > 0 && (
              <>
                <CommandGroup heading="Recent">
                  {recentToShow.map((brand) => (
                    <CommandItem
                      key={`recent-${brand}`}
                      value={brand}
                      onSelect={() => handleSelect(brand)}
                      className="cursor-pointer group"
                    >
                      <Clock className="mr-2 h-4 w-4 text-slate-400" />
                      <span className="flex-1">{brand}</span>
                      {value?.toLowerCase() === brand.toLowerCase() && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* All Brands */}
            <CommandGroup heading={searchQuery ? "Results" : "All Brands"}>
              {filteredOptions.length === 0 && !isNewBrand ? (
                <CommandEmpty>
                  <div className="py-4 text-center">
                    <Package className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">No brands found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Type to add a new brand
                    </p>
                  </div>
                </CommandEmpty>
              ) : (
                filteredOptions.map((brand) => (
                  <CommandItem
                    key={brand}
                    value={brand}
                    onSelect={() => handleSelect(brand)}
                    className="cursor-pointer group"
                  >
                    <Package className="mr-2 h-4 w-4 text-amber-500" />
                    <span className="flex-1">{brand}</span>
                    {value?.toLowerCase() === brand.toLowerCase() && (
                      <Check className="h-4 w-4 text-green-600 mr-2" />
                    )}
                    <button
                      onClick={(e) => handleDelete(brand, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                      aria-label={`Delete ${brand}`}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </button>
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </CommandList>

          {/* Footer hint */}
          <div className="border-t px-3 py-2 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Press Enter to create new</span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">↑↓</kbd>
              navigate
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] ml-2">⏎</kbd>
              select
            </span>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default PlywoodCombobox;
