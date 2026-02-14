/**
 * Library Page - Module Template Storage
 * Redesigned with category sidebar and improved UI.
 * Uses persistent Zustand store for auto-save.
 */

import { useState, useEffect, useMemo } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Search, Package, Save, Clock, CreditCard } from "lucide-react";
import { generateUUID } from "@/lib/uuid";
import type { LibraryModule, LibraryCategory } from "@/modules/library/types";
import {
  inferCategoryFromUnitType,
  publishLibraryModule,
  unpublishLibraryModule,
  createRateCardFromLibraryModule,
  createRateCardsForAllModules,
} from "@/modules/library/storage";
import { useLibraryStore } from "@/modules/library/store/useLibraryStore";
import { PREDEFINED_TEMPLATES } from "@/modules/library/presets";
import { DEFAULT_UNIT_TYPES } from "@/modules/visual-quotation/types/core";
import { UNIT_TYPE_LABELS } from "@/constants/unitTypes";
import { CategorySidebar, ModuleCard, ModulePreviewModal } from "@/modules/library/components";
import type { CategoryCount } from "@/modules/library/components";

// =============================================================================
// Constants
// =============================================================================

const EMPTY_FORM: Partial<LibraryModule> = {
  name: "",
  unitType: "wardrobe",
  description: "",
  widthMm: 0,
  heightMm: 0,
  depthMm: 0,
  shutterCount: 0,
  loftEnabled: false,
  loftHeightMm: 0,
  sectionCount: 1,
  carcassMaterial: "plywood",
  shutterMaterial: "laminate",
  tags: [],
  isTemplate: true,
};

const CATEGORY_ORDER: (LibraryCategory | "all" | "favorites")[] = [
  "all",
  "favorites",
  "bedroom",
  "kitchen",
  "living",
  "study",
  "utility",
  "custom",
];

// =============================================================================
// Library Page Component
// =============================================================================

