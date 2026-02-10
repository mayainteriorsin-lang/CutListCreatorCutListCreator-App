/**
 * LaminateLibrary - Visual Laminate Gallery with Image Upload
 *
 * Features:
 * - Grid view of all laminates with thumbnails
 * - Add new laminate with image upload
 * - Edit/Delete existing laminates
 * - Search/filter laminates
 * - Wood grain indicator
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Search,
  Trash2,
  Upload,
  ImageIcon,
  Layers,
  X,
  Edit2,
  Grid3X3,
  List,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useGodownStore } from "@/features/material";
import { useLaminateCodes, useCreateLaminateCode } from "@/hooks/useLaminateGodown";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Types
type LaminateImageMap = Record<string, string>;

interface LaminateItem {
  code: string;
  name?: string;
  imageUrl?: string;
  hasWoodGrain?: boolean;
}

// LocalStorage keys for offline support
const LOCAL_STORAGE_CODES_KEY = "laminate_library_codes";
const LOCAL_STORAGE_IMAGES_KEY = "laminate_library_images";

// Load from localStorage
function loadLocalCodes(): string[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_CODES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {}
  return [];
}

function saveLocalCodes(codes: string[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_CODES_KEY, JSON.stringify(codes));
  } catch {}
}

function loadLocalImages(): LaminateImageMap {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_IMAGES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return {};
}

function saveLocalImages(images: LaminateImageMap) {
  try {
    localStorage.setItem(LOCAL_STORAGE_IMAGES_KEY, JSON.stringify(images));
  } catch {}
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
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1] ?? result;
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const res = await fetch(`/api/laminate-image/${encodeURIComponent(code)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mimeType: file.type, base64 }),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error || errorJson?.message || 'Upload failed');
  }

  const json = await res.json();
  // API returns { ok: true, data: { url: ... } } envelope
  return json?.data?.url ?? json?.url ?? null;
}

// Delete laminate image
async function deleteLaminateImage(code: string): Promise<void> {
  const res = await fetch(`/api/laminate-image/${encodeURIComponent(code)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    console.warn('Failed to delete laminate image');
  }
}

interface LaminateLibraryProps {
  woodGrainsPreferences?: Record<string, boolean>;
  onWoodGrainChange?: (code: string, enabled: boolean) => void;
}

export function LaminateLibrary({
  woodGrainsPreferences = {},
  onWoodGrainChange,
}: LaminateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [laminateImages, setLaminateImages] = useState<LaminateImageMap>(loadLocalImages);
  const [localCodes, setLocalCodes] = useState<string[]>(loadLocalCodes);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLaminate, setEditingLaminate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state for add/edit modal
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formHasWoodGrain, setFormHasWoodGrain] = useState(false);
  const [formImage, setFormImage] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: fetchedCodes, refetch: refetchCodes } = useLaminateCodes();
  const createCode = useCreateLaminateCode();
  const removeLaminate = useGodownStore((state) => state.removeLaminate);
  const fetchMaterials = useGodownStore((state) => state.fetch);

  // Get laminate codes - merge server data with localStorage
  const serverCodes = Array.isArray(fetchedCodes)
    ? fetchedCodes.map((c) => c.code)
    : [];

  // Combine server + local codes (deduplicated)
  const laminateCodes = [...new Set([...serverCodes, ...localCodes])].sort();

  // Sync server codes to localStorage when available
  useEffect(() => {
    if (serverCodes.length > 0) {
      const merged = [...new Set([...serverCodes, ...localCodes])];
      setLocalCodes(merged);
      saveLocalCodes(merged);
    }
  }, [serverCodes.length]);

  // Load images on mount
  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetchLaminateImages(),
      fetchMaterials(),
    ]).then(([images]) => {
      // Merge server images with local
      const mergedImages = { ...loadLocalImages(), ...images };
      setLaminateImages(mergedImages);
      saveLocalImages(mergedImages);
      setIsLoading(false);
    });
  }, [fetchMaterials]);

  // Filter laminates by search
  const filteredLaminates = laminateCodes.filter((code) =>
    code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Reset form
  const resetForm = useCallback(() => {
    setFormCode("");
    setFormName("");
    setFormHasWoodGrain(false);
    setFormImage(null);
    setFormImagePreview(null);
    setEditingLaminate(null);
  }, []);

  // Open add modal
  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (code: string) => {
    setFormCode(code);
    setFormName(code);
    setFormHasWoodGrain(woodGrainsPreferences[code] === true);
    setFormImagePreview(laminateImages[code] || null);
    setEditingLaminate(code);
    setIsAddModalOpen(true);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormImage(file);
      const reader = new FileReader();
      reader.onload = () => setFormImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!formCode.trim()) {
      toast({
        title: "Error",
        description: "Laminate code is required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    const code = formCode.trim();

    // Always save to localStorage first (offline support)
    const newLocalCodes = [...new Set([...localCodes, code])];
    setLocalCodes(newLocalCodes);
    saveLocalCodes(newLocalCodes);

    // Save image preview to localStorage if provided
    if (formImagePreview) {
      const newImages = { ...laminateImages, [code]: formImagePreview };
      setLaminateImages(newImages);
      saveLocalImages(newImages);
    }

    try {
      // Try to create on server if not editing
      if (!editingLaminate) {
        try {
          await createCode.mutateAsync({
            code: code,
            name: formName.trim() || code,
          });
        } catch (serverErr) {
          console.warn("Server save failed, using localStorage:", serverErr);
          // Continue - already saved locally
        }
      }

      // Try to upload image to server if provided
      if (formImage) {
        try {
          const imageUrl = await uploadLaminateImage(code, formImage);
          if (imageUrl) {
            const newImages = { ...laminateImages, [code]: imageUrl };
            setLaminateImages(newImages);
            saveLocalImages(newImages);
          }
        } catch (imgErr) {
          console.warn("Image upload failed, using local preview:", imgErr);
          // Continue - already saved locally with preview
        }
      }

      // Update wood grain preference
      if (onWoodGrainChange) {
        onWoodGrainChange(code, formHasWoodGrain);
      }

      // Try to save wood grain to backend
      try {
        await apiRequest("POST", "/api/wood-grains-preference", {
          laminateCode: code,
          woodGrainsEnabled: formHasWoodGrain,
        });
      } catch (e) {
        console.warn("Failed to save wood grain preference:", e);
      }

      // Try to refresh from server
      try {
        await fetchMaterials();
        refetchCodes();
      } catch {}

      toast({
        title: editingLaminate ? "Laminate Updated" : "Laminate Added",
        description: `"${code}" has been ${editingLaminate ? "updated" : "added"} to your library.`,
      });

      setIsAddModalOpen(false);
      resetForm();
    } catch (error) {
      console.error("Failed to save laminate:", error);
      // Still show success since it's saved locally
      toast({
        title: "Saved Locally",
        description: `"${code}" saved locally. Will sync when server is available.`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (code: string) => {
    if (!confirm(`Delete "${code}" from your laminate library?`)) return;

    // Remove from localStorage first
    const newLocalCodes = localCodes.filter((c) => c !== code);
    setLocalCodes(newLocalCodes);
    saveLocalCodes(newLocalCodes);

    // Remove image from localStorage
    const newImages = { ...laminateImages };
    delete newImages[code];
    setLaminateImages(newImages);
    saveLocalImages(newImages);

    try {
      await removeLaminate(code);
      await deleteLaminateImage(code);

      toast({
        title: "Laminate Deleted",
        description: `"${code}" has been removed from your library.`,
      });
    } catch (error) {
      console.error("Failed to delete from server:", error);
      // Still show success since deleted locally
      toast({
        title: "Laminate Deleted",
        description: `"${code}" has been removed locally.`,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Laminate Library</h3>
            <p className="text-xs text-slate-500">
              {laminateCodes.length} laminates in your collection
            </p>
          </div>
        </div>
        <Button onClick={openAddModal} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4 mr-1" />
          Add Laminate
        </Button>
      </div>

      {/* Search and View Toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search laminates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center border rounded-lg p-1 bg-slate-50">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-1.5 rounded",
              viewMode === "grid" ? "bg-white shadow-sm" : "hover:bg-slate-100"
            )}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-1.5 rounded",
              viewMode === "list" ? "bg-white shadow-sm" : "hover:bg-slate-100"
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : filteredLaminates.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <ImageIcon className="w-8 h-8 text-slate-400" />
          </div>
          <h4 className="font-medium text-slate-700 mb-1">
            {searchQuery ? "No laminates found" : "No laminates yet"}
          </h4>
          <p className="text-sm text-slate-500 mb-4">
            {searchQuery
              ? "Try a different search term"
              : "Add your first laminate to get started"}
          </p>
          {!searchQuery && (
            <Button onClick={openAddModal} variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              Add Laminate
            </Button>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredLaminates.map((code) => (
            <div
              key={code}
              className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-indigo-300 transition-all"
            >
              {/* Image */}
              <div className="aspect-square bg-slate-50 relative">
                {laminateImages[code] ? (
                  <img
                    src={laminateImages[code]}
                    alt={code}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-slate-300" />
                  </div>
                )}

                {/* Hover Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => openEditModal(code)}
                    className="p-2 bg-white rounded-full hover:bg-slate-100"
                  >
                    <Edit2 className="w-4 h-4 text-slate-700" />
                  </button>
                  <button
                    onClick={() => handleDelete(code)}
                    className="p-2 bg-white rounded-full hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm text-slate-800 truncate">
                    {code}
                  </span>
                  {woodGrainsPreferences[code] && (
                    <Badge
                      variant="outline"
                      className="ml-1 px-1 py-0 text-[10px] bg-amber-50 text-amber-700 border-amber-200"
                    >
                      <Layers className="w-2.5 h-2.5" />
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Add New Card */}
          <button
            onClick={openAddModal}
            className="aspect-square flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
          >
            <Plus className="w-8 h-8 text-slate-400 mb-2" />
            <span className="text-sm text-slate-500">Add New</span>
          </button>
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {filteredLaminates.map((code) => (
            <div
              key={code}
              className="flex items-center gap-4 p-3 bg-white rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors"
            >
              {/* Thumbnail */}
              <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                {laminateImages[code] ? (
                  <img
                    src={laminateImages[code]}
                    alt={code}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-slate-400" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{code}</span>
                  {woodGrainsPreferences[code] && (
                    <Badge
                      variant="outline"
                      className="px-1.5 py-0 text-[10px] bg-amber-50 text-amber-700 border-amber-200"
                    >
                      <Layers className="w-2.5 h-2.5 mr-0.5" />
                      Grain
                    </Badge>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(code)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-slate-500" />
                </button>
                <button
                  onClick={() => handleDelete(code)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLaminate ? "Edit Laminate" : "Add New Laminate"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Image Upload */}
            <div className="space-y-1.5">
              <Label>Laminate Image</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "relative h-28 rounded-lg border-2 border-dashed cursor-pointer transition-colors overflow-hidden",
                  formImagePreview
                    ? "border-indigo-300 bg-indigo-50"
                    : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50"
                )}
              >
                {formImagePreview ? (
                  <>
                    <img
                      src={formImagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <span className="text-white text-sm font-medium">
                        Click to change
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs text-slate-500">
                      Click to upload image
                    </span>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* Code Input */}
            <div className="space-y-1">
              <Label htmlFor="laminate-code" className="text-xs">Laminate Code *</Label>
              <Input
                id="laminate-code"
                placeholder="e.g., SF-001"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                disabled={!!editingLaminate}
                className="h-9"
              />
            </div>

            {/* Name Input */}
            <div className="space-y-1">
              <Label htmlFor="laminate-name" className="text-xs">Name (Optional)</Label>
              <Input
                id="laminate-name"
                placeholder="e.g., Sunset Oak"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-9"
              />
            </div>

            {/* Wood Grain Toggle */}
            <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
              <Checkbox
                id="wood-grain"
                checked={formHasWoodGrain}
                onCheckedChange={(checked) =>
                  setFormHasWoodGrain(checked === true)
                }
              />
              <Label
                htmlFor="wood-grain"
                className="flex-1 text-xs font-medium text-amber-900 cursor-pointer"
              >
                Has Wood Grain (locks rotation)
              </Label>
              <Layers className="w-4 h-4 text-amber-600" />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAddModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
              disabled={isSaving || !formCode.trim()}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Saving...
                </>
              ) : editingLaminate ? (
                "Update"
              ) : (
                "Add"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LaminateLibrary;
