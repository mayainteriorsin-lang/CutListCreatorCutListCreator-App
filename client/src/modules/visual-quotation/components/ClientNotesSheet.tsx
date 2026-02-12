/**
 * ClientNotesSheet
 *
 * Full-screen sheet for managing client notes with photos.
 * Auto-generated structure from Floor > Room > Unit.
 */

import React, { useState, useRef, useCallback, ChangeEvent } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronDown,
  ChevronRight,
  Camera,
  Image,
  X,
  Star,
  AlertCircle,
  FileText,
  Plus,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClientNotesStore, NotePhoto } from '../store/v2/useClientNotesStore';
import { useDesignCanvasStore } from '../store/v2/useDesignCanvasStore';
import { useQuotationMetaStore } from '../store/v2/useQuotationMetaStore';
import { formatUnitTypeLabel } from '../constants';
import { validateImageFile } from '../utils/fileValidation';
import { useToast } from '@/hooks/use-toast';
import type { DrawnUnit } from '../types';

interface ClientNotesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper to format floor/room names
const formatName = (name: string) =>
  name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// Photo thumbnail component
const PhotoThumbnail: React.FC<{
  photo: NotePhoto;
  onRemove: () => void;
}> = ({ photo, onRemove }) => (
  <div className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-slate-300 group">
    <img
      src={photo.src}
      alt={photo.caption || 'Note photo'}
      className="w-full h-full object-cover"
    />
    <button
      onClick={onRemove}
      className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
    >
      <X className="h-3 w-3" />
    </button>
    {photo.caption && (
      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] px-1 py-0.5 truncate">
        {photo.caption}
      </div>
    )}
  </div>
);

// Photo upload button with camera/gallery options
const PhotoUploadButton: React.FC<{
  onUpload: (photo: Omit<NotePhoto, 'id' | 'timestamp'>) => void;
  compact?: boolean;
}> = ({ onUpload, compact }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.isValid) {
      toast({
        title: 'Invalid file',
        description: validation.error,
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onUpload({
        src: reader.result as string,
        type: 'site',
      });
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onUpload, toast]);

  const triggerCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  const triggerGallery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'gap-1',
              compact ? 'h-7 px-2 text-xs' : 'h-8 px-3 text-sm'
            )}
          >
            <Plus className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
            {!compact && 'Photo'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={triggerCamera} className="text-xs">
            <Camera className="h-3.5 w-3.5 mr-2" />
            Camera
          </DropdownMenuItem>
          <DropdownMenuItem onClick={triggerGallery} className="text-xs">
            <Image className="h-3.5 w-3.5 mr-2" />
            Gallery
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

// Unit note card component
const UnitNoteCard: React.FC<{
  unit: DrawnUnit;
  unitIndex: number;
  floorName: string;
  roomName: string;
}> = ({ unit, unitIndex, floorName, roomName }) => {
  const {
    getUnitNote,
    setUnitNote,
    setUnitPriority,
    addUnitPhoto,
    removeUnitPhoto,
  } = useClientNotesStore();

  const note = getUnitNote(unit.id);
  const unitLabel = `${formatUnitTypeLabel(unit.unitType || 'wardrobe')} #${unitIndex + 1}`;

  const priorityColors = {
    normal: 'border-slate-200',
    important: 'border-amber-400 bg-amber-50',
    urgent: 'border-red-400 bg-red-50',
  };

  return (
    <div className={cn(
      'border rounded-lg p-3 space-y-2',
      priorityColors[note.priority]
    )}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-500" />
          <span className="font-medium text-sm">{unitLabel}</span>
          {note.priority === 'important' && (
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
          )}
          {note.priority === 'urgent' && (
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]">
              Priority
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem
              onClick={() => setUnitPriority(unit.id, 'normal')}
              className="text-xs"
            >
              Normal
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setUnitPriority(unit.id, 'important')}
              className="text-xs"
            >
              <Star className="h-3 w-3 mr-2 text-amber-500" />
              Important
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setUnitPriority(unit.id, 'urgent')}
              className="text-xs"
            >
              <AlertCircle className="h-3 w-3 mr-2 text-red-500" />
              Urgent
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Dimensions badge */}
      {unit.widthMm && unit.heightMm && (
        <div className="text-[10px] text-slate-500">
          {unit.widthMm} × {unit.heightMm} × {unit.depthMm || 560} mm
        </div>
      )}

      {/* Text area */}
      <Textarea
        placeholder="Client suggestions, requirements..."
        value={note.text}
        onChange={(e) => setUnitNote(unit.id, e.target.value)}
        className="min-h-[60px] text-sm resize-none"
      />

      {/* Photos */}
      <div className="flex items-center gap-2 flex-wrap">
        {note.photos.map((photo) => (
          <PhotoThumbnail
            key={photo.id}
            photo={photo}
            onRemove={() => removeUnitPhoto(unit.id, photo.id)}
          />
        ))}
        <PhotoUploadButton
          onUpload={(photo) => addUnitPhoto(unit.id, photo)}
          compact
        />
      </div>
    </div>
  );
};

