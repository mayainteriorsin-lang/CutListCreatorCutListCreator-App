import { UseFormReturn } from "react-hook-form";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import { toast } from "@/hooks/use-toast";
import { Cabinet, Panel } from "@shared/schema";
// PATCH 28: Use preview store for delete state
import { usePreviewStore } from "@/features/preview";

// PATCH 18 + 19 + 24 + 28: Strict prop typing with store actions, autosave clear, and preview store
export interface ClearConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: UseFormReturn<any>;
  updateCabinets: (cabinets: Cabinet[]) => void;
  setManualPanels: (panels: Panel[]) => void;
  // PATCH 28: Removed - now uses preview store directly
  // setDeletedPreviewSheets: (sheets: Set<string>) => void;
  // setDeletedPreviewPanels: (panels: Set<string>) => void;
  closePreview: () => void;
  setIsPreviewActive: (active: boolean) => void;
  masterPlywoodBrand?: string;
  masterLaminateCode?: string;
  // PATCH 24: Clear autosave callback
  onClearAutosave?: () => void;
}

export default function ClearConfirmDialog({
  open,
  onOpenChange,
  form,
  updateCabinets,
  setManualPanels,
  closePreview,
  setIsPreviewActive,
  masterPlywoodBrand,
  masterLaminateCode,
  onClearAutosave,
}: ClearConfirmDialogProps) {
  // PATCH 28: Use preview store for clearing delete state
  const clearPreviewState = usePreviewStore((s) => s.clearAll);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear All Cabinets & Spreadsheet?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete all cabinets, spreadsheet data, and preview.
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>

          <AlertDialogAction
            onClick={() => {
              localStorage.removeItem("cutlist_spreadsheet_v1");

              // PATCH 24: Clear autosave when clearing all data
              onClearAutosave?.();

              updateCabinets([]);
              setManualPanels([]);
              // PATCH 28: Use preview store to clear delete state
              clearPreviewState();
              closePreview();
              setIsPreviewActive(false);

              form.reset({
                id: crypto.randomUUID(),
                name: "Shutter #1",
                type: "single",
                height: 800,
                width: 600,
                depth: 450,
                widthReduction: 36,
                plywoodType: masterPlywoodBrand || "Apple Ply 16mm BWP",
                backPanelPlywoodBrand: "Apple ply 6mm BWP",
                topPanelLaminateCode: masterLaminateCode || "",
                bottomPanelLaminateCode: masterLaminateCode || "",
                leftPanelLaminateCode: masterLaminateCode || "",
                rightPanelLaminateCode: masterLaminateCode || "",
                backPanelLaminateCode: masterLaminateCode || "",
                topPanelInnerLaminateCode: "",
                bottomPanelInnerLaminateCode: "",
                leftPanelInnerLaminateCode: "",
                rightPanelInnerLaminateCode: "",
                backPanelInnerLaminateCode: "",
                innerLaminateCode: "",
                shuttersEnabled: false,
                shutterCount: 1,
                shutterType: "Standard",
                shutterHeightReduction: 0,
                shutterWidthReduction: 0,
                shutters: [],
                centerPostEnabled: false,
                centerPostQuantity: 1,
                centerPostHeight: 764,
                centerPostDepth: 430,
                centerPostLaminateCode: "",
                centerPostInnerLaminateCode: "",
                shelvesEnabled: false,
                shelvesQuantity: 1,
                shelvesLaminateCode: "",
              });

              toast({
                title: "Everything Cleared",
                description: "All cabinets and spreadsheet data removed.",
              });
            }}
            className="bg-red-600 hover:bg-red-700"
          >
            Clear All
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
