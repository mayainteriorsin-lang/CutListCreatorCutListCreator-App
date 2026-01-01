import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

/**
 * CabinetNotesPanel
 *
 * Reusable notes/remarks UI for cabinets.
 *
 * Props:
 *  - notes: current notes text
 *  - attachToPdf: whether to include in PDF summary
 *  - applyToAll: whether to apply notes to all cabinets
 *  - onChange(field, value): callback for value changes
 */

interface CabinetNotesPanelProps {
  notes: string;
  attachToPdf: boolean;
  applyToAll: boolean;
  onChange: (field: string, value: any) => void;
}

export default function CabinetNotesPanel({
  notes,
  attachToPdf,
  applyToAll,
  onChange,
}: CabinetNotesPanelProps) {
  return (
    <div className="border rounded-md p-4 bg-gray-50 space-y-4">

      {/* NOTES TEXTAREA */}
      <div className="space-y-1">
        <Label className="text-sm font-medium">Notes / Remarks</Label>
        <Textarea
          className="min-h-[80px]"
          placeholder="Add any special instructions for this cabinet..."
          value={notes || ""}
          onChange={(e) => onChange("notes", e.target.value)}
        />
      </div>

      {/* INCLUDE IN PDF */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Include in PDF summary</Label>
        <Switch
          checked={attachToPdf}
          onCheckedChange={(c) => onChange("attachToPdf", c)}
        />
      </div>

      {/* APPLY TO ALL */}
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Apply to all cabinets</Label>
        <Switch
          checked={applyToAll}
          onCheckedChange={(c) => onChange("applyToAll", c)}
        />
      </div>
    </div>
  );
}
