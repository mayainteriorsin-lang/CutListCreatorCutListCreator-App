import React, { useMemo } from "react";
import { FileSpreadsheet, FileText, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useVisualQuotationStore } from "../../store/visualQuotationStore";
import { buildCutlistItems, formatMm } from "../../engine/productionEngine";
import { exportProductionExcel, exportProductionPDF } from "../../engine/productionExportEngine";

type CadGroup = {
  key: string;
  roomName: string;
  unitLabel: string;
  colWidthsMm: number[];
  rowHeightsMm: number[];
  shutters: {
    row: number;
    col: number;
    widthMm: number;
    heightMm: number;
    label: string;
  }[];
};

function buildCadGroups(items: ReturnType<typeof buildCutlistItems>): CadGroup[] {
  const groups = new Map<string, CadGroup>();

  items
    .filter((item) => item.panelType === "SHUTTER")
    .forEach((item) => {
      const key = `${item.roomIndex}:${item.unitId}`;
      const existing = groups.get(key);
      const unitLabel = item.unitLabel;
      const roomName = item.roomName;
      const shutters = existing?.shutters ?? [];

      shutters.push({
        row: item.row,
        col: item.col,
        widthMm: item.widthMm,
        heightMm: item.heightMm,
        label: item.panelLabel,
      });

      groups.set(key, {
        key,
        roomName,
        unitLabel,
        colWidthsMm: existing?.colWidthsMm ?? [],
        rowHeightsMm: existing?.rowHeightsMm ?? [],
        shutters,
      });
    });

  return Array.from(groups.values()).map((group) => {
    const maxCol = Math.max(1, ...group.shutters.map((s) => s.col));
    const maxRow = Math.max(1, ...group.shutters.map((s) => s.row));
    const colWidths = Array.from({ length: maxCol }, (_, idx) => {
      const col = idx + 1;
      const widths = group.shutters.filter((s) => s.col === col).map((s) => s.widthMm);
      return widths.length > 0 ? Math.max(...widths) : 0;
    });
    const rowHeights = Array.from({ length: maxRow }, (_, idx) => {
      const row = idx + 1;
      const heights = group.shutters.filter((s) => s.row === row).map((s) => s.heightMm);
      return heights.length > 0 ? Math.max(...heights) : 0;
    });

    return {
      ...group,
      colWidthsMm: colWidths,
      rowHeightsMm: rowHeights,
    };
  });
}

