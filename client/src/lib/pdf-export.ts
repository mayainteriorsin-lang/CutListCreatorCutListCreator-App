import { jsPDF } from "jspdf";
import { calculateGaddiLineDirection, shouldShowGaddiMarking, type GaddiPanel } from '@/features/gaddi';

// 🔥 VERSION TRACKING - Update this to force cache refresh
const PDF_VERSION = "2025-12-01-GADDI-CLEAN";

/** Safe ASCII text (avoid garbled PDF text) */
function asciiSafe(str: string | undefined | null): string {
  if (!str) return "";
  return String(str)
    .normalize("NFKD")
    .replace(/×/g, "x")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

/** Main: generate simplified PDF with per-sheet layout */
export function generateCutlistPDF({
  brandResults = [],
  sheet,
  plywoodTypes = [],
  laminateCodes = [],
  roomNames = [],
  filename = "cutting-list.pdf",
  orientationPreference = "portrait",
  deletedSheets = new Set(),
  cabinets = [],
  materialSummary,
}: {
  brandResults?: Array<{ brand: string; laminateCode: string; laminateDisplay: string; result: any; isBackPanel: boolean }>;
  sheet: { w: number; h: number; kerf: number };
  plywoodTypes?: string[];
  laminateCodes?: string[];
  roomNames?: string[];
  filename?: string;
  orientationPreference?: "portrait" | "landscape";
  deletedSheets?: Set<string>;
  cabinets?: any[];
  materialSummary?: {
    plywood: Record<string, number>;
    laminates: Record<string, number>;
    totalPlywoodSheets: number;
  };
}): jsPDF {
  
  // Clear service workers and caches to force fresh code
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => reg.unregister());
    });
  }
  if (typeof caches !== 'undefined') {
    caches.keys().then(keys => {
      keys.forEach(key => caches.delete(key));
    });
  }
  
  const doc = new jsPDF({
    orientation: orientationPreference,
    unit: "mm",
    format: "a4"
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;
  
  // Calculate total pages across all brand results, excluding deleted sheets
  let totalPages = 0;
  brandResults.forEach((brandResult) => {
    const sheets = brandResult.result?.panels || [];  // ✅ FIX: Changed 'sheets' to 'panels'
    sheets.forEach((s: any, idx: number) => {
      const sheetId = s._sheetId || `${brandResult.brand}|||${brandResult.laminateCode}-${idx}`;
      if (s.placed && s.placed.length > 0 && !deletedSheets.has(sheetId)) {
        totalPages++;
      }
    });
  });
  
  let currentPage = 0;

  // Function to draw Material List page (first page)
  function drawMaterialListPage() {
    currentPage++;
    
    const centerX = pageW / 2;
    let yPos = margin + 20;
    
    // Company Name - Centered
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(0);
    doc.text("Maya Interiors", centerX, yPos, { align: 'center' });
    yPos += 10;
    
    // Title - Centered
    doc.setFontSize(16);
    doc.text("Material List", centerX, yPos, { align: 'center' });
    yPos += 15;
    
    // Project Info (if available)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    if (cabinets && cabinets.length > 0 && cabinets[0].clientName) {
      doc.text(`Project: ${asciiSafe(cabinets[0].clientName)}`, margin, yPos);
      yPos += 6;
    }
    
    if (roomNames && roomNames.length > 0) {
      doc.text(`Room: ${asciiSafe(roomNames.join(', '))}`, margin, yPos);
      yPos += 6;
    }
    
    const today = new Date().toISOString().split('T')[0];
    doc.text(`Date: ${today}`, margin, yPos);
    yPos += 12;
    
    // Line separator
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageW - margin, yPos);
    yPos += 10;
    
    // Sheet Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Sheet Size: ${sheet.w} x ${sheet.h} mm`, margin, yPos);
    yPos += 6;
    doc.text(`Kerf: ${sheet.kerf} mm`, margin, yPos);
    yPos += 15;
    
    // Material Requirements Table
    if (materialSummary) {
      const tableX = margin;
      const tableWidth = pageW - margin * 2;
      
      // 1. PLYWOOD SHEETS
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setFillColor(217, 119, 6); // Amber-600
      doc.rect(tableX, yPos, tableWidth, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.text(`PLYWOOD SHEETS - Total: ${materialSummary.totalPlywoodSheets}`, tableX + 3, yPos + 5.5);
      yPos += 8;
      
      // Plywood list
      if (Object.keys(materialSummary.plywood).length > 0) {
        // Table header
        doc.setFillColor(250, 250, 250);
        doc.rect(tableX, yPos, tableWidth, 7, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("#", tableX + 3, yPos + 4.5);
        doc.text("Plywood Brand", tableX + 12, yPos + 4.5);
        doc.text("Qty", tableX + tableWidth - 15, yPos + 4.5);
        yPos += 7;
        
        // Table rows (sorted by count descending)
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        let rowNum = 1;
        Object.entries(materialSummary.plywood)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .forEach(([brand, count]) => {
            doc.setFillColor(rowNum % 2 === 0 ? 255 : 250, rowNum % 2 === 0 ? 255 : 250, rowNum % 2 === 0 ? 255 : 250);
            doc.rect(tableX, yPos, tableWidth, 6, 'F');
            doc.setTextColor(0, 0, 0);
            doc.text(`${rowNum}`, tableX + 3, yPos + 4);
            doc.text(asciiSafe(brand), tableX + 12, yPos + 4);
            doc.setFont("helvetica", "bold");
            doc.text(`${count}`, tableX + tableWidth - 15, yPos + 4);
            doc.setFont("helvetica", "normal");
            yPos += 6;
            rowNum++;
          });
        
        // Border around plywood table
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.rect(tableX, yPos - (rowNum - 1) * 6 - 15, tableWidth, (rowNum - 1) * 6 + 15);
        yPos += 8;
      }
      
      // 2. LAMINATE SHEETS
      if (Object.keys(materialSummary.laminates).length > 0) {
        const totalLaminates = Object.values(materialSummary.laminates).reduce((sum: number, count) => sum + count, 0);
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setFillColor(37, 99, 235); // Blue-600
        doc.rect(tableX, yPos, tableWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(`LAMINATE SHEETS - Total: ${totalLaminates}`, tableX + 3, yPos + 5.5);
        yPos += 8;
        
        // Table header
        doc.setFillColor(250, 250, 250);
        doc.rect(tableX, yPos, tableWidth, 7, 'F');
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("#", tableX + 3, yPos + 4.5);
        doc.text("Laminate Code", tableX + 12, yPos + 4.5);
        doc.text("Qty", tableX + tableWidth - 15, yPos + 4.5);
        yPos += 7;
        
        // Table rows (sorted by count descending)
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        let rowNum = 1;
        Object.entries(materialSummary.laminates)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .forEach(([code, count]) => {
            doc.setFillColor(rowNum % 2 === 0 ? 255 : 250, rowNum % 2 === 0 ? 255 : 250, rowNum % 2 === 0 ? 255 : 250);
            doc.rect(tableX, yPos, tableWidth, 6, 'F');
            doc.setTextColor(0, 0, 0);
            doc.text(`${rowNum}`, tableX + 3, yPos + 4);
            doc.text(asciiSafe(code), tableX + 12, yPos + 4);
            doc.setFont("helvetica", "bold");
            doc.text(`${count}`, tableX + tableWidth - 15, yPos + 4);
            doc.setFont("helvetica", "normal");
            yPos += 6;
            rowNum++;
          });
        
        // Border around laminate table
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.rect(tableX, yPos - (rowNum - 1) * 6 - 15, tableWidth, (rowNum - 1) * 6 + 15);
        yPos += 5;
      }
    }
    
    // Separator line
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageW - margin, yPos);
    yPos += 10;
    
    // Summary Totals
    if (cabinets && cabinets.length > 0) {
      const allPanels = cabinets.flatMap((c: any) => {
        // This is a simplified panel count - you can enhance this if needed
        return [];
      });
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`Total Cabinets: ${cabinets.length}`, margin, yPos);
      yPos += 6;
      
      // Calculate total panels from brand results
      const totalPanelsCount = brandResults.reduce((sum, br) => {
        const panels = br.result?.panels || [];
        return sum + panels.reduce((pSum: number, sheet: any) => pSum + (sheet.placed?.length || 0), 0);
      }, 0);
      
      doc.text(`Total Panels: ${totalPanelsCount}`, margin, yPos);
    }
    
    // Footer with version and label
    const footerY = pageH - 5;
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`v${PDF_VERSION}`, margin, footerY);
    
    // Summary label (bottom right) - NOT a page number
    doc.setFontSize(9);
    doc.setTextColor(0);
    doc.text(`Summary`, pageW - margin, footerY, { align: 'right' });
  }

  // Function to draw a single sheet page
  function drawSheetPage(sheetData: any, brand: string, laminateDisplay: string, isBackPanel: boolean, sheetNumber: number) {
    currentPage++;
    if (currentPage > 1) doc.addPage();

    const panels = sheetData.placed || [];

    // Header
    const headerY = margin + 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("Maya Interiors", margin, headerY);
    
    // Left side info
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Sheet Size: ${sheet.w}x${sheet.h} mm`, margin, headerY + 6);
    doc.text(`Kerf: ${sheet.kerf} mm`, margin, headerY + 11);
    
    // Version info (bottom left corner)
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`v${PDF_VERSION}`, margin, pageH - 5);
    
    // Right side material info
    const rightX = pageW - margin;
    let rightY = headerY;
    
    // Always show the specific brand for this sheet
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0); // Black
    doc.text(asciiSafe(`Plywood: ${brand}`), rightX, rightY, { align: 'right' });
    rightY += 5.5;
    
    // Show room names if available
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(0); // Black
    if (roomNames.length > 0) {
      doc.text(asciiSafe(`Room: ${roomNames.join(', ')}`), rightX, rightY, { align: 'right' });
      rightY += 5;
    }
    
    // Always show laminate composition
    doc.setFontSize(11);
    
    // Split laminate display into front and inner
    const parts = laminateDisplay.split(' + ');
    const frontLaminate = parts[0] || 'None';
    const innerLaminate = parts[1] || parts[0] || 'None';
    
    doc.text(asciiSafe(`Front Laminate: ${frontLaminate}`), rightX, rightY, { align: 'right' });
    rightY += 5;
    doc.text(asciiSafe(`Inner Laminate: ${innerLaminate}`), rightX, rightY, { align: 'right' });
    
    // Line separator
    doc.setLineWidth(0.5);
    doc.line(margin, headerY + 26, pageW - margin, headerY + 26);
    
    // Sheet area
    const sheetY = headerY + 26;
    const sheetAreaH = pageH - sheetY - margin - 15;
    const sheetAreaW = pageW - 2 * margin;
    
    // Scale to fit sheet dimensions within area
    const scale = Math.min(sheetAreaW / sheet.w, sheetAreaH / sheet.h);
    const scaledW = sheet.w * scale;
    const scaledH = sheet.h * scale;
    
    // Center the scaled sheet
    const offsetX = margin + (sheetAreaW - scaledW) / 2;
    const offsetY = sheetY + (sheetAreaH - scaledH) / 2;
    
    // Draw the actual sheet border (not the full area)
    doc.setLineWidth(0.8);
    doc.rect(offsetX, offsetY, scaledW, scaledH);
    
    // Create panel dimension summary (group by size and count quantity)
    const panelSummary: { [key: string]: { letterCode: string; width: number; height: number; count: number } } = {};
    let uniqueSizeIndex = 0;
    panels.forEach((panel: any) => {
      const nomW = (panel as any).nomW ?? panel.w;
      const nomH = (panel as any).nomH ?? panel.h;
      const sizeKey = `${Math.round(nomW)}x${Math.round(nomH)}`;
      
      if (!panelSummary[sizeKey]) {
        panelSummary[sizeKey] = {
          letterCode: String.fromCharCode(65 + uniqueSizeIndex),
          width: Math.round(nomW),
          height: Math.round(nomH),
          count: 0
        };
        uniqueSizeIndex++;
      }
      panelSummary[sizeKey].count++;
    });
    
    // Draw panel dimension list on the left side
    const listX = margin;
    let listY = sheetY;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(0);
    doc.text("Panel Sizes:", listX, listY);
    listY += 7;
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    Object.values(panelSummary).forEach((item, index) => {
      const letterCode = String.fromCharCode(65 + index);
      const text = `${letterCode} - ${item.width}x${item.height}  ( ${item.count} )`;
      doc.text(text, listX, listY);
      listY += 6;
    });
    
    // Draw panels in their actual optimized positions
    panels.forEach((panel: any, idx: number) => {
      const nomW = (panel as any).nomW ?? panel.w;
      const nomH = (panel as any).nomH ?? panel.h;
      
      // Scale panel position and size
      // Flip Y axis: optimizer uses bottom-left origin, PDF uses top-left
      const x = offsetX + panel.x * scale;
      const y = offsetY + (sheet.h - panel.y - panel.h) * scale;
      const w = panel.w * scale;
      const h = panel.h * scale;
      
      // Panel border - ENHANCED: Bolder for better visibility
      doc.setLineWidth(0.8);
      doc.rect(x, y, w, h);
      
      // Extract panel name
      const panelName = panel.id.toUpperCase().includes('LEFT') ? 'LEFT' :
                       panel.id.toUpperCase().includes('RIGHT') ? 'RIGHT' :
                       panel.id.toUpperCase().includes('TOP') ? 'TOP' :
                       panel.id.toUpperCase().includes('BOTTOM') ? 'BOTTOM' :
                       panel.id.toUpperCase().includes('BACK') ? 'BACK' : 
                       panel.id;
      
      // Only draw panel name and dimensions on panels >= 200mm in both dimensions
      const scale_inverse = 2420 / scaledH; // Calculate inverse scale to get original mm
      const originalW = panel.w;
      const originalH = panel.h;
      
      if (originalW >= 200 && originalH >= 200) {
        // Dimensions - Below Delete Button Position - Responsive font size based on panel size
        const dimensionText = `${Math.round(nomW)}x${Math.round(nomH)}`;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0); // Black
        
        // Responsive sizing: scales with panel size, min 8pt, max 18pt
        const dimensionFontSize = Math.max(8, Math.min(18, w / 12, h / 8));
        doc.setFontSize(dimensionFontSize);
        doc.text(dimensionText, x + w / 2, y + 10, { align: 'center', baseline: 'top' });
        
        // Panel name - Bottom Center - Responsive font size based on panel size
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0); // Black
        // Responsive sizing: scales with panel size, min 9pt, max 16pt
        const nameFontSize = Math.max(9, Math.min(16, w / 10, h / 6));
        doc.setFontSize(nameFontSize);
        doc.text(asciiSafe(panelName), x + w / 2, y + h - 3, { align: 'center', baseline: 'bottom' });
      }
      
      // Letter code (centered, large) - ENHANCED: Better contrast, always visible
      {
        // Look up letter code based on panel SIZE (not position)
        const sizeKey = `${Math.round(nomW)}x${Math.round(nomH)}`;
        const letterCode = panelSummary[sizeKey]?.letterCode || 'X';
        doc.setFont("helvetica", "bold");
        // Responsive font size: minimum 6pt, scales with panel size
        doc.setFontSize(Math.max(6, Math.min(48, w / 2.3, h / 1.6)));
        doc.setTextColor(180); // ENHANCED: Lighter gray for better contrast with black text
        doc.text(letterCode, x + w / 2, y + h / 2, { align: 'center', baseline: 'middle' });
        doc.setTextColor(0); // Reset to black
      }
      
      // GADDI Dotted Line - Mark nomW for TOP/BOTTOM, nomH for LEFT/RIGHT
      if ((panel as any).gaddi === true) {
        const gaddiPanel: GaddiPanel = {
          panelType: panelName,
          gaddi: true,
          nomW,
          nomH,
          w: panel.w,
          h: panel.h
        };
        
        if (shouldShowGaddiMarking(gaddiPanel)) {
          const lineConfig = calculateGaddiLineDirection(gaddiPanel);
          
          doc.setLineWidth(lineConfig.lineWidth);
          doc.setDrawColor(lineConfig.color);
          (doc as any).setLineDash(lineConfig.dashPattern);
          
          if (lineConfig.lineDirection === 'x') {
            // Mark nomW: horizontal dotted line
            doc.line(
              x + lineConfig.inset,
              y + lineConfig.inset,
              x + w - lineConfig.inset,
              y + lineConfig.inset
            );
          } else {
            // Mark nomH: vertical dotted line
            doc.line(
              x + lineConfig.inset,
              y + lineConfig.inset,
              x + lineConfig.inset,
              y + h - lineConfig.inset
            );
          }
          
          (doc as any).setLineDash([]);
          doc.setDrawColor(0);
        }
      }
      
    });
    
    // Single Grain Direction Indicator - Left Side (outside sheet) - Only for sheets with grain direction
    const hasGrainDirection = panels.some((p: any) => p.grainDirection === true && p.laminateCode && p.laminateCode.trim() !== '');
    if (hasGrainDirection) {
      const indicatorW = 25; // Larger width for better visibility
      const indicatorH = 30; // Larger height for better visibility
      const indicatorX = offsetX - indicatorW - 5; // Left side, outside sheet with margin
      const indicatorY = offsetY + (scaledH - indicatorH) / 2; // Y-axis centered
      
      // Draw border box
      doc.setLineWidth(0.8);
      doc.setDrawColor(0); // Black border
      doc.setFillColor(255, 255, 255); // White background
      doc.rect(indicatorX, indicatorY, indicatorW, indicatorH, 'FD'); // Fill and Draw
      
      // "Grain Direction" label at top of box
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(0);
      doc.text("Grain", indicatorX + indicatorW / 2, indicatorY + 5, { align: 'center' });
      doc.text("Direction", indicatorX + indicatorW / 2, indicatorY + 10, { align: 'center' });
      
      // Draw arrow along Y-axis in center of box (larger)
      const arrowX = indicatorX + indicatorW / 2;
      const arrowStartY = indicatorY + indicatorH - 4;
      const arrowEndY = indicatorY + 14;
      
      doc.setLineWidth(1.2);
      doc.setDrawColor(0); // Black arrow
      
      // Arrow line along Y-axis (thicker)
      doc.line(arrowX, arrowStartY, arrowX, arrowEndY);
      
      // Arrow head at top (pointing up) - larger
      const headSize = 3;
      doc.line(arrowX, arrowEndY, arrowX - headSize, arrowEndY + headSize);
      doc.line(arrowX, arrowEndY, arrowX + headSize, arrowEndY + headSize);
      
      // Reset
      doc.setDrawColor(0);
      doc.setTextColor(0);
    }
    
    // Footer
    const footerY = pageH - margin - 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 5, pageW - margin, footerY - 5);
    doc.text(`Total Panels: ${panels.length} | Page ${currentPage} of ${totalPages}`, margin, footerY);
  }

  // Draw Material List page first
  if (materialSummary) {
    drawMaterialListPage();
    currentPage = 0; // Reset to 0 so cutting sheets start at Page 1
  }

  // Draw each brand's sheets on separate pages (skip deleted sheets)
  brandResults.forEach((brandResult) => {
    const sheets = brandResult.result?.panels || [];  // ✅ FIX: Changed 'sheets' to 'panels'
    
    sheets.forEach((sheetData: any, idx: number) => {
      const sheetId = sheetData._sheetId || `${brandResult.brand}|||${brandResult.laminateCode}-${idx}`;
      if (sheetData.placed && sheetData.placed.length > 0 && !deletedSheets.has(sheetId)) {
        drawSheetPage(sheetData, brandResult.brand, brandResult.laminateDisplay, brandResult.isBackPanel, idx + 1);
      }
    });
  });

  doc.save(filename);
  return doc;
}
