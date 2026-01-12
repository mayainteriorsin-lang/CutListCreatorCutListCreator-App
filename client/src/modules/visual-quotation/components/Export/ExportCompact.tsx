import React, { useState, useCallback } from "react";
import { FileText, FileSpreadsheet, Share2, Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useVisualQuotationStore } from "../../store/visualQuotationStore";
import {
  generateQuotationPDF,
  generateQuotationExcel,
  copyQuotationToClipboard,
} from "../../engine/exportEngine";
import { captureCanvasImage } from "../Canvas/CanvasStage";

const ExportCompact: React.FC = () => {
  const {
    client,
    meta,
    quotationRooms,
    drawnUnits,
    activeRoomIndex,
    sqftRate,
    setActiveRoomIndex,
    saveCurrentRoomState,
    loadRoomState,
  } = useVisualQuotationStore();

  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasData = drawnUnits.some(u => u.widthMm > 0 && u.heightMm > 0) ||
    quotationRooms.some(r => r.drawnUnits.some(u => u.widthMm > 0 && u.heightMm > 0));

  // Helper to wait for canvas to render after room switch
  const waitForRender = () => new Promise(resolve => setTimeout(resolve, 150));

  // Capture all room canvases sequentially
  const captureAllRoomCanvases = useCallback(async (): Promise<Map<number, string>> => {
    const allCanvasImages = new Map<number, string>();

    if (quotationRooms.length === 0) {
      // No rooms - just capture current canvas
      const currentImage = captureCanvasImage();
      if (currentImage) {
        allCanvasImages.set(0, currentImage);
      }
      return allCanvasImages;
    }

    // Save current room state first
    saveCurrentRoomState();
    const originalRoomIndex = activeRoomIndex;

    // Capture each room's canvas
    for (let i = 0; i < quotationRooms.length; i++) {
      if (i !== originalRoomIndex) {
        // Switch to this room
        loadRoomState(i);
        await waitForRender(); // Wait for canvas to re-render
      }

      // Capture the canvas
      const canvasImage = captureCanvasImage();
      if (canvasImage) {
        allCanvasImages.set(i, canvasImage);
      }
    }

    // Restore original room
    if (originalRoomIndex !== quotationRooms.length - 1) {
      loadRoomState(originalRoomIndex);
      await waitForRender();
    }

    return allCanvasImages;
  }, [quotationRooms, activeRoomIndex, saveCurrentRoomState, loadRoomState]);

  const exportPdf = async () => {
    if (!hasData) {
      alert("Please add units with dimensions first");
      return;
    }

    setIsExporting(true);
    try {
      // Capture ALL room canvases for visual PDF
      const allCanvasImages = await captureAllRoomCanvases();

      // Also capture current canvas as fallback
      const canvasImageData = captureCanvasImage();

      generateQuotationPDF({
        client,
        meta,
        quotationRooms,
        currentDrawnUnits: drawnUnits,
        activeRoomIndex,
        sqftRate,
        canvasImageData: canvasImageData || undefined,
        allCanvasImages: allCanvasImages.size > 0 ? allCanvasImages : undefined,
      });
    } catch (error) {
      console.error("PDF export error:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const exportExcel = async () => {
    if (!hasData) {
      alert("Please add units with dimensions first");
      return;
    }

    setIsExporting(true);
    try {
      generateQuotationExcel({
        client,
        meta,
        quotationRooms,
        currentDrawnUnits: drawnUnits,
        activeRoomIndex,
        sqftRate,
      });
    } catch (error) {
      console.error("Excel export error:", error);
      alert("Failed to generate Excel. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!hasData) {
      alert("Please add units with dimensions first");
      return;
    }

    const success = await copyQuotationToClipboard({
      client,
      meta,
      quotationRooms,
      currentDrawnUnits: drawnUnits,
      activeRoomIndex,
      sqftRate,
    });

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      alert("Failed to copy. Please try again.");
    }
  };

  const handleWhatsAppShare = async () => {
    if (!hasData) {
      alert("Please add units with dimensions first");
      return;
    }

    // First copy to clipboard
    await copyQuotationToClipboard({
      client,
      meta,
      quotationRooms,
      currentDrawnUnits: drawnUnits,
      activeRoomIndex,
      sqftRate,
    });

    // Open WhatsApp with pre-filled message prompt
    const phone = client.phone?.replace(/\D/g, "") || "";
    const whatsappUrl = phone
      ? `https://wa.me/${phone.startsWith("91") ? phone : "91" + phone}`
      : "https://wa.me/";

    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="p-2 rounded-xl border border-slate-600/50 bg-gradient-to-b from-slate-700/80 to-slate-800/80 backdrop-blur-sm shadow-lg shadow-black/10">
      <div className="flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-[10px] bg-rose-600/20 border-rose-500/30 text-rose-300 hover:bg-rose-600/30 hover:text-rose-200 hover:border-rose-500/50 transition-all duration-200"
          onClick={exportPdf}
          disabled={isExporting || !hasData}
        >
          {isExporting ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <FileText className="h-3 w-3 mr-1" />
          )}
          PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-[10px] bg-emerald-600/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 hover:text-emerald-200 hover:border-emerald-500/50 transition-all duration-200"
          onClick={exportExcel}
          disabled={isExporting || !hasData}
        >
          <FileSpreadsheet className="h-3 w-3 mr-1" />
          Excel
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-[10px] bg-blue-600/20 border-blue-500/30 text-blue-300 hover:bg-blue-600/30 hover:text-blue-200 hover:border-blue-500/50 transition-all duration-200"
              disabled={!hasData}
            >
              {copied ? (
                <Check className="h-3 w-3 mr-1 text-green-400" />
              ) : (
                <Share2 className="h-3 w-3 mr-1" />
              )}
              Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 bg-slate-800 border-slate-600">
            <DropdownMenuItem onClick={handleCopyToClipboard} className="text-xs text-slate-200 focus:bg-slate-700 focus:text-white">
              <Copy className="h-3 w-3 mr-2" />
              Copy to Clipboard
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleWhatsAppShare} className="text-xs text-slate-200 focus:bg-slate-700 focus:text-white">
              <svg className="h-3 w-3 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
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
