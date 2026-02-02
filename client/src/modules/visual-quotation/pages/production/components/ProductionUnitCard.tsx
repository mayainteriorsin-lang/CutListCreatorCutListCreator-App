/**
 * ProductionUnitCard Component
 * ----------------------------
 * Displays a single unit with its production view and cut list table.
 */

import React, { useMemo, useCallback } from "react";
import {
  ArrowUp,
  ArrowRight,
  Trash2,
  Minus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatMm } from "../../../engine/productionEngine";
import {
  getOverriddenDimensions,
  calculateGroupLayout,
  GAP_OPTIONS,
  type CadGroup,
} from "../../../services/productionService";
import type { PanelOverrides, GaddiSettings } from "../../../services/storageService";
import CanvasPreview from "./CanvasPreview";

interface ProductionUnitCardProps {
  group: CadGroup;
  gapMm: number;
  canvasSnapshot?: string;
  editing: { unitKey: string; panelId: string | null; field: "width" | "height" } | null;
  editValue: string;
  panelOverrides: PanelOverrides;
  frontLaminate: string;
  innerLaminate: string;
  grainSettings: Record<string, boolean>;
  gaddiSettings: GaddiSettings;
  onStartEdit: (unitKey: string, panelId: string | null, field: "width" | "height", currentValue: number) => void;
  onValueChange: (value: string) => void;
  onCloseEdit: () => void;
  onPanelDimensionChange: (panelId: string, field: "width" | "height", value: number) => void;
  onGapChange: (unitKey: string, gap: number) => void;
  onToggleGaddi: (panelId: string) => void;
  onDeletePanel: (panelId: string) => void;
}

