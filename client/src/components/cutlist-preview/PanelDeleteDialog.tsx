import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
// PATCH 28: Use preview store for delete state
import { usePreviewStore } from "@/features/preview";

// PATCH 18 + 28: Strict prop typing with preview store
export interface PanelToDelete {
  sheetId: string;
  panelId: string;
}

export interface PanelDeleteDialogProps {
  panelToDelete: PanelToDelete | null;
  setPanelToDelete: (panel: PanelToDelete | null) => void;
  // PATCH 28: Removed - now uses preview store directly
  // setDeletedPreviewPanels: Dispatch<SetStateAction<Set<string>>>;
}

export default function PanelDeleteDialog({
  panelToDelete,
  setPanelToDelete,
}: PanelDeleteDialogProps) {
  // PATCH 28: Use preview store for delete state
  const deletePanel = usePreviewStore((s) => s.deletePanel);
  const open = !!panelToDelete;

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && setPanelToDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Panel?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove the panel "
            {panelToDelete?.panelId || "panel"}
            " from the sheet. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>

          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700"
            onClick={() => {
              if (panelToDelete) {
                // PATCH 28: Use preview store deletePanel action
                deletePanel(panelToDelete.sheetId, panelToDelete.panelId);

                toast({
                  title: "Panel Deleted",
                  description: `Removed "${panelToDelete.panelId}" from the sheet.`,
                });

                setPanelToDelete(null);
              }
            }}
          >
            Delete Panel
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
