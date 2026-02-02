import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// PATCH 18: Strict prop typing
// GADDI = Cavity/groove marking on panel
export interface GaddiToggleProps {
  value?: boolean;
  onChange: (value: boolean) => void;
}

export default function GaddiToggle({ value, onChange }: GaddiToggleProps) {
  return (
    <div className="flex items-center space-x-2" title={value ? "Gaddi ON - Panel has cavity" : "Gaddi OFF - No cavity"}>
      <Switch checked={Boolean(value)} onCheckedChange={onChange} />
      <Label className="text-sm cursor-pointer">GADDI</Label>
    </div>
  );
}
