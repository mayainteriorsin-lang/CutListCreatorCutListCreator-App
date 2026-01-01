import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LaminateSelectorPanel, PlywoodSelectorPanel } from "@/components/selectors";

/**
 * MasterMaterialPanel
 *
 * Handles:
 *  - Default plywood brand
 *  - Default laminate code
 *  - Plywood memory list
 *  - Laminate memory list
 *  - Add-to-memory controls
 *
 * Props:
 *  - masterPlywoodBrand
 *  - masterLaminateCode
 *  - plywoodMemory
 *  - laminateMemory
 *  - laminateCodes
 *  - onChange(field, value)
 *  - onAddPlywood
 *  - onAddLaminate
 */
export default function MasterMaterialPanel({
  masterPlywoodBrand,
  masterLaminateCode,
  plywoodMemory,
  laminateMemory,
  laminateCodes,
  onChange,
  onAddPlywood,
  onAddLaminate,
}: any) {

  return (
    <Card className="bg-white border-gray-200 shadow-md mt-6">
      <CardHeader>
        <CardTitle className="text-gray-900">
          Master Material Settings
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">

        {/* DEFAULT PLYWOOD BRAND */}
        <div className="space-y-2">
          <Label className="font-medium text-sm">Default Plywood Brand</Label>
          <PlywoodSelectorPanel
            value={masterPlywoodBrand}
            onChange={(v) => onChange("masterPlywoodBrand", v)}
          />

          <Button
            variant="outline"
            className="h-9 mt-1"
            onClick={onAddPlywood}
          >
            Add Plywood to Memory
          </Button>
        </div>

        {/* DEFAULT LAMINATE CODE */}
        <div className="space-y-2">
          <Label className="font-medium text-sm">Default Laminate Code</Label>
          <LaminateSelectorPanel
            value={masterLaminateCode}
            onChange={(v) => onChange("masterLaminateCode", v)}
            label="Default Laminate Code"
          />

          <Button
            variant="outline"
            className="h-9 mt-1"
            onClick={onAddLaminate}
          >
            Add Laminate to Memory
          </Button>
        </div>

        {/* MEMORY LIST DISPLAYS */}
        <div className="pt-4 border-t space-y-2">

          {/* Plywood Memory */}
          <div>
            <Label className="font-semibold text-sm">Plywood Memory</Label>
            <ul className="list-disc ml-6 text-sm text-gray-700">
              {plywoodMemory.map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Laminate Memory */}
          <div>
            <Label className="font-semibold text-sm">Laminate Memory</Label>
            <ul className="list-disc ml-6 text-sm text-gray-700">
              {laminateMemory.map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

        </div>
      </CardContent>
    </Card>
  );
}
