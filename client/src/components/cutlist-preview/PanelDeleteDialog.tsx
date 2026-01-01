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

export default function PanelDeleteDialog({
  panelToDelete,
  setPanelToDelete,
  setDeletedPreviewPanels,
}: any) {
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
                const uniqueId = `${panelToDelete.sheetId}-${panelToDelete.panelId}`;

                setDeletedPreviewPanels((prev: any) => {
                  return new Set([...Array.from(prev), uniqueId]);
                });

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
