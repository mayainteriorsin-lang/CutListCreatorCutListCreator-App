/**
 * Module Preview Modal
 * Shows a larger 2D preview of a library module with details.
 */

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LibraryModule } from "../types";
import { UNIT_TYPE_LABELS } from "@/modules/visual-quotation/constants";
import { generateHumanReadableId } from "../storage";
import RealModelPreview from "./RealModelPreview";
import {
  Ruler,
  Layers,
  Tag,
  Calendar,
  Star,
  Edit3,
  Trash2,
  Copy,
  Share2,
  Globe,
  Lock,
  Link,
  CheckCircle2,
} from "lucide-react";

interface ModulePreviewModalProps {
  module: LibraryModule | null;
  open: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onToggleFavorite?: () => void;
  onPublish?: () => void;
  onUnpublish?: () => void;
  shareCode?: string | null;
  isPublished?: boolean;
}

export default function ModulePreviewModal({
  module,
  open,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleFavorite,
  onPublish,
  onUnpublish,
  shareCode,
  isPublished,
}: ModulePreviewModalProps) {
  const [copied, setCopied] = React.useState(false);
  const [idCopied, setIdCopied] = React.useState(false);

  if (!module) return null;

  const humanReadableId = module.fullConfig
    ? generateHumanReadableId(module.fullConfig)
    : generateHumanReadableId({
        unitType: module.unitType,
        widthMm: module.widthMm,
        heightMm: module.heightMm,
        depthMm: module.depthMm,
        shutterCount: module.shutterCount,
        sectionCount: module.sectionCount,
        loftEnabled: module.loftEnabled,
      });

  const copyModuleId = () => {
    // Copy both human-readable and UUID
    navigator.clipboard.writeText(`${humanReadableId} [${module.id}]`);
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), 2000);
  };

  const shareUrl = shareCode ? `${window.location.origin}/library/public/${shareCode}` : null;

  const copyShareLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const typeLabel = UNIT_TYPE_LABELS[module.unitType] || module.unitType;
  const hasDimensions = module.widthMm > 0 && module.heightMm > 0;

  const formatDim = (mm: number) => {
    if (mm === 0) return "—";
    if (mm >= 1000) return `${(mm / 1000).toFixed(2)}m`;
    return `${mm}mm`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Preview Area */}
          <div className="md:w-1/2 bg-gradient-to-br from-slate-100 to-slate-50 p-4 flex items-center justify-center min-h-[300px]">
            <RealModelPreview
              module={module}
              className="w-full h-[280px]"
              showDimensions={true}
            />
          </div>

          {/* Details Panel */}
          <div className="md:w-1/2 p-6 flex flex-col">
            <DialogHeader className="mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-800">
                    {module.name}
                  </DialogTitle>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {typeLabel}
                  </span>
                </div>
                {module.favorite && (
                  <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
                )}
              </div>
            </DialogHeader>

            {/* Description */}
            {module.description && (
              <p className="text-sm text-slate-600 mb-4">{module.description}</p>
            )}

            {/* Specs Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Dimensions */}
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                  <Ruler className="w-3.5 h-3.5" />
                  Dimensions
                </div>
                <div className="font-mono text-sm text-slate-700">
                  {hasDimensions ? (
                    <>
                      {formatDim(module.widthMm)} × {formatDim(module.heightMm)} × {formatDim(module.depthMm)}
                    </>
                  ) : (
                    <span className="italic text-slate-400">Template (no dims)</span>
                  )}
                </div>
              </div>

              {/* Materials */}
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                  <Layers className="w-3.5 h-3.5" />
                  Materials
                </div>
                <div className="text-sm text-slate-700">
                  {module.carcassMaterial || "—"} / {module.shutterMaterial || "—"}
                </div>
              </div>

              {/* Config */}
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                  <Tag className="w-3.5 h-3.5" />
                  Configuration
                </div>
                <div className="text-sm text-slate-700">
                  {module.shutterCount || 0} shutters, {module.sectionCount || 1} sections
                  {module.loftEnabled && ", with loft"}
                </div>
              </div>

              {/* Created */}
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Created
                </div>
                <div className="text-sm text-slate-700">
                  {formatDate(module.createdAt)}
                </div>
              </div>
            </div>

            {/* Tags */}
            {module.tags && module.tags.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-slate-500 mb-1.5">Tags</div>
                <div className="flex flex-wrap gap-1.5">
                  {module.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Human-Readable ID */}
            <div className="mb-4 p-2 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-100">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">Model Signature</div>
                <button
                  onClick={copyModuleId}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  {idCopied ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy ID
                    </>
                  )}
                </button>
              </div>
              {/* Human readable name */}
              <div className="font-semibold text-sm text-indigo-700 mt-1">
                {humanReadableId}
              </div>
              {/* UUID (smaller, for reference) */}
              <div className="font-mono text-[10px] text-slate-400 mt-1 truncate select-all" title={module.id}>
                ID: {module.id}
              </div>
            </div>

            {/* Source Badge */}
            <div className="flex items-center gap-2 mb-4">
              <span
                className={cn(
                  "px-2 py-1 rounded text-xs font-medium",
                  module.source === "predefined"
                    ? "bg-slate-100 text-slate-600"
                    : "bg-indigo-50 text-indigo-600"
                )}
              >
                {module.source === "predefined" ? "Preset Module" : "Custom Module"}
              </span>
              {module.isTemplate && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-teal-50 text-teal-600">
                  Template
                </span>
              )}
              {isPublished && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-green-50 text-green-600 flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  Published
                </span>
              )}
            </div>

            {/* Publish/Share Section */}
            {module.source !== "predefined" && (
              <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Share2 className="h-4 w-4 text-blue-500" />
                    Share Online
                  </div>
                  {isPublished ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onUnpublish}
                      className="h-7 text-xs gap-1 text-orange-600 border-orange-200 hover:bg-orange-50"
                    >
                      <Lock className="h-3 w-3" />
                      Unpublish
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onPublish}
                      className="h-7 text-xs gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Globe className="h-3 w-3" />
                      Publish
                    </Button>
                  )}
                </div>
                {isPublished && shareUrl && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 px-2 py-1 text-xs bg-white border border-slate-200 rounded font-mono text-slate-600 truncate"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyShareLink}
                      className="h-7 text-xs gap-1"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Link className="h-3 w-3" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                )}
                {!isPublished && (
                  <p className="text-xs text-slate-500 mt-1">
                    Publish to share this template with others via a unique link.
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100">
              {onToggleFavorite && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleFavorite}
                  className={cn(
                    "gap-1.5",
                    module.favorite && "text-amber-600 border-amber-200 bg-amber-50"
                  )}
                >
                  <Star
                    className={cn("h-3.5 w-3.5", module.favorite && "fill-amber-400")}
                  />
                  {module.favorite ? "Favorited" : "Favorite"}
                </Button>
              )}
              {onDuplicate && (
                <Button variant="outline" size="sm" onClick={onDuplicate} className="gap-1.5">
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </Button>
              )}
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit
                </Button>
              )}
              {onDelete && module.source !== "predefined" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDelete}
                  className="gap-1.5 text-red-600 hover:bg-red-50 hover:border-red-200"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
