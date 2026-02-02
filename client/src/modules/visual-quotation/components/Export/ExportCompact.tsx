import React, { useState, useCallback } from "react";
import { FileText, FileSpreadsheet, Share2, Copy, Check, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuotationMetaStore } from "../../store/v2/useQuotationMetaStore";
import { useRoomStore } from "../../store/v2/useRoomStore";
import { useDesignCanvasStore } from "../../store/v2/useDesignCanvasStore";
import {
  generateQuotationPDF,
  generateQuotationExcel,
  copyQuotationToClipboard,
} from "../../engine/exportEngine";
import { captureCanvasImage } from "../Canvas";
import { logger } from "../../services/logger";

const ExportCompact: React.FC = () => {
  const { client, meta } = useQuotationMetaStore();
  const { quotationRooms, activeRoomIndex, setActiveRoomIndex, saveCurrentRoomState, loadRoomState } = useRoomStore();
  const { drawnUnits, roomPhoto, referencePhotos } = useDesignCanvasStore();

  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasData = drawnUnits.some(u => u.widthMm > 0 && u.heightMm > 0) ||
    quotationRooms.some(r => r.drawnUnits.some(u => u.widthMm > 0 && u.heightMm > 0));

  const waitForRender = () => new Promise(resolve => setTimeout(resolve, 150));

  const captureAllRoomCanvases = useCallback(async (): Promise<Map<number, string>> => {
    const allCanvasImages = new Map<number, string>();

    if (quotationRooms.length === 0) {
      const currentImage = captureCanvasImage();
      if (currentImage) allCanvasImages.set(0, currentImage);
      return allCanvasImages;
    }

    saveCurrentRoomState();
    const originalRoomIndex = activeRoomIndex;

    for (let i = 0; i < quotationRooms.length; i++) {
      if (i !== originalRoomIndex) {
        loadRoomState(i);
        await waitForRender();
      }
      const canvasImage = captureCanvasImage();
      if (canvasImage) allCanvasImages.set(i, canvasImage);
    }

    if (originalRoomIndex !== quotationRooms.length - 1) {
      loadRoomState(originalRoomIndex);
      await waitForRender();
    }

    return allCanvasImages;
  }, [quotationRooms, activeRoomIndex, saveCurrentRoomState, loadRoomState]);

  const exportPdf = async () => {
    if (!hasData) { alert("Please add units with dimensions first"); return; }

    setIsExporting(true);
    try {
      const allCanvasImages = await captureAllRoomCanvases();
      const canvasImageData = captureCanvasImage();

      generateQuotationPDF({
        client,
        meta,
        quotationRooms,
        currentDrawnUnits: drawnUnits,
        activeRoomIndex,
        canvasImageData: canvasImageData || undefined,
        allCanvasImages: allCanvasImages.size > 0 ? allCanvasImages : undefined,
        currentRoomPhoto: roomPhoto,
        currentReferencePhotos: referencePhotos,
      });
    } catch (error) {
      logger.error('PDF export failed', { error: String(error), context: 'export-compact' });
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const exportExcel = async () => {
    if (!hasData) { alert("Please add units with dimensions first"); return; }

    setIsExporting(true);
    try {
      generateQuotationExcel({
        client,
        meta,
        quotationRooms,
        currentDrawnUnits: drawnUnits,
        activeRoomIndex,
      });
    } catch (error) {
      logger.error('Excel export failed', { error: String(error), context: 'export-compact' });
      alert("Failed to generate Excel. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!hasData) { alert("Please add units with dimensions first"); return; }

    const success = await copyQuotationToClipboard({
      client,
      meta,
      quotationRooms,
      currentDrawnUnits: drawnUnits,
      activeRoomIndex,
    });

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      alert("Failed to copy. Please try again.");
    }
  };

  const handleWhatsAppShare = async () => {
    if (!hasData) { alert("Please add units with dimensions first"); return; }

    await copyQuotationToClipboard({
      client,
      meta,
      quotationRooms,
      currentDrawnUnits: drawnUnits,
      activeRoomIndex,
    });

    const phone = client.phone?.replace(/\D/g, "") || "";
    const whatsappUrl = phone
      ? `https://wa.me/${phone.startsWith("91") ? phone : "91" + phone}`
      : "https://wa.me/";

    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Download className="h-4 w-4 text-slate-600" />
        <span className="text-sm font-semibold text-slate-800">Export & Share</span>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-9 text-xs font-medium bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
          onClick={exportPdf}
          disabled={isExporting || !hasData}
        >
          {isExporting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileText className="h-4 w-4 mr-1.5" />}
          PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-9 text-xs font-medium bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
          onClick={exportExcel}
          disabled={isExporting || !hasData}
        >
          <FileSpreadsheet className="h-4 w-4 mr-1.5" />
          Excel
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-9 text-xs font-medium bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              disabled={!hasData}
            >
              {copied ? <Check className="h-4 w-4 mr-1.5 text-green-600" /> : <Share2 className="h-4 w-4 mr-1.5" />}
              Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={handleCopyToClipboard} className="text-sm">
              <Copy className="h-4 w-4 mr-2" />
              Copy to Clipboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleWhatsAppShare} className="text-sm">
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default ExportCompact;