export default function LibraryPage() {
  // Use persistent store for modules (auto-saves to localStorage)
  const {
    modules,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    addModule,
    updateModule,
    deleteModule,
    toggleFavorite,
    syncFromLocalStorage,
    lastSaved,
  } = useLibraryStore();

  // Local UI state
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingModule, setEditingModule] = useState<LibraryModule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LibraryModule | null>(null);
  const [previewModule, setPreviewModule] = useState<LibraryModule | null>(null);
  const [formData, setFormData] = useState<Partial<LibraryModule>>(EMPTY_FORM);
  const [tagInput, setTagInput] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<Record<string, { published: boolean; shareCode?: string }>>({});

  // Sync from localStorage on mount (handles migration from old storage)
  useEffect(() => {
    syncFromLocalStorage();

    // Add predefined templates if missing
    const existingIds = new Set(modules.map((m) => m.id));
    const missing = PREDEFINED_TEMPLATES.filter((p) => !existingIds.has(p.id));
    if (missing.length > 0) {
      missing.forEach((m) => addModule(m));
      logger.info(`[Library] Added ${missing.length} predefined templates`, { context: 'library-page' });
    }
  }, []);

  // Calculate category counts
  const categoryCounts = useMemo<CategoryCount[]>(() => {
    const counts: Record<string, number> = {
      all: modules.length,
      favorites: modules.filter((m) => m.favorite).length,
    };

    for (const m of modules) {
      const cat = m.category || inferCategoryFromUnitType(m.unitType);
      counts[cat] = (counts[cat] || 0) + 1;
    }

    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      count: counts[cat] || 0,
    }));
  }, [modules]);

  // Filter modules by category and search
  const filtered = useMemo(() => {
    return modules.filter((m) => {
      // Category filter
      if (activeCategory === "favorites") {
        if (!m.favorite) return false;
      } else if (activeCategory !== "all") {
        const mCat = m.category || inferCategoryFromUnitType(m.unitType);
        if (mCat !== activeCategory) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          m.name.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q)) ||
          (UNIT_TYPE_LABELS[m.unitType] || "").toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [modules, activeCategory, searchQuery]);

  // Open add dialog
  const handleAdd = () => {
    setEditingModule(null);
    setFormData({ ...EMPTY_FORM });
    setTagInput("");
    setShowDialog(true);
  };

  // Open edit dialog
  const handleEdit = (mod: LibraryModule) => {
    setEditingModule(mod);
    setFormData({ ...mod });
    setTagInput(mod.tags.join(", "));
    setShowDialog(true);
  };

  // Save (create or update) - auto-saves to persistent store
  const handleSave = () => {
    setSyncing(true);
    const now = new Date().toISOString();
    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (editingModule) {
        // Update existing module
        updateModule(editingModule.id, {
          ...formData,
          tags,
          category: inferCategoryFromUnitType(formData.unitType || "other"),
        });
      } else {
        // Create new module
        const newModule: LibraryModule = {
          id: generateUUID(),
          name: formData.name || "Untitled Module",
          unitType: formData.unitType || "other",
          source: "custom",
          description: formData.description,
          widthMm: 0, // Templates have no dimensions
          heightMm: 0,
          depthMm: 0,
          shutterCount: formData.shutterCount,
          loftEnabled: formData.loftEnabled,
          loftHeightMm: formData.loftHeightMm,
          sectionCount: formData.sectionCount,
          carcassMaterial: formData.carcassMaterial,
          shutterMaterial: formData.shutterMaterial,
          shutterLaminateCode: formData.shutterLaminateCode,
          tags,
          createdAt: now,
          updatedAt: now,
          category: inferCategoryFromUnitType(formData.unitType || "other"),
          isTemplate: true,
          favorite: false,
        };
        addModule(newModule);
      }
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setSyncing(false);
      setShowDialog(false);
    }
  };

  // Toggle favorite - auto-saves to persistent store
  const handleToggleFavorite = (id: string) => {
    toggleFavorite(id);
  };

  // Confirm delete - auto-saves to persistent store
  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    deleteModule(deleteTarget.id);
    setDeleteTarget(null);
    setShowDeleteDialog(false);
  };

  // Publish module - make it shareable online
  const handlePublish = async (id: string) => {
    setSyncing(true);
    try {
      const { success, shareCode, error } = await publishLibraryModule(id);
      if (success && shareCode) {
        setPublishStatus((prev) => ({
          ...prev,
          [id]: { published: true, shareCode },
        }));
      } else {
        console.error('Publish failed:', error);
      }
    } catch (error) {
      console.error('Publish failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Unpublish module
  const handleUnpublish = async (id: string) => {
    setSyncing(true);
    try {
      const { success, error } = await unpublishLibraryModule(id);
      if (success) {
        setPublishStatus((prev) => ({
          ...prev,
          [id]: { published: false, shareCode: undefined },
        }));
      } else {
        console.error('Unpublish failed:', error);
      }
    } catch (error) {
      console.error('Unpublish failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Create rate card for a single module
  const handleCreateRateCard = (mod: LibraryModule) => {
    const result = createRateCardFromLibraryModule(mod);
    if (result.success) {
      alert(`Rate card created for "${mod.name}"! Go to Rate Cards page to view.`);
    } else {
      alert(`Failed to create rate card: ${result.error}`);
    }
  };

  // Create rate cards for all modules
  const handleCreateAllRateCards = () => {
    const result = createRateCardsForAllModules();
    alert(`Rate cards created: ${result.created} new, ${result.skipped} skipped (already exist), ${result.failed} failed`);
  };

  return (
    <AppLayout
      title="Module Library"
      subtitle={`${modules.length} templates`}
      headerActions={
        <div className="flex items-center gap-2">
          <Button
            onClick={handleCreateAllRateCards}
            variant="outline"
            className="h-9 px-3 text-sm"
            title="Create rate cards for all library modules"
          >
            <CreditCard className="h-4 w-4 mr-1.5" />
            Create All Rate Cards
          </Button>
          <Button
            onClick={handleAdd}
            className="h-9 px-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl shadow-lg shadow-indigo-500/20"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Template
          </Button>
        </div>
      }
    >
      <div className="flex h-[calc(100vh-140px)] -m-4">
        {/* Category Sidebar */}
        <CategorySidebar
          categories={categoryCounts}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Search Bar */}
          <div className="p-4 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search templates by name, type, or tag..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 bg-slate-50 border-slate-200"
                />
              </div>
              {/* Auto-save indicator */}
              {lastSaved && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                  <Save className="h-3.5 w-3.5" />
                  <span>Auto-saved</span>
                </div>
              )}
            </div>
          </div>

          {/* Module Grid */}
          <div className="flex-1 overflow-auto p-4 bg-slate-50/50">
            {filtered.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 mb-3">
                  {searchQuery ? "No templates match your search" : "No templates in this category"}
                </p>
                {modules.length === 0 && !searchQuery && (
                  <p className="text-xs text-slate-400 mb-4">
                    Save modules from the Design page using the "Library" button to see them here.
                    <br />
                    <span className="text-emerald-600">All changes auto-save instantly!</span>
                  </p>
                )}
                <Button onClick={handleAdd} variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Template
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filtered.map((mod) => (
                  <ModuleCard
                    key={mod.id}
                    module={mod}
                    onEdit={() => handleEdit(mod)}
                    onDelete={() => {
                      setDeleteTarget(mod);
                      setShowDeleteDialog(true);
                    }}
                    onToggleFavorite={() => handleToggleFavorite(mod.id)}
                    onPreview={() => setPreviewModule(mod)}
                    onCreateRateCard={() => handleCreateRateCard(mod)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingModule ? "Edit Template" : "Add Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Name & Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">
                  Template Name
                </label>
                <Input
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Master Wardrobe"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">
                  Module Type
                </label>
                <select
                  value={formData.unitType || "wardrobe"}
                  onChange={(e) => setFormData({ ...formData, unitType: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-slate-200 text-sm bg-white"
                >
                  {DEFAULT_UNIT_TYPES.map((ut) => (
                    <option key={ut} value={ut}>
                      {UNIT_TYPE_LABELS[ut] || ut}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Config */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">
                  Shutters
                </label>
                <Input
                  type="number"
                  value={formData.shutterCount ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, shutterCount: Number(e.target.value) || 0 })
                  }
                  placeholder="2"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">
                  Sections
                </label>
                <Input
                  type="number"
                  value={formData.sectionCount ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, sectionCount: Number(e.target.value) || 1 })
                  }
                  placeholder="1"
                />
              </div>
              <div className="flex items-end gap-2 pb-0.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.loftEnabled || false}
                    onChange={(e) =>
                      setFormData({ ...formData, loftEnabled: e.target.checked })
                    }
                    className="rounded border-slate-300"
                  />
                  <span className="text-xs font-medium text-slate-600">Loft</span>
                </label>
              </div>
            </div>

            {/* Materials */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">
                  Carcass Material
                </label>
                <select
                  value={formData.carcassMaterial || "plywood"}
                  onChange={(e) =>
                    setFormData({ ...formData, carcassMaterial: e.target.value })
                  }
                  className="w-full h-9 px-3 rounded-md border border-slate-200 text-sm bg-white"
                >
                  <option value="plywood">Plywood</option>
                  <option value="mdf">MDF</option>
                  <option value="particle_board">Particle Board</option>
                  <option value="hdhmr">HDHMR</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">
                  Shutter Material
                </label>
                <select
                  value={formData.shutterMaterial || "laminate"}
                  onChange={(e) =>
                    setFormData({ ...formData, shutterMaterial: e.target.value })
                  }
                  className="w-full h-9 px-3 rounded-md border border-slate-200 text-sm bg-white"
                >
                  <option value="laminate">Laminate</option>
                  <option value="acrylic">Acrylic</option>
                  <option value="veneer">Veneer</option>
                  <option value="lacquer">Lacquer</option>
                  <option value="membrane">Membrane</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                Description
              </label>
              <Input
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description..."
              />
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">
                Tags (comma-separated)
              </label>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="bedroom, premium, modern"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {editingModule ? "Save Changes" : "Add Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-4">
            This will permanently delete <strong>{deleteTarget?.name}</strong> from
            the library.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleDeleteConfirm} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <ModulePreviewModal
        module={previewModule}
        open={!!previewModule}
        onClose={() => setPreviewModule(null)}
        onEdit={() => {
          if (previewModule) {
            handleEdit(previewModule);
            setPreviewModule(null);
          }
        }}
        onDelete={() => {
          if (previewModule) {
            setDeleteTarget(previewModule);
            setShowDeleteDialog(true);
            setPreviewModule(null);
          }
        }}
        onToggleFavorite={() => {
          if (previewModule) {
            handleToggleFavorite(previewModule.id);
            // Update preview module state to reflect change
            setPreviewModule((prev) =>
              prev ? { ...prev, favorite: !prev.favorite } : null
            );
          }
        }}
        onPublish={() => {
          if (previewModule) {
            handlePublish(previewModule.id);
          }
        }}
        onUnpublish={() => {
          if (previewModule) {
            handleUnpublish(previewModule.id);
          }
        }}
        isPublished={previewModule ? publishStatus[previewModule.id]?.published : false}
        shareCode={previewModule ? publishStatus[previewModule.id]?.shareCode : undefined}
      />

    </AppLayout>
  );
}
