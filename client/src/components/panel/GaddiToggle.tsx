import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

/**
 * GaddiToggle
 *
 * Reusable toggle for GADDI boolean flag.
 */
export default function GaddiToggle({ value, onChange }: any) {
  return (
    <div className="flex items-center space-x-2">
      <Switch checked={value} onCheckedChange={onChange} />
      <Label className="text-sm">GADDI</Label>
    </div>
  );
}