const ProductionPanel: React.FC = () => {
  const {
    client,
    meta,
    units,
    quotationRooms,
    drawnUnits,
    activeRoomIndex,
    productionSettings,
    setProductionSettings,
  } = useVisualQuotationStore();

  const shutterLaminateCode = units[0]?.finish?.shutterLaminateCode;
  const loftLaminateCode = units[0]?.finish?.loftLaminateCode;

  const items = useMemo(
    () =>
      buildCutlistItems({
        quotationRooms,
        currentDrawnUnits: drawnUnits,
        activeRoomIndex,
        settings: productionSettings,
        shutterLaminateCode,
        loftLaminateCode,
      }),
    [
      quotationRooms,
      drawnUnits,
      activeRoomIndex,
      productionSettings,
      shutterLaminateCode,
      loftLaminateCode,
    ]
  );

  const cadGroups = useMemo(() => buildCadGroups(items), [items]);
  const hasData = items.length > 0;

  const handleExportPdf = () => {
    if (!hasData) {
      alert("Add unit dimensions to generate production cut list.");
      return;
    }
    exportProductionPDF({ client, meta, items, settings: productionSettings });
  };

  const handleExportExcel = () => {
    if (!hasData) {
      alert("Add unit dimensions to generate production cut list.");
      return;
    }
    exportProductionExcel({ client, meta, items, settings: productionSettings });
  };

  return (
    <aside className="absolute right-2 top-2 bottom-2 w-[360px] bg-white/95 border border-slate-200 shadow-lg rounded-xl overflow-hidden backdrop-blur-sm flex flex-col z-10">
      <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Ruler className="h-4 w-4 text-slate-600" />
          <h2 className="text-sm font-semibold text-slate-800">Production</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] px-2"
            onClick={handleExportPdf}
            disabled={!hasData}
          >
            <FileText className="h-3 w-3 mr-1" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-[10px] px-2"
            onClick={handleExportExcel}
            disabled={!hasData}
          >
            <FileSpreadsheet className="h-3 w-3 mr-1" />
            Excel
          </Button>
        </div>
      </div>

      <div className="p-3 space-y-3 overflow-y-auto flex-1">
        <section className="p-2 rounded-lg border border-slate-200 bg-white">
          <p className="text-[10px] font-semibold text-slate-500 uppercase mb-2">Settings (mm)</p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <label className="flex flex-col gap-1">
              Rounding
              <Input
                type="number"
                min={0}
                step={0.5}
                value={productionSettings.roundingMm}
                onChange={(e) =>
                  setProductionSettings({ roundingMm: Math.max(0, Number(e.target.value) || 0) })
                }
                className="h-8 text-[11px]"
              />
            </label>
            <label className="flex flex-col gap-1">
              Width reduction
              <Input
                type="number"
                min={0}
                step={1}
                value={productionSettings.widthReductionMm}
                onChange={(e) =>
                  setProductionSettings({ widthReductionMm: Math.max(0, Number(e.target.value) || 0) })
                }
                className="h-8 text-[11px]"
              />
            </label>
            <label className="flex flex-col gap-1">
              Height reduction
              <Input
                type="number"
                min={0}
                step={1}
                value={productionSettings.heightReductionMm}
                onChange={(e) =>
                  setProductionSettings({ heightReductionMm: Math.max(0, Number(e.target.value) || 0) })
                }
                className="h-8 text-[11px]"
              />
            </label>
            <label className="flex items-center justify-between gap-2 pt-4">
              Include loft
              <Switch
                checked={productionSettings.includeLoft}
                onCheckedChange={(checked) => setProductionSettings({ includeLoft: checked })}
              />
            </label>
          </div>
        </section>

        <section className="p-2 rounded-lg border border-slate-200 bg-white">
          <p className="text-[10px] font-semibold text-slate-500 uppercase mb-2">2D Shutters</p>
          {!hasData ? (
            <p className="text-[11px] text-slate-400 text-center py-4">
              Add unit width and height to show CAD shutters.
            </p>
          ) : (
            <div className="space-y-3">
              {cadGroups.map((group) => {
                const totalWidth = group.colWidthsMm.reduce((sum, value) => sum + value, 0);
                const totalHeight = group.rowHeightsMm.reduce((sum, value) => sum + value, 0);
                const scale = Math.min(
                  totalWidth > 0 ? 280 / totalWidth : 1,
                  totalHeight > 0 ? 160 / totalHeight : 1,
                  1
                );
                const gridTemplateColumns = group.colWidthsMm
                  .map((w) => `${Math.max(20, w * scale)}px`)
                  .join(" ");
                const gridTemplateRows = group.rowHeightsMm
                  .map((h) => `${Math.max(20, h * scale)}px`)
                  .join(" ");

                return (
                  <div key={group.key} className="border border-slate-200 rounded-md p-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-semibold text-slate-700">{group.unitLabel}</span>
                      <span>{group.roomName}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                      <span>W: {formatMm(totalWidth, productionSettings.roundingMm)} mm</span>
                      <span>H: {formatMm(totalHeight, productionSettings.roundingMm)} mm</span>
                    </div>
                    <div
                      className="mt-2 grid gap-[2px] bg-slate-100 p-1 rounded"
                      style={{
                        gridTemplateColumns,
                        gridTemplateRows,
                      }}
                    >
                      {group.shutters.map((panel) => (
                        <div
                          key={`${group.key}-${panel.row}-${panel.col}`}
                          className="bg-white border border-slate-300 rounded-sm flex flex-col items-center justify-center text-[9px] leading-tight text-slate-700"
                        >
                          <span className="text-[8px] text-slate-400">{panel.label}</span>
                          <span>{formatMm(panel.widthMm, productionSettings.roundingMm)}</span>
                          <span>{formatMm(panel.heightMm, productionSettings.roundingMm)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="p-2 rounded-lg border border-slate-200 bg-white">
          <p className="text-[10px] font-semibold text-slate-500 uppercase mb-2">Cut List</p>
          {!hasData ? (
            <p className="text-[11px] text-slate-400 text-center py-4">
              No panels yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] text-slate-700 border-collapse">
                <thead>
                  <tr className="text-[9px] text-slate-500 uppercase">
                    <th className="text-left py-1">#</th>
                    <th className="text-left py-1">Room</th>
                    <th className="text-left py-1">Unit</th>
                    <th className="text-left py-1">Type</th>
                    <th className="text-left py-1">Panel</th>
                    <th className="text-right py-1">W (mm)</th>
                    <th className="text-right py-1">H (mm)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.id} className="border-t border-slate-100">
                      <td className="py-1">{idx + 1}</td>
                      <td className="py-1">{item.roomName}</td>
                      <td className="py-1">{item.unitLabel}</td>
                      <td className="py-1">{item.panelType}</td>
                      <td className="py-1">{item.panelLabel}</td>
                      <td className="py-1 text-right">
                        {formatMm(item.widthMm, productionSettings.roundingMm)}
                      </td>
                      <td className="py-1 text-right">
                        {formatMm(item.heightMm, productionSettings.roundingMm)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </aside>
  );
};

export default ProductionPanel;
