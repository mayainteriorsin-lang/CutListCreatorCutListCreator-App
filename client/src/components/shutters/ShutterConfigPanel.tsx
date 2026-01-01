import { forwardRef, RefObject } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

/**
 * ShutterConfigPanel
 *
 * Reusable shutter configuration UI.
 *
 * Props:
 *  - shuttersEnabled: boolean
 *  - shutterCount: number
 *  - shutterType: string (optional)
 *  - shutterHeightReduction: number
 *  - shutterWidthReduction: number
 *  - onChange(field, value): callback for value changes
 *  - onToggle(): optional callback when shutters enabled/disabled
 *  - shutterHeightInputRef: optional ref for height input
 *  - showType: whether to show shutter type selector (default true)
 *  - registerShutterCount: optional react-hook-form register for shutterCount
 *  - registerWidthReduction: optional react-hook-form register for shutterWidthReduction
 *  - registerHeightReduction: optional react-hook-form register for shutterHeightReduction
 */

interface ShutterConfigPanelProps {
  shuttersEnabled: boolean;
  shutterCount?: number;
  shutterType?: string;
  shutterHeightReduction?: number;
  shutterWidthReduction?: number;
  onChange: (field: string, value: any) => void;
  onToggle?: () => void;
  shutterHeightInputRef?: RefObject<HTMLInputElement>;
  showType?: boolean;
  registerShutterCount?: any;
  registerWidthReduction?: any;
  registerHeightReduction?: any;
}

export default function ShutterConfigPanel({
  shuttersEnabled,
  shutterCount,
  shutterType,
  shutterHeightReduction,
  shutterWidthReduction,
  onChange,
  onToggle,
  shutterHeightInputRef,
  showType = true,
  registerShutterCount,
  registerWidthReduction,
  registerHeightReduction,
}: ShutterConfigPanelProps) {

  return (
    <div className="space-y-4 border-b pb-4">
      <Label className="font-semibold">Shutters</Label>

      {/* Toggle */}
      <div className="flex items-center gap-2">
        <Switch
          checked={shuttersEnabled}
          onCheckedChange={(v) => {
            onChange("shuttersEnabled", v);
            onToggle?.();
          }}
        />
        <Label>Enable Shutters</Label>
      </div>

      {shuttersEnabled && (
        <div className="grid grid-cols-2 gap-3">
          {/* Shutter Count */}
          <div>
            <Label>Shutter Count</Label>
            {registerShutterCount ? (
              <Input type="number" {...registerShutterCount} />
            ) : (
              <Input
                type="number"
                min={1}
                max={10}
                value={shutterCount}
                onChange={(e) => onChange("shutterCount", parseInt(e.target.value) || 1)}
              />
            )}
          </div>

          {/* Shutter Width Reduction */}
          <div>
            <Label>Shutter Width Reduction</Label>
            {registerWidthReduction ? (
              <Input type="number" {...registerWidthReduction} />
            ) : (
              <Input
                type="number"
                value={shutterWidthReduction}
                onChange={(e) => onChange("shutterWidthReduction", parseInt(e.target.value) || 0)}
              />
            )}
          </div>

          {/* Shutter Height Reduction */}
          <div>
            <Label>Shutter Height Reduction</Label>
            {registerHeightReduction ? (
              <Input ref={shutterHeightInputRef} type="number" {...registerHeightReduction} />
            ) : (
              <Input
                ref={shutterHeightInputRef}
                type="number"
                value={shutterHeightReduction}
                onChange={(e) => onChange("shutterHeightReduction", parseInt(e.target.value) || 0)}
              />
            )}
          </div>

          {/* Shutter Type (optional) */}
          {showType && shutterType !== undefined && (
            <div>
              <Label>Shutter Type</Label>
              <Select
                value={shutterType}
                onValueChange={(v) => onChange("shutterType", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Handleless">Handleless</SelectItem>
                  <SelectItem value="Profile">Profile</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
