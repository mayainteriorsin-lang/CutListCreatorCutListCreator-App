/**
 * RateLineGrid
 *
 * Spreadsheet-style grid for editing rate card configuration.
 * One row per rate type (Shutter, Carcass, Loft, Inner Laminate).
 */

import React from "react";
import { IndianRupee } from "lucide-react";
import { useRateLineEditor } from "../../hooks/useRateLineEditor";
import { RateLineRow } from "./RateLineRow";
import type { WardrobeConfig } from "../../types/pricing";
import type { RateLineType, RateLineUpdate } from "../../types/rateLine";

// ============================================================================
// Types
// ============================================================================

interface RateLineGridProps {
  config: WardrobeConfig;
  onChange: (config: WardrobeConfig) => void;
  readOnly?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const RateLineGrid: React.FC<RateLineGridProps> = ({
  config,
  onChange,
  readOnly = false,
}) => {
  const {
    lines,
    totals,
    isDirty,
    error,
    updateLine,
    editingRow,
    setEditingRow,
  } = useRateLineEditor({ config, onChange });

  const handleUpdateLine = (lineType: RateLineType, updates: RateLineUpdate) => {
    updateLine(lineType, updates);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[80px_1fr_100px_100px_100px_100px_100px] gap-px bg-gray-200">
        <div className="bg-gray-50 px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          Photo
        </div>
        <div className="bg-gray-50 px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          Type / Material
        </div>
        <div className="bg-gray-50 px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          Thickness
        </div>
        <div className="bg-gray-50 px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          Finish
        </div>
        <div className="bg-gray-50 px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          Edge/Handle
        </div>
        <div className="bg-gray-50 px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-right">
          Rate/sqft
        </div>
        <div className="bg-gray-50 px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider text-center">
          Action
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-200">
        {lines.map((line) => (
          <RateLineRow
            key={line.type}
            line={line}
            isEditing={editingRow === line.type}
            onEditToggle={() => setEditingRow(editingRow === line.type ? null : line.type)}
            onUpdate={(updates) => handleUpdateLine(line.type, updates)}
            readOnly={readOnly || line.isCalculated}
          />
        ))}
      </div>

      {/* Totals Footer */}
      <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-t-2 border-emerald-200">
        <div className="grid grid-cols-[80px_1fr_100px_100px_100px_100px_100px] gap-px">
          <div className="px-3 py-3" />
          <div className="px-3 py-3">
            <span className="text-sm font-bold text-emerald-800">Combined Rate</span>
            <span className="text-[10px] text-emerald-600 ml-2">(Loft + Inner Lam)</span>
          </div>
          <div className="px-3 py-3" />
          <div className="px-3 py-3" />
          <div className="px-3 py-3" />
          <div className="px-3 py-3 text-right">
            <span className="text-lg font-bold text-emerald-700 flex items-center justify-end">
              <IndianRupee className="h-4 w-4" />
              {totals.combinedRate.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="px-3 py-3" />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Dirty indicator */}
      {isDirty && (
        <div className="px-4 py-1 bg-amber-50 border-t border-amber-200 text-xs text-amber-600">
          Unsaved changes
        </div>
      )}
    </div>
  );
};

export default RateLineGrid;
