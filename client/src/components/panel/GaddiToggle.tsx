import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// PATCH 18: Strict prop typing
export interface GaddiToggleProps {
  value?: boolean;
  onChange: (value: boolean) => void;
}

export default function GaddiToggle({ value, onChange }: GaddiToggleProps) {
  return (
    <div className="flex items-center space-x-2">
      <Switch checked={Boolean(value)} onCheckedChange={onChange} />
      <Label className="text-sm">GADDI</Label>
    </div>
  );
}