const ProductionUnitCard: React.FC<ProductionUnitCardProps> = ({
  group,
  gapMm,
  canvasSnapshot,
  editing,
  editValue,
  panelOverrides,
  frontLaminate,
  innerLaminate,
  grainSettings,
  gaddiSettings,
  onStartEdit,
  onValueChange,
  onCloseEdit,
  onPanelDimensionChange,
  onGapChange,
  onToggleGaddi,
  onDeletePanel,
}) => {
  // Layout calculations
  const layoutCalcs = useMemo(() => {
    const prodMaxWidth = 450;
    const prodMaxHeight = 350;
    const layout = calculateGroupLayout(group, gapMm, panelOverrides);

    const aspectRatio = layout.totalWidthMm / (layout.totalHeightMm || 1);
    let prodContainerWidth = prodMaxWidth;
    let prodContainerHeight = prodContainerWidth / aspectRatio;
    if (prodContainerHeight > prodMaxHeight) {
      prodContainerHeight = prodMaxHeight;
      prodContainerWidth = prodContainerHeight * aspectRatio;
    }

    const gapPx = Math.max(3, gapMm * 1.5);
    const totalGapWidth = gapPx * (layout.colWidthsMm.length - 1);
    const availableWidth = prodContainerWidth - totalGapWidth - gapPx * 2;
    const totalMm = layout.colWidthsMm.reduce((s, w) => s + w, 0) || 1;
    const colPxWidths = layout.colWidthsMm.map(w => Math.round((w / totalMm) * availableWidth));

    const rowGapHeight = gapPx * Math.max(0, layout.rowHeightsMm.length - 1);
    const loftHeightRatio = layout.loftHeightMm / (layout.totalHeightMm || 1);
    const loftHeight = layout.loftHeightMm > 0 ? Math.max(50, prodContainerHeight * loftHeightRatio) : 0;
    const availableHeight = prodContainerHeight - rowGapHeight - loftHeight - (layout.loftHeightMm > 0 ? gapPx : 0) - gapPx * 2;
    const totalRowMm = layout.rowHeightsMm.reduce((s, h) => s + h, 0) || 1;
    const rowPxHeights = layout.rowHeightsMm.map(h => Math.round((h / totalRowMm) * availableHeight));

    return {
      ...layout,
      prodContainerWidth,
      gapPx,
      colPxWidths,
      rowPxHeights,
      loftHeight,
    };
  }, [group, gapMm, panelOverrides]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "Tab" || e.key === "Escape") {
      e.preventDefault();
      onCloseEdit();
    }
  }, [onCloseEdit]);

  const { prodContainerWidth, gapPx, colPxWidths, rowPxHeights, loftHeight, totalWidthMm, totalHeightMm, colWidthsMm, isLoftOnly } = layoutCalcs;

  return (
    <div className="bg-white rounded-lg border border-gray-300">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className={`h-8 w-8 rounded flex items-center justify-center text-white font-bold text-sm ${isLoftOnly ? 'bg-amber-600' : 'bg-blue-600'}`}>
            {group.roomCode}{group.unitNumber}
          </div>
          <div>
            <h3 className="font-bold text-black text-sm">{group.roomName}</h3>
            <p className="text-xs text-gray-500">
              {group.unitLabel}
              {isLoftOnly && <span className="ml-1 text-amber-600">(Loft Only)</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Overall dimensions */}
          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded border border-gray-300">
            <span className="text-xs font-bold text-gray-600">W</span>
            {editing?.unitKey === group.key && editing.panelId === null && editing.field === "width" ? (
              <Input
                type="number"
                value={editValue}
                onChange={e => onValueChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={onCloseEdit}
                autoFocus
                className="h-6 w-20 text-xs font-mono border-gray-400"
              />
            ) : (
              <button
                onClick={() => onStartEdit(group.key, null, "width", totalWidthMm)}
                className="text-sm font-bold text-black hover:bg-gray-100 px-2 rounded min-w-[50px] text-right"
              >
                {formatMm(totalWidthMm, 1)}
              </button>
            )}
            <span className="text-xs font-bold text-gray-600">H</span>
            {editing?.unitKey === group.key && editing.panelId === null && editing.field === "height" ? (
              <Input
                type="number"
                value={editValue}
                onChange={e => onValueChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={onCloseEdit}
                autoFocus
                className="h-6 w-20 text-xs font-mono border-gray-400"
              />
            ) : (
              <button
                onClick={() => onStartEdit(group.key, null, "height", totalHeightMm)}
                className="text-sm font-bold text-black hover:bg-gray-100 px-2 rounded min-w-[50px] text-right"
              >
                {formatMm(totalHeightMm, 1)}
              </button>
            )}
            <span className="text-xs text-gray-500">mm</span>
          </div>
          {/* Gap Dropdown */}
          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-gray-300">
            <span className="text-xs font-bold text-gray-600">Gap</span>
            <select
              value={gapMm}
              onChange={e => onGapChange(group.key, Number(e.target.value))}
              className="h-6 w-14 text-xs font-mono border border-gray-300 rounded bg-white cursor-pointer"
            >
              {GAP_OPTIONS.map(g => (
                <option key={g} value={g}>{g} mm</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content: Canvas Preview + Production View */}
      <div className="flex p-4 gap-4">
        <div className="flex-shrink-0">
          <p className="text-[10px] text-gray-500 mb-1 text-center">Canvas Preview</p>
          <CanvasPreview snapshotSrc={canvasSnapshot} maxWidth={280} maxHeight={280} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-500 mb-1 text-center">Production View</p>
          <div
            className="relative mx-auto bg-gray-200"
            style={{ width: `${prodContainerWidth}px`, padding: `${gapPx}px` }}
          >
            {/* Loft Section */}
            {group.loftPanels.length > 0 && (
              <div className="flex mb-1" style={{ gap: `${gapPx}px`, marginBottom: `${gapPx}px` }}>
                {group.loftPanels.map((panel, idx) => {
                  const dims = getOverriddenDimensions(panel.id, panel.widthMm, panel.heightMm, panelOverrides);
                  return (
                    <div
                      key={panel.id}
                      className="bg-white border-2 border-gray-800 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50"
                      style={{ width: `${colPxWidths[idx] || colPxWidths[0]}px`, height: `${loftHeight}px` }}
                      onClick={() => onStartEdit(group.key, panel.id, "width", dims.width)}
                    >
                      <div className="text-sm font-bold text-black">W{formatMm(dims.width, 1)}</div>
                      <div className="text-sm font-bold text-black">H{formatMm(dims.height, 1)}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Main Shutters Grid */}
            <div
              className="grid"
              style={{
                gridTemplateColumns: colPxWidths.map(w => `${w}px`).join(" "),
                gridTemplateRows: rowPxHeights.map(h => `${h}px`).join(" "),
                gap: `${gapPx}px`,
              }}
            >
              {group.shutters.map((panel) => {
                const isEditing = editing?.unitKey === group.key && editing?.panelId === panel.id;
                const isEditingWidth = isEditing && editing?.field === "width";
                const isEditingHeight = isEditing && editing?.field === "height";
                const dims = getOverriddenDimensions(panel.id, panel.widthMm, panel.heightMm, panelOverrides);

                return (
                  <div
                    key={panel.id}
                    className="bg-white border-2 border-gray-800 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50"
                    style={{ gridColumn: panel.col, gridRow: panel.row }}
                  >
                    {isEditingWidth ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={e => {
                          onValueChange(e.target.value);
                          const val = Number(e.target.value);
                          if (val > 0) onPanelDimensionChange(panel.id, "width", val);
                        }}
                        onKeyDown={handleKeyDown}
                        onBlur={onCloseEdit}
                        autoFocus
                        className="w-16 h-6 text-sm text-center font-mono border border-blue-400 rounded bg-white"
                      />
                    ) : (
                      <button
                        onClick={() => onStartEdit(group.key, panel.id, "width", dims.width)}
                        className="text-sm font-bold text-black hover:bg-blue-100 px-1 rounded"
                      >
                        W{formatMm(dims.width, 1)}
                      </button>
                    )}
                    {isEditingHeight ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={e => {
                          onValueChange(e.target.value);
                          const val = Number(e.target.value);
                          if (val > 0) onPanelDimensionChange(panel.id, "height", val);
                        }}
                        onKeyDown={handleKeyDown}
                        onBlur={onCloseEdit}
                        autoFocus
                        className="w-16 h-6 text-sm text-center font-mono border border-blue-400 rounded bg-white"
                      />
                    ) : (
                      <button
                        onClick={() => onStartEdit(group.key, panel.id, "height", dims.height)}
                        className="text-sm font-bold text-black hover:bg-blue-100 px-1 rounded"
                      >
                        H{formatMm(dims.height, 1)}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column Width Labels */}
          <div
            className="flex justify-center mt-2"
            style={{ gap: `${gapPx}px`, width: `${prodContainerWidth}px`, margin: "8px auto 0" }}
          >
            {colWidthsMm.map((w, i) => (
              <div
                key={i}
                className="text-center text-xs text-gray-600 border-t border-gray-400 pt-1"
                style={{ width: `${colPxWidths[i]}px` }}
              >
                {formatMm(w, 1)}
              </div>
            ))}
          </div>

          {/* Unit Cut List Table */}
          <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full text-xs table-fixed">
              <thead>
                <tr className="bg-gray-50/80 text-gray-600 uppercase tracking-wider">
                  <th className="text-left py-2.5 px-3 font-semibold w-[5%]">#</th>
                  <th className="text-left py-2.5 px-3 font-semibold w-[10%]">Panel</th>
                  <th className="text-right py-2.5 px-3 font-semibold w-[12%]">Width</th>
                  <th className="text-right py-2.5 px-3 font-semibold w-[12%]">Height</th>
                  <th className="text-left py-2.5 px-3 font-semibold w-[18%]">Front Lam</th>
                  <th className="text-left py-2.5 px-3 font-semibold w-[18%]">Inner Lam</th>
                  <th className="text-center py-2.5 px-3 font-semibold w-[10%]">Grain</th>
                  <th className="text-center py-2.5 px-3 font-semibold w-[10%]">Gaddi</th>
                  <th className="text-center py-2.5 px-3 font-semibold w-[5%]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* Loft panels */}
                {group.loftPanels.map((panel, idx) => {
                  const dims = getOverriddenDimensions(panel.id, panel.widthMm, panel.heightMm, panelOverrides);
                  const isGrainEnabled = grainSettings[panel.id] ?? true;
                  const isGaddiEnabled = gaddiSettings[panel.id] ?? false;
                  return (
                    <tr key={panel.id} className={`hover:bg-blue-50/40 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                      <td className="py-2.5 px-3 text-gray-400 font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex px-2 py-0.5 rounded font-bold bg-amber-500 text-white text-[11px]">
                          L{panel.col}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-gray-900">{formatMm(dims.width, 1)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-gray-900">{formatMm(dims.height, 1)}</td>
                      <td className="py-2.5 px-3">
                        {frontLaminate ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-sm border border-amber-300 bg-gradient-to-br from-amber-200 to-amber-400 flex-shrink-0" />
                            <span className="text-gray-700 font-medium truncate">{frontLaminate}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300 italic">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {innerLaminate ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-sm border border-gray-300 bg-gradient-to-br from-gray-200 to-gray-400 flex-shrink-0" />
                            <span className="text-gray-700 font-medium truncate">{innerLaminate}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300 italic">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto ${isGrainEnabled ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}
                          title={isGrainEnabled ? "Wood grain enabled" : "No wood grain"}
                        >
                          {isGrainEnabled ? <ArrowUp className="h-3 w-3" /> : <ArrowRight className="h-3 w-3 opacity-50" />}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => onToggleGaddi(panel.id)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto transition-all ${isGaddiEnabled ? "bg-red-500 text-white" : "bg-gray-200 text-gray-400"}`}
                          title={isGaddiEnabled ? "Gaddi ON" : "Gaddi OFF"}
                        >
                          <Minus className={`h-3 w-3 ${isGaddiEnabled ? "" : "opacity-50"}`} />
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => onDeletePanel(panel.id)}
                          className="w-6 h-6 rounded-full flex items-center justify-center mx-auto text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {/* Shutter panels */}
                {group.shutters.map((panel, idx) => {
                  const dims = getOverriddenDimensions(panel.id, panel.widthMm, panel.heightMm, panelOverrides);
                  const isGrainEnabled = grainSettings[panel.id] ?? true;
                  const isGaddiEnabled = gaddiSettings[panel.id] ?? false;
                  const rowNum = group.loftPanels.length + idx + 1;
                  return (
                    <tr key={panel.id} className={`hover:bg-blue-50/40 transition-colors ${rowNum % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                      <td className="py-2.5 px-3 text-gray-400 font-mono">{rowNum}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex px-2 py-0.5 rounded font-bold bg-blue-500 text-white text-[11px]">
                          S{panel.row}{panel.col}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-gray-900">{formatMm(dims.width, 1)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-gray-900">{formatMm(dims.height, 1)}</td>
                      <td className="py-2.5 px-3">
                        {frontLaminate ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-sm border border-amber-300 bg-gradient-to-br from-amber-200 to-amber-400 flex-shrink-0" />
                            <span className="text-gray-700 font-medium truncate">{frontLaminate}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300 italic">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {innerLaminate ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-sm border border-gray-300 bg-gradient-to-br from-gray-200 to-gray-400 flex-shrink-0" />
                            <span className="text-gray-700 font-medium truncate">{innerLaminate}</span>
                          </div>
                        ) : (
                          <span className="text-gray-300 italic">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto ${isGrainEnabled ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`}
                          title={isGrainEnabled ? "Wood grain enabled" : "No wood grain"}
                        >
                          {isGrainEnabled ? <ArrowUp className="h-3 w-3" /> : <ArrowRight className="h-3 w-3 opacity-50" />}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => onToggleGaddi(panel.id)}
                          className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto transition-all ${isGaddiEnabled ? "bg-red-500 text-white" : "bg-gray-200 text-gray-400"}`}
                          title={isGaddiEnabled ? "Gaddi ON" : "Gaddi OFF"}
                        >
                          <Minus className={`h-3 w-3 ${isGaddiEnabled ? "" : "opacity-50"}`} />
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => onDeletePanel(panel.id)}
                          className="w-6 h-6 rounded-full flex items-center justify-center mx-auto text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ProductionUnitCard);
