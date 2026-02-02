/**
 * RateCardImportModal
 *
 * Modal for importing a rate card from JSON.
 */

import React, { useState } from "react";
import { Upload, FileJson, AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ServiceResult } from "../../services/types";
import type { RateCard } from "../../types/rateCard";

interface RateCardImportModalProps {
  isOpen: boolean;
  onImport: (json: string) => ServiceResult<RateCard>;
  onClose: () => void;
}

export const RateCardImportModal: React.FC<RateCardImportModalProps> = ({
  isOpen,
  onImport,
  onClose,
}) => {
  const [json, setJson] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleImport = () => {
    setError(null);
    setSuccess(false);

    if (!json.trim()) {
      setError("Please paste the JSON data");
      return;
    }

    const result = onImport(json);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        setJson("");
        setSuccess(false);
        onClose();
      }, 1000);
    } else {
      setError(result.error || "Failed to import rate card");
    }
  };

  const handleClose = () => {
    setJson("");
    setError(null);
    setSuccess(false);
    onClose();
  };

  // Handle file drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/json") {
      const reader = new FileReader();
      reader.onload = (event) => {
        setJson(event.target?.result as string);
        setError(null);
      };
      reader.readAsText(file);
    } else {
      setError("Please drop a JSON file");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Import Rate Card
          </DialogTitle>
          <DialogDescription>
            Paste the rate card JSON data below or drag and drop a JSON file.
          </DialogDescription>
        </DialogHeader>

        <div
          className={`
            relative border-2 border-dashed rounded-lg p-4 transition-colors
            ${error ? "border-red-300 bg-red-50" : success ? "border-green-300 bg-green-50" : "border-gray-300 hover:border-gray-400"}
          `}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="flex items-center gap-2 mb-2">
            <FileJson className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">JSON Data</span>
          </div>

          <Textarea
            value={json}
            onChange={(e) => {
              setJson(e.target.value);
              setError(null);
            }}
            placeholder={`{
  "name": "My Rate Card",
  "description": "Optional description",
  "unitType": "wardrobe",
  "config": { ... }
}`}
            rows={10}
            className="font-mono text-xs"
          />

          {/* Drop overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-blue-50/80 opacity-0 hover:opacity-0 pointer-events-none rounded-lg">
            <p className="text-blue-600 font-medium">Drop JSON file here</p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            <Check className="h-4 w-4 flex-shrink-0" />
            Rate card imported successfully!
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!json.trim() || success}>
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RateCardImportModal;
