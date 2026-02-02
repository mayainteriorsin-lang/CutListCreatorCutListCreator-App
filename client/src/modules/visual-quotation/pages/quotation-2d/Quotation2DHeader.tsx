/**
 * Quotation2DHeader
 *
 * Header rows for the 2D quotation page.
 * Row 1: Logo, Client Info, View Toggle
 * Row 2: Room, Floor, Unit Type, Export
 */

import React, { ChangeEvent, useState, useEffect, useMemo } from "react";
import {
  Plus,
  Trash2,
  Sparkles,
  PanelLeftClose,
  PanelLeft,
  User,
  Building2,
  Upload,
  FileText,
  FileSpreadsheet,
  Loader2,
  Share2,
  Copy,
  Check,
  Cuboid,
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
import { FLOOR_OPTIONS, ROOM_OPTIONS, formatUnitTypeLabel, RATE_CARD_IDS, type RateCardKey } from "../../constants";
import { useQuotationMetaStore, usePricingStore, useRateCardStore, selectRateCards } from "../../store";
import ViewToggle from "../../components/ViewToggle/ViewToggle";

interface Quotation2DHeaderProps {
  navigate: (path: string) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  locked: boolean;
  room: string;
  floor: string;
  newUnitType: string;
  setNewUnitType: (type: string) => void;
  showAddUnit: boolean;
  setShowAddUnit: (show: boolean) => void;
  allUnitTypes: { value: string; label: string }[];
  unitType: string;
  roomPhoto: { src: string; width: number; height: number } | null;
  isExporting: boolean;
  copied: boolean;
  hasExportData: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  refFileInputRef: React.RefObject<HTMLInputElement | null>;
  handleNew: () => void;
  handleDelete: () => void;
  handleRoomChange: (room: string) => void;
  handleFloorChange: (floor: string) => void;
  handleAddNewUnitType: () => void;
  handleUnitTypeChange: (type: string) => void;
  handleMainPhotoUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  handleRefPhotoUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  handleExportPDF: () => Promise<void>;
  handleExportExcel: () => Promise<void>;
  handleCopyToClipboard: () => Promise<void>;
  handleWhatsAppShare: () => Promise<void>;
  clearRoomPhoto: () => void;
  // View modes (Photo or 3D only)
  viewMode?: "photo" | "css3d";
  setViewMode?: (mode: "photo" | "css3d") => void;
}

export function Quotation2DHeader({
  navigate,
  sidebarCollapsed,
  setSidebarCollapsed,
  locked,
  room,
  floor,
  newUnitType,
  setNewUnitType,
  showAddUnit,
  setShowAddUnit,
  allUnitTypes,
  unitType,
  roomPhoto,
  isExporting,
  copied,
  hasExportData,
  fileInputRef,
  refFileInputRef,
  handleNew,
  handleDelete,
  handleRoomChange,
  handleFloorChange,
  handleAddNewUnitType,
  handleUnitTypeChange,
  handleMainPhotoUpload,
  handleRefPhotoUpload,
  handleExportPDF,
  handleExportExcel,
  handleCopyToClipboard,
  handleWhatsAppShare,
  clearRoomPhoto,
  viewMode = "photo",
  setViewMode,
}: Quotation2DHeaderProps) {
  const handleViewModeChange = (newMode: "photo" | "css3d") => {
    if (setViewMode) {
      setViewMode(newMode);
    }
  };
  const { client, setClientField } = useQuotationMetaStore();
  const { pricingControl } = usePricingStore();

  // Rate card state - subscribe to store for live updates
  const [selectedRateCard, setSelectedRateCard] = useState<string>(RATE_CARD_IDS.shutter);
  const dynamicRateCards = useRateCardStore(selectRateCards);

  // Ensure rate cards are loaded from storage on mount
  useEffect(() => {
    const state = useRateCardStore.getState();
    if (!state.isLoaded) {
      state.loadFromStorage();
    }
  }, []);

  // Default rate cards
  const defaultRateCards = useMemo(() => [
    { id: RATE_CARD_IDS.shutter, name: "Shutter", code: "RC-SHT", rate: pricingControl.sqftRate },
    { id: RATE_CARD_IDS.shutter_loft, name: "Shutter + Loft", code: "RC-SHL", rate: pricingControl.shutterLoftShutterRate },
    { id: RATE_CARD_IDS.loft_only, name: "Loft Only", code: "RC-LFT", rate: pricingControl.loftSqftRate },
    { id: RATE_CARD_IDS.iso_kitchen, name: "Iso Kitchen", code: "RC-KIT", rate: pricingControl.sqftRate },
  ], [pricingControl]);

  // Get selected rate card display name
  const getSelectedRateCardName = () => {
    const defaultCard = defaultRateCards.find(c => c.id === selectedRateCard);
    if (defaultCard) return defaultCard.name;
    const dynamicCard = dynamicRateCards.find(c => c.id === selectedRateCard);
    if (dynamicCard) return dynamicCard.name;
    return "Select Rate";
  };

  return (
    <>
      {/* Header Row 1: Logo, Client Info, View Toggle */}
      <header className="flex-shrink-0 h-11 bg-slate-800 border-b border-slate-700">
        <div className="h-full px-3 flex items-center justify-between">
          {/* Left: Navigation & Branding */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
              aria-label="Navigate to home page"
              title="Go to Home"
            >
              <div className="h-6 w-6 rounded-md bg-indigo-500 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-white" aria-hidden="true" />
              </div>
              <span className="text-sm font-semibold text-white">2D Quotation</span>
            </button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </Button>
          </div>

          {/* Center: Client Info */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-700/50 rounded-md px-2 py-0.5 border border-slate-600">
              <User className="h-3 w-3 text-slate-400" />
              <Input
                type="text"
                placeholder="Client Name"
                value={client.name}
                onChange={(e) => setClientField("name", e.target.value)}
                disabled={locked}
                className="h-5 w-28 border-0 bg-transparent text-xs font-medium text-white placeholder:text-slate-500 focus-visible:ring-0 p-0"
                aria-label="Client name"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-700/50 rounded-md px-2 py-0.5 border border-slate-600">
              <Building2 className="h-3 w-3 text-slate-400" />
              <Input
                type="text"
                placeholder="Project / Site"
                value={client.location}
                onChange={(e) => setClientField("location", e.target.value)}
                disabled={locked}
                className="h-5 w-24 border-0 bg-transparent text-xs font-medium text-white placeholder:text-slate-500 focus-visible:ring-0 p-0"
                aria-label="Project or site location"
              />
            </div>
          </div>

          {/* Right: Actions & View Toggle */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 font-medium"
              onClick={handleNew}
              aria-label="Create new quotation"
              title="New Quotation"
            >
              <Plus className="h-3 w-3 mr-0.5" aria-hidden="true" />
              New
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 font-medium"
              onClick={handleDelete}
              aria-label="Clear all data"
              title="Clear All"
            >
              <Trash2 className="h-3 w-3 mr-0.5" aria-hidden="true" />
              Clear
            </Button>
            <div className="w-px h-4 bg-slate-700/50 mx-0.5" />
            <ViewToggle />
          </div>
        </div>
      </header>

      {/* Header Row 2: Room, Floor, Unit Type, Export */}
      <div className="flex-shrink-0 h-10 bg-white border-b border-slate-200 px-3 flex items-center justify-between">
        {/* Left: Room, Floor, Unit selectors */}
        <div className="flex items-center gap-2">
          <Select value={room} onValueChange={handleRoomChange} disabled={locked}>
            <SelectTrigger className="h-7 w-[130px] text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Room" />
            </SelectTrigger>
            <SelectContent>
              {ROOM_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value} className="text-xs">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={floor} onValueChange={handleFloorChange} disabled={locked}>
            <SelectTrigger className="h-7 w-[100px] text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Floor" />
            </SelectTrigger>
            <SelectContent>
              {FLOOR_OPTIONS.map((f) => (
                <SelectItem key={f.value} value={f.value} className="text-xs">
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="h-5 w-px bg-slate-200" />

          {showAddUnit ? (
            <div className="flex gap-1">
              <Input
                type="text"
                value={newUnitType}
                onChange={(e) => setNewUnitType(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddNewUnitType();
                  } else if (e.key === "Escape") {
                    setShowAddUnit(false);
                    setNewUnitType("");
                  }
                }}
                placeholder="Type name..."
                className="h-7 w-24 text-xs"
                autoFocus
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => {
                  setShowAddUnit(false);
                  setNewUnitType("");
                }}
              >
                ×
              </Button>
            </div>
          ) : (
            <>
              <Select value={unitType} onValueChange={handleUnitTypeChange} disabled={locked}>
                <SelectTrigger className="h-7 w-[110px] text-xs bg-slate-50 border-slate-200">
                  <SelectValue>{formatUnitTypeLabel(unitType)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {allUnitTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setShowAddUnit(true)}
                disabled={locked}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </>
          )}

          <div className="h-5 w-px bg-slate-200" />

          {/* View Mode Tabs */}
          <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-md">
            {/* Photo View */}
            <Button
              variant={viewMode === "photo" ? "default" : "ghost"}
              size="sm"
              className={`h-6 px-2 text-xs gap-1 ${viewMode === "photo" ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm" : "text-slate-600 hover:text-slate-800 hover:bg-slate-200"}`}
              onClick={() => {
                if (viewMode !== "photo") {
                  handleViewModeChange("photo");
                } else {
                  fileInputRef.current?.click();
                }
              }}
              disabled={locked}
              aria-label="Photo view mode"
              title="Photo View"
            >
              <Upload className="h-3 w-3" aria-hidden="true" />
              Photo
            </Button>

            {/* CSS 3D View */}
            <Button
              variant={viewMode === "css3d" ? "default" : "ghost"}
              size="sm"
              className={`h-6 px-2 text-xs gap-1 ${viewMode === "css3d" ? "bg-purple-600 text-white hover:bg-purple-700 shadow-sm" : "text-slate-600 hover:text-slate-800 hover:bg-slate-200"}`}
              onClick={() => handleViewModeChange("css3d")}
              aria-label="3D view mode"
              title="3D View"
            >
              <Cuboid className="h-3 w-3" aria-hidden="true" />
              3D
            </Button>
          </div>

          {roomPhoto && viewMode === "photo" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={clearRoomPhoto}
              disabled={locked}
              aria-label="Remove background photo"
              title="Remove Photo"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}

          <div className="h-5 w-px bg-slate-200" />

          {/* Rate Card Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs font-medium bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 gap-1"
                disabled={locked}
                aria-label="Select rate card"
                title="Rate Card"
              >
                <span className="max-w-[80px] truncate">{getSelectedRateCardName()}</span>
                <span className="text-[10px] text-indigo-400 font-mono">
                  {defaultRateCards.find(c => c.id === selectedRateCard)?.code || ""}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-96 overflow-y-auto">
              {/* Default Rate Cards */}
              {defaultRateCards.map((card) => (
                <DropdownMenuItem
                  key={card.id}
                  onClick={() => setSelectedRateCard(card.id)}
                  className="text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {selectedRateCard === card.id && (
                      <Check className="h-3.5 w-3.5 text-indigo-600" />
                    )}
                    {selectedRateCard !== card.id && <span className="w-3.5" />}
                    <span>{card.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{card.code}</span>
                </DropdownMenuItem>
              ))}

              {/* Dynamic Rate Cards from Store */}
              {dynamicRateCards.length > 0 && (
                <>
                  <div className="h-px bg-slate-200 my-1" />
                  <div className="px-2 py-1 text-[10px] font-medium text-slate-400 uppercase">
                    Custom ({dynamicRateCards.length})
                  </div>
                  {dynamicRateCards.map((card) => (
                    <DropdownMenuItem
                      key={card.id}
                      onClick={() => setSelectedRateCard(card.id)}
                      className="text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {selectedRateCard === card.id && (
                          <Check className="h-3.5 w-3.5 text-indigo-600" />
                        )}
                        {selectedRateCard !== card.id && <span className="w-3.5" />}
                        <span className="truncate max-w-[120px]">{card.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {card.id.slice(0, 6).toUpperCase()}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleMainPhotoUpload}
          />
        </div>

        {/* Right: Export buttons */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs font-medium bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
            onClick={handleExportPDF}
            disabled={isExporting || !hasExportData}
            aria-label="Export to PDF (Ctrl+E)"
            title="Export PDF (Ctrl+E)"
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" aria-hidden="true" />
            ) : (
              <FileText className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            )}
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs font-medium bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
            onClick={handleExportExcel}
            disabled={isExporting || !hasExportData}
            aria-label="Export to Excel"
            title="Export Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
            Excel
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs font-medium bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                disabled={!hasExportData}
                aria-label="Share quotation"
                title="Share Options"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 mr-1 text-green-600" aria-hidden="true" />
                ) : (
                  <Share2 className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
                )}
                Share
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={handleCopyToClipboard} className="text-xs">
                <Copy className="h-3.5 w-3.5 mr-2" />
                Copy to Clipboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleWhatsAppShare} className="text-xs">
                <svg className="h-3.5 w-3.5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => refFileInputRef.current?.click()}
            aria-label="Add reference photos"
            title="Add Reference Photos"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Reference
          </Button>
        </div>
      </div>

      <input
        ref={refFileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleRefPhotoUpload}
      />
    </>
  );
}
