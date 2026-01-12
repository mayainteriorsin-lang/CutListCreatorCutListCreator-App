import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// PATCH 18: Strict prop typing
export interface GrainToggleProps {
  value?: boolean;
  onChange: (value: boolean) => void;
}

export default function GrainToggle({ value, onChange }: GrainToggleProps) {
  return (
    <div className="flex items-center space-x-2">
      <Switch checked={Boolean(value)} onCheckedChange={onChange} />
      <Label className="text-sm">Wood Grains</Label>
    </div>
  );
}
