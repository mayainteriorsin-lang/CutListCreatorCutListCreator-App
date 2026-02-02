import React, { useEffect } from "react";
import { Palette } from "lucide-react";
import { LaminateCombobox } from "@/components/master-settings/LaminateCombobox";
import { useDesignCanvasStore } from "../../store/v2/useDesignCanvasStore";
import { useQuotationMetaStore } from "../../store/v2/useQuotationMetaStore";
import { useGodownStore } from "@/features/material";

const LaminateCompact: React.FC = () => {
  const { drawnUnits, activeUnitIndex, updateDrawnUnitById } = useDesignCanvasStore();
  const { status } = useQuotationMetaStore();

  const laminateOptions = useGodownStore((state) => state.laminateOptions);
  const fetchMaterials = useGodownStore((state) => state.fetch);
  const locked = status === "APPROVED";
  const unit = drawnUnits[activeUnitIndex];

  const laminateCodes = laminateOptions.map((l) => l.code);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Palette className="h-4 w-4 text-purple-600" />
        <span className="text-sm font-semibold text-slate-800">Finishes</span>
      </div>

      {!unit ? (
        <p className="text-xs text-slate-400 text-center py-3 bg-slate-50 rounded-lg">Add unit first</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Shutter</label>
            <LaminateCombobox
              value={unit.finish?.shutterLaminateCode || ""}
              onChange={(v) =>
                unit && updateDrawnUnitById(unit.id, { finish: { ...unit.finish, shutterLaminateCode: v } })
              }
              laminateCodes={laminateCodes}
              placeholder="Select..."
              disabled={locked}
              className="h-9 w-full text-sm bg-white border-slate-200"
            />
          </div>
          <div>
            <label className="text-xs text-amber-600 mb-1 block">Loft</label>
            <LaminateCombobox
              value={unit.finish?.loftLaminateCode || ""}
              onChange={(v) =>
                unit && updateDrawnUnitById(unit.id, { finish: { ...unit.finish, loftLaminateCode: v } })
              }
              laminateCodes={laminateCodes}
              placeholder="Select..."
              disabled={locked}
              className="h-9 w-full text-sm bg-amber-50/50 border-amber-200"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default LaminateCompact;
