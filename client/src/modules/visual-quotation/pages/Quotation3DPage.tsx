import React, { useEffect, useState, useRef, ChangeEvent, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  User,
  MapPin,
  Phone,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeft,
  Plus,
  Upload,
  Trash2,
  FileText,
  FileSpreadsheet,
  Share2,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import { useQuotationMetaStore } from "../store/v2/useQuotationMetaStore";
import { useDesignCanvasStore } from "../store/v2/useDesignCanvasStore";
import { useRoomStore } from "../store/v2/useRoomStore";
import { DEFAULT_UNIT_TYPES, UnitType } from "../types";
import { quotationOrchestrator } from "../services/QuotationOrchestrator";
import { roomService } from "../services/roomService";
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
import { cn } from "@/lib/utils";
import { captureCanvasImage } from "../components/Canvas";
import { FLOOR_OPTIONS, ROOM_OPTIONS, formatUnitTypeLabel, generateRoomName } from "../constants";

import { useAutoSave } from "../persistence";
import { logger } from "../services/logger";

// Components
import ViewToggle from "../components/ViewToggle/ViewToggle";
import UnitsCompact from "../components/Wardrobe/UnitsCompact";
import LaminateCompact from "../components/Materials/LaminateCompact";
import PriceCompact from "../components/Pricing/PriceCompact";
import ApprovalBar from "../components/Approval/ApprovalBar";
import CanvasStage from "../components/Canvas";
import { LibraryQuickPicker } from "../components/LibraryQuickPicker";
import type { DrawnUnit } from "../types";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const Quotation3DPage: React.FC = () => {
  // Phase 1: Auto-save quotations to database
  useAutoSave();


  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // V2 Stores
  const {
    syncFromUrl, status, client, setClientField, meta
  } = useQuotationMetaStore();

  const {
    roomPhoto, wardrobeBox, unitType, customUnitTypes, drawnUnits,
    setRoomPhoto, clearRoomPhoto, setUnitType, addCustomUnitType,
    referencePhotos, addUnit, setActiveUnitIndex
  } = useDesignCanvasStore();

  const {
    quotationRooms, activeRoomIndex, setActiveRoomIndex
  } = useRoomStore();

  // Helper wrappers to match legacy API for now, or use direct service calls
  const saveCurrentRoomState = roomService.saveCurrentRoom;
  const loadRoomState = roomService.switchToRoom;
  const addQuotationRoom = (type: UnitType, name: string) => roomService.createRoom({ unitType: type, name });

  const leadId = searchParams.get("leadId");
  const quoteId = searchParams.get("quoteId");

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [floor, setFloor] = useState("ground");
  const [room, setRoom] = useState("master_bedroom");
  const [newUnitType, setNewUnitType] = useState("");
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  const locked = status === "APPROVED";

  const allUnitTypes = useMemo(() => [
    ...DEFAULT_UNIT_TYPES.map(v => ({ value: v, label: formatUnitTypeLabel(v) })),
    ...customUnitTypes.map(v => ({ value: v, label: formatUnitTypeLabel(v) })),
  ], [customUnitTypes]);

  const hasData = drawnUnits.some(u => u.widthMm > 0 && u.heightMm > 0) ||
    quotationRooms.some(r => r.drawnUnits.some(u => u.widthMm > 0 && u.heightMm > 0));

  useEffect(() => {
    syncFromUrl({ leadId, quoteId });
  }, [leadId, quoteId, syncFromUrl]);

  useEffect(() => {
    if (quotationRooms.length > 0 && activeRoomIndex >= 0) {
      const currentRoom = quotationRooms[activeRoomIndex];
      if (currentRoom) {
        // Only update if current state differs to prevent loop
        const roomMatch = ROOM_OPTIONS.find(r =>
          currentRoom.name.toLowerCase().includes(r.label.toLowerCase())
        );
        if (roomMatch && room !== roomMatch.value) {
          setRoom(roomMatch.value);
        }

        const floorMatch = FLOOR_OPTIONS.find(f =>
          currentRoom.name.toLowerCase().includes(f.label.toLowerCase())
        );
        if (floorMatch) {
          if (floor !== floorMatch.value) setFloor(floorMatch.value);
        } else {
          if (floor !== "ground") setFloor("ground");
        }
      }
    }
  }, [activeRoomIndex, quotationRooms, room, floor]);

  const handleAddNewUnitType = () => {
    if (!newUnitType.trim()) return;
    const normalized = newUnitType.trim().toLowerCase().replace(/\s+/g, "_");
    addCustomUnitType(normalized);
    setUnitType(normalized);
    setNewUnitType("");
    setShowAddUnit(false);
  };

  // Handler for adding a library unit to the canvas
  const handleAddLibraryUnit = (unit: DrawnUnit) => {
    addUnit(unit);
    setActiveUnitIndex(drawnUnits.length); // Select the new unit
  };

  const handleUnitTypeChange = (v: string) => {
    setUnitType(v as UnitType);
  };

  const handleRoomChange = (newRoom: string) => {
    if (locked) return;
    setRoom(newRoom);
    const newName = generateRoomName(newRoom, floor);
    const existingIndex = quotationRooms.findIndex(r => r.name === newName);

    if (existingIndex >= 0) {
      setActiveRoomIndex(existingIndex);
    } else {
      if (quotationRooms.length > 0) {
        saveCurrentRoomState();
      } else if (roomPhoto || wardrobeBox || drawnUnits.length > 0) {
        const currentName = generateRoomName(room, floor);
        addQuotationRoom(unitType, currentName);
      }
      addQuotationRoom(unitType, newName);
    }
  };

  const handleFloorChange = (newFloor: string) => {
    if (locked) return;
    setFloor(newFloor);
    const newName = generateRoomName(room, newFloor);
    const existingIndex = quotationRooms.findIndex(r => r.name === newName);

    if (existingIndex >= 0) {
      setActiveRoomIndex(existingIndex);
    } else {
      if (quotationRooms.length > 0) {
        saveCurrentRoomState();
      } else if (roomPhoto || wardrobeBox || drawnUnits.length > 0) {
        const currentName = generateRoomName(room, floor);
        addQuotationRoom(unitType, currentName);
      }
      addQuotationRoom(unitType, newName);
    }
  };

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    if (locked) return;
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/") || file.size > MAX_IMAGE_BYTES) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => setRoomPhoto(reader.result as string, img.naturalWidth, img.naturalHeight);
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Helper to create export context from current state
  const createExportContext = () => ({
    client,
    meta,
    quotationRooms,
    currentDrawnUnits: drawnUnits,
    activeRoomIndex,
    roomPhoto,
    referencePhotos,
  });

  // Helper to create canvas capture interface
  const createCanvasCapture = () => ({
    captureCurrentCanvas: captureCanvasImage,
    saveRoomState: saveCurrentRoomState,
    loadRoomState: loadRoomState,
  });

  const exportPdf = async () => {
    setIsExporting(true);
    try {
      await quotationOrchestrator.exportToPDF(
        createExportContext(),
        createCanvasCapture()
      );
    } catch (error) {
      logger.error('PDF export failed', { error: String(error), context: 'quotation-3d-page' });
      alert(error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportExcel = async () => {
    setIsExporting(true);
    try {
      await quotationOrchestrator.exportToExcel(createExportContext());
    } catch (error) {
      logger.error('Excel export failed', { error: String(error), context: 'quotation-3d-page' });
      alert(error instanceof Error ? error.message : 'Failed to generate Excel. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      const success = await quotationOrchestrator.copyToClipboard(createExportContext());
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        alert('Failed to copy. Please try again.');
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to copy. Please try again.');
    }
  };

  const handleWhatsAppShare = async () => {
    if (!hasData) {
      alert('Please add units with dimensions first');
      return;
    }

    try {
      await quotationOrchestrator.shareViaWhatsApp(createExportContext());
    } catch (error) {
      logger.error('WhatsApp share failed', { error: String(error), context: 'quotation-3d-page' });
      alert('Failed to share. Please try again.');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100">
      {/* Header Row 1: Logo, Client Info, View Toggle */}
      <header className="flex-shrink-0 h-11 bg-slate-800 border-b border-slate-700">
        <div className="h-full px-3 flex items-center justify-between">
          {/* Left: Logo & Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
            >
              <div className="h-6 w-6 rounded-md bg-indigo-500 flex items-center justify-center">
                <LayoutDashboard className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-semibold text-white">3D Quotation</span>
            </button>

            {/* Sidebar Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-slate-700"
            >
              {sidebarCollapsed ? <PanelLeft className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
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
              />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-700/50 rounded-md px-2 py-0.5 border border-slate-600">
              <MapPin className="h-3 w-3 text-slate-400" />
              <Input
                type="text"
                placeholder="Location"
                value={client.location}
                onChange={(e) => setClientField("location", e.target.value)}
                disabled={locked}
                className="h-5 w-24 border-0 bg-transparent text-xs font-medium text-white placeholder:text-slate-500 focus-visible:ring-0 p-0"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-700/50 rounded-md px-2 py-0.5 border border-slate-600">
              <Phone className="h-3 w-3 text-slate-400" />
              <Input
                type="tel"
                placeholder="Phone"
                value={client.phone || ""}
                onChange={(e) => setClientField("phone", e.target.value)}
                disabled={locked}
                className="h-5 w-20 border-0 bg-transparent text-xs font-medium text-white placeholder:text-slate-500 focus-visible:ring-0 p-0"
              />
            </div>
          </div>

          {/* Right: View Toggle */}
          <ViewToggle />
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
                onClick={() => { setShowAddUnit(false); setNewUnitType(""); }}
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

          {/* Library Picker */}
          <LibraryQuickPicker
            onSelectModule={handleAddLibraryUnit}
            disabled={locked}
          />

          <div className="h-5 w-px bg-slate-200" />

          {/* Photo Upload */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => uploadRef.current?.click()}
            disabled={locked}
          >
            <Upload className="h-3.5 w-3.5" />
            Photo
          </Button>
          {roomPhoto && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={clearRoomPhoto}
              disabled={locked}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>

        {/* Right: Export buttons */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs font-medium bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
            onClick={exportPdf}
            disabled={isExporting || !hasData}
          >
            {isExporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <FileText className="h-3.5 w-3.5 mr-1" />}
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs font-medium bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
            onClick={exportExcel}
            disabled={isExporting || !hasData}
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />
            Excel
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs font-medium bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                disabled={!hasData}
              >
                {copied ? <Check className="h-3.5 w-3.5 mr-1 text-green-600" /> : <Share2 className="h-3.5 w-3.5 mr-1" />}
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
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex min-h-0">
        {/* Left Panel - Now just dimensions and settings */}
        <aside
          className={cn(
            "flex-shrink-0 bg-white border-r border-slate-200 flex flex-col transition-all duration-200",
            sidebarCollapsed ? "w-0 overflow-hidden" : "w-[300px]"
          )}
        >
          <div className="flex-1 overflow-y-auto">
            {/* Dimensions */}
            <div className="p-3 border-b border-slate-100">
              <UnitsCompact />
            </div>

            {/* Finishes */}
            <div className="p-3 border-b border-slate-100">
              <LaminateCompact />
            </div>

            {/* Estimate */}
            <div className="p-3">
              <PriceCompact />
            </div>
          </div>
        </aside>

        {/* Canvas Area */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-slate-50">
          <div className="flex-1 min-h-0 m-2 bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <CanvasStage />
          </div>
        </div>
      </main>

      {/* Bottom Bar */}
      <ApprovalBar />
    </div>
  );
};

export default Quotation3DPage;
