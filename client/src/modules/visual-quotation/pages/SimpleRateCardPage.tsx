/**
 * SimpleRateCardPage
 *
 * Unified rate card management with grid layout.
 * All rate cards (system defaults + library) use the same card format.
 *
 * Tabs:
 * - Default (SHUTTER, SHUTTER+LOFT, LOFT ONLY)
 * - Wardrobe, Kitchen, etc. (from Library)
 *
 * Persists to localStorage via zustand.
 */

import React, { useEffect, useState, useMemo } from "react";
import { ArrowLeft, Check, IndianRupee, Trash2, Package, FolderOpen, Shirt, UtensilsCrossed, Tv, Armchair, BookOpen, Home, Settings2, Edit2, Layers, Plus, X, FolderPlus, Palette, Star, Box, Heart, Briefcase, ShoppingBag, Coffee, Music, Camera, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { RATE_CARD_IDS, DEFAULT_RATE_CARD_SPECS, type RateCardKey, type RateCardMaterialSpecs } from "../constants";
import { getAllRateCards, deleteRateCard } from "../services/rateCardService";
import type { RateCard, RateCardUnitType } from "../types/rateCard";
import { RATE_CARD_UNIT_TYPE_LABELS } from "../types/rateCard";
import { usePricingStore, useCustomFolderStore, selectFolders, type CustomFolder } from "../store";

// Available icons for folder selection
const FOLDER_ICONS: { id: string; icon: React.ReactNode; label: string }[] = [
  { id: "folder", icon: <FolderOpen className="h-4 w-4" />, label: "Folder" },
  { id: "package", icon: <Package className="h-4 w-4" />, label: "Package" },
  { id: "box", icon: <Box className="h-4 w-4" />, label: "Box" },
  { id: "star", icon: <Star className="h-4 w-4" />, label: "Star" },
  { id: "heart", icon: <Heart className="h-4 w-4" />, label: "Heart" },
  { id: "briefcase", icon: <Briefcase className="h-4 w-4" />, label: "Briefcase" },
  { id: "shopping", icon: <ShoppingBag className="h-4 w-4" />, label: "Shopping" },
  { id: "coffee", icon: <Coffee className="h-4 w-4" />, label: "Coffee" },
  { id: "music", icon: <Music className="h-4 w-4" />, label: "Music" },
  { id: "camera", icon: <Camera className="h-4 w-4" />, label: "Camera" },
  { id: "zap", icon: <Zap className="h-4 w-4" />, label: "Zap" },
  { id: "palette", icon: <Palette className="h-4 w-4" />, label: "Palette" },
];

// Available colors for folders
const FOLDER_COLORS: { id: string; gradient: string; bgColor: string; borderColor: string; textColor: string }[] = [
  { id: "indigo", gradient: "from-indigo-500 to-blue-500", bgColor: "bg-indigo-50", borderColor: "border-indigo-200", textColor: "text-indigo-600" },
  { id: "blue", gradient: "from-blue-500 to-cyan-500", bgColor: "bg-blue-50", borderColor: "border-blue-200", textColor: "text-blue-600" },
  { id: "emerald", gradient: "from-emerald-500 to-teal-500", bgColor: "bg-emerald-50", borderColor: "border-emerald-200", textColor: "text-emerald-600" },
  { id: "amber", gradient: "from-amber-500 to-orange-500", bgColor: "bg-amber-50", borderColor: "border-amber-200", textColor: "text-amber-600" },
  { id: "rose", gradient: "from-rose-500 to-pink-500", bgColor: "bg-rose-50", borderColor: "border-rose-200", textColor: "text-rose-600" },
  { id: "violet", gradient: "from-violet-500 to-purple-500", bgColor: "bg-violet-50", borderColor: "border-violet-200", textColor: "text-violet-600" },
  { id: "cyan", gradient: "from-cyan-500 to-blue-500", bgColor: "bg-cyan-50", borderColor: "border-cyan-200", textColor: "text-cyan-600" },
  { id: "orange", gradient: "from-orange-500 to-red-500", bgColor: "bg-orange-50", borderColor: "border-orange-200", textColor: "text-orange-600" },
];

// Helper to get icon component by id
const getIconById = (iconId: string): React.ReactNode => {
  const found = FOLDER_ICONS.find(i => i.id === iconId);
  return found?.icon || <FolderOpen className="h-4 w-4" />;
};

// Helper to get color config by id
const getColorById = (colorId: string) => {
  return FOLDER_COLORS.find(c => c.id === colorId) || FOLDER_COLORS[0];
};

// Folder configuration for each unit type
const FOLDER_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string; borderColor: string; gradient: string }> = {
  default: { icon: <Settings2 className="h-4 w-4" />, color: "text-indigo-600", bgColor: "bg-indigo-50", borderColor: "border-indigo-200", gradient: "from-indigo-500 to-blue-500" },
  wardrobe: { icon: <Shirt className="h-4 w-4" />, color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200", gradient: "from-blue-500 to-indigo-500" },
  kitchen: { icon: <UtensilsCrossed className="h-4 w-4" />, color: "text-amber-600", bgColor: "bg-amber-50", borderColor: "border-amber-200", gradient: "from-amber-500 to-orange-500" },
  tv_unit: { icon: <Tv className="h-4 w-4" />, color: "text-emerald-600", bgColor: "bg-emerald-50", borderColor: "border-emerald-200", gradient: "from-emerald-500 to-teal-500" },
  dresser: { icon: <Armchair className="h-4 w-4" />, color: "text-pink-600", bgColor: "bg-pink-50", borderColor: "border-pink-200", gradient: "from-pink-500 to-rose-500" },
  study_table: { icon: <BookOpen className="h-4 w-4" />, color: "text-violet-600", bgColor: "bg-violet-50", borderColor: "border-violet-200", gradient: "from-violet-500 to-purple-500" },
  shoe_rack: { icon: <Package className="h-4 w-4" />, color: "text-cyan-600", bgColor: "bg-cyan-50", borderColor: "border-cyan-200", gradient: "from-cyan-500 to-blue-500" },
  book_shelf: { icon: <BookOpen className="h-4 w-4" />, color: "text-green-600", bgColor: "bg-green-50", borderColor: "border-green-200", gradient: "from-green-500 to-emerald-500" },
  crockery_unit: { icon: <UtensilsCrossed className="h-4 w-4" />, color: "text-yellow-600", bgColor: "bg-yellow-50", borderColor: "border-yellow-200", gradient: "from-yellow-500 to-amber-500" },
  pooja_unit: { icon: <Home className="h-4 w-4" />, color: "text-orange-600", bgColor: "bg-orange-50", borderColor: "border-orange-200", gradient: "from-orange-500 to-red-500" },
  vanity: { icon: <Armchair className="h-4 w-4" />, color: "text-rose-600", bgColor: "bg-rose-50", borderColor: "border-rose-200", gradient: "from-rose-500 to-pink-500" },
  bar_unit: { icon: <UtensilsCrossed className="h-4 w-4" />, color: "text-purple-600", bgColor: "bg-purple-50", borderColor: "border-purple-200", gradient: "from-purple-500 to-indigo-500" },
  display_unit: { icon: <Package className="h-4 w-4" />, color: "text-teal-600", bgColor: "bg-teal-50", borderColor: "border-teal-200", gradient: "from-teal-500 to-cyan-500" },
  all: { icon: <FolderOpen className="h-4 w-4" />, color: "text-slate-600", bgColor: "bg-slate-50", borderColor: "border-slate-200", gradient: "from-slate-500 to-gray-500" },
};

// Unified card type for display
interface UnifiedCard {
  id: string;
  name: string;
  type: "default" | "library";
  unitType: string;
  rate: number;
  rate2?: number; // For SHUTTER+LOFT (has 2 rates)
  rateLabel: string;
  rateLabel2?: string;
  description?: string;
  createdAt?: string;
  isEditable: boolean;
  config?: RateCard["config"];
  // Material specs
  specKey?: RateCardKey; // Key to access specs (shutter, shutter_loft, loft_only)
  plywood?: string;
  laminate?: string;
  innerLaminate?: string;
  // Folder association
  folderId?: string;
}

const SimpleRateCardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    pricingControl,
    setSqftRate,
    setLoftSqftRate,
    setShutterLoftShutterRate,
    setShutterLoftLoftRate,
    rateCardSpecs,
    setRateCardSpecs,
  } = usePricingStore();

  // Material specs state (merged with defaults)
  const specs = useMemo(() => ({
    shutter: { ...DEFAULT_RATE_CARD_SPECS.shutter, ...rateCardSpecs?.shutter },
    shutter_loft: { ...DEFAULT_RATE_CARD_SPECS.shutter_loft, ...rateCardSpecs?.shutter_loft },
    loft_only: { ...DEFAULT_RATE_CARD_SPECS.loft_only, ...rateCardSpecs?.loft_only },
  }), [rateCardSpecs]);

  // Update spec helper
  const updateSpec = (key: RateCardKey, field: keyof RateCardMaterialSpecs, value: string) => {
    setRateCardSpecs({
      ...rateCardSpecs,
      [key]: { ...specs[key], [field]: value }
    });
  };

  // Dynamic rate cards from rateCardStore
  const [dynamicCards, setDynamicCards] = useState<RateCard[]>([]);

  // Custom folders from Zustand store (persistent)
  const customFolders = useCustomFolderStore(selectFolders);
  const addFolder = useCustomFolderStore((state) => state.addFolder);
  const removeFolder = useCustomFolderStore((state) => state.removeFolder);

  // Add folder dialog state
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderIcon, setNewFolderIcon] = useState("folder");
  const [newFolderColor, setNewFolderColor] = useState("indigo");

  // Active tab for grid view
  const [activeTab, setActiveTab] = useState<string>("default");

  // Editing state
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editRate, setEditRate] = useState<number>(0);
  const [editRate2, setEditRate2] = useState<number>(0);

  // Load dynamic rate cards on mount
  useEffect(() => {
    const cards = getAllRateCards();
    setDynamicCards(cards);
  }, []);

  // Add new folder
  const handleAddFolder = () => {
    if (!newFolderName.trim()) {
      alert("Please enter a folder name");
      return;
    }

    // Check for duplicate names
    const exists = customFolders.some(f => f.name.toLowerCase() === newFolderName.trim().toLowerCase());
    if (exists) {
      alert("A folder with this name already exists");
      return;
    }

    const newFolder: CustomFolder = {
      id: `custom_${Date.now()}`,
      name: newFolderName.trim(),
      icon: newFolderIcon,
      color: newFolderColor,
      createdAt: new Date().toISOString(),
    };

    // Use Zustand store action (auto-persists to localStorage)
    addFolder(newFolder);
    setShowAddFolder(false);
    setNewFolderName("");
    setNewFolderIcon("folder");
    setNewFolderColor("indigo");
  };

  // Delete custom folder
  const handleDeleteFolder = (folderId: string) => {
    if (confirm("Delete this folder? Rate cards in this folder will move to 'All Units'.")) {
      // Use Zustand store action (auto-persists to localStorage)
      removeFolder(folderId);
      if (activeTab === folderId) {
        setActiveTab("default");
      }
    }
  };

  // Default system cards
  const defaultCards: UnifiedCard[] = useMemo(() => [
    {
      id: RATE_CARD_IDS.shutter,
      name: "SHUTTER",
      type: "default",
      unitType: "default",
      rate: pricingControl.sqftRate || 0,
      rateLabel: "Rate per sqft",
      description: "Standard shutter rate",
      isEditable: true,
      specKey: "shutter",
      plywood: specs.shutter.plywoodThickness,
      laminate: specs.shutter.laminateThickness,
      innerLaminate: specs.shutter.innerLaminateThickness,
    },
    {
      id: RATE_CARD_IDS.shutter_loft,
      name: "SHUTTER + LOFT",
      type: "default",
      unitType: "default",
      rate: pricingControl.shutterLoftShutterRate ?? 1100,
      rate2: pricingControl.shutterLoftLoftRate ?? 900,
      rateLabel: "Shutter",
      rateLabel2: "Loft",
      description: "Combined shutter and loft",
      isEditable: true,
      specKey: "shutter_loft",
      plywood: specs.shutter_loft.plywoodThickness,
      laminate: specs.shutter_loft.laminateThickness,
      innerLaminate: specs.shutter_loft.innerLaminateThickness,
    },
    {
      id: RATE_CARD_IDS.loft_only,
      name: "LOFT ONLY",
      type: "default",
      unitType: "default",
      rate: pricingControl.loftSqftRate || 0,
      rateLabel: "Rate per sqft",
      description: "Loft only rate",
      isEditable: true,
      specKey: "loft_only",
      plywood: specs.loft_only.plywoodThickness,
      laminate: specs.loft_only.laminateThickness,
      innerLaminate: specs.loft_only.innerLaminateThickness,
    },
  ], [pricingControl, specs]);

  // Convert library cards to unified format
  const libraryCards: UnifiedCard[] = useMemo(() =>
    dynamicCards.map(card => ({
      id: card.id,
      name: card.name,
      type: "library" as const,
      unitType: card.unitType || "all",
      rate: card.config?.carcassPricing?.ratePerSqft || 0,
      rateLabel: "Carcass rate",
      description: card.description,
      createdAt: card.createdAt,
      isEditable: false,
      config: card.config,
      folderId: card.folderId,
    })),
  [dynamicCards]);

  // Group library cards by unit type AND custom folder
  const groupedLibraryCards = useMemo(() => {
    const groups: Record<string, UnifiedCard[]> = {};
    for (const card of libraryCards) {
      // If card has a custom folderId, group by that
      // Otherwise group by unitType
      const groupKey = card.folderId || card.unitType || "all";
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(card);
    }
    return groups;
  }, [libraryCards]);

  // Available tabs (including custom folders)
  const availableTabs = useMemo(() => {
    const systemTabs = ["default", ...Object.keys(groupedLibraryCards)];
    const customTabIds = customFolders.map(f => f.id);
    return [...new Set([...systemTabs, ...customTabIds])];
  }, [groupedLibraryCards, customFolders]);

  // Get folder config (either system or custom)
  const getFolderConfig = (tabId: string) => {
    // Check if it's a custom folder
    const customFolder = customFolders.find(f => f.id === tabId);
    if (customFolder) {
      const colorConfig = getColorById(customFolder.color);
      return {
        icon: getIconById(customFolder.icon),
        color: colorConfig.textColor,
        bgColor: colorConfig.bgColor,
        borderColor: colorConfig.borderColor,
        gradient: colorConfig.gradient,
        isCustom: true,
        customFolder,
      };
    }
    // Return system config
    return {
      ...(FOLDER_CONFIG[tabId] || FOLDER_CONFIG.all),
      isCustom: false,
      customFolder: null,
    };
  };

  // Cards for current tab
  const currentTabCards = useMemo(() => {
    if (activeTab === "default") {
      return defaultCards;
    }
    return groupedLibraryCards[activeTab] || [];
  }, [activeTab, defaultCards, groupedLibraryCards]);

  // Handle delete library card
  const handleDeleteCard = (id: string, name: string) => {
    if (confirm(`Delete rate card "${name}"?`)) {
      const result = deleteRateCard(id);
      if (result.success) {
        setDynamicCards(getAllRateCards());
      } else {
        alert(`Failed to delete: ${result.error}`);
      }
    }
  };

  // Handle edit default card
  const startEditing = (card: UnifiedCard) => {
    setEditingCard(card.id);
    setEditRate(card.rate);
    setEditRate2(card.rate2 || 0);
  };

  const saveEditing = (card: UnifiedCard) => {
    if (card.id === RATE_CARD_IDS.shutter) {
      setSqftRate(editRate);
    } else if (card.id === RATE_CARD_IDS.shutter_loft) {
      setShutterLoftShutterRate(editRate);
      setShutterLoftLoftRate(editRate2);
    } else if (card.id === RATE_CARD_IDS.loft_only) {
      setLoftSqftRate(editRate);
    }
    setEditingCard(null);
  };

  const cancelEditing = () => {
    setEditingCard(null);
  };

  // Get total cards count
  const totalCards = defaultCards.length + libraryCards.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Rate Cards</h1>
              <p className="text-sm text-slate-500">{totalCards} rate cards configured</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
            <Check className="h-4 w-4" />
            <span className="text-sm font-medium">Auto-saved</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {availableTabs.map((tab) => {
            const folderConfig = getFolderConfig(tab);
            const isCustom = folderConfig.isCustom;
            const customFolder = folderConfig.customFolder;

            // Determine label
            let label: string;
            if (tab === "default") {
              label = "Default";
            } else if (isCustom && customFolder) {
              label = customFolder.name;
            } else {
              label = RATE_CARD_UNIT_TYPE_LABELS[tab as RateCardUnitType] || tab;
            }

            const count = tab === "default"
              ? defaultCards.length
              : (groupedLibraryCards[tab]?.length || 0);
            const isActive = activeTab === tab;

            return (
              <div key={tab} className="relative group">
                <button
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all",
                    isActive
                      ? `bg-gradient-to-r ${folderConfig.gradient} text-white border-transparent shadow-lg`
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                  )}
                >
                  <span className={isActive ? "text-white" : folderConfig.color}>{folderConfig.icon}</span>
                  <span>{label}</span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  )}>
                    {count}
                  </span>
                </button>
                {/* Delete button for custom folders */}
                {isCustom && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(tab);
                    }}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                    title="Delete folder"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add Folder Button */}
          <button
            onClick={() => setShowAddFolder(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-300 text-sm font-medium text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all"
          >
            <FolderPlus className="h-4 w-4" />
            <span>Add Folder</span>
          </button>
        </div>

        {/* Grid of Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentTabCards.map((card) => {
            const config = FOLDER_CONFIG[card.unitType] || FOLDER_CONFIG.all;
            const isEditing = editingCard === card.id;

            return (
              <div
                key={card.id}
                className={cn(
                  "bg-white rounded-2xl border-2 shadow-sm hover:shadow-xl transition-all overflow-hidden",
                  isEditing ? "border-indigo-400 ring-2 ring-indigo-200" : config.borderColor
                )}
              >
                {/* Card Header with Gradient */}
                <div className={cn(
                  "h-3 bg-gradient-to-r",
                  config.gradient
                )} />

                <div className="p-4">
                  {/* Icon and Title Row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-xl border-2 flex items-center justify-center",
                        config.bgColor,
                        config.borderColor
                      )}>
                        <span className={cn(config.color, "[&>svg]:h-6 [&>svg]:w-6")}>{config.icon}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{card.name}</h3>
                        <p className="text-[11px] text-slate-500">{card.description}</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1">
                      {card.isEditable && !isEditing && (
                        <button
                          onClick={() => startEditing(card)}
                          className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 flex items-center justify-center transition-colors"
                          title="Edit rate"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      )}
                      {card.type === "library" && (
                        <button
                          onClick={() => handleDeleteCard(card.id, card.name)}
                          className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors"
                          title="Delete rate card"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rate Display/Edit */}
                  <div className="space-y-2">
                    {/* Rate 1 */}
                    <div className={cn(
                      "rounded-xl p-3",
                      config.bgColor
                    )}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 font-medium">{card.rateLabel}</span>
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400">₹</span>
                            <Input
                              type="number"
                              value={editRate || ""}
                              onChange={(e) => setEditRate(Number(e.target.value) || 0)}
                              className="w-20 h-8 text-right font-bold"
                              autoFocus
                            />
                            <span className="text-xs text-slate-500">/sqft</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <IndianRupee className="h-4 w-4 text-slate-400" />
                            <span className="text-lg font-bold text-slate-900">{card.rate}</span>
                            <span className="text-xs text-slate-500">/sqft</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rate 2 (for SHUTTER+LOFT) */}
                    {card.rate2 !== undefined && (
                      <div className={cn(
                        "rounded-xl p-3",
                        "bg-amber-50"
                      )}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-600 font-medium">{card.rateLabel2}</span>
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">₹</span>
                              <Input
                                type="number"
                                value={editRate2 || ""}
                                onChange={(e) => setEditRate2(Number(e.target.value) || 0)}
                                className="w-20 h-8 text-right font-bold"
                              />
                              <span className="text-xs text-slate-500">/sqft</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <IndianRupee className="h-4 w-4 text-slate-400" />
                              <span className="text-lg font-bold text-slate-900">{card.rate2}</span>
                              <span className="text-xs text-slate-500">/sqft</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Material Specs - Only for default cards */}
                  {card.specKey && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Layers className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-[10px] font-medium text-slate-500 uppercase">Materials</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[9px] text-slate-400 font-medium block mb-1">Plywood</label>
                          {isEditing ? (
                            <Input
                              value={specs[card.specKey].plywoodThickness}
                              onChange={(e) => updateSpec(card.specKey!, "plywoodThickness", e.target.value)}
                              className="h-7 text-[11px] px-2"
                              placeholder="18mm BWP"
                            />
                          ) : (
                            <span className="text-[11px] text-slate-700 font-medium">{card.plywood}</span>
                          )}
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 font-medium block mb-1">Laminate</label>
                          {isEditing ? (
                            <Input
                              value={specs[card.specKey].laminateThickness}
                              onChange={(e) => updateSpec(card.specKey!, "laminateThickness", e.target.value)}
                              className="h-7 text-[11px] px-2"
                              placeholder="1mm"
                            />
                          ) : (
                            <span className="text-[11px] text-slate-700 font-medium">{card.laminate}</span>
                          )}
                        </div>
                        <div>
                          <label className="text-[9px] text-slate-400 font-medium block mb-1">Inner</label>
                          {isEditing ? (
                            <Input
                              value={specs[card.specKey].innerLaminateThickness}
                              onChange={(e) => updateSpec(card.specKey!, "innerLaminateThickness", e.target.value)}
                              className="h-7 text-[11px] px-2"
                              placeholder="0.8mm"
                            />
                          ) : (
                            <span className="text-[11px] text-slate-700 font-medium">{card.innerLaminate}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Edit Actions */}
                  {isEditing && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                      <Button
                        size="sm"
                        onClick={() => saveEditing(card)}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditing}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  {/* Footer Info */}
                  {card.createdAt && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                      Created: {new Date(card.createdAt).toLocaleDateString()}
                    </div>
                  )}

                  {/* ID Badge */}
                  <div className="mt-2">
                    <span className="text-[9px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                      {card.id}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {currentTabCards.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">No rate cards in this category</p>
            <p className="text-xs mt-1">Create rate cards from the Library page</p>
          </div>
        )}
      </div>

      {/* Add Folder Dialog */}
      <Dialog open={showAddFolder} onOpenChange={setShowAddFolder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-indigo-600" />
              Add New Folder
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Folder Name */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Folder Name</label>
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g., Custom Projects"
                className="w-full"
                autoFocus
              />
            </div>

            {/* Icon Selection */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Icon</label>
              <div className="grid grid-cols-6 gap-2">
                {FOLDER_ICONS.map((icon) => (
                  <button
                    key={icon.id}
                    onClick={() => setNewFolderIcon(icon.id)}
                    className={cn(
                      "h-10 w-10 rounded-lg border-2 flex items-center justify-center transition-all",
                      newFolderIcon === icon.id
                        ? "border-indigo-500 bg-indigo-50 text-indigo-600"
                        : "border-slate-200 hover:border-slate-300 text-slate-500"
                    )}
                    title={icon.label}
                  >
                    {icon.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Selection */}
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Color</label>
              <div className="grid grid-cols-8 gap-2">
                {FOLDER_COLORS.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setNewFolderColor(color.id)}
                    className={cn(
                      "h-8 w-8 rounded-full bg-gradient-to-br transition-all",
                      color.gradient,
                      newFolderColor === color.id
                        ? "ring-2 ring-offset-2 ring-slate-400 scale-110"
                        : "hover:scale-110"
                    )}
                    title={color.id}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="pt-2 border-t">
              <label className="text-sm font-medium text-slate-700 block mb-2">Preview</label>
              <div className="flex items-center gap-2">
                {(() => {
                  const colorConfig = getColorById(newFolderColor);
                  return (
                    <div
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium bg-gradient-to-r",
                        colorConfig.gradient
                      )}
                    >
                      {getIconById(newFolderIcon)}
                      <span>{newFolderName || "Folder Name"}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">0</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFolder(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddFolder}
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={!newFolderName.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SimpleRateCardPage;
