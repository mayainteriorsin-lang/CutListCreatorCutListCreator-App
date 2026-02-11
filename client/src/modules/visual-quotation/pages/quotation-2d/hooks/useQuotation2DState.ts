/**
 * useQuotation2DState
 *
 * Hook for local state management and room/floor handling.
 * Now uses roomService and quotationService for operations.
 */

import { useState, useEffect, useCallback, useRef, ChangeEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useDesignCanvasStore } from "../../../store/v2/useDesignCanvasStore";
import { useQuotationMetaStore } from "../../../store/v2/useQuotationMetaStore";
import { useRoomStore } from "../../../store/v2/useRoomStore";
import { DEFAULT_UNIT_TYPES, DEFAULT_WARDROBE_CONFIG, WardrobeConfig } from "../../../types";
import { FLOOR_OPTIONS, ROOM_OPTIONS, formatUnitTypeLabel, generateRoomName } from "../../../constants";
import { setGlobalStageRef } from "../../../components/Canvas";
import { roomService, quotationService, isEditable } from "../../../services";
import { useToast } from "@/hooks/use-toast";
import { validateImageFile } from "../../../utils/fileValidation";
import Konva from "konva";
import { logger } from "../../../services/logger";

interface UseQuotation2DStateProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

interface UseQuotation2DStateReturn {
  // UI state
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  dimensions: { width: number; height: number };
  recalculateDimensions: () => void;
  isFullscreen: boolean;
  setIsFullscreen: (fullscreen: boolean) => void;
  canvasFocused: boolean;
  setCanvasFocused: (focused: boolean) => void;
  photoImage: HTMLImageElement | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  refFileInputRef: React.RefObject<HTMLInputElement | null>;

  // Form state
  floor: string;
  room: string;
  newUnitType: string;
  setNewUnitType: (type: string) => void;
  showAddUnit: boolean;
  setShowAddUnit: (show: boolean) => void;
  showRateCard: boolean;
  setShowRateCard: (show: boolean) => void;

  // Derived
  locked: boolean;
  allUnitTypes: { value: string; label: string }[];
  currentRateCardConfig: WardrobeConfig;
  photoTransform: { x: number; y: number; scale: number; width?: number; height?: number };

  // Handlers
  handleAddNewUnitType: () => void;
  handleUnitTypeChange: (v: string) => void;
  handleRoomChange: (newRoom: string) => void;
  handleFloorChange: (newFloor: string) => void;
  handleMainPhotoUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  handleRefPhotoUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  handleNew: () => void;
  handleDelete: () => void;
  handleSaveRateCard: (config: WardrobeConfig) => void;
}

