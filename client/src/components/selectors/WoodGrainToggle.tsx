/**
 * PATCH 26: WoodGrainToggle
 *
 * Simple wood grain toggle switch component.
 * Used in panel material selectors.
 */

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export interface WoodGrainToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function WoodGrainToggle({
  checked,
  onChange,
  label = "Wood Grain",
  disabled = false,
  className = "",
}: WoodGrainToggleProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
      <Label className="text-sm">{label}</Label>
    </div>
  );
}

export default WoodGrainToggle;
