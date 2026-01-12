import React, { useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVisualQuotationStore } from "../../store/visualQuotationStore";
import { useGodownStore } from "@/features/material";

const LaminateCompact: React.FC = () => {
  const { units, updateWardrobeUnit, status } = useVisualQuotationStore();
  const laminateOptions = useGodownStore((state) => state.laminateOptions);
  const fetchMaterials = useGodownStore((state) => state.fetch);
  const locked = status === "APPROVED";
  const unit = units[0];

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  return (
    <div className="flex-1 p-2 rounded-xl border border-slate-600/50 bg-gradient-to-b from-slate-700/80 to-slate-800/80 backdrop-blur-sm space-y-1.5 shadow-lg shadow-black/10">
      <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
        Finishes
      </span>

      {!unit ? (
        <p className="text-[9px] text-slate-500 text-center py-2">Add unit first</p>
      ) : (
        <div className="space-y-1.5">
          <div>
            <label className="text-[8px] text-slate-400 uppercase tracking-wide">Shutter</label>
            <Select
              value={unit.finish.shutterLaminateCode || ""}
              onValueChange={(v) =>
                updateWardrobeUnit(unit.id, { finish: { ...unit.finish, shutterLaminateCode: v } })
              }
              disabled={locked}
            >
              <SelectTrigger className="h-8 w-full text-[11px] bg-slate-800/60 border-slate-600/50 text-white hover:bg-slate-700/60 focus:ring-1 focus:ring-purple-500/30 transition-all">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {laminateOptions.map((l) => (
                  <SelectItem key={l.code} value={l.code} className="text-xs text-slate-200 focus:bg-slate-700 focus:text-white">
                    {l.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[8px] text-slate-400 uppercase tracking-wide">Loft</label>
            <Select
              value={unit.finish.loftLaminateCode || ""}
              onValueChange={(v) =>
                updateWardrobeUnit(unit.id, { finish: { ...unit.finish, loftLaminateCode: v } })
              }
              disabled={locked}
            >
              <SelectTrigger className="h-8 w-full text-[11px] bg-slate-800/60 border-amber-500/30 text-white hover:bg-slate-700/60 focus:ring-1 focus:ring-amber-500/30 transition-all">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {laminateOptions.map((l) => (
                  <SelectItem key={l.code} value={l.code} className="text-xs text-slate-200 focus:bg-slate-700 focus:text-white">
                    {l.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
};

export default LaminateCompact;
