import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

/**
 * GrainToggle
 *
 * Reusable toggle for grain direction / wood grains.
 */
export default function GrainToggle({ value, onChange }: any) {
  return (
    <div className="flex items-center space-x-2">
      <Switch checked={value} onCheckedChange={onChange} />
      <Label className="text-sm">Wood Grains</Label>
    </div>
  );
}
