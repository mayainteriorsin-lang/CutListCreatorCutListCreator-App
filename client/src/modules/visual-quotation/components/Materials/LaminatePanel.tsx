import React, { useEffect } from "react";
import { PaintBucket, Lock, Palette } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVisualQuotationStore } from "../../store/visualQuotationStore";
import { useGodownStore } from "@/features/material";

const LaminatePanel: React.FC = () => {
  const { units, updateWardrobeUnit, status } = useVisualQuotationStore();
  const laminateOptions = useGodownStore((state) => state.laminateOptions);
  const fetchMaterials = useGodownStore((state) => state.fetch);
  const locked = status === "APPROVED";

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-4 space-y-4">
        {/* Empty State */}
        {units.length === 0 && (
          <div className="py-6 text-center">
            <div className="h-10 w-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-2">
              <Palette className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-sm text-slate-600 font-medium">No units to configure</p>
            <p className="text-xs text-slate-400 mt-1">Add a wardrobe unit first</p>
          </div>
        )}

        {/* Units List */}
        {units.length > 0 && (
          <div className="space-y-4">
            {units.map((u, idx) => (
              <div
                key={u.id}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <PaintBucket className="h-4 w-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-700">Unit {idx + 1}</span>
                  <Badge variant="outline" className="text-[10px]">{u.wallId}</Badge>
                </div>

                <div className="space-y-2">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-slate-500 uppercase tracking-wide">
                      Shutter Laminate
                    </Label>
                    <Select
                      value={u.finish.shutterLaminateCode || ""}
                      onValueChange={(value) =>
                        updateWardrobeUnit(u.id, {
                          finish: { ...u.finish, shutterLaminateCode: value },
                        })
                      }
                      disabled={locked}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select shutter finish" />
                      </SelectTrigger>
                      <SelectContent>
                        {laminateOptions.map((l) => (
                          <SelectItem key={l.code} value={l.code}>
                            <span className="font-medium">{l.code}</span>
                            <span className="text-slate-500 ml-2">{l.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-slate-500 uppercase tracking-wide">
                      Loft Laminate
                    </Label>
                    <Select
                      value={u.finish.loftLaminateCode || ""}
                      onValueChange={(value) =>
                        updateWardrobeUnit(u.id, {
                          finish: { ...u.finish, loftLaminateCode: value },
                        })
                      }
                      disabled={locked}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select loft finish" />
                      </SelectTrigger>
                      <SelectContent>
                        {laminateOptions.map((l) => (
                          <SelectItem key={l.code} value={l.code}>
                            <span className="font-medium">{l.code}</span>
                            <span className="text-slate-500 ml-2">{l.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Locked Warning */}
        {locked && (
          <Alert className="bg-amber-50 border-amber-200">
            <Lock className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-xs text-amber-800">
              Approved quotes cannot be edited.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default LaminatePanel;
