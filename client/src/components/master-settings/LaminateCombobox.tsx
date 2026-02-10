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
  Upload,
  ImageIcon,
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
const LOCAL_STORAGE_CODES_KEY = "laminate_library_codes";
const LOCAL_STORAGE_IMAGES_KEY = "laminate_library_images";
const MAX_RECENT = 5;

// Laminate image cache
type LaminateImageMap = Record<string, string>;

// Load codes from localStorage (same key as LaminateLibrary)
function loadLocalCodes(): string[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_CODES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

// Save codes to localStorage
function saveLocalCodes(codes: string[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_CODES_KEY, JSON.stringify(codes));
  } catch {
    // Ignore storage errors
  }
}

// Load images from localStorage (same key as LaminateLibrary)
function loadLocalImages(): LaminateImageMap {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_IMAGES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    }
  } catch {
    // Ignore parse errors
  }
  return {};
}

// Fetch laminate images from server
async function fetchLaminateImages(): Promise<LaminateImageMap> {
  try {
    const res = await fetch('/api/laminate-images');
    if (!res.ok) return {};
    const json = await res.json();
    // API returns { ok: true, data: {...} } envelope
    return json?.data ?? json ?? {};
  } catch {
    return {};
  }
}

// Upload laminate image
async function uploadLaminateImage(code: string, file: File): Promise<string | null> {
  try {
    // Convert file to base64
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:mime;base64, prefix
        const base64Data = result.split(',')[1] ?? result;
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const res = await fetch(`/api/laminate-image/${encodeURIComponent(code)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mimeType: file.type,
        base64,
      }),
    });

    if (!res.ok) {
      const errorJson = await res.json().catch(() => ({}));
      throw new Error(errorJson?.error || errorJson?.message || 'Upload failed');
    }

    const json = await res.json();
    // API returns { ok: true, data: { url: ... } } envelope
    return json?.data?.url ?? json?.url ?? null;
  } catch (error) {
    console.error('Failed to upload laminate image:', error);
    throw error;
  }
}

export interface LaminateComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onCreate?: (value: string) => void;
  laminateCodes?: string[];
  /** @deprecated Use laminateCodes instead */
  externalCodes?: string[];
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
  laminateCodes,
  externalCodes,
  placeholder = "Select laminate code...",
  disabled = false,
  className,
  woodGrainsPreferences = {},
  showWoodGrainBadge = true,
}: LaminateComboboxProps) {
  // Support both prop names (externalCodes is deprecated alias)
  const providedCodes = laminateCodes ?? externalCodes;
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentCodes, setRecentCodes] = useState<string[]>([]);
  const [laminateImages, setLaminateImages] = useState<LaminateImageMap>(loadLocalImages);
  const [localCodes, setLocalCodes] = useState<string[]>(loadLocalCodes);
  const [uploadingCode, setUploadingCode] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: fetchedCodes } = useLaminateCodes();
  const createCode = useCreateLaminateCode();
  const queryClient = useQueryClient();
  const removeLaminate = useGodownStore((state) => state.removeLaminate);
  const fetchMaterials = useGodownStore((state) => state.fetch);

  // Use external codes if provided, otherwise merge fetched codes + localStorage codes
  const laminateOptions = useMemo(() => {
    const safeProvidedCodes = Array.isArray(providedCodes) ? providedCodes : [];
    const safeFetchedCodes = Array.isArray(fetchedCodes)
      ? fetchedCodes.map((c) => c.code)
      : [];
    const safeLocalCodes = Array.isArray(localCodes) ? localCodes : [];

    // Merge server + localStorage codes (localStorage fallback when server is down)
    const codes = safeProvidedCodes.length > 0
      ? safeProvidedCodes
      : [...safeFetchedCodes, ...safeLocalCodes];

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
  }, [providedCodes, fetchedCodes, localCodes]);

  // Load laminate images on mount (merge server + localStorage)
  useEffect(() => {
    const localImages = loadLocalImages();
    fetchLaminateImages().then((serverImages) => {
      // Merge server images with local images (server takes priority)
      setLaminateImages({ ...localImages, ...serverImages });
    });
  }, []);

  // Refresh data when dropdown opens
  useEffect(() => {
    if (open) {
      // Refresh localStorage codes (may have been added from Laminate Library)
      setLocalCodes(loadLocalCodes());
      setLaminateImages((prev) => ({ ...prev, ...loadLocalImages() }));

      // Force refresh the materials when dropdown opens
      fetchMaterials();
      queryClient.invalidateQueries({ queryKey: ["laminate-code-godown"] });
    }
  }, [open, fetchMaterials, queryClient]);

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

  // Get thumbnail URL for a laminate code
  const getThumbnail = useCallback(
    (code: string) => {
      return laminateImages[code] || null;
    },
    [laminateImages]
  );

  // Handle image upload for a laminate code
  const handleImageUpload = useCallback(async (code: string, file: File) => {
    setUploadingCode(code);
    try {
      const url = await uploadLaminateImage(code, file);
      if (url) {
        setLaminateImages((prev) => ({ ...prev, [code]: url }));
        toast({
          title: "Image Uploaded",
          description: `Thumbnail for "${code}" has been saved.`,
        });
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload image.",
        variant: "destructive",
      });
    } finally {
      setUploadingCode(null);
    }
  }, []);

  // Trigger file input for a specific code
  const triggerUpload = useCallback((code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setUploadingCode(code);
    fileInputRef.current?.click();
  }, []);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingCode) {
      handleImageUpload(uploadingCode, file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [uploadingCode, handleImageUpload]);

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

    // Always save to localStorage first (offline support)
    const currentLocal = loadLocalCodes();
    if (!currentLocal.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      const updatedLocal = [...currentLocal, trimmed];
      saveLocalCodes(updatedLocal);
      setLocalCodes(updatedLocal);
    }

    try {
      if (onCreate) {
        onCreate(trimmed);
        onChange(trimmed);
        addToRecent(trimmed);
      } else {
        // Try to save to server (may fail if database is down)
        try {
          const result = await createCode.mutateAsync({ code: trimmed, name: trimmed });
          // logger.info('✅ Laminate code created:', result);

          // Force refresh materials to get the new code
          await fetchMaterials();

          // Also invalidate the react-query cache
          queryClient.invalidateQueries({ queryKey: ["laminate-code-godown"] });
        } catch (serverError) {
          console.warn('⚠️ Server save failed, using localStorage:', serverError);
          // Don't show error toast - localStorage save succeeded
        }

        toast({
          title: "Code Added",
          description: `"${trimmed}" has been added to your laminate codes.`,
        });

        onChange(trimmed);
        addToRecent(trimmed);
      }

      setOpen(false);
      setSearchQuery("");
    } catch (error) {
      console.error("❌ Failed to create laminate code:", error);
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

    // Remove from localStorage
    const currentLocal = loadLocalCodes();
    const updatedLocal = currentLocal.filter((c) => c.toLowerCase() !== target);
    saveLocalCodes(updatedLocal);
    setLocalCodes(updatedLocal);

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

  // Render thumbnail preview
  const ThumbnailPreview = ({ code, size = 'md' }: { code: string; size?: 'sm' | 'md' }) => {
    const url = getThumbnail(code);
    const sizeClass = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';

    if (url) {
      return (
        <img
          src={url}
          alt={code}
          className={cn(sizeClass, "rounded border border-slate-200 object-cover shrink-0")}
        />
      );
    }

    // Placeholder when no image
    return (
      <div className={cn(sizeClass, "rounded border border-dashed border-slate-300 flex items-center justify-center bg-slate-50 shrink-0")}>
        <ImageIcon className="w-3 h-3 text-slate-400" />
      </div>
    );
  };

  return (
    <>
      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

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
                  <ThumbnailPreview code={value} />
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
                        <ThumbnailPreview code={code} size="sm" />
                        <span className="flex-1 ml-2">{code}</span>
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
                      <ThumbnailPreview code={code} size="sm" />
                      <span className="flex-1 ml-2">{code}</span>
                      <WoodGrainBadge code={code} />
                      {value?.toLowerCase() === code.toLowerCase() && (
                        <Check className="h-4 w-4 text-green-600 mr-2" />
                      )}
                      {/* Upload button - show on hover */}
                      <button
                        onClick={(e) => triggerUpload(code, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-indigo-100 rounded transition-opacity"
                        aria-label={`Upload image for ${code}`}
                        title="Upload thumbnail"
                      >
                        <Upload className="h-3 w-3 text-indigo-500" />
                      </button>
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
    </>
  );
}

export default LaminateCombobox;
