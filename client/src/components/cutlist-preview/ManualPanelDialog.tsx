import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import PanelDimensions from "@/components/panel/PanelDimensions";
import GaddiToggle from "@/components/panel/GaddiToggle";
import GrainToggle from "@/components/panel/GrainToggle";
import { toast } from "@/hooks/use-toast";

export default function ManualPanelDialog({
  open,
  onOpenChange,
  manualPanelForm,
  setManualPanelForm,
  globalPlywoodBrandMemory,
  laminateCodes,
  woodGrainsPreferences,
  selectedSheetContext,
  setSelectedSheetContext,
  setManualPanels,
}: any) {

  if (!open) return null;

  const generateUUID = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">
            {selectedSheetContext ? `Add Panel to ${selectedSheetContext.brand}` : 'Add Manual Panel'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2.5">

          {/* Panel Name + Qty */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-sm">Panel Name</Label>
              <Input
                defaultValue={manualPanelForm.name}
                placeholder="e.g., Extra Shutter, Shelf"
                id="manual-panel-name-input"
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Quantity</Label>
              <Input
                type="number"
                value={manualPanelForm.quantity}
                onChange={(e) =>
                  setManualPanelForm((prev: any) => ({
                    ...prev,
                    quantity: parseInt(e.target.value) || 1,
                  }))
                }
                min="1"
                className="h-9"
              />
            </div>
          </div>

          {/* Height + Width */}
          <PanelDimensions
            height={manualPanelForm.height}
            width={manualPanelForm.width}
            onHeightChange={(value) =>
              setManualPanelForm((prev: any) => ({
                ...prev,
                height: value,
              }))
            }
            onWidthChange={(value) =>
              setManualPanelForm((prev: any) => ({
                ...prev,
                width: value,
              }))
            }
            heightLabel="Height (mm)"
            widthLabel="Width (mm)"
          />

          {/* Plywood */}
          <div className="space-y-1">
            <Label className="text-sm">Plywood Type</Label>
            <Select
              value={manualPanelForm.plywoodType}
              onValueChange={(value) =>
                setManualPanelForm((prev: any) => ({ ...prev, plywoodType: value }))
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {globalPlywoodBrandMemory.map((b: any, idx: number) => (
                  <SelectItem key={idx} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Laminate */}
          <div className="space-y-1">
            <Label className="text-sm">Laminate Code (Optional)</Label>
            <Select
              value={manualPanelForm.laminateCode || undefined}
              onValueChange={(value) =>
                setManualPanelForm((prev: any) => ({
                  ...prev,
                  laminateCode: value,
                }))
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select laminate code (optional)" />
              </SelectTrigger>
              <SelectContent>
                {laminateCodes.map((code: any) => (
                  <SelectItem key={code.id} value={code.code}>
                    {code.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Switches */}
          <div className="flex items-center gap-4 pt-1">
            <GrainToggle
              value={manualPanelForm.grainDirection}
              onChange={(checked) =>
                setManualPanelForm((prev: any) => ({
                  ...prev,
                  grainDirection: checked,
                }))
              }
            />

            <GaddiToggle
              value={manualPanelForm.gaddi}
              onChange={(checked) =>
                setManualPanelForm((prev: any) => ({
                  ...prev,
                  gaddi: checked,
                }))
              }
            />
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-2 pt-3 border-t mt-2">
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                setSelectedSheetContext(null);
              }}
              className="h-9"
            >
              Cancel
            </Button>

            <Button
              className="bg-green-600 hover:bg-green-700 h-9"
              onClick={() => {
                const name = (document.getElementById("manual-panel-name-input") as HTMLInputElement)?.value || "Manual Panel";
                const height = parseInt(String(manualPanelForm.height || 0));
                const width = parseInt(String(manualPanelForm.width || 0));

                if (!height || !width || height <= 0 || width <= 0) {
                  return toast({
                    title: "Invalid Dimensions",
                    description: "Please enter valid height and width.",
                    variant: "destructive",
                  });
                }

                const baseLaminate = (manualPanelForm.laminateCode || "").split("+")[0].trim();
                const grain = woodGrainsPreferences[baseLaminate] === true;

                setManualPanels((prev: any) => [
                  ...prev,
                  {
                    id: generateUUID(),
                    name,
                    height,
                    width,
                    laminateCode: manualPanelForm.laminateCode,
                    plywoodType: manualPanelForm.plywoodType,
                    quantity: manualPanelForm.quantity,
                    grainDirection: grain,
                    gaddi: manualPanelForm.gaddi,
                    targetSheet: selectedSheetContext || undefined,
                  },
                ]);

                onOpenChange(false);
                setSelectedSheetContext(null);

                toast({
                  title: "Manual Panel Added",
                  description: `${name} (${width}×${height}) added.`,
                });
              }}
            >
              Add Panel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
