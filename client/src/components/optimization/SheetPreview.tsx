/**
 * SheetPreview - Shared optimization result display component
 * Used by both CabinetsPro and ProductionPage to display cut sheet optimization results
 */

import React, { useState, useRef } from 'react';
import { ArrowUp } from 'lucide-react';
import type { BrandResult } from '@shared/schema';

// Room color mapping for color coding feature
const ROOM_COLORS: Record<string, string> = {
  'Kitchen': 'bg-blue-100 border-blue-400',
  'Bedroom': 'bg-green-100 border-green-400',
  'Living Room': 'bg-purple-100 border-purple-400',
  'Bathroom': 'bg-cyan-100 border-cyan-400',
  'Office': 'bg-amber-100 border-amber-400',
  'Custom': 'bg-pink-100 border-pink-400',
  'default': 'bg-white border-slate-800',
};

interface SheetPreviewProps {
  brandResult: BrandResult;
  sheetWidth?: number;
  sheetHeight?: number;
  kerf?: number;
  companyName?: string;
}

export function SheetPreview({
  brandResult,
  sheetWidth = 1210,
  sheetHeight = 2420,
  kerf = 0,
  companyName = 'Maya Interiors'
}: SheetPreviewProps) {
  const sheets = brandResult.result?.panels || [];
  const sheetCount = sheets.length;
  const sheetRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Feature states
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [selectedPanel, setSelectedPanel] = useState<any>(null);
  const [colorMode, setColorMode] = useState<'type' | 'room'>('type');
  const [showWaste, setShowWaste] = useState(true);

  // Export sheet as PNG using html2canvas
  const exportAsPNG = async (sheetIdx: number) => {
    const element = sheetRefs.current[sheetIdx];
    if (!element) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `sheet-${sheetIdx + 1}-${brandResult.brand.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Failed to export PNG:', error);
    }
  };

  // Export sheet as SVG
  const exportAsSVG = (sheetIdx: number, placed: any[], legend: { letter: string; w: number; h: number; count: number }[], panelLetterMap: Map<any, string>) => {
    const svgWidth = 800;
    const svgHeight = (sheetHeight / sheetWidth) * svgWidth;
    const scaleX = svgWidth / sheetWidth;
    const scaleY = svgHeight / sheetHeight;

    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight + 120}" viewBox="0 0 ${svgWidth} ${svgHeight + 120}">
  <style>
    .header { font: bold 18px sans-serif; fill: #1e293b; }
    .subtext { font: 12px sans-serif; fill: #475569; }
    .legend { font: 12px monospace; fill: #334155; }
    .letter { font: bold 10px monospace; fill: #3b82f6; }
    .dim { font: 9px monospace; fill: #334155; }
    .panel-letter { font: bold 24px sans-serif; fill: #94a3b8; }
    .panel-type { font: bold 8px sans-serif; fill: #1e293b; }
    .gaddi { font: bold 6px sans-serif; fill: #ef4444; }
  </style>
  <text x="10" y="25" class="header">${companyName}</text>
  <text x="${svgWidth - 10}" y="20" text-anchor="end" class="subtext">Date: ${new Date().toISOString().split('T')[0]}</text>
  <text x="${svgWidth - 10}" y="35" text-anchor="end" class="subtext">Sheet: ${sheetWidth}x${sheetHeight} mm</text>
  <text x="${svgWidth - 10}" y="50" text-anchor="end" class="subtext">Kerf: ${kerf} mm</text>
  <text x="10" y="50" class="subtext">Plywood: ${brandResult.brand} | Front: ${brandResult.laminateDisplay?.split('+')[0]?.trim() || 'N/A'} | Inner: ${brandResult.laminateDisplay?.split('+')[1]?.trim() || 'N/A'}</text>
  <text x="10" y="70" class="legend">${legend.map(l => `<tspan class="letter">${l.letter}</tspan>:${l.w}x${l.h}(${l.count})`).join('  ')}</text>
  <rect x="10" y="90" width="${svgWidth - 20}" height="${svgHeight}" fill="white" stroke="#1e293b" stroke-width="2"/>`;

    placed.forEach((panel: any) => {
      const x = 10 + (panel.x || 0) * scaleX;
      const y = 90 + (panel.y || 0) * scaleY;
      const w = (panel.w || 0) * scaleX;
      const h = (panel.h || 0) * scaleY;
      const letter = panelLetterMap.get(panel) || '?';
      const type = (panel.type || panel.name || '').toUpperCase().replace(/PANEL/gi, '').trim().slice(0, 10);
      const needsGaddiMark = panel.gaddi === true || type.includes('TOP') || type.includes('BOTTOM') || type.includes('LEFT') || type.includes('RIGHT');
      const isVerticalGaddi = type.includes('LEFT') || type.includes('RIGHT');

      // Check grain direction
      const hasGrain = panel.grainDirection === true;

      svgContent += `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="white" stroke="#1e293b" stroke-width="1.5"/>
  <text x="${x + w / 2}" y="${y + h / 2 - 8}" text-anchor="middle" class="dim">${panel.w}x${panel.h}</text>
  <text x="${x + w / 2}" y="${y + h / 2 + 10}" text-anchor="middle" class="panel-letter">${letter}</text>
  <text x="${x + w / 2}" y="${y + h / 2 + 22}" text-anchor="middle" class="panel-type">${type}</text>`;

      // Grain direction indicator (green circle with up arrow)
      if (hasGrain) {
        const grainX = x + 8;
        const grainY = y + 8;
        svgContent += `
  <circle cx="${grainX}" cy="${grainY}" r="6" fill="#22c55e"/>
  <path d="M${grainX} ${grainY + 3} L${grainX} ${grainY - 3} M${grainX - 2} ${grainY - 1} L${grainX} ${grainY - 3} L${grainX + 2} ${grainY - 1}" stroke="white" stroke-width="1.5" fill="none"/>`;
      }

      if (needsGaddiMark) {
        if (isVerticalGaddi) {
          svgContent += `
  <line x1="${x + 4}" y1="${y}" x2="${x + 4}" y2="${y + h}" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,2"/>`;
        } else {
          svgContent += `
  <line x1="${x}" y1="${y + h - 4}" x2="${x + w}" y2="${y + h - 4}" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,2"/>`;
        }
      }
    });

    svgContent += `
  <text x="${svgWidth / 2}" y="${svgHeight + 110}" text-anchor="middle" class="subtext">Sheet ${sheetIdx + 1} of ${sheetCount} | ${placed.length} panels</text>
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `sheet-${sheetIdx + 1}-${brandResult.brand.replace(/\s+/g, '-')}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Print single sheet
  const printSheet = (sheetIdx: number) => {
    const element = sheetRefs.current[sheetIdx];
    if (!element) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Sheet ${sheetIdx + 1} - ${brandResult.brand}</title>
          <style>
            body { margin: 0; padding: 20px; font-family: sans-serif; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${element.outerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // Parse laminate display
  const laminateDisplay = brandResult.laminateDisplay || brandResult.laminateCode || '';
  const [frontLam, innerLam] = laminateDisplay.includes('+')
    ? laminateDisplay.split('+').map((s: string) => s.trim())
    : [laminateDisplay, laminateDisplay];

  // Build panel legend
  const buildPanelLegend = (placed: any[]) => {
    const sizeGroups: Record<string, { w: number; h: number; count: number; panels: any[] }> = {};
    placed.forEach((p: any) => {
      const key = `${p.w}x${p.h}`;
      if (!sizeGroups[key]) sizeGroups[key] = { w: p.w, h: p.h, count: 0, panels: [] };
      sizeGroups[key].count++;
      sizeGroups[key].panels.push(p);
    });

    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const legend: { letter: string; w: number; h: number; count: number }[] = [];
    const panelLetterMap: Map<any, string> = new Map();

    Object.values(sizeGroups).forEach((group, idx) => {
      const letter = letters[idx] || `${idx + 1}`;
      legend.push({ letter, w: group.w, h: group.h, count: group.count });
      group.panels.forEach(p => panelLetterMap.set(p, letter));
    });

    return { legend, panelLetterMap };
  };

  // Calculate sheet efficiency
  const calculateEfficiency = (placed: any[]) => {
    const totalSheetArea = sheetWidth * sheetHeight;
    const usedArea = placed.reduce((sum, p) => sum + (p.w || 0) * (p.h || 0), 0);
    return Math.round((usedArea / totalSheetArea) * 100);
  };

  // Get efficiency badge color
  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 85) return 'bg-green-500';
    if (efficiency >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Check if panel is rotated
  const isRotated = (panel: any) => {
    const nomW = panel.nomW ?? panel.w;
    const nomH = panel.nomH ?? panel.h;
    return Math.abs(panel.w - nomH) < 0.5 && Math.abs(panel.h - nomW) < 0.5;
  };

  // Check if panel needs GADDI mark
  const needsGaddi = (panel: any) => {
    const type = (panel.type || panel.name || '').toUpperCase();
    return panel.gaddi === true || type.includes('TOP') || type.includes('BOTTOM') || type.includes('LEFT') || type.includes('RIGHT');
  };

  // Get GADDI line orientation
  const getGaddiOrientation = (panel: any) => {
    const type = (panel.type || panel.name || '').toUpperCase();
    if (type.includes('LEFT') || type.includes('RIGHT')) return 'vertical';
    return 'horizontal';
  };

  // Check if panel has grain direction enabled
  const hasGrainDirection = (panel: any) => {
    return panel.grainDirection === true;
  };

  // Get panel color based on mode
  const getPanelColor = (panel: any) => {
    if (colorMode === 'room') {
      const room = panel.roomName || 'default';
      return ROOM_COLORS[room] || ROOM_COLORS['default'];
    }
    // Type-based coloring
    const type = (panel.type || panel.name || '').toUpperCase();
    if (type.includes('TOP')) return 'bg-blue-50 border-blue-500';
    if (type.includes('BOTTOM')) return 'bg-blue-100 border-blue-600';
    if (type.includes('LEFT')) return 'bg-green-50 border-green-500';
    if (type.includes('RIGHT')) return 'bg-green-100 border-green-600';
    if (type.includes('BACK')) return 'bg-amber-50 border-amber-500';
    if (type.includes('SHELF')) return 'bg-purple-50 border-purple-500';
    if (type.includes('SHUTTER')) return 'bg-pink-50 border-pink-500';
    return 'bg-white border-slate-800';
  };

  // Calculate waste areas (simplified - just shows total waste percentage)
  const calculateWasteArea = (placed: any[]) => {
    const totalSheetArea = sheetWidth * sheetHeight;
    const usedArea = placed.reduce((sum, p) => sum + (p.w || 0) * (p.h || 0), 0);
    return totalSheetArea - usedArea;
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-4 p-3 bg-slate-100 rounded-lg">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Color:</label>
          <select
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value as 'type' | 'room')}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="type">By Type</option>
            <option value="room">By Room</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={showWaste}
            onChange={(e) => setShowWaste(e.target.checked)}
            className="rounded"
          />
          Show Waste
        </label>
        {sheetCount > 1 && (
          <select
            value={activeSheetIdx}
            onChange={(e) => setActiveSheetIdx(Number(e.target.value))}
            className="text-sm border rounded px-2 py-1 ml-auto"
          >
            <option value={-1}>All Sheets</option>
            {sheets.map((_: any, idx: number) => (
              <option key={idx} value={idx}>Sheet {idx + 1}</option>
            ))}
          </select>
        )}
      </div>

      {/* Active Sheet Display */}
      {sheets.map((sheet: any, sheetIdx: number) => {
        if (activeSheetIdx !== -1 && sheetIdx !== activeSheetIdx) return null;

        const placed = sheet.placed || [];
        const { legend, panelLetterMap } = buildPanelLegend(placed);
        const efficiency = calculateEfficiency(placed);
        const wasteArea = calculateWasteArea(placed);

        return (
          <div key={sheetIdx} ref={(el) => { sheetRefs.current[sheetIdx] = el; }} className="bg-white border-2 border-slate-400 rounded-lg overflow-hidden shadow-lg">
            {/* Header */}
            <div className="border-b-2 border-slate-400 p-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="text-xl font-bold text-slate-800">{companyName}</div>
                  {/* Efficiency Badge */}
                  <div className={`px-2 py-1 rounded text-white text-sm font-bold ${getEfficiencyColor(efficiency)}`}>
                    {efficiency}% Used
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  {/* Export/Print Buttons */}
                  <div className="flex gap-1">
                    <button onClick={() => exportAsPNG(sheetIdx)} className="px-2 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded" title="Export PNG">PNG</button>
                    <button onClick={() => exportAsSVG(sheetIdx, placed, legend, panelLetterMap)} className="px-2 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded" title="Export SVG">SVG</button>
                    <button onClick={() => printSheet(sheetIdx)} className="px-2 py-1 text-xs bg-slate-500 hover:bg-slate-600 text-white rounded" title="Print">Print</button>
                  </div>
                  <div className="text-right text-sm text-slate-600">
                    <div>Date: {new Date().toISOString().split('T')[0]}</div>
                    <div>Sheet: {sheetWidth}x{sheetHeight} mm</div>
                    <div>Kerf: {kerf} mm</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-8 mt-3 text-sm">
                <div><span className="font-semibold">Plywood:</span> {brandResult.brand}</div>
                <div><span className="font-semibold">Front:</span> {frontLam}</div>
                <div><span className="font-semibold">Inner:</span> {innerLam}</div>
              </div>
            </div>

            {/* Legend */}
            <div className="border-b border-slate-300 px-4 py-2 bg-slate-50">
              <div className="flex flex-wrap gap-4 text-sm font-mono">
                {legend.map(({ letter, w, h, count }) => (
                  <span key={letter} className="text-slate-700">
                    <span className="font-bold text-blue-600">{letter}</span>:{w}x{h}
                    <span className="text-slate-500">({count})</span>
                  </span>
                ))}
                {showWaste && (
                  <span className="text-red-500 ml-auto">
                    Waste: {Math.round(wasteArea / 1000)}cm² ({100 - efficiency}%)
                  </span>
                )}
              </div>
            </div>

            {/* Visual Sheet */}
            <div className="p-4">
              <div className="flex justify-center">
                <div
                  className="relative border-2 border-slate-800"
                  style={{
                    width: '100%',
                    maxWidth: '600px',
                    aspectRatio: `${sheetWidth} / ${sheetHeight}`,
                    background: showWaste ? '#f1f5f9' : 'white',
                  }}
                >
                  {/* Placed panels */}
                  {placed.map((panel: any, pIdx: number) => {
                    const scaleX = 100 / sheetWidth;
                    const scaleY = 100 / sheetHeight;
                    const letter = panelLetterMap.get(panel) || '?';
                    const type = (panel.type || panel.name || '').toUpperCase();
                    const showGaddi = needsGaddi(panel);
                    const gaddiOrientation = getGaddiOrientation(panel);
                    const rotated = isRotated(panel);
                    const panelColor = getPanelColor(panel);
                    const isSelected = selectedPanel === panel;

                    return (
                      <div
                        key={pIdx}
                        onClick={() => setSelectedPanel(isSelected ? null : panel)}
                        className={`absolute border-2 flex flex-col items-center justify-center cursor-pointer transition-all ${panelColor} ${
                          isSelected ? 'ring-4 ring-blue-400 z-10 scale-[1.02]' : 'hover:ring-2 hover:ring-blue-300'
                        }`}
                        style={{
                          left: `${(panel.x || 0) * scaleX}%`,
                          top: `${(panel.y || 0) * scaleY}%`,
                          width: `${(panel.w || 0) * scaleX}%`,
                          height: `${(panel.h || 0) * scaleY}%`,
                        }}
                      >
                        {/* Grain Direction Indicator - Top Left */}
                        {hasGrainDirection(panel) && (
                          <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center" title="Grain Direction (Up)">
                            <ArrowUp className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}

                        {/* Rotation Indicator - Top Right */}
                        {rotated && (
                          <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center" title="Rotated">
                            <span className="text-[8px] text-white font-bold">R</span>
                          </div>
                        )}

                        {/* GADDI mark */}
                        {showGaddi && (
                          gaddiOrientation === 'vertical' ? (
                            <div className="absolute left-1 top-0 bottom-0 w-0 border-l-2 border-dashed border-red-500" style={{ height: '100%' }} />
                          ) : (
                            <div className="absolute left-0 right-0 bottom-1 h-0 border-t-2 border-dashed border-red-500" style={{ width: '100%' }} />
                          )
                        )}

                        {/* Panel content */}
                        <div className="text-center">
                          <div className="text-[10px] font-mono text-slate-700">{panel.w}x{panel.h}</div>
                          <div className="text-2xl font-bold text-slate-400">{letter}</div>
                          <div className="text-[9px] font-semibold text-slate-800 uppercase">
                            {type.replace(/PANEL/gi, '').trim().slice(0, 10)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="text-center mt-2 text-sm text-slate-500">
                Sheet {sheetIdx + 1} of {sheetCount} | {placed.length} panels
              </div>
            </div>

            {/* Selected Panel Details */}
            {selectedPanel && (
              <div className="border-t border-slate-300 p-4 bg-blue-50">
                <h4 className="text-sm font-bold text-slate-700 mb-2">Selected Panel Details</h4>
                <div className="grid grid-cols-4 gap-4 text-xs">
                  <div><span className="font-semibold">Type:</span> {selectedPanel.type || selectedPanel.name || 'N/A'}</div>
                  <div><span className="font-semibold">Size:</span> {selectedPanel.w}x{selectedPanel.h} mm</div>
                  <div><span className="font-semibold">Position:</span> ({selectedPanel.x}, {selectedPanel.y})</div>
                  <div><span className="font-semibold">Rotated:</span> {isRotated(selectedPanel) ? 'Yes' : 'No'}</div>
                  <div><span className="font-semibold">Room:</span> {selectedPanel.roomName || 'N/A'}</div>
                  <div><span className="font-semibold">Grain:</span> {hasGrainDirection(selectedPanel) ? 'Yes (Up)' : 'No'}</div>
                  <div><span className="font-semibold">GADDI:</span> {needsGaddi(selectedPanel) ? 'Yes' : 'No'}</div>
                  <div><span className="font-semibold">ID:</span> {selectedPanel.id || 'N/A'}</div>
                  <div>
                    <button onClick={() => setSelectedPanel(null)} className="text-blue-600 hover:underline">
                      Clear Selection
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Room Color Legend (when in room mode) */}
      {colorMode === 'room' && (
        <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded border border-slate-200 text-xs">
          <span className="font-medium text-slate-600">Room Colors:</span>
          {Object.entries(ROOM_COLORS).filter(([k]) => k !== 'default').map(([room, colors]) => (
            <span key={room} className={`px-2 py-0.5 rounded border ${colors}`}>{room}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default SheetPreview;
