import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import type { PendingMaterialAction } from "@/pages/homePageTypes";

// PATCH 18: Strict prop typing
export interface MaterialValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingMaterialAction: PendingMaterialAction | null;
  setPendingMaterialAction: (action: PendingMaterialAction | null) => void;
}

export default function MaterialValidationDialog({
  open,
  onOpenChange,
  pendingMaterialAction,
  setPendingMaterialAction,
}: MaterialValidationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">
            Laminate Code Required
          </AlertDialogTitle>

          <AlertDialogDescription>
            <p className="font-semibold">
              Cannot add cabinet or shutter without laminate codes on:
            </p>

            {pendingMaterialAction && pendingMaterialAction.missingPanels.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mt-2">
                <ul className="space-y-2 text-sm">
                  {pendingMaterialAction.missingPanels.map((msg: string, i: number) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-red-600 mt-0.5">✕</span>
                      <span className="font-medium">{msg}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-sm text-slate-700 mt-3 bg-blue-50 border border-blue-200 rounded-md p-3">
              Please select both front and inner laminate for all panels.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogAction
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => {
              onOpenChange(false);
              setPendingMaterialAction(null);
            }}
          >
            OK, I'll Add Laminate Codes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
