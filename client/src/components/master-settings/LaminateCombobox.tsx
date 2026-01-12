/**
 * LaminateCombobox - SaaS-level Laminate Code Selector
 *
 * Features:
 * - Command palette style with fuzzy search
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Create new codes inline with "+" action
 * - Recent/frequently used codes section
 * - Wood grain indicator with visual badges
 * - Color preview swatch (future: from PDF catalog)
 * - Smooth animations and micro-interactions
 * - Accessible with proper ARIA labels
 */

import * as React from "react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronsUpDown,
  Plus,
  X,
  Palette,
  Clock,
  Trash2,
  Search,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
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
import { useLaminateCodes, useCreateLaminateCode } from "@/hooks/useLaminateGodown";
import { toast } from "@/hooks/use-toast";

// Constants
const RECENT_STORAGE_KEY = "laminate_recent_codes";
const MAX_RECENT = 5;

export interface LaminateComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onCreate?: (value: string) => void;
  laminateCodes?: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Wood grain preferences map: code -> boolean */
  woodGrainsPreferences?: Record<string, boolean>;
  /** Show wood grain badge indicator */
  showWoodGrainBadge?: boolean;
}

export function LaminateCombobox({
  value,
  onChange,
  onCreate,
  laminateCodes: externalCodes,
  placeholder = "Select laminate code...",
  disabled = false,
  className,
  woodGrainsPreferences = {},
  showWoodGrainBadge = true,
}: LaminateComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentCodes, setRecentCodes] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: fetchedCodes } = useLaminateCodes();
  const createCode = useCreateLaminateCode();
  const queryClient = useQueryClient();
  const removeLaminate = useGodownStore((state) => state.removeLaminate);
  const fetchMaterials = useGodownStore((state) => state.fetch);

  // Use external codes if provided, otherwise use fetched codes
  const laminateOptions = useMemo(() => {
    const safeExternalCodes = Array.isArray(externalCodes) ? externalCodes : [];
    const safeFetchedCodes = Array.isArray(fetchedCodes)
      ? fetchedCodes.map((c) => c.code)
      : [];
    const codes = safeExternalCodes.length > 0 ? safeExternalCodes : safeFetchedCodes;

    // Deduplicate and sort
    const seen = new Set<string>();
    const deduped: string[] = [];

    codes.forEach((code) => {
      const trimmed = (code || "").trim();
      const key = trimmed.toLowerCase();
      if (!trimmed || seen.has(key)) return;
      seen.add(key);
      deduped.push(trimmed);
    });

    return deduped.sort((a, b) => a.localeCompare(b));
  }, [externalCodes, fetchedCodes]);

  // Load recent codes from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Filter out codes that no longer exist
          const validRecent = parsed.filter((r: string) =>
            laminateOptions.some((l) => l.toLowerCase() === r.toLowerCase())
          );
          setRecentCodes(validRecent.slice(0, MAX_RECENT));
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [laminateOptions]);

  // Save to recent codes
  const addToRecent = useCallback((code: string) => {
    setRecentCodes((prev) => {
      const filtered = prev.filter((r) => r.toLowerCase() !== code.toLowerCase());
      const updated = [code, ...filtered].slice(0, MAX_RECENT);
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
    if (!searchQuery.trim()) return laminateOptions;
    const query = searchQuery.toLowerCase();
    return laminateOptions.filter((code) => code.toLowerCase().includes(query));
  }, [laminateOptions, searchQuery]);

  // Check if search query is a new code (not in existing list)
  const isNewCode = useMemo(() => {
    if (!searchQuery.trim()) return false;
    const query = searchQuery.trim().toLowerCase();
    return !laminateOptions.some((l) => l.toLowerCase() === query);
  }, [searchQuery, laminateOptions]);

  // Check if code has wood grain
  const hasWoodGrain = useCallback(
    (code: string) => {
      return woodGrainsPreferences[code] === true;
    },
    [woodGrainsPreferences]
  );

  // Handle code selection
  const handleSelect = (code: string) => {
    onChange(code);
    addToRecent(code);
    setOpen(false);
    setSearchQuery("");
  };

  // Handle creating new code
  const handleCreate = async () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    try {
      if (onCreate) {
        onCreate(trimmed);
      } else {
        // API requires both code and name - use code as name if not provided
        await createCode.mutateAsync({ code: trimmed, name: trimmed });
        await fetchMaterials();
      }

      toast({
        title: "Code Added",
        description: `"${trimmed}" has been added to your laminate codes.`,
      });

      onChange(trimmed);
      addToRecent(trimmed);
      setOpen(false);
      setSearchQuery("");
    } catch (error) {
      console.error("Failed to create laminate code:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create laminate code. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle delete code
  const handleDelete = async (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const target = code.toLowerCase();

    // Optimistic update for query cache
    queryClient.setQueryData(["godown", "laminates"], (prev: any) => {
      if (!Array.isArray(prev)) return prev;
      return prev.filter((entry: any) => (entry.code || "").toLowerCase() !== target);
    });

    removeLaminate(code);

    // Remove from recent
    setRecentCodes((prev) => prev.filter((r) => r.toLowerCase() !== target));
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

    // Clean up localStorage references for laminate
    cleanupDeletedLaminateFromLocalStorage(code);

    // Clear selection if deleted code was selected
    if (value && value.toLowerCase() === target) {
      onChange("");
    }

    toast({
      title: "Code Removed",
      description: `"${code}" has been removed from your laminate codes.`,
    });
  };

  // Helper function to clean deleted laminate from localStorage
  const cleanupDeletedLaminateFromLocalStorage = (deletedCode: string) => {
    if (typeof window === "undefined") return;

    const target = deletedCode.toLowerCase();

    try {
      // Clean shutter form memory
      const SHUTTER_FORM_MEMORY_KEY = "shutterFormMemory_v1";
      const shutterMemory = localStorage.getItem(SHUTTER_FORM_MEMORY_KEY);
      if (shutterMemory) {
        const parsed = JSON.parse(shutterMemory);
        let changed = false;
        if (parsed.shutterLaminateCode?.toLowerCase() === target) {
          delete parsed.shutterLaminateCode;
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
          "topPanelLaminateCode",
          "bottomPanelLaminateCode",
          "leftPanelLaminateCode",
          "rightPanelLaminateCode",
          "backPanelLaminateCode",
          "shutterLaminateCode",
          "shelfLaminateCode",
          "frontLaminateCode",
          "innerLaminateCode",
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
      console.error("Failed to clean localStorage after laminate deletion:", error);
    }
  };

  // Get recent codes that are not already in filtered results at top
  const recentToShow = useMemo(() => {
    if (searchQuery.trim()) return []; // Don't show recent when searching
    return recentCodes.filter((r) => r.toLowerCase() !== value?.toLowerCase());
  }, [recentCodes, value, searchQuery]);

  // Render wood grain badge
  const WoodGrainBadge = ({ code }: { code: string }) => {
    if (!showWoodGrainBadge || !hasWoodGrain(code)) return null;
    return (
      <Badge
        variant="outline"
        className="ml-1 px-1.5 py-0 text-[10px] bg-amber-50 text-amber-700 border-amber-200"
      >
        <Layers className="h-2.5 w-2.5 mr-0.5" />
        Grain
      </Badge>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select laminate code"
          disabled={disabled}
          className={cn(
            "w-full justify-between h-10 font-normal",
            !value && "text-muted-foreground",
            hasWoodGrain(value) && "border-amber-300 bg-amber-50/30",
            className
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {value ? (
              <>
                <Palette className="h-4 w-4 shrink-0 text-indigo-600" />
                <span className="truncate">{value}</span>
                <WoodGrainBadge code={value} />
              </>
            ) : (
              <>
                <Palette className="h-4 w-4 shrink-0 opacity-50" />
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
                if (e.key === "Enter" && isNewCode && searchQuery.trim()) {
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
            {isNewCode && searchQuery.trim() && (
              <>
                <CommandGroup>
                  <CommandItem onSelect={handleCreate} className="cursor-pointer">
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

            {/* Recent Codes */}
            {recentToShow.length > 0 && (
              <>
                <CommandGroup heading="Recent">
                  {recentToShow.map((code) => (
                    <CommandItem
                      key={`recent-${code}`}
                      value={code}
                      onSelect={() => handleSelect(code)}
                      className="cursor-pointer group"
                    >
                      <Clock className="mr-2 h-4 w-4 text-slate-400" />
                      <span className="flex-1">{code}</span>
                      <WoodGrainBadge code={code} />
                      {value?.toLowerCase() === code.toLowerCase() && (
                        <Check className="h-4 w-4 text-green-600 ml-2" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* All Codes */}
            <CommandGroup heading={searchQuery ? "Results" : "All Codes"}>
              {filteredOptions.length === 0 && !isNewCode ? (
                <CommandEmpty>
                  <div className="py-4 text-center">
                    <Palette className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">No codes found</p>
                    <p className="text-xs text-slate-400 mt-1">Type to add a new code</p>
                  </div>
                </CommandEmpty>
              ) : (
                filteredOptions.map((code) => (
                  <CommandItem
                    key={code}
                    value={code}
                    onSelect={() => handleSelect(code)}
                    className="cursor-pointer group"
                  >
                    <Palette
                      className={cn(
                        "mr-2 h-4 w-4",
                        hasWoodGrain(code) ? "text-amber-500" : "text-indigo-500"
                      )}
                    />
                    <span className="flex-1">{code}</span>
                    <WoodGrainBadge code={code} />
                    {value?.toLowerCase() === code.toLowerCase() && (
                      <Check className="h-4 w-4 text-green-600 mr-2" />
                    )}
                    <button
                      onClick={(e) => handleDelete(code, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                      aria-label={`Delete ${code}`}
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

export default LaminateCombobox;