export function useQuotation2DState({
  stageRef,
}: UseQuotation2DStateProps): UseQuotation2DStateReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refFileInputRef = useRef<HTMLInputElement>(null);

  // V2 Stores - must be called before useState that uses store values
  const {
    roomPhoto,
    setRoomPhoto,
    addReferencePhoto,
    drawnUnits,
    activeUnitIndex,
    wardrobeBox,
    unitType,
    customUnitTypes,
    setUnitType,
    addCustomUnitType,
    updateActiveDrawnUnit,
    // Multi-room support
    activeFloorId,
    activeRoomId,
    switchRoom,
  } = useDesignCanvasStore();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [photoImage, setPhotoImage] = useState<HTMLImageElement | null>(null);
  // Sync floor/room with store's active values
  const [floor, setFloor] = useState(activeFloorId || "ground");
  const [room, setRoom] = useState(activeRoomId || "master_bedroom");
  const [newUnitType, setNewUnitType] = useState("");
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [showRateCard, setShowRateCard] = useState(false);
  const [canvasFocused, setCanvasFocused] = useState(false);

  const { status, setClientField, setMetaField } = useQuotationMetaStore();
  const { quotationRooms, activeRoomIndex } = useRoomStore();
  const [searchParams] = useSearchParams();

  const { toast } = useToast();

  // Use quotationService for editable check
  const locked = !isEditable() || status === "APPROVED";
  const activeDrawnUnit = drawnUnits[activeUnitIndex];
  const currentRateCardConfig = activeDrawnUnit?.wardrobeConfig || DEFAULT_WARDROBE_CONFIG;

  const allUnitTypes = [
    ...DEFAULT_UNIT_TYPES.map((v) => ({ value: v, label: formatUnitTypeLabel(v) })),
    ...customUnitTypes.map((v) => ({ value: v, label: formatUnitTypeLabel(v) })),
  ];

  // Sync client info from URL params (when navigating from quotations page)
  useEffect(() => {
    const clientName = searchParams.get('clientName');
    const clientPhone = searchParams.get('clientPhone');
    const clientLocation = searchParams.get('clientLocation');
    const quoteNo = searchParams.get('quoteNo');

    if (clientName) setClientField('name', clientName);
    if (clientPhone) setClientField('phone', clientPhone);
    if (clientLocation) setClientField('location', clientLocation);
    if (quoteNo) setMetaField('quoteNo', quoteNo);

    // Clear URL params after syncing to avoid re-syncing on refresh
    if (clientName || clientPhone || clientLocation || quoteNo) {
      logger.info('Synced client info from URL params', { clientName, quoteNo });
    }
  }, [searchParams, setClientField, setMetaField]);

  // Sync local state with store's active floor/room
  useEffect(() => {
    if (activeFloorId && activeFloorId !== floor) {
      setFloor(activeFloorId);
    }
    if (activeRoomId && activeRoomId !== room) {
      setRoom(activeRoomId);
    }
  }, [activeFloorId, activeRoomId]);

  // Load photo image for Konva
  useEffect(() => {
    if (roomPhoto?.src) {
      const img = new window.Image();
      img.src = roomPhoto.src;
      img.onload = () => setPhotoImage(img);
    } else {
      setPhotoImage(null);
    }
  }, [roomPhoto?.src]);

  // Set global stage ref for canvas capture
  useEffect(() => {
    if (stageRef.current) {
      setGlobalStageRef(stageRef.current);
    }
    return () => {
      setGlobalStageRef(null);
    };
  }, [stageRef]);

  // Recalculate dimensions function - can be called when view mode changes
  const recalculateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width: Math.max(400, width), height: Math.max(300, height) });
    }
  }, []);

  // Responsive canvas sizing
  useEffect(() => {
    recalculateDimensions();
    window.addEventListener("resize", recalculateDimensions);
    return () => window.removeEventListener("resize", recalculateDimensions);
  }, [sidebarCollapsed, recalculateDimensions]);

  const handleAddNewUnitType = useCallback(() => {
    if (!newUnitType.trim()) return;
    const normalized = newUnitType.trim().toLowerCase().replace(/\s+/g, "_");
    addCustomUnitType(normalized);
    setUnitType(normalized);
    setNewUnitType("");
    setShowAddUnit(false);
  }, [newUnitType, addCustomUnitType, setUnitType]);

  const handleUnitTypeChange = useCallback(
    (v: string) => {
      setUnitType(v as any);
    },
    [setUnitType]
  );

  const handleRoomChange = useCallback(
    (newRoom: string) => {
      if (locked) return;
      setRoom(newRoom);
      // Use new multi-room switchRoom action
      switchRoom(floor, newRoom);
    },
    [locked, floor, switchRoom]
  );

  const handleFloorChange = useCallback(
    (newFloor: string) => {
      if (locked) return;
      setFloor(newFloor);
      // Use new multi-room switchRoom action
      switchRoom(newFloor, room);
    },
    [locked, room, switchRoom]
  );

  const handleMainPhotoUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      try {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file
        const validation = validateImageFile(file);
        if (!validation.isValid) {
          toast({
            title: "Invalid file",
            description: validation.error,
            variant: "destructive",
          });
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const img = new window.Image();
          img.src = reader.result as string;
          img.onload = () => {
            setRoomPhoto(reader.result as string, img.naturalWidth, img.naturalHeight);
            toast({
              title: "Photo uploaded",
              description: "Main photo added successfully",
            });
          };
        };
        reader.readAsDataURL(file);
      } catch (error) {
        logger.error('Photo upload failed', { error: String(error), context: 'quotation-2d-state' });
        toast({
          title: "Upload failed",
          description: "Failed to upload photo. Please try again.",
          variant: "destructive",
        });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [setRoomPhoto, toast]
  );

  const handleRefPhotoUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      try {
        const files = e.target.files;
        if (!files) return;

        let validCount = 0;
        Array.from(files).forEach((file) => {
          // Validate each file
          const validation = validateImageFile(file);
          if (!validation.isValid) {
            toast({
              title: "Invalid file",
              description: `${file.name}: ${validation.error}`,
              variant: "destructive",
            });
            return;
          }

          const reader = new FileReader();
          reader.onload = () => {
            const img = new window.Image();
            img.src = reader.result as string;
            img.onload = () => {
              addReferencePhoto(reader.result as string, img.naturalWidth, img.naturalHeight);
            };
          };
          reader.readAsDataURL(file);
          validCount++;
        });

        if (validCount > 0) {
          toast({
            title: "Photos uploaded",
            description: `${validCount} reference photo(s) added`,
          });
        }
      } catch (error) {
        logger.error('Reference photo upload failed', { error: String(error), context: 'quotation-2d-state' });
        toast({
          title: "Upload failed",
          description: "Failed to upload reference photos. Please try again.",
          variant: "destructive",
        });
      } finally {
        if (refFileInputRef.current) {
          refFileInputRef.current.value = "";
        }
      }
    },
    [addReferencePhoto, toast]
  );

  const handleNew = useCallback(() => {
    if (window.confirm("Start a new quotation? Current data will be cleared.")) {
      // Use quotationService to reset
      quotationService.create(); // Create resets everything
    }
  }, []);

  const handleDelete = useCallback(() => {
    if (window.confirm("Delete all data? This cannot be undone.")) {
      // Use quotationService to reset
      quotationService.create();
    }
  }, []);

  const handleSaveRateCard = useCallback(
    (config: WardrobeConfig) => {
      if (activeDrawnUnit) {
        updateActiveDrawnUnit({ wardrobeConfig: config });
      }
      setShowRateCard(false);
    },
    [activeDrawnUnit, updateActiveDrawnUnit]
  );

  // Calculate photo scale to fit canvas
  const getPhotoTransform = useCallback(() => {
    if (!roomPhoto || !photoImage) return { x: 0, y: 0, scale: 1 };

    const canvasWidth = dimensions.width;
    const canvasHeight = dimensions.height;
    const photoWidth = roomPhoto.width;
    const photoHeight = roomPhoto.height;

    const scaleX = canvasWidth / photoWidth;
    const scaleY = canvasHeight / photoHeight;
    const scale = Math.min(scaleX, scaleY, 1);

    const scaledWidth = photoWidth * scale;
    const scaledHeight = photoHeight * scale;

    const x = (canvasWidth - scaledWidth) / 2;
    const y = (canvasHeight - scaledHeight) / 2;

    return { x, y, scale, width: scaledWidth, height: scaledHeight };
  }, [roomPhoto, photoImage, dimensions]);

  const photoTransform = getPhotoTransform();

  return {
    sidebarCollapsed,
    setSidebarCollapsed,
    dimensions,
    recalculateDimensions,
    isFullscreen,
    setIsFullscreen,
    canvasFocused,
    setCanvasFocused,
    photoImage,
    containerRef,
    fileInputRef,
    refFileInputRef,
    floor,
    room,
    newUnitType,
    setNewUnitType,
    showAddUnit,
    setShowAddUnit,
    showRateCard,
    setShowRateCard,
    locked,
    allUnitTypes,
    currentRateCardConfig,
    photoTransform,
    handleAddNewUnitType,
    handleUnitTypeChange,
    handleRoomChange,
    handleFloorChange,
    handleMainPhotoUpload,
    handleRefPhotoUpload,
    handleNew,
    handleDelete,
    handleSaveRateCard,
  };
}