export const ClientNotesSheet: React.FC<ClientNotesSheetProps> = ({
  open,
  onOpenChange,
}) => {
  const { client } = useQuotationMetaStore();
  const { roomUnits, customFloors, customRooms } = useDesignCanvasStore();
  const {
    generalNotes,
    generalPhotos,
    setGeneralNotes,
    addGeneralPhoto,
    removeGeneralPhoto,
    getNotesCount,
    clearAllNotes,
  } = useClientNotesStore();

  const [expandedFloors, setExpandedFloors] = useState<Record<string, boolean>>({});
  const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>({});

  const { toast } = useToast();

  // Get all floors from roomUnits keys
  const getFloorsWithUnits = useCallback(() => {
    const floors = new Map<string, Map<string, DrawnUnit[]>>();

    Object.entries(roomUnits).forEach(([key, units]) => {
      if (!units || units.length === 0) return;

      const [floorId, roomId] = key.split('_');
      if (!floorId || !roomId) return;

      if (!floors.has(floorId)) {
        floors.set(floorId, new Map());
      }

      const floorRooms = floors.get(floorId)!;
      floorRooms.set(roomId, units);
    });

    return floors;
  }, [roomUnits]);

  const floorsWithUnits = getFloorsWithUnits();
  const { notes: notesCount, photos: photosCount } = getNotesCount();

  const toggleFloor = (floorId: string) => {
    setExpandedFloors((prev) => ({
      ...prev,
      [floorId]: !prev[floorId],
    }));
  };

  const toggleRoom = (roomKey: string) => {
    setExpandedRooms((prev) => ({
      ...prev,
      [roomKey]: !prev[roomKey],
    }));
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all notes and photos? This cannot be undone.')) {
      clearAllNotes();
      toast({
        title: 'Notes cleared',
        description: 'All notes and photos have been removed.',
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg p-0 flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b bg-slate-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Client Notes
              </SheetTitle>
              {client.name && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {client.name} {client.location && `- ${client.location}`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500">
                {notesCount} notes, {photosCount} photos
              </span>
              {(notesCount > 0 || photosCount > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  className="h-7 px-2 text-xs text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Units by Floor/Room */}
            {floorsWithUnits.size > 0 ? (
              Array.from(floorsWithUnits.entries()).map(([floorId, rooms]) => {
                const floorName = formatName(floorId);
                const isFloorExpanded = expandedFloors[floorId] !== false;

                return (
                  <Collapsible
                    key={floorId}
                    open={isFloorExpanded}
                    onOpenChange={() => toggleFloor(floorId)}
                  >
                    <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                      {isFloorExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <span className="font-semibold text-sm">{floorName}</span>
                      <span className="text-xs opacity-75 ml-auto">
                        {rooms.size} room(s)
                      </span>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="pl-2 mt-2 space-y-3">
                      {Array.from(rooms.entries()).map(([roomId, units]) => {
                        const roomName = formatName(roomId);
                        const roomKey = `${floorId}_${roomId}`;
                        const isRoomExpanded = expandedRooms[roomKey] !== false;

                        return (
                          <Collapsible
                            key={roomKey}
                            open={isRoomExpanded}
                            onOpenChange={() => toggleRoom(roomKey)}
                          >
                            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
                              {isRoomExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-slate-600" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                              )}
                              <span className="font-medium text-sm text-slate-700">
                                {roomName}
                              </span>
                              <span className="text-xs text-slate-500 ml-auto">
                                {units.length} unit(s)
                              </span>
                            </CollapsibleTrigger>

                            <CollapsibleContent className="pl-4 mt-2 space-y-2">
                              {units.map((unit, idx) => (
                                <UnitNoteCard
                                  key={unit.id}
                                  unit={unit}
                                  unitIndex={idx}
                                  floorName={floorName}
                                  roomName={roomName}
                                />
                              ))}
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })
            ) : (
              <div className="text-center py-8 text-slate-500">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No units created yet</p>
                <p className="text-xs mt-1">
                  Draw units on the canvas to add notes
                </p>
              </div>
            )}

            {/* General Notes Section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold text-sm text-slate-700 mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                General Notes
              </h3>
              <Textarea
                placeholder="Overall client preferences, delivery timeline, special instructions..."
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                className="min-h-[80px] text-sm resize-none mb-3"
              />

              {/* General Photos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Reference Photos ({generalPhotos.length})
                  </span>
                  <PhotoUploadButton onUpload={addGeneralPhoto} compact />
                </div>
                {generalPhotos.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {generalPhotos.map((photo) => (
                      <PhotoThumbnail
                        key={photo.id}
                        photo={photo}
                        onRemove={() => removeGeneralPhoto(photo.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default ClientNotesSheet;
