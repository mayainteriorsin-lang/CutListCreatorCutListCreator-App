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

export default function ClearConfirmDialog({
  open,
  onOpenChange,
  form,
  updateCabinets,
  setManualPanels,
  setDeletedPreviewSheets,
  setDeletedPreviewPanels,
  setShowPreviewDialog,
  setIsPreviewActive,
  masterPlywoodBrand,
  masterLaminateCode,
}: any) {
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

              updateCabinets([]);
              setManualPanels([]);
              setDeletedPreviewSheets(new Set());
              setDeletedPreviewPanels(new Set());
              setShowPreviewDialog(false);
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
