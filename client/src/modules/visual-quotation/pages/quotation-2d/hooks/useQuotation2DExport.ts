/**
 * useQuotation2DExport
 *
 * Hook for export functionality in 2D Quotation page.
 */

import { useState, useCallback, useRef } from "react";
import Konva from "konva";
import { useDesignCanvasStore } from "../../../store/v2/useDesignCanvasStore";
import { useToast } from "@/hooks/use-toast";
import {
  exportService,
  canExport,
} from "../../../services";
import { logger } from "../../../services/logger";

interface UseQuotation2DExportReturn {
  stageRef: React.RefObject<Konva.Stage | null>;
  isExporting: boolean;
  error: Error | null;
  copied: boolean;
  hasExportData: boolean;
  handleExportPDF: () => Promise<void>;
  handleExportExcel: () => Promise<void>;
  handleCopyToClipboard: () => Promise<void>;
  handleWhatsAppShare: () => Promise<void>;
}

export function useQuotation2DExport(): UseQuotation2DExportReturn {
  const stageRef = useRef<Konva.Stage>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { drawnUnits } = useDesignCanvasStore();

  // Check if we have data to export (use service)
  const hasExportData = canExport();

  // Capture canvas as image for PDF
  const capturePhotoCanvas = useCallback((): string | undefined => {
    if (!stageRef.current) return undefined;
    try {
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;
      let hasUnits = false;

      drawnUnits.forEach((unit) => {
        if (unit.box && unit.box.width > 0 && unit.box.height > 0) {
          hasUnits = true;
          minX = Math.min(minX, unit.box.x);
          minY = Math.min(minY, unit.box.y);
          maxX = Math.max(maxX, unit.box.x + unit.box.width);
          maxY = Math.max(maxY, unit.box.y + unit.box.height);
        }
      });

      if (hasUnits && minX !== Infinity) {
        const padding = 30;
        const x = Math.max(0, minX - padding);
        const y = Math.max(0, minY - padding);
        const width = maxX - minX + padding * 2;
        const height = maxY - minY + padding * 2;

        return stageRef.current.toDataURL({
          pixelRatio: 4,
          x,
          y,
          width,
          height,
        });
      }

      return stageRef.current.toDataURL({ pixelRatio: 4 });
    } catch {
      return undefined;
    }
  }, [drawnUnits]);

  // Export to PDF (via service)
  const handleExportPDF = useCallback(async () => {
    if (!hasExportData) {
      toast({
        title: "No data to export",
        description: "Please add units with dimensions first",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsExporting(true);
      setError(null);

      const canvasImageData = capturePhotoCanvas();
      const result = exportService.exportToPDF({ canvasImageData });

      if (!result.success) {
        throw new Error(result.error || "Failed to generate PDF");
      }

      toast({
        title: "PDF exported successfully",
        description: "Your quotation has been downloaded",
      });
    } catch (err) {
      const error = err as Error;
      setError(error);
      logger.error('PDF export failed', { error: String(error), context: 'quotation-2d-export' });
      toast({
        title: "Export failed",
        description: error.message || "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [hasExportData, capturePhotoCanvas, toast]);

  // Export to Excel (via service)
  const handleExportExcel = useCallback(async () => {
    if (!hasExportData) {
      toast({
        title: "No data to export",
        description: "Please add units with dimensions first",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsExporting(true);
      setError(null);

      const result = exportService.exportToExcel();

      if (!result.success) {
        throw new Error(result.error || "Failed to generate Excel");
      }

      toast({
        title: "Excel exported successfully",
        description: "Your quotation has been downloaded",
      });
    } catch (err) {
      const error = err as Error;
      setError(error);
      logger.error('Excel export failed', { error: String(error), context: 'quotation-2d-export' });
      toast({
        title: "Export failed",
        description: error.message || "Failed to generate Excel. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  }, [hasExportData, toast]);

  // Copy to clipboard (via service)
  const handleCopyToClipboard = useCallback(async () => {
    if (!hasExportData) {
      toast({
        title: "No data to copy",
        description: "Please add units with dimensions first",
        variant: "destructive",
      });
      return;
    }

    try {
      setError(null);
      const result = await exportService.copyToClipboard();

      if (result.success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({
          title: "Copied to clipboard",
          description: "Quotation details copied successfully",
        });
      } else {
        throw new Error(result.error || "Failed to copy");
      }
    } catch (err) {
      const error = err as Error;
      setError(error);
      logger.error('Copy to clipboard failed', { error: String(error), context: 'quotation-2d-export' });
      toast({
        title: "Copy failed",
        description: error.message || "Failed to copy. Please try again.",
        variant: "destructive",
      });
    }
  }, [hasExportData, toast]);

  // Share to WhatsApp (via service)
  const handleWhatsAppShare = useCallback(async () => {
    if (!hasExportData) {
      toast({
        title: "No data to share",
        description: "Please add units with dimensions first",
        variant: "destructive",
      });
      return;
    }

    try {
      setError(null);
      const result = await exportService.shareToWhatsApp();

      if (!result.success) {
        throw new Error(result.error || "Failed to share");
      }

      toast({
        title: "Opening WhatsApp",
        description: "Quotation ready to share",
      });
    } catch (err) {
      const error = err as Error;
      setError(error);
      logger.error('WhatsApp share failed', { error: String(error), context: 'quotation-2d-export' });
      toast({
        title: "Share failed",
        description: error.message || "Failed to open WhatsApp. Please try again.",
        variant: "destructive",
      });
    }
  }, [hasExportData, toast]);

  return {
    stageRef,
    isExporting,
    error,
    copied,
    hasExportData,
    handleExportPDF,
    handleExportExcel,
    handleCopyToClipboard,
    handleWhatsAppShare,
  };
}
