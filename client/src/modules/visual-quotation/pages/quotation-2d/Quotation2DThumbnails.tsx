/**
 * Quotation2DThumbnails
 *
 * Thumbnails strip showing main photo and reference photos.
 */

import React from "react";
import { Plus, Camera, X } from "lucide-react";

interface RoomPhoto {
  src: string;
  width: number;
  height: number;
}

interface ReferencePhoto extends RoomPhoto {
  id: string;
}

interface Quotation2DThumbnailsProps {
  roomPhoto: RoomPhoto | null;
  referencePhotos: ReferencePhoto[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  refFileInputRef: React.RefObject<HTMLInputElement | null>;
  removeReferencePhoto: (id: string) => void;
  clearRoomPhoto?: () => void;
}

export function Quotation2DThumbnails({
  roomPhoto,
  referencePhotos,
  fileInputRef,
  refFileInputRef,
  removeReferencePhoto,
  clearRoomPhoto,
}: Quotation2DThumbnailsProps) {
  return (
    <div className="flex-shrink-0 w-20 bg-slate-800 border-l border-slate-700 flex flex-col">
      <div className="flex-1 flex flex-col items-center py-2 px-1.5 gap-2 overflow-y-auto">
        {/* Main Photo Thumbnail */}
        <div className="flex-shrink-0 w-full">
          <p className="text-[8px] text-slate-500 mb-1 uppercase tracking-wide text-center">Main</p>
          {roomPhoto ? (
            <div className="relative w-full aspect-[4/3] rounded overflow-hidden border-2 border-blue-500 group">
              <img
                src={roomPhoto.src}
                alt="Main photo"
                className="w-full h-full object-cover"
              />
              {clearRoomPhoto && (
                <button
                  onClick={() => {
                    if (confirm("Delete main photo?")) {
                      clearRoomPhoto();
                    }
                  }}
                  className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          ) : (
            <div
              className="w-full aspect-[4/3] rounded border-2 border-dashed border-slate-600 flex items-center justify-center cursor-pointer hover:border-blue-500/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="h-4 w-4 text-slate-500" />
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-10 h-px bg-slate-700" />

        {/* Reference Photos */}
        <div className="flex-1 w-full min-h-0">
          <p className="text-[8px] text-slate-500 uppercase tracking-wide mb-1 text-center">
            Refs ({referencePhotos.length})
          </p>
          <div className="flex flex-col gap-1.5 overflow-y-auto">
            {/* Existing Reference Photos */}
            {referencePhotos.map((photo, index) => (
              <div
                key={photo.id}
                className="relative flex-shrink-0 w-full aspect-[4/3] rounded overflow-hidden border border-slate-600 group hover:border-slate-500 transition-colors"
              >
                <img
                  src={photo.src}
                  alt={`Reference ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => {
                    if (confirm(`Delete reference ${index + 1}?`)) {
                      removeReferencePhoto(photo.id);
                    }
                  }}
                  className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}

            {/* Add More Button - Always visible */}
            <div
              className="flex-shrink-0 w-full aspect-[4/3] rounded border border-dashed border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-500/50 hover:bg-slate-700/30 transition-colors gap-0.5"
              onClick={() => refFileInputRef.current?.click()}
            >
              <Plus className="h-4 w-4 text-slate-500" />
              <span className="text-[7px] text-slate-500">Add</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
