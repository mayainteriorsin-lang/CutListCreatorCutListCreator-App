/**
 * RateCardDeleteConfirm
 *
 * Confirmation dialog for deleting a rate card.
 */

import React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { RateCard } from "../../types/rateCard";

interface RateCardDeleteConfirmProps {
  isOpen: boolean;
  card: RateCard | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export const RateCardDeleteConfirm: React.FC<RateCardDeleteConfirmProps> = ({
  isOpen,
  card,
  onConfirm,
  onCancel,
}) => {
  if (!card) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Delete Rate Card
          </DialogTitle>
          <DialogDescription className="pt-2">
            Are you sure you want to delete <strong>"{card.name}"</strong>?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 bg-red-50 rounded-lg border border-red-200">
          <p className="text-sm text-red-800">
            This will permanently remove:
          </p>
          <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
            <li>All rate configurations</li>
            <li>Add-on settings</li>
            <li>Any quotations using this card will need to select a new rate card</li>
          </ul>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RateCardDeleteConfirm;
